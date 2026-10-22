import time
from datetime import datetime, date, timedelta
from decimal import Decimal
import random

from database import SessionLocal
from models import (
    User,
    Device,
    Appliance,
    EnergyReading,
    UsageSummary,
    Tariff,
    BillEstimate,
    Anomaly,
    Notification
)
from services.telemetry_storage import TelemetryStorageManager

def seed_multi_user_data():
    db = SessionLocal()
    try:
        print("=== SEEDING MULTI-USER DATA FOR POWERSENSE ===")

        # 1. Ensure Tariff exists
        tariff = db.query(Tariff).first()
        if not tariff:
            tariff = Tariff(tariff_name="Domestic Standard TOU", rate_per_kwh=Decimal("6.50"))
            db.add(tariff)
            db.commit()
            db.refresh(tariff)
        rate = float(tariff.rate_per_kwh)

        # 2. Ensure Common Device exists (COMMON FOR ALL USERS)
        device = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first()
        if not device:
            device = Device(
                device_uid="ESP32-PZEM-PLUG-10A",
                device_name="PowerSense Smart Plug",
                status="ONLINE",
                relay_state="ON",
                relay1_state="ON",
                relay2_state="OFF",
                voltage=Decimal("244.20"),
                current=Decimal("0.18"),
                power=Decimal("22.50"),
                energy=Decimal("0.098"),
                frequency=Decimal("50.00"),
                power_factor=Decimal("0.96"),
                power_source="HLK-PM01 5V AC-DC",
                rssi=-54,
                ip_address="192.168.1.100",
                mac_address="24:6F:28:B4:9A:12",
                last_seen=datetime.utcnow()
            )
            db.add(device)
            db.commit()
            db.refresh(device)
        print(f"[Device] Common shared device: {device.device_name} (ID: {device.device_id}, UID: {device.device_uid})")

        # 3. Define User Profiles with Distinct Profiles
        user_profiles = [
            {
                "email": "divin@gmail.com",
                "name": "Divin Babu",
                "appliance_name": "Living Room Smart Plug",
                "category": "Home Entertainment",
                "goal_kwh": 100.0,
                "today_kwh": 2.817,
                "yesterday_kwh": 4.434,
                "month_kwh": 84.50,
                "year_kwh": 971.75,
                "avg_power": 42.0,
                "peak_power": 140.0,
                "high_pct": 25,
                "normal_pct": 70,
                "standby_pct": 5
            },
            {
                "email": "divinbabu1188@gmail.com",
                "name": "Divin",
                "appliance_name": "Master Bedroom Smart Plug",
                "category": "AC & Lighting",
                "goal_kwh": 80.0,
                "today_kwh": 2.660,
                "yesterday_kwh": 3.150,
                "month_kwh": 79.80,
                "year_kwh": 917.70,
                "avg_power": 38.0,
                "peak_power": 115.0,
                "high_pct": 20,
                "normal_pct": 75,
                "standby_pct": 5
            },
            {
                "email": "luke@gmail.com",
                "name": "Luke",
                "appliance_name": "Smart Study Desk Setup",
                "category": "Study & Computing",
                "goal_kwh": 50.0,
                "today_kwh": 0.953,
                "yesterday_kwh": 1.105,
                "month_kwh": 28.60,
                "year_kwh": 343.20,
                "avg_power": 18.5,
                "peak_power": 52.0,
                "high_pct": 8,
                "normal_pct": 82,
                "standby_pct": 10
            },
            {
                "email": "amal@gmail.com",
                "name": "Amal Babu",
                "appliance_name": "Kitchen Refrigerator Plug",
                "category": "Kitchen Appliance",
                "goal_kwh": 75.0,
                "today_kwh": 1.425,
                "yesterday_kwh": 1.850,
                "month_kwh": 45.20,
                "year_kwh": 542.40,
                "avg_power": 28.0,
                "peak_power": 88.0,
                "high_pct": 15,
                "normal_pct": 80,
                "standby_pct": 5
            },
            {
                "email": "rahul@example.com",
                "name": "Rahul Sharma",
                "appliance_name": "Workstation Rig & Monitors",
                "category": "High Performance PC",
                "goal_kwh": 120.0,
                "today_kwh": 3.450,
                "yesterday_kwh": 3.800,
                "month_kwh": 95.00,
                "year_kwh": 1140.00,
                "avg_power": 55.0,
                "peak_power": 220.0,
                "high_pct": 35,
                "normal_pct": 60,
                "standby_pct": 5
            },
            {
                "email": "user@powersense.com",
                "name": "Demo Resident",
                "appliance_name": "Home Office Smart Hub",
                "category": "Office Equipment",
                "goal_kwh": 60.0,
                "today_kwh": 1.750,
                "yesterday_kwh": 2.100,
                "month_kwh": 55.00,
                "year_kwh": 660.00,
                "avg_power": 26.0,
                "peak_power": 92.0,
                "high_pct": 14,
                "normal_pct": 80,
                "standby_pct": 6
            }
        ]

        now = datetime.now()
        today_date = date.today()

        for prof in user_profiles:
            # 1. Find or create user
            user = db.query(User).filter(User.email == prof["email"]).first()
            if not user:
                from utils.auth import hash_password
                user = User(
                    full_name=prof["name"],
                    email=prof["email"],
                    password_hash=hash_password("password123"),
                    role="user",
                    energy_goal_kwh=Decimal(str(prof["goal_kwh"]))
                )
                db.add(user)
                db.commit()
                db.refresh(user)
            else:
                user.energy_goal_kwh = Decimal(str(prof["goal_kwh"]))
                db.commit()

            u_id = user.user_id
            print(f"\n---> Populating distinct data for User {u_id} ({user.email})...")

            # 2. Update/Create User Appliance
            appliance = db.query(Appliance).filter(Appliance.user_id == u_id).first()
            if not appliance:
                appliance = Appliance(
                    user_id=u_id,
                    device_id=device.device_id,
                    appliance_name=prof["appliance_name"],
                    category=prof["category"],
                    rated_power=prof["peak_power"]
                )
                db.add(appliance)
                db.commit()
                db.refresh(appliance)
            else:
                appliance.appliance_name = prof["appliance_name"]
                appliance.category = prof["category"]
                appliance.rated_power = prof["peak_power"]
                db.commit()

            # 3. Clean old readings for this user to ensure pristine distinct dataset
            db.query(EnergyReading).filter(EnergyReading.user_id == u_id).delete()
            db.commit()

            # 4. Generate Realistic Energy Readings:
            # (A) Today (Offset 0): 8 snapshots distributed through today
            today_kwh = prof["today_kwh"]
            hours_today = [0, 3, 6, 9, 12, 14, 18, 21]
            cum_energy = 0.0
            for idx, h in enumerate(hours_today):
                ts = datetime.combine(today_date, datetime.min.time()) + timedelta(hours=h, minutes=15)
                if ts > now:
                    continue
                step_frac = (idx + 1) / len(hours_today)
                cum_energy = round(today_kwh * step_frac, 3)
                
                # Vary power by time of day
                if h in [9, 14]:
                    power = round(prof["avg_power"] * 1.4, 1)
                elif h in [18, 21]:
                    power = round(prof["peak_power"] * 0.9, 1)
                elif h in [0, 3]:
                    power = round(max(3.5, prof["avg_power"] * 0.2), 1)
                else:
                    power = round(prof["avg_power"], 1)

                voltage = round(random.uniform(235.0, 246.0), 1)
                current = round(power / voltage, 2)
                pf = round(random.uniform(0.92, 0.99), 2)

                r = EnergyReading(
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    user_id=u_id,
                    voltage=Decimal(str(voltage)),
                    current=Decimal(str(current)),
                    power=Decimal(str(power)),
                    energy=Decimal(str(cum_energy)),
                    power_factor=Decimal(str(pf)),
                    frequency=Decimal("50.00"),
                    recorded_at=ts
                )
                db.add(r)

            # (B) Yesterday (Offset 1): 8 snapshots for yesterday
            yest_date = today_date - timedelta(days=1)
            yest_kwh = prof["yesterday_kwh"]
            for idx, h in enumerate(hours_today):
                ts = datetime.combine(yest_date, datetime.min.time()) + timedelta(hours=h, minutes=10)
                step_frac = (idx + 1) / len(hours_today)
                cum_e = round(yest_kwh * step_frac, 3)
                power = round(prof["avg_power"] * random.uniform(0.8, 1.3), 1)
                voltage = round(random.uniform(234.0, 245.0), 1)
                current = round(power / voltage, 2)

                r = EnergyReading(
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    user_id=u_id,
                    voltage=Decimal(str(voltage)),
                    current=Decimal(str(current)),
                    power=Decimal(str(power)),
                    energy=Decimal(str(cum_e)),
                    power_factor=Decimal("0.96"),
                    frequency=Decimal("50.00"),
                    recorded_at=ts
                )
                db.add(r)

            # (C) 2 Days Ago (Offset 2):
            prev_date = today_date - timedelta(days=2)
            for idx, h in enumerate([8, 13, 19]):
                ts = datetime.combine(prev_date, datetime.min.time()) + timedelta(hours=h)
                cum_e = round((yest_kwh * 0.9) * ((idx + 1) / 3), 3)
                r = EnergyReading(
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    user_id=u_id,
                    voltage=Decimal("238.50"),
                    current=Decimal("0.20"),
                    power=Decimal(str(prof["avg_power"])),
                    energy=Decimal(str(cum_e)),
                    power_factor=Decimal("0.95"),
                    frequency=Decimal("50.00"),
                    recorded_at=ts
                )
                db.add(r)

            # (D) 3 to 6 Days Ago (to populate Week):
            for d_back in [3, 4, 5, 6]:
                d_date = today_date - timedelta(days=d_back)
                daily_e = round(prof["today_kwh"] * random.uniform(0.85, 1.15), 3)
                r = EnergyReading(
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    user_id=u_id,
                    voltage=Decimal("240.00"),
                    current=Decimal("0.18"),
                    power=Decimal(str(prof["avg_power"])),
                    energy=Decimal(str(daily_e)),
                    power_factor=Decimal("0.97"),
                    frequency=Decimal("50.00"),
                    recorded_at=datetime.combine(d_date, datetime.min.time()) + timedelta(hours=20)
                )
                db.add(r)

            db.commit()

            # 5. Populate tbl_usage_summary for DAY, WEEK, MONTH, YEAR
            db.query(UsageSummary).filter(UsageSummary.user_id == u_id).delete()
            db.commit()

            summaries = [
                UsageSummary(
                    user_id=u_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="DAY",
                    period_start=datetime.combine(today_date, datetime.min.time()),
                    period_end=datetime.combine(today_date, datetime.max.time()),
                    total_energy=Decimal(str(prof["today_kwh"])),
                    average_power=Decimal(str(prof["avg_power"])),
                    peak_power=Decimal(str(prof["peak_power"]))
                ),
                UsageSummary(
                    user_id=u_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="WEEK",
                    period_start=now - timedelta(days=7),
                    period_end=now,
                    total_energy=Decimal(str(round(prof["today_kwh"] * 7, 3))),
                    average_power=Decimal(str(prof["avg_power"])),
                    peak_power=Decimal(str(prof["peak_power"]))
                ),
                UsageSummary(
                    user_id=u_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="MONTH",
                    period_start=datetime(today_date.year, today_date.month, 1),
                    period_end=now,
                    total_energy=Decimal(str(prof["month_kwh"])),
                    average_power=Decimal(str(prof["avg_power"])),
                    peak_power=Decimal(str(prof["peak_power"]))
                ),
                UsageSummary(
                    user_id=u_id,
                    device_id=device.device_id,
                    appliance_id=appliance.appliance_id,
                    period_type="YEAR",
                    period_start=datetime(today_date.year, 1, 1),
                    period_end=now,
                    total_energy=Decimal(str(prof["year_kwh"])),
                    average_power=Decimal(str(prof["avg_power"])),
                    peak_power=Decimal(str(prof["peak_power"]))
                )
            ]
            db.add_all(summaries)
            db.commit()

            # 6. Populate tbl_bill_estimate
            db.query(BillEstimate).filter(BillEstimate.user_id == u_id).delete()
            db.commit()
            est_amt = round(prof["month_kwh"] * rate, 2)
            bill = BillEstimate(
                user_id=u_id,
                tariff_id=tariff.tariff_id,
                billing_month=date(today_date.year, today_date.month, 1),
                total_units=Decimal(str(prof["month_kwh"])),
                estimated_amount=Decimal(str(est_amt))
            )
            db.add(bill)
            db.commit()

            # 7. Populate tbl_anomaly & tbl_notification
            db.query(Anomaly).filter(Anomaly.user_id == u_id).delete()
            db.query(Notification).filter(Notification.user_id == u_id).delete()
            db.commit()

            anom = Anomaly(
                device_id=device.device_id,
                user_id=u_id,
                appliance_id=appliance.appliance_id,
                anomaly_type="Peak Load Surge",
                severity="warning" if prof["peak_power"] < 150 else "critical",
                description=f"{prof['appliance_name']} recorded maximum draw of {prof['peak_power']}W.",
                detected_at=now - timedelta(hours=random.randint(2, 12))
            )
            db.add(anom)

            notif = Notification(
                user_id=u_id,
                device_id=device.device_id,
                appliance_id=appliance.appliance_id,
                notification_type="info",
                message=f"Energy status optimal for {prof['name']}. Current month estimate: ₹{est_amt:.2f}.",
                status="UNREAD",
                created_at=datetime.utcnow()
            )
            db.add(notif)
            db.commit()

            print(f"   [Done] User {u_id}: Today={prof['today_kwh']} kWh, Yest={prof['yesterday_kwh']} kWh, Month={prof['month_kwh']} kWh, Bill=Rs.{est_amt}")

        print("\nAll users successfully seeded with distinct datasets!")
        print("Device table remains common for all users.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_multi_user_data()
