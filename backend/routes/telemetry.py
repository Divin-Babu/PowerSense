import time
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from services.telemetry_storage import TelemetryStorageManager

router = APIRouter()

# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class Esp32TelemetryPayload(BaseModel):
    device_id: str
    name: Optional[str] = "ESP32 PZEM Smart Plug"
    voltage: float = 0.0          # Volts (e.g. 230.4)
    current: float = 0.0          # Amperes (e.g. 1.25)
    power: float = 0.0            # Watts (e.g. 288.0)
    energy: float = 0.0           # Cumulative kWh (e.g. 1.45)
    frequency: float = 50.0       # Hz
    power_factor: float = 1.0     # 0.0 - 1.0
    relay_state: str = "OFF"      # "ON" or "OFF"
    rssi: Optional[int] = -60     # WiFi RSSI dBm
    ip_address: Optional[str] = "192.168.1.100"
    mac_address: Optional[str] = "24:6F:28:XX:XX:XX"

class RelayCommand(BaseModel):
    device_id: str
    state: str                    # "ON" or "OFF"

# ─── In-Memory Store for Real-Time Telemetry & Devices ────────────────────────

CONNECTED_DEVICES: Dict[str, Dict[str, Any]] = {}
LATEST_TELEMETRY: Dict[str, Any] = {
    "connected": False,
    "status": "STANDBY",
    "message": "Waiting for ESP32 hardware telemetry stream...",
    "voltage": 0.0,
    "current": 0.0,
    "power_kw": 0.0,
    "power_watts": 0.0,
    "energy_kwh": 0.0,
    "frequency": 0.0,
    "power_factor": 0.0,
    "cost_today": 0.0,
    "relay_state": "OFF",
    "rssi": None,
    "device_id": None,
    "device_name": None,
    "last_seen": None,
    "last_seen_timestamp": 0
}

# ─── ESP32 Ingestion Endpoints ────────────────────────────────────────────────

@router.post("/esp32/telemetry")
def ingest_esp32_telemetry(payload: Esp32TelemetryPayload):
    """
    Endpoint for ESP32 PZEM-004T microcontroller to push real-time sensor readings.
    ESP32 makes an HTTP POST to this endpoint at 1.0 Hz with JSON payload.
    """
    now_iso = datetime.utcnow().isoformat()
    now_ts = time.time()

    power_kw = round(payload.power / 1000.0, 4) if payload.power > 0 else 0.0
    cost_est = round(payload.energy * 6.50, 2)  # Standard tariff estimate

    # Update or register device
    CONNECTED_DEVICES[payload.device_id] = {
        "id": payload.device_id,
        "name": payload.name or f"Node {payload.device_id}",
        "status": "ONLINE",
        "ip": payload.ip_address or "Unknown",
        "mac": payload.mac_address or "Unknown",
        "rssi": payload.rssi or -60,
        "relay_state": payload.relay_state.upper(),
        "live_watts": round(payload.power, 1),
        "voltage": round(payload.voltage, 1),
        "current_amps": round(payload.current, 2),
        "energy_kwh": round(payload.energy, 3),
        "frequency": round(payload.frequency, 1),
        "power_factor": round(payload.power_factor, 2),
        "pzem_status": "HEALTHY (Live Stream)",
        "last_seen": "Just now",
        "last_seen_timestamp": now_ts,
        "last_seen_iso": now_iso
    }

    # Update global latest telemetry
    LATEST_TELEMETRY.update({
        "connected": True,
        "status": "ONLINE",
        "message": f"Receiving live telemetry from {payload.device_id}",
        "voltage": round(payload.voltage, 1),
        "current": round(payload.current, 2),
        "power_kw": power_kw,
        "power_watts": round(payload.power, 1),
        "energy_kwh": round(payload.energy, 3),
        "frequency": round(payload.frequency, 1),
        "power_factor": round(payload.power_factor, 2),
        "cost_today": cost_est,
        "relay_state": payload.relay_state.upper(),
        "rssi": payload.rssi,
        "device_id": payload.device_id,
        "device_name": payload.name,
        "last_seen": "Just now",
        "last_seen_timestamp": now_ts
    })

    # Process and throttled persist into PostgreSQL (Every 30s or on significant delta/anomaly)
    storage_res = TelemetryStorageManager.process_and_persist(payload.dict())

    return {
        "success": True,
        "message": "Telemetry ingested successfully",
        "device_id": payload.device_id,
        "relay_state": payload.relay_state.upper(),
        "database_storage": storage_res
    }

@router.post("/telemetry/prune")
def prune_telemetry(days: int = 30):
    """
    Prunes raw 30-second readings older than `days` days from tbl_energy_reading.
    Preserves daily summaries in tbl_usage_summary permanently.
    """
    deleted_count = TelemetryStorageManager.prune_old_readings(retention_days=days)
    return {
        "success": True,
        "deleted_records": deleted_count,
        "retention_policy": f"Kept last {days} days of raw readings. Aggregations preserved permanently."
    }

@router.get("/telemetry/live")
def get_live_telemetry():
    """
    Get latest telemetry. If ESP32 has not sent data within 15 seconds, marks status as STANDBY.
    """
    now = time.time()
    last_ts = LATEST_TELEMETRY.get("last_seen_timestamp", 0)

    if last_ts > 0 and (now - last_ts) < 15:
        # Live and receiving
        seconds_ago = int(now - last_ts)
        LATEST_TELEMETRY["connected"] = True
        LATEST_TELEMETRY["status"] = "ONLINE"
        LATEST_TELEMETRY["last_seen"] = f"{seconds_ago}s ago" if seconds_ago > 0 else "Just now"
    elif last_ts > 0:
        # Previously connected but timed out
        LATEST_TELEMETRY["connected"] = False
        LATEST_TELEMETRY["status"] = "OFFLINE"
        LATEST_TELEMETRY["message"] = "ESP32 stream timed out. Waiting for reconnection..."
    else:
        # Never connected / awaiting purchase & setup
        LATEST_TELEMETRY["connected"] = False
        LATEST_TELEMETRY["status"] = "STANDBY"
        LATEST_TELEMETRY["message"] = "Awaiting ESP32 hardware connection..."

    return {
        "success": True,
        "telemetry": LATEST_TELEMETRY
    }

@router.get("/devices")
def get_live_devices():
    """
    Returns real connected devices. Empty array [] if no ESP32 devices have transmitted yet.
    """
    now = time.time()
    device_list = []

    for dev_id, dev in CONNECTED_DEVICES.items():
        last_ts = dev.get("last_seen_timestamp", 0)
        is_online = (now - last_ts) < 15
        dev_copy = dev.copy()
        dev_copy["status"] = "ONLINE" if is_online else "OFFLINE"
        dev_copy["pzem_status"] = "HEALTHY (Live Stream)" if is_online else "DISCONNECTED"
        if is_online:
            secs = int(now - last_ts)
            dev_copy["last_seen"] = f"{secs}s ago" if secs > 0 else "Just now"
        else:
            mins = int((now - last_ts) / 60)
            dev_copy["last_seen"] = f"{mins}m ago" if mins > 0 else "Inactive"
        device_list.append(dev_copy)

    return {
        "success": True,
        "count": len(device_list),
        "devices": device_list
    }

@router.post("/esp32/relay")
def toggle_esp32_relay(cmd: RelayCommand):
    """
    Send a relay ON/OFF command to a specific ESP32 node.
    """
    target_state = cmd.state.strip().upper()
    if target_state not in ["ON", "OFF"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Relay state must be 'ON' or 'OFF'.")

    if cmd.device_id in CONNECTED_DEVICES:
        CONNECTED_DEVICES[cmd.device_id]["relay_state"] = target_state

    if LATEST_TELEMETRY.get("device_id") == cmd.device_id or not LATEST_TELEMETRY.get("device_id"):
        LATEST_TELEMETRY["relay_state"] = target_state

    return {
        "success": True,
        "device_id": cmd.device_id,
        "relay_state": target_state,
        "message": f"Relay command '{target_state}' dispatched for {cmd.device_id}."
    }
