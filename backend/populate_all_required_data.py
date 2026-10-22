import sys
import os
import io
from datetime import datetime, date, timedelta
from decimal import Decimal

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from models import (
    User,
    Device,
    Appliance,
    EnergyReading,
    UsageSummary,
    Tariff,
    BillEstimate,
    Anomaly,
    AiRecommendation,
    KnowledgeDocument,
    Notification
)
from utils.auth import hash_password

def seed_all_required_data():
    print("=" * 60)
    print("Populating all required data into database tables...")
    print("=" * 60)
    db = SessionLocal()

    try:
        # ─── 1. Users Setup ───────────────────────────────────────────────────
        users_config = [
            {"email": "admin@powersense.com", "name": "System Administrator", "role": "admin", "goal": 200.0, "phone": "+91 98765 00000"},
            {"email": "divin@gmail.com", "name": "Divin Babu", "role": "user", "goal": 100.0, "phone": "+91 87145 61144"},
            {"email": "luke@gmail.com", "name": "Luke", "role": "user", "goal": 50.0, "phone": "+91 96325 87895"},
            {"email": "amal@gmail.com", "name": "Amal Babu", "role": "user", "goal": 75.0, "phone": "+91 87456 32146"},
            {"email": "user@powersense.com", "name": "Demo Resident", "role": "user", "goal": 80.0, "phone": "+91 98765 11111"},
            {"email": "rahul@example.com", "name": "Rahul Sharma", "role": "user", "goal": 120.0, "phone": "+91 98765 43210"},
            {"email": "pattikan@gmail.com", "name": "Divvv", "role": "user", "goal": 90.0, "phone": "+91 99999 99998"},
            {"email": "divinbabu1188@gmail.com", "name": "Divin", "role": "user", "goal": 100.0, "phone": "+91 78965 41236"},
        ]

        user_map = {}
        for u in users_config:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                existing = User(
                    full_name=u["name"],
                    email=u["email"],
                    phone=u["phone"],
                    password_hash=hash_password("admin123" if u["role"] == "admin" else "user123"),
                    role=u["role"],
                    energy_goal_kwh=Decimal(str(u["goal"])),
                    created_at=datetime.utcnow() - timedelta(days=60)
                )
                db.add(existing)
                db.commit()
                db.refresh(existing)
            else:
                existing.full_name = u["name"]
                if u["phone"] and not existing.phone:
                    existing.phone = u["phone"]
                existing.energy_goal_kwh = Decimal(str(u["goal"]))
                db.commit()
            user_map[u["email"]] = existing

        # Fetch all existing users in the db to ensure everyone is covered
        all_db_users = db.query(User).all()
        for du in all_db_users:
            if du.email not in user_map:
                user_map[du.email] = du

        print(f"Users ready: {len(all_db_users)} registered users.")

        # ─── 2. Single ESP32 Device Setup ─────────────────────────────────────
        print("Setting up single ESP32 Smart Plug device...")
        dev_uid = "ESP32-PZEM-PLUG-10A"
        device = db.query(Device).filter(Device.device_uid == dev_uid).first()
        if not device:
            device = Device(
                device_uid=dev_uid,
                device_name="PowerSense Smart Plug",
                status="ONLINE",
                relay_state="ON",
                relay1_state="ON",
                relay2_state="OFF",
                voltage=Decimal("230.40"),
                current=Decimal("1.25"),
                power=Decimal("288.00"),
                energy=Decimal("1.450"),
                frequency=Decimal("50.00"),
                power_factor=Decimal("0.98"),
                power_source="HLK-PM01 5V AC-DC",
                rssi=-58,
                ip_address="192.168.1.100",
                mac_address="24:6F:28:B4:9A:12",
                last_seen=datetime.utcnow(),
                created_at=datetime.utcnow() - timedelta(days=90)
            )
            db.add(device)
            db.commit()
            db.refresh(device)
        else:
            device.device_name = "PowerSense Smart Plug"
            device.status = "ONLINE"
            device.relay_state = "ON"
            device.relay1_state = "ON"
            device.relay2_state = "OFF"
            device.voltage = Decimal("230.40")
            device.current = Decimal("1.25")
            device.power = Decimal("288.00")
            device.energy = Decimal("1.450")
            device.frequency = Decimal("50.00")
            device.power_factor = Decimal("0.98")
            device.power_source = "HLK-PM01 5V AC-DC"
            device.rssi = -58
            device.ip_address = "192.168.1.100"
            device.mac_address = "24:6F:28:B4:9A:12"
            device.last_seen = datetime.utcnow()
            db.commit()

        # Delete any accidental duplicate / mock devices so ONLY the ESP32 is present
        db.query(Device).filter(Device.device_uid != dev_uid).delete(synchronize_session=False)
        db.commit()
        print(f"Device ready: ID {device.device_id} ({device.device_uid} - {device.device_name})")

        # ─── 3. Single Connected Load (Appliance Table Support) ────────────────
        appliance = db.query(Appliance).filter(Appliance.device_id == device.device_id).first()
        if not appliance:
            appliance = Appliance(
                device_id=device.device_id,
                appliance_name="Smart Plug AC Load",
                category="Connected Load",
                rated_power=Decimal("1500.00"),
                created_at=datetime.utcnow() - timedelta(days=90)
            )
            db.add(appliance)
            db.commit()
            db.refresh(appliance)
        else:
            appliance.appliance_name = "Smart Plug AC Load"
            appliance.category = "Connected Load"
            appliance.rated_power = Decimal("1500.00")
            db.commit()

        # Clean up any extraneous appliances
        db.query(Appliance).filter(Appliance.appliance_id != appliance.appliance_id).delete(synchronize_session=False)
        db.commit()

        # ─── 4. Tariffs ───────────────────────────────────────────────────────
        tariffs_data = [
            {"id": 1, "name": "Domestic LT-1 Standard", "rate": Decimal("6.50")},
            {"id": 2, "name": "Peak Time-of-Use (6 PM - 10 PM)", "rate": Decimal("9.80")},
            {"id": 3, "name": "Off-Peak Incentive (10 PM - 6 AM)", "rate": Decimal("4.20")},
            {"id": 4, "name": "Commercial LT-2 Standard", "rate": Decimal("8.75")},
        ]
        for t in tariffs_data:
            existing_t = db.query(Tariff).filter(Tariff.tariff_id == t["id"]).first()
            if not existing_t:
                new_t = Tariff(
                    tariff_id=t["id"],
                    tariff_name=t["name"],
                    rate_per_kwh=t["rate"],
                    effective_from=date(2025, 1, 1),
                    effective_to=date(2027, 12, 31)
                )
                db.add(new_t)
            else:
                existing_t.tariff_name = t["name"]
                existing_t.rate_per_kwh = t["rate"]
        db.commit()
        print("Tariff schedules populated.")

        # ─── 5. User-Specific Bill Estimates ──────────────────────────────────
        # Provide realistic distinct unit consumption & bills for each user
        user_usage_profiles = {
            "admin@powersense.com": {"units": 142.0, "bill": 923.00},
            "divin@gmail.com": {"units": 84.5, "bill": 549.25},
            "luke@gmail.com": {"units": 28.6, "bill": 185.90},
            "amal@gmail.com": {"units": 45.2, "bill": 293.80},
            "user@powersense.com": {"units": 62.3, "bill": 404.95},
            "rahul@example.com": {"units": 68.4, "bill": 444.60},
            "pattikan@gmail.com": {"units": 54.1, "bill": 351.65},
            "divinbabu1188@gmail.com": {"units": 79.8, "bill": 518.70},
        }

        # Clear existing bills to reset cleanly
        db.query(BillEstimate).delete()
        db.commit()

        current_month_date = date.today().replace(day=1)

        for u in all_db_users:
            profile = user_usage_profiles.get(u.email, {
                "units": round(30.0 + (u.user_id * 7.5) % 80, 1),
                "bill": round((30.0 + (u.user_id * 7.5) % 80) * 6.50, 2)
            })
            b = BillEstimate(
                user_id=u.user_id,
                tariff_id=1,
                billing_month=current_month_date,
                total_units=Decimal(str(profile["units"])),
                estimated_amount=Decimal(str(profile["bill"])),
                created_at=datetime.utcnow()
            )
            db.add(b)
        db.commit()
        print("User-specific bill estimates populated.")

        # ─── 6. User-Specific Usage Summaries (DAY, WEEK, MONTH, YEAR) ────────
        db.query(UsageSummary).delete()
        db.commit()

        for u in all_db_users:
            profile = user_usage_profiles.get(u.email, {
                "units": round(30.0 + (u.user_id * 7.5) % 80, 1),
                "bill": round((30.0 + (u.user_id * 7.5) % 80) * 6.50, 2)
            })
            m_kwh = float(profile["units"])
            d_kwh = round(m_kwh / 30.0 * (0.8 + (u.user_id % 5) * 0.1), 3)
            w_kwh = round(d_kwh * 7.0, 3)
            y_kwh = round(m_kwh * 11.5, 3)

            summaries = [
                UsageSummary(
                    user_id=u.user_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="DAY",
                    period_start=date.today(),
                    period_end=date.today(),
                    total_energy=Decimal(str(d_kwh)),
                    average_power=Decimal(str(round(d_kwh * 1000 / 12, 1))),
                    peak_power=Decimal(str(round(450.0 + (u.user_id * 40) % 800, 1)))
                ),
                UsageSummary(
                    user_id=u.user_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="WEEK",
                    period_start=date.today() - timedelta(days=7),
                    period_end=date.today(),
                    total_energy=Decimal(str(w_kwh)),
                    average_power=Decimal(str(round(w_kwh * 1000 / 84, 1))),
                    peak_power=Decimal(str(round(650.0 + (u.user_id * 50) % 800, 1)))
                ),
                UsageSummary(
                    user_id=u.user_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="MONTH",
                    period_start=current_month_date,
                    period_end=date.today(),
                    total_energy=Decimal(str(m_kwh)),
                    average_power=Decimal(str(round(m_kwh * 1000 / 360, 1))),
                    peak_power=Decimal(str(round(850.0 + (u.user_id * 60) % 650, 1)))
                ),
                UsageSummary(
                    user_id=u.user_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="YEAR",
                    period_start=date(date.today().year, 1, 1),
                    period_end=date.today(),
                    total_energy=Decimal(str(y_kwh)),
                    average_power=Decimal(str(round(y_kwh * 1000 / 4000, 1))),
                    peak_power=Decimal(str(round(1200.0 + (u.user_id * 30) % 290, 1)))
                ),
            ]
            for s in summaries:
                db.add(s)
        db.commit()
        print("Usage summaries (DAY/WEEK/MONTH/YEAR) populated.")

        # ─── 7. Notifications (User and Hardware Events) ──────────────────────
        db.query(Notification).delete()
        db.commit()

        # Shared hardware events
        shared_notifs = [
            {"type": "success", "msg": "Smart Plug Online: ESP32-PZEM-PLUG-10A active on local network."},
            {"type": "info", "msg": "Safety Monitoring Active: Surge limit set to 1450W (10A rating)."},
            {"type": "info", "msg": "Tariff Rate Active: Standard Domestic LT-1 applied at ₹6.50/kWh."},
            {"type": "info", "msg": "Relay Switched: Smart Plug relay turned ON (CH1 Active)."},
            {"type": "warning", "msg": "Unusual Usage: Heavy load detected at 02:30 AM outside typical active schedule."},
            {"type": "critical", "msg": "High Power Usage: Power draw reached 1,450 W (continuous high inductive load for > 45 mins)."},
        ]

        now = datetime.utcnow()
        for idx, sn in enumerate(shared_notifs):
            db.add(Notification(
                user_id=None,
                device_id=device.device_id,
                appliance_id=appliance.appliance_id,
                notification_type=sn["type"],
                message=sn["msg"],
                status="UNREAD" if idx < 3 else "READ",
                created_at=now - timedelta(minutes=(idx + 1) * 35)
            ))

        # User-specific notifications
        for u in all_db_users:
            goal_kwh = float(u.energy_goal_kwh or 100.0)
            u_name = u.full_name or "Resident"
            db.add(Notification(
                user_id=u.user_id,
                device_id=device.device_id,
                appliance_id=appliance.appliance_id,
                notification_type="success",
                message=f"Welcome {u_name}: PowerSense Smart Plug linked and ready to monitor.",
                status="UNREAD",
                created_at=now - timedelta(hours=1)
            ))
            db.add(Notification(
                user_id=u.user_id,
                device_id=device.device_id,
                appliance_id=appliance.appliance_id,
                notification_type="info",
                message=f"Energy Target Active: Monthly goal is {goal_kwh:.0f} kWh. Spend tracking enabled.",
                status="UNREAD",
                created_at=now - timedelta(hours=2)
            ))
        db.commit()
        print("Notifications populated.")

        # ─── 8. Anomalies ─────────────────────────────────────────────────────
        db.query(Anomaly).delete()
        db.commit()

        db.add(Anomaly(
            device_id=device.device_id,
            appliance_id=appliance.appliance_id,
            anomaly_type="High Power Usage",
            severity="critical",
            description="Power draw reached 1,450 W (continuous high inductive load for > 45 mins).",
            detected_at=now - timedelta(hours=3)
        ))
        db.add(Anomaly(
            device_id=device.device_id,
            appliance_id=appliance.appliance_id,
            anomaly_type="Unusual Usage",
            severity="warning",
            description="Heavy load detected at 02:30 AM outside typical active schedule.",
            detected_at=now - timedelta(hours=8)
        ))
        db.add(Anomaly(
            device_id=device.device_id,
            appliance_id=appliance.appliance_id,
            anomaly_type="Standby Leak",
            severity="info",
            description="Idle electronics left plugged in draw 12W phantom power.",
            detected_at=now - timedelta(hours=14)
        ))
        db.commit()
        print("Anomalies populated.")

        # ─── 9. AI Recommendations ───────────────────────────────────────────
        db.query(AiRecommendation).delete()
        db.commit()

        recs = [
            ("Standby Power Shaving: Idle electronics left plugged in draw 2W-15W phantom power. Enable smart schedule cutoff to conserve energy.", "RAG_EFFICIENCY"),
            ("Power Factor & Line Stability: Operating at 230V nominal. Optimal power factor (>0.90) observed during active load cycles.", "RAG_POWER_QUALITY"),
            ("Peak Tariff Shift: Shifting high loads from 6 PM - 10 PM to morning hours will save up to ₹185 this month.", "RAG_TARIFF_SAVINGS"),
            ("Voltage Stability: Grid voltage has remained stable at 230.4V ± 2% throughout the day.", "RAG_GRID_HEALTH"),
        ]
        for r_text, r_src in recs:
            db.add(AiRecommendation(
                device_id=device.device_id,
                recommendation=r_text,
                source_type=r_src,
                created_at=now - timedelta(hours=5)
            ))
        db.commit()
        print("AI Recommendations populated.")

        # ─── 10. Knowledge Documents (RAG) ────────────────────────────────────
        db.query(KnowledgeDocument).delete()
        db.commit()

        docs = [
            ("PZEM-004T & ESP32 Smart Plug Circuit Specs", "Hardware Specs", "Hardware", "PowerSense Hardware Lab",
             "The smart plug unit utilizes an ESP32 microcontroller interfaced with a PZEM-004T v3 sensor over TTL serial (GPIO 16/17). It reads Voltage (80-260V), Current (0-10A safe range), Active Power, and Energy. An inline safety relay allows automated load control."),
            ("Time-of-Use (TOU) Tariff & Peak Shaving Algorithms", "Optimization", "Energy", "Grid Intelligence Engine",
             "Configure tariff rates in the Admin Dashboard. The system computes real-time spend from cumulative kWh sensor telemetry, alerting you when power surges or peak tariff windows occur."),
            ("Air Conditioner Inrush Current Behavior", "Appliance Guide", "Air Conditioner", "Thermal HVAC Research",
             "AC compressor startup draws 3x to 5x nominal running current for 200-500ms. If sustained for > 5 seconds, an overload alert is triggered."),
            ("BLE & Wi-Fi Provisioning Protocol", "Connectivity Guide", "BLE", "IoT Connectivity Team",
             "The ESP32 initiates BLE advertisement on boot. PowerSense mobile app connects over BLE GATT service to provision local Wi-Fi SSID and passkey securely."),
        ]
        for title, doc_type, app_cat, source, file_path in docs:
            db.add(KnowledgeDocument(
                title=title,
                document_type=doc_type,
                appliance_category=app_cat,
                source=source,
                file_path=file_path
            ))
        db.commit()
        print("Knowledge documents populated.")

        # ─── 11. 24-Hour Energy Readings Baseline ─────────────────────────────
        # Seed realistic 2-hourly readings for today so hourly bars have rich real values
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Keep existing real readings or add today's baseline if needed
        existing_reading_count = db.query(EnergyReading).filter(EnergyReading.recorded_at >= today_start).count()
        if existing_reading_count < 12:
            base_kwh = 0.10
            for h in range(0, 24, 2):
                hour_dt = today_start + timedelta(hours=h, minutes=15)
                if hour_dt > datetime.utcnow():
                    break
                # Typical load curve: morning peak (8-10), afternoon dip, evening peak (18-22)
                if 8 <= h <= 10:
                    w = 680.0
                    i = 2.95
                    delta_kwh = 0.35
                elif 18 <= h <= 22:
                    w = 890.0
                    i = 3.86
                    delta_kwh = 0.45
                elif 0 <= h <= 6:
                    w = 25.0
                    i = 0.11
                    delta_kwh = 0.04
                else:
                    w = 240.0
                    i = 1.04
                    delta_kwh = 0.18

                base_kwh += delta_kwh

                db.add(EnergyReading(
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    voltage=Decimal("230.40"),
                    current=Decimal(str(i)),
                    power=Decimal(str(w)),
                    energy=Decimal(str(round(base_kwh, 3))),
                    power_factor=Decimal("0.96"),
                    frequency=Decimal("50.00"),
                    recorded_at=hour_dt
                ))
            db.commit()
            print("24-Hour energy readings populated.")

    finally:
        db.close()

    print("=" * 60)
    print("ALL TABLES POPULATED SUCCESSFULLY WITH REAL PROJECT DATA!")
    print("=" * 60)

if __name__ == "__main__":
    seed_all_required_data()
