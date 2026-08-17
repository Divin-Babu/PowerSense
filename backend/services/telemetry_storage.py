import time
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, Any, Optional

from sqlalchemy.orm import Session
from database import SessionLocal
from models import (
    Device,
    Appliance,
    EnergyReading,
    UsageSummary,
    Anomaly,
    Notification
)

class TelemetryStorageManager:
    """
    Intelligent Multi-Tier Telemetry Processor:
    - Tier 1: Real-time In-Memory cache for 1.0 Hz live app display & MQTT.
    - Tier 2: Throttled persistence to PostgreSQL (Every 30-60s OR significant power surge/drop).
    - Tier 3: Automated daily usage summary rollups in tbl_usage_summary.
    - Tier 4: Long-term raw data retention pruning.
    """

    # Device ID -> { 'last_persisted_ts': float, 'last_power_w': float, 'last_relay': str }
    _device_state: Dict[str, Dict[str, Any]] = {}

    # Configuration thresholds
    PERIODIC_PERSIST_INTERVAL_SECONDS = 30  # Persist at most once every 30 seconds for stable loads
    SIGNIFICANT_DELTA_WATTS = 40.0         # Immediate write if load changes by >= 40W
    SIGNIFICANT_DELTA_RATIO = 0.20         # Immediate write if load changes by >= 20%
    OVERLOAD_WATTS_THRESHOLD = 1450.0      # Critical safety threshold (10A smart plug rating)
    OVERVOLTAGE_THRESHOLD = 250.0          # Voltage surge limit

    @classmethod
    def should_persist_to_db(cls, device_uid: str, power_w: float, relay_state: str) -> bool:
        """
        Determines whether 1-second telemetry should be saved into PostgreSQL tbl_energy_reading.
        """
        now = time.time()
        prev = cls._device_state.get(device_uid)

        if not prev:
            # First reading from this device -> persist immediately
            cls._device_state[device_uid] = {
                "last_persisted_ts": now,
                "last_power_w": power_w,
                "last_relay": relay_state
            }
            return True

        time_since_last = now - prev.get("last_persisted_ts", 0)
        last_power = prev.get("last_power_w", 0.0)
        last_relay = prev.get("last_relay", "OFF")

        # Condition A: Relay state changed (e.g. turned ON or OFF)
        if relay_state.upper() != last_relay.upper():
            cls._update_device_state(device_uid, now, power_w, relay_state)
            return True

        # Condition B: Anomaly / Overload condition
        if power_w >= cls.OVERLOAD_WATTS_THRESHOLD:
            cls._update_device_state(device_uid, now, power_w, relay_state)
            return True

        # Condition C: Significant power surge or drop (|ΔW| >= 40W or 20%)
        power_diff = abs(power_w - last_power)
        if power_diff >= cls.SIGNIFICANT_DELTA_WATTS or (last_power > 0 and (power_diff / last_power) >= cls.SIGNIFICANT_DELTA_RATIO):
            cls._update_device_state(device_uid, now, power_w, relay_state)
            return True

        # Condition D: Periodic 30-second interval elapsed for steady baseline
        if time_since_last >= cls.PERIODIC_PERSIST_INTERVAL_SECONDS:
            cls._update_device_state(device_uid, now, power_w, relay_state)
            return True

        return False

    @classmethod
    def _update_device_state(cls, device_uid: str, ts: float, power_w: float, relay_state: str):
        cls._device_state[device_uid] = {
            "last_persisted_ts": ts,
            "last_power_w": power_w,
            "last_relay": relay_state
        }

    @classmethod
    def process_and_persist(cls, payload: Dict[str, Any]):
        """
        Executes the intelligent storage pipeline for incoming ESP32/PZEM telemetry.
        """
        device_uid = payload.get("device_id") or "ESP32-PZEM-PLUG-10A"
        power_w = float(payload.get("power", 0.0))
        voltage = float(payload.get("voltage", 230.0))
        current = float(payload.get("current", 0.0))
        energy_kwh = float(payload.get("energy", 0.0))
        power_factor = float(payload.get("power_factor", 1.0))
        frequency = float(payload.get("frequency", 50.0))
        relay_state = str(payload.get("relay_state", "OFF")).upper()

        # Check if this reading qualifies for database storage
        if not cls.should_persist_to_db(device_uid, power_w, relay_state):
            return {"persisted": False, "reason": "Throttled in-memory (1s fast buffer)"}

        db: Session = SessionLocal()
        try:
            # 1. Resolve or create Device in PostgreSQL
            device = db.query(Device).filter(Device.device_uid == device_uid).first()
            if not device:
                device = Device(
                    device_uid=device_uid,
                    device_name=payload.get("name") or f"Plug {device_uid}",
                    status="ONLINE",
                    last_seen=datetime.utcnow()
                )
                db.add(device)
                db.commit()
                db.refresh(device)
            else:
                device.last_seen = datetime.utcnow()
                device.status = "ONLINE"
                db.commit()

            # 2. Resolve connected Appliance
            appliance = db.query(Appliance).filter(Appliance.device_id == device.device_id).first()
            appliance_id = appliance.appliance_id if appliance else None

            # 3. Store throttled snapshot in tbl_energy_reading
            new_reading = EnergyReading(
                device_id=device.device_id,
                appliance_id=appliance_id,
                voltage=Decimal(str(round(voltage, 2))),
                current=Decimal(str(round(current, 2))),
                power=Decimal(str(round(power_w, 2))),
                energy=Decimal(str(round(energy_kwh, 3))),
                power_factor=Decimal(str(round(power_factor, 2))),
                frequency=Decimal(str(round(frequency, 2))),
                recorded_at=datetime.utcnow()
            )
            db.add(new_reading)
            db.commit()
            db.refresh(new_reading)

            # 4. Check for and record Anomalies if safety threshold exceeded
            if power_w >= cls.OVERLOAD_WATTS_THRESHOLD:
                anomaly = Anomaly(
                    appliance_id=appliance_id,
                    reading_id=new_reading.reading_id,
                    anomaly_type="High Power Usage",
                    severity="critical",
                    description=f"Power draw peaked at {power_w:.1f}W (> {cls.OVERLOAD_WATTS_THRESHOLD}W rating).",
                    detected_at=datetime.utcnow()
                )
                db.add(anomaly)

                notif = Notification(
                    user_id=device.user_id,
                    appliance_id=appliance_id,
                    notification_type="critical",
                    message=f"High Power Usage: Load exceeded {power_w:.1f}W on {device.device_name}.",
                    status="UNREAD",
                    created_at=datetime.utcnow()
                )
                db.add(notif)
                db.commit()

            return {
                "persisted": True,
                "reading_id": new_reading.reading_id,
                "device_id": device.device_id,
                "recorded_at": new_reading.recorded_at.isoformat()
            }

        except Exception as e:
            db.rollback()
            print(f"[Telemetry Storage Error] {e}")
            return {"persisted": False, "error": str(e)}
        finally:
            db.close()

    @classmethod
    def prune_old_readings(cls, retention_days: int = 30) -> int:
        """
        Deletes raw 30-second readings older than retention_days to prevent database bloat.
        Daily summaries in tbl_usage_summary are preserved permanently.
        """
        db: Session = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(days=retention_days)
            deleted = db.query(EnergyReading).filter(EnergyReading.recorded_at < cutoff).delete()
            db.commit()
            return deleted
        except Exception as e:
            db.rollback()
            print(f"[Prune Error] {e}")
            return 0
        finally:
            db.close()
