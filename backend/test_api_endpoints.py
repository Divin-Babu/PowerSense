import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoints():
    print("=" * 60)
    print("TESTING BACKEND API ENDPOINTS FOR USER ISOLATION & ESP32")
    print("=" * 60)

    # 1. Test Dashboard for Divin
    r1 = client.get("/api/data/dashboard?email=divin@gmail.com")
    assert r1.status_code == 200, f"Expected 200, got {r1.status_code}: {r1.text}"
    d1 = r1.json()
    print(f"\n[Dashboard Divin Babu]")
    print(f"User: {d1['user']['name']} ({d1['user']['email']})")
    print(f"Today Usage: {d1['today_usage']['kwh']} kWh")
    print(f"Monthly Usage: {d1['this_month']['kwh']} / {d1['this_month']['goal_kwh']} kWh ({d1['this_month']['goal_pct']}%)")
    print(f"Estimated Bill: ₹ {d1['bill_estimate']['amount']}")
    print(f"Live Watts: {d1['live']['watts']} W, Relay: {d1['live']['relay_state']}")

    # 2. Test Dashboard for Luke
    r2 = client.get("/api/data/dashboard?email=luke@gmail.com")
    assert r2.status_code == 200
    d2 = r2.json()
    print(f"\n[Dashboard Luke]")
    print(f"User: {d2['user']['name']} ({d2['user']['email']})")
    print(f"Today Usage: {d2['today_usage']['kwh']} kWh")
    print(f"Monthly Usage: {d2['this_month']['kwh']} / {d2['this_month']['goal_kwh']} kWh ({d2['this_month']['goal_pct']}%)")
    print(f"Estimated Bill: ₹ {d2['bill_estimate']['amount']}")

    # 3. Test Dashboard for Amal
    r3 = client.get("/api/data/dashboard?email=amal@gmail.com")
    assert r3.status_code == 200
    d3 = r3.json()
    print(f"\n[Dashboard Amal Babu]")
    print(f"User: {d3['user']['name']} ({d3['user']['email']})")
    print(f"Today Usage: {d3['today_usage']['kwh']} kWh")
    print(f"Monthly Usage: {d3['this_month']['kwh']} / {d3['this_month']['goal_kwh']} kWh ({d3['this_month']['goal_pct']}%)")
    print(f"Estimated Bill: ₹ {d3['bill_estimate']['amount']}")

    # Verify user data is DIFFERENT across users!
    assert d1['today_usage']['kwh'] != d2['today_usage']['kwh'], "Divin and Luke must have distinct today usage!"
    assert d1['bill_estimate']['amount'] != d2['bill_estimate']['amount'], "Divin and Luke must have distinct bill amounts!"
    print("\n>>> CONFIRMED: Each user has distinct usage and bills! <<<")

    # 4. Test Devices Tab (Strictly 1 ESP32 Smart Plug)
    r_dev = client.get("/api/data/devices")
    assert r_dev.status_code == 200
    devs = r_dev.json()
    print(f"\n[Devices Tab]")
    print(f"Device Count: {devs['count']}")
    assert devs['count'] == 1, f"Expected exactly 1 device, got {devs['count']}"
    dev0 = devs['devices'][0]
    print(f"Device Name: {dev0['name']}")
    print(f"Device UID: {dev0['uid']}")
    print(f"Status: {dev0['status']}")
    print(f"Relay State: {dev0['relay_state']}")
    print(f"Supply: {dev0['power_source']}, Sensor: {dev0['sensor']}")
    assert dev0['uid'] == "ESP32-PZEM-PLUG-10A"
    print(">>> CONFIRMED: Only the current ESP32 Smart Plug is present! <<<")

    # 5. Test Analytics Tab
    r_an = client.get("/api/data/analytics?period=day&email=divin@gmail.com")
    assert r_an.status_code == 200
    an_data = r_an.json()
    print(f"\n[Analytics Tab - Divin]")
    print(f"Period: {an_data['period']}")
    print(f"Total Usage: {an_data['total_usage_kwh']} kWh")
    print(f"Peak: {an_data['peak_tooltip']}")
    print(f"Top Loads: {[t['name'] + ': ' + t['kwh'] for t in an_data['top_appliances']]}")

    # 6. Test In-App Notification Creation
    r_notif = client.post("/api/data/alerts", json={
        "user_email": "divin@gmail.com",
        "title": "Device Added on Phone",
        "message": "PowerSense ESP32 Smart Plug provisioned successfully via Bluetooth.",
        "notification_type": "success"
    })
    assert r_notif.status_code == 200
    print(f"\n[In-App Notification Test]: {r_notif.json()}")

    # 7. Test Alerts Tab
    r_alerts = client.get("/api/data/alerts?email=divin@gmail.com")
    assert r_alerts.status_code == 200
    al_data = r_alerts.json()
    print(f"\n[Alerts Tab - Divin]")
    print(f"Alerts Count: {len(al_data['alerts'])}, Unread: {al_data['unread_count']}")
    print(f"Latest Alert: {al_data['alerts'][0]['title']} - {al_data['alerts'][0]['description']}")

    # 8. Test ESP32 Relay Toggle
    r_relay = client.post("/api/esp32/relay", json={
        "device_id": "ESP32-PZEM-PLUG-10A",
        "state": "ON",
        "channel": "CH1"
    })
    assert r_relay.status_code == 200
    print(f"\n[ESP32 Relay Command]: {r_relay.json()}")

    # 9. Test ESP32 Telemetry Ingestion (Permanent PostgreSQL write)
    r_telem = client.post("/api/esp32/telemetry", json={
        "device_id": "ESP32-PZEM-PLUG-10A",
        "name": "PowerSense Smart Plug",
        "voltage": 232.5,
        "current": 1.45,
        "power": 337.1,
        "energy": 1.465,
        "frequency": 50.0,
        "power_factor": 0.99,
        "relay_state": "ON",
        "relay1_state": "ON",
        "relay2_state": "OFF",
        "power_source": "HLK-PM01 5V AC-DC",
        "rssi": -55,
        "ip_address": "192.168.1.100",
        "mac_address": "24:6F:28:B4:9A:12"
    })
    assert r_telem.status_code == 200
    print(f"\n[ESP32 Telemetry Ingestion]: {r_telem.json()}")

    # 10. Test Low Voltage Brownout Detection (< 205V)
    # Reset debounce timer for testing
    from services.telemetry_storage import TelemetryStorageManager
    TelemetryStorageManager._last_undervoltage_alert["ESP32-PZEM-PLUG-10A"] = 0

    r_low_v = client.post("/api/esp32/telemetry", json={
        "device_id": "ESP32-PZEM-PLUG-10A",
        "name": "PowerSense Smart Plug",
        "voltage": 194.2,  # < 205V triggers Low Voltage Warning
        "current": 1.12,
        "power": 217.5,
        "energy": 1.470,
        "frequency": 49.8,
        "power_factor": 0.96,
        "relay_state": "ON",
        "relay1_state": "ON",
        "relay2_state": "OFF"
    })
    assert r_low_v.status_code == 200
    print(f"\n[Low Voltage Telemetry Ingestion (194.2V)]: {r_low_v.json()}")

    # Check that alert was registered
    r_alerts_after = client.get("/api/data/alerts?email=divin@gmail.com")
    alerts_after = r_alerts_after.json().get("alerts", [])
    has_low_v_alert = any("Low Voltage" in a["title"] or "Low Voltage" in a["description"] for a in alerts_after)
    print(f"[Low Voltage Alert Verified in Database]: {has_low_v_alert}")
    assert has_low_v_alert, "Low Voltage alert should be recorded in database!"

    print("\n" + "=" * 60)
    print("ALL API ENDPOINT TESTS (INCLUDING LOW VOLTAGE ALERTS) PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    test_endpoints()
