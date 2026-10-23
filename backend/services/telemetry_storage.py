import time
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import Dict, Any, Optional

IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now() -> datetime:
    return datetime.now(timezone.utc).astimezone(IST)

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
    - Tier 1: Real-time In-Memory cache for 1.0 Hz live app display.
    - Tier 2: Persistent storage into PostgreSQL (Every 10s OR significant power surge/drop).
    - Tier 3: Automated usage summary updates in tbl_usage_summary.
    - Tier 4: Long-term raw data retention pruning.
    """

    _device_state: Dict[str, Dict[str, Any]] = {}
    _reading_buffers: Dict[str, list] = {}
    _last_aggregation_ts: Dict[str, float] = {}
    _last_relay_state: Dict[str, str] = {}

    AGGREGATION_INTERVAL_SECONDS = 60      # Store 1 clean averaged record every 60 seconds (1 minute window)
    OVERLOAD_WATTS_THRESHOLD = 1450.0      # Critical safety threshold (10A smart plug rating)
    OVERVOLTAGE_THRESHOLD = 250.0          # Voltage surge limit (> 250V)
    UNDERVOLTAGE_THRESHOLD = 205.0         # Brownout / low voltage limit (< 205V)
    MIN_OPERATING_VOLTAGE = 50.0           # Below 50V is a power outage / unplugged

    _last_undervoltage_alert: Dict[str, float] = {}
    _last_overvoltage_alert: Dict[str, float] = {}
    _active_user_id: Optional[int] = 2  # Default to primary active resident user

    @classmethod
    def set_active_user(cls, user_id: int):
        cls._active_user_id = user_id

    @classmethod
    def get_active_user_id(cls) -> Optional[int]:
        return cls._active_user_id

    @classmethod
    def process_and_persist(cls, payload: Dict[str, Any]):
        device_uid = payload.get("device_id") or "ESP32-PZEM-PLUG-10A"
        power_w = float(payload.get("power", 0.0))
        voltage = float(payload.get("voltage", 230.0))
        current = float(payload.get("current", 0.0))
        energy_kwh = float(payload.get("energy", 0.0))
        power_factor = float(payload.get("power_factor", 1.0))
        frequency = float(payload.get("frequency", 50.0))
        relay_state = str(payload.get("relay_state", "OFF")).upper()

        now_ts = time.time()
        db: Session = SessionLocal()
        try:
            # ─────────────────────────────────────────────────────────────────
            # 1. ALWAYS UPDATE DEVICE LIVE ATTRIBUTES (Real-Time Live Telemetry)
            # ─────────────────────────────────────────────────────────────────
            device = db.query(Device).filter(Device.device_uid == device_uid).first()
            if not device:
                device = Device(
                    device_uid=device_uid,
                    device_name=payload.get("name") or "PowerSense Smart Plug",
                    status="ONLINE",
                    relay_state=relay_state,
                    relay1_state=str(payload.get("relay1_state", "ON")).upper(),
                    relay2_state=str(payload.get("relay2_state", "OFF")).upper(),
                    voltage=Decimal(str(round(voltage, 2))),
                    current=Decimal(str(round(current, 2))),
                    power=Decimal(str(round(power_w, 2))),
                    energy=Decimal(str(round(energy_kwh, 3))),
                    frequency=Decimal(str(round(frequency, 2))),
                    power_factor=Decimal(str(round(power_factor, 2))),
                    power_source=payload.get("power_source") or "HLK-PM01 5V AC-DC",
                    rssi=payload.get("rssi") or -60,
                    ip_address=payload.get("ip_address") or "192.168.1.100",
                    mac_address=payload.get("mac_address") or "24:6F:28:B4:9A:12",
                    last_seen=datetime.utcnow()
                )
                db.add(device)
                db.commit()
                db.refresh(device)
            else:
                device.last_seen = datetime.utcnow()
                device.status = "ONLINE"
                device.relay_state = relay_state
                if payload.get("relay1_state"):
                    device.relay1_state = str(payload.get("relay1_state")).upper()
                if payload.get("relay2_state"):
                    device.relay2_state = str(payload.get("relay2_state")).upper()
                device.voltage = Decimal(str(round(voltage, 2)))
                device.current = Decimal(str(round(current, 2)))
                device.power = Decimal(str(round(power_w, 2)))
                device.energy = Decimal(str(round(energy_kwh, 3)))
                device.frequency = Decimal(str(round(frequency, 2)))
                device.power_factor = Decimal(str(round(power_factor, 2)))
                if payload.get("rssi") is not None:
                    device.rssi = int(payload.get("rssi"))
                if payload.get("ip_address"):
                    device.ip_address = str(payload.get("ip_address"))
                if payload.get("mac_address"):
                    device.mac_address = str(payload.get("mac_address"))
                db.commit()

            # 2. Resolve connected Appliance (optional)
            active_uid = cls.get_active_user_id() or device.user_id or 2
            appliance = db.query(Appliance).filter(
                (Appliance.device_id == device.device_id) & ((Appliance.user_id == active_uid) | (Appliance.user_id == None))
            ).first()
            appliance_id = appliance.appliance_id if appliance else None

            # ─────────────────────────────────────────────────────────────────
            # ─────────────────────────────────────────────────────────────────
            # 2. INSTANTANEOUS LIVE ANOMALY & SAFETY SENSING (Evaluated Every 1s)
            # ─────────────────────────────────────────────────────────────────
            ist_now = get_ist_now().replace(tzinfo=None)

            # A. Overload Peak Sensing
            if power_w >= cls.OVERLOAD_WATTS_THRESHOLD:
                anomaly = Anomaly(
                    device_id=device.device_id,
                    user_id=active_uid,
                    appliance_id=appliance_id,
                    anomaly_type="High Power Usage",
                    severity="critical",
                    description=f"Power draw peaked at {power_w:.1f}W (> {cls.OVERLOAD_WATTS_THRESHOLD}W rating).",
                    detected_at=ist_now
                )
                db.add(anomaly)
                notif = Notification(
                    user_id=active_uid,
                    device_id=device.device_id,
                    appliance_id=appliance_id,
                    notification_type="critical",
                    message=f"High Power Usage: Load exceeded {power_w:.1f}W on {device.device_name}.",
                    status="UNREAD",
                    created_at=ist_now
                )
                db.add(notif)
                db.commit()

            # B. Live Low Voltage Brownout Sensing (< 205V)
            if cls.MIN_OPERATING_VOLTAGE < voltage < cls.UNDERVOLTAGE_THRESHOLD:
                last_uv = cls._last_undervoltage_alert.get(device_uid, 0)
                if now_ts - last_uv >= 300:  # 5-minute debounce
                    cls._last_undervoltage_alert[device_uid] = now_ts
                    anomaly = Anomaly(
                        device_id=device.device_id,
                        user_id=active_uid,
                        appliance_id=appliance_id,
                        anomaly_type="Low Voltage",
                        severity="warning",
                        description=f"Low mains voltage detected: {voltage:.1f}V (< {cls.UNDERVOLTAGE_THRESHOLD}V). Brownout conditions may damage compressor motors or power supplies.",
                        detected_at=ist_now
                    )
                    db.add(anomaly)
                    notif = Notification(
                        user_id=active_uid,
                        device_id=device.device_id,
                        appliance_id=appliance_id,
                        notification_type="warning",
                        message=f"Low Voltage Warning: Mains dropped to {voltage:.1f}V on {device.device_name}. Sensitive appliances may experience brownout stress.",
                        status="UNREAD",
                        created_at=ist_now
                    )
                    db.add(notif)
                    db.commit()

            # C. Live Overvoltage Surge Sensing (>= 250V)
            if voltage >= cls.OVERVOLTAGE_THRESHOLD:
                last_ov = cls._last_overvoltage_alert.get(device_uid, 0)
                if now_ts - last_ov >= 300:  # 5-minute debounce
                    cls._last_overvoltage_alert[device_uid] = now_ts
                    anomaly = Anomaly(
                        device_id=device.device_id,
                        user_id=active_uid,
                        appliance_id=appliance_id,
                        anomaly_type="High Voltage",
                        severity="critical",
                        description=f"Overvoltage surge detected: {voltage:.1f}V (>= {cls.OVERVOLTAGE_THRESHOLD}V). Risk of appliance component breakdown.",
                        detected_at=ist_now
                    )
                    db.add(anomaly)
                    notif = Notification(
                        user_id=active_uid,
                        device_id=device.device_id,
                        appliance_id=appliance_id,
                        notification_type="critical",
                        message=f"Overvoltage Alert: Voltage spiked to {voltage:.1f}V on {device.device_name}. Disconnect load immediately.",
                        status="UNREAD",
                        created_at=ist_now
                    )
                    db.add(notif)
                    db.commit()

            # ─────────────────────────────────────────────────────────────────
            # D. AUTOMATIC RELAY SAFETY CUTOFF (High Power Overload or Low Voltage)
            # ─────────────────────────────────────────────────────────────────
            is_overpower = power_w >= cls.OVERLOAD_WATTS_THRESHOLD or (voltage >= 255.0 and power_w > 5.0)
            is_critical_low_v = cls.MIN_OPERATING_VOLTAGE < voltage < 185.0 and (power_w > 10.0 or relay_state == "ON")

            if (is_overpower or is_critical_low_v) and (relay_state == "ON" or (device and device.relay_state == "ON")):
                device.relay_state = "OFF"
                device.relay1_state = "OFF"
                device.relay2_state = "OFF"
                db.commit()

                try:
                    from routes.telemetry import LATEST_TELEMETRY, CONNECTED_DEVICES
                    LATEST_TELEMETRY["relay_state"] = "OFF"
                    LATEST_TELEMETRY["relay1_state"] = "OFF"
                    LATEST_TELEMETRY["relay2_state"] = "OFF"
                    if device_uid in CONNECTED_DEVICES:
                        CONNECTED_DEVICES[device_uid]["relay_state"] = "OFF"
                        CONNECTED_DEVICES[device_uid]["relay1_state"] = "OFF"
                        CONNECTED_DEVICES[device_uid]["relay2_state"] = "OFF"
                except Exception:
                    pass

                reason_text = f"Power Overload ({power_w:.1f}W ≥ {cls.OVERLOAD_WATTS_THRESHOLD}W)" if is_overpower else f"Dangerous Low Voltage ({voltage:.1f}V < 185V)"
                cutoff_notif = Notification(
                    user_id=active_uid,
                    device_id=device.device_id,
                    appliance_id=appliance_id,
                    notification_type="critical",
                    message=f"🚨 Auto-Cutoff Triggered: Smart plug relay turned OFF automatically due to {reason_text}. Equipment protected.",
                    status="UNREAD",
                    created_at=ist_now
                )
                db.add(cutoff_notif)
                db.commit()

            # ─────────────────────────────────────────────────────────────────
            # 3. TIME-WINDOW BUFFERING & PERIODIC AVERAGING FOR tbl_energy_reading
            # ─────────────────────────────────────────────────────────────────
            if device_uid not in cls._reading_buffers:
                cls._reading_buffers[device_uid] = []
                cls._last_aggregation_ts[device_uid] = now_ts
                cls._last_relay_state[device_uid] = relay_state

            cls._reading_buffers[device_uid].append({
                "voltage": voltage,
                "current": current,
                "power": power_w,
                "energy": energy_kwh,
                "power_factor": power_factor,
                "frequency": frequency,
                "relay_state": relay_state
            })

            last_agg = cls._last_aggregation_ts.get(device_uid, now_ts)
            buffer = cls._reading_buffers[device_uid]
            relay_changed = (cls._last_relay_state.get(device_uid) != relay_state)
            time_elapsed = now_ts - last_agg

            # Only write to tbl_energy_reading when the averaging window elapses (60s) or relay state changes
            if (time_elapsed >= cls.AGGREGATION_INTERVAL_SECONDS) or (relay_changed and len(buffer) >= 2):
                cls._last_aggregation_ts[device_uid] = now_ts
                cls._last_relay_state[device_uid] = relay_state

                avg_voltage = round(sum(s["voltage"] for s in buffer) / len(buffer), 2)
                avg_current = round(sum(s["current"] for s in buffer) / len(buffer), 2)
                avg_power = round(sum(s["power"] for s in buffer) / len(buffer), 2)
                avg_pf = round(sum(s["power_factor"] for s in buffer) / len(buffer), 2)
                avg_freq = round(sum(s["frequency"] for s in buffer) / len(buffer), 2)
                max_energy = round(max(s["energy"] for s in buffer), 3)
                sample_count = len(buffer)

                # Reset buffer for next averaging period
                cls._reading_buffers[device_uid] = []

                new_reading = EnergyReading(
                    device_id=device.device_id,
                    appliance_id=appliance_id,
                    user_id=active_uid,
                    voltage=Decimal(str(avg_voltage)),
                    current=Decimal(str(avg_current)),
                    power=Decimal(str(avg_power)),
                    energy=Decimal(str(max_energy)),
                    power_factor=Decimal(str(avg_pf)),
                    frequency=Decimal(str(avg_freq)),
                    recorded_at=get_ist_now().replace(tzinfo=None)
                )
                db.add(new_reading)

                # Automated update to active user's DAY summary in tbl_usage_summary
                now_ist = get_ist_now()
                today_start = datetime.combine(now_ist.date(), datetime.min.time())
                today_end = datetime.combine(now_ist.date(), datetime.max.time())
                day_summary = db.query(UsageSummary).filter(
                    UsageSummary.user_id == active_uid,
                    UsageSummary.period_type == "DAY"
                ).first()
                if day_summary:
                    day_summary.total_energy = Decimal(str(max_energy))
                    day_summary.average_power = Decimal(str(avg_power))
                    if day_summary.peak_power is None or Decimal(str(avg_power)) > day_summary.peak_power:
                        day_summary.peak_power = Decimal(str(avg_power))
                    day_summary.period_end = now_ist.replace(tzinfo=None)
                else:
                    new_summary = UsageSummary(
                        user_id=active_uid,
                        device_id=device.device_id,
                        period_type="DAY",
                        period_start=today_start,
                        period_end=today_end,
                        total_energy=Decimal(str(max_energy)),
                        average_power=Decimal(str(avg_power)),
                        peak_power=Decimal(str(avg_power))
                    )
                    db.add(new_summary)

                db.commit()
                db.refresh(new_reading)

                return {
                    "persisted": True,
                    "reading_id": new_reading.reading_id,
                    "device_id": device.device_id,
                    "aggregated_samples": sample_count,
                    "window_seconds": int(time_elapsed),
                    "avg_power_w": avg_power,
                    "avg_voltage": avg_voltage,
                    "recorded_at": new_reading.recorded_at.isoformat()
                }

            return {
                "persisted": False,
                "buffered_samples": len(buffer),
                "seconds_until_next_snapshot": max(0, int(cls.AGGREGATION_INTERVAL_SECONDS - time_elapsed)),
                "device_id": device.device_id
            }

        except Exception as e:
            db.rollback()
            print(f"[Telemetry Storage Error] {e}")
            return {"persisted": False, "error": str(e)}
        finally:
            db.close()

    @classmethod
    def prune_old_readings(cls, retention_days: int = 30) -> int:
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
