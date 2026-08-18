import os
import sys
from datetime import datetime, date, timedelta
from decimal import Decimal

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
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

def seed_database():
    print("[Seeder] Initializing database tables...")
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE tbl_user DROP COLUMN IF EXISTS name;"))
            conn.commit()
        except Exception:
            pass

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ─── 1. tbl_user ──────────────────────────────────────────────────────
        print("[Seeder] Seeding tbl_user...")
        admin_user = db.query(User).filter(User.email == "admin@powersense.com").first()
        if not admin_user:
            admin_user = User(
                name="System Administrator",
                email="admin@powersense.com",
                password_hash=hash_password("admin123"),
                role="admin",
                created_at=datetime.utcnow() - timedelta(days=30)
            )
            db.add(admin_user)

        demo_user = db.query(User).filter(User.email == "user@powersense.com").first()
        if not demo_user:
            demo_user = User(
                name="Demo Resident",
                email="user@powersense.com",
                password_hash=hash_password("user123"),
                role="user",
                created_at=datetime.utcnow() - timedelta(days=20)
            )
            db.add(demo_user)

        rahul_user = db.query(User).filter(User.email == "rahul@example.com").first()
        if not rahul_user:
            rahul_user = User(
                name="Rahul Sharma",
                email="rahul@example.com",
                password_hash=hash_password("pass123"),
                role="user",
                created_at=datetime.utcnow() - timedelta(days=10)
            )
            db.add(rahul_user)

        db.commit()
        db.refresh(admin_user)
        db.refresh(demo_user)
        db.refresh(rahul_user)

        target_user_id = demo_user.user_id

        # ─── 2. tbl_device (Single Smart Plug Prototype) ─────────────────────
        print("[Seeder] Seeding tbl_device (Single Prototype)...")
        devices_data = [
            {"uid": "ESP32-PZEM-PLUG-10A", "name": "PowerSense Smart Plug", "status": "ONLINE"},
        ]
        created_devices = {}
        for dev_info in devices_data:
            existing_dev = db.query(Device).filter(Device.device_uid == dev_info["uid"]).first()
            if not existing_dev:
                existing_dev = Device(
                    user_id=target_user_id,
                    device_uid=dev_info["uid"],
                    device_name=dev_info["name"],
                    status=dev_info["status"],
                    last_seen=datetime.utcnow(),
                    created_at=datetime.utcnow() - timedelta(days=15)
                )
                db.add(existing_dev)
                db.commit()
                db.refresh(existing_dev)
            else:
                existing_dev.device_name = dev_info["name"]
                existing_dev.status = dev_info["status"]
                db.commit()
            created_devices[dev_info["uid"]] = existing_dev

        primary_device = created_devices["ESP32-PZEM-PLUG-10A"]

        # ─── 3. tbl_appliance (Single Connected Load) ────────────────────────
        print("[Seeder] Seeding tbl_appliance (Single Connected Load)...")
        appliances_data = [
            {"name": "Smart Plug Load", "category": "Connected Load", "power": 1500.00, "dev": primary_device.device_id},
        ]
        created_appliances = []
        for app_info in appliances_data:
            existing_app = db.query(Appliance).filter(
                Appliance.appliance_name == app_info["name"],
                Appliance.user_id == target_user_id
            ).first()
            if not existing_app:
                existing_app = Appliance(
                    user_id=target_user_id,
                    device_id=app_info["dev"],
                    appliance_name=app_info["name"],
                    category=app_info["category"],
                    rated_power=Decimal(str(app_info["power"])),
                    created_at=datetime.utcnow() - timedelta(days=12)
                )
                db.add(existing_app)
                db.commit()
                db.refresh(existing_app)
            created_appliances.append(existing_app)

        main_appliance = created_appliances[0]

        # ─── 4. tbl_energy_reading ────────────────────────────────────────────
        print("[Seeder] Seeding tbl_energy_reading...")
        # Populate 24-hour readings for today matching the app graph
        hourly_kwh_values = [
            0.25, 0.15, 0.40, 0.20, 0.60, 0.85, 
            0.70, 1.30, 0.90, 0.50, 1.10, 0.65, 0.45
        ]
        reading_count = db.query(EnergyReading).filter(EnergyReading.device_id == primary_device.device_id).count()
        latest_reading = None
        if reading_count < 10:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            for idx, val in enumerate(hourly_kwh_values):
                recorded_time = today_start + timedelta(hours=idx * 2)
                watts = val * 1000 / 2.0  # approximate watts
                new_reading = EnergyReading(
                    device_id=primary_device.device_id,
                    appliance_id=main_appliance.appliance_id,
                    voltage=Decimal("230.20"),
                    current=Decimal("1.62"),
                    power=Decimal(str(round(watts if idx < 12 else 215.0, 2))),
                    energy=Decimal(str(val)),
                    power_factor=Decimal("0.98"),
                    frequency=Decimal("50.00"),
                    recorded_at=recorded_time
                )
                db.add(new_reading)
            db.commit()

        latest_reading = db.query(EnergyReading).filter(EnergyReading.device_id == primary_device.device_id).order_by(EnergyReading.reading_id.desc()).first()

        # ─── 5. tbl_usage_summary ─────────────────────────────────────────────
        print("[Seeder] Seeding tbl_usage_summary...")
        summary_count = db.query(UsageSummary).count()
        if summary_count == 0:
            today_date = date.today()
            summaries = [
                UsageSummary(
                    appliance_id=main_appliance.appliance_id,
                    period_type="DAY",
                    period_start=today_date,
                    period_end=today_date,
                    total_energy=Decimal("2.450"),
                    average_power=Decimal("215.00"),
                    peak_power=Decimal("1320.00")
                ),
                UsageSummary(
                    appliance_id=main_appliance.appliance_id,
                    period_type="WEEK",
                    period_start=today_date - timedelta(days=7),
                    period_end=today_date,
                    total_energy=Decimal("18.200"),
                    average_power=Decimal("220.00"),
                    peak_power=Decimal("1450.00")
                ),
                UsageSummary(
                    appliance_id=main_appliance.appliance_id,
                    period_type="MONTH",
                    period_start=today_date.replace(day=1),
                    period_end=today_date,
                    total_energy=Decimal("78.360"),
                    average_power=Decimal("210.00"),
                    peak_power=Decimal("1800.00")
                ),
            ]
            db.add_all(summaries)
            db.commit()

        # ─── 6. tbl_tariff ────────────────────────────────────────────────────
        print("[Seeder] Seeding tbl_tariff...")
        std_tariff = db.query(Tariff).filter(Tariff.tariff_name == "Domestic LT-1 Standard").first()
        if not std_tariff:
            std_tariff = Tariff(
                tariff_name="Domestic LT-1 Standard",
                rate_per_kwh=Decimal("6.50"),
                effective_from=date(2025, 1, 1),
                effective_to=date(2025, 12, 31)
            )
            db.add(std_tariff)
            db.commit()
            db.refresh(std_tariff)

        # ─── 7. tbl_bill_estimate ─────────────────────────────────────────────
        print("[Seeder] Seeding tbl_bill_estimate...")
        existing_bill = db.query(BillEstimate).filter(BillEstimate.user_id == target_user_id).first()
        if not existing_bill:
            current_month = date.today().replace(day=1)
            new_bill = BillEstimate(
                user_id=target_user_id,
                tariff_id=std_tariff.tariff_id,
                billing_month=current_month,
                total_units=Decimal("78.360"),
                estimated_amount=Decimal("623.45"),
                created_at=datetime.utcnow()
            )
            db.add(new_bill)
            db.commit()

        # ─── 8. tbl_anomaly ───────────────────────────────────────────────────
        print("[Seeder] Seeding tbl_anomaly...")
        existing_anomaly = db.query(Anomaly).first()
        anomaly_obj = None
        if not existing_anomaly:
            anomalies = [
                Anomaly(
                    appliance_id=main_appliance.appliance_id,
                    reading_id=latest_reading.reading_id if latest_reading else None,
                    anomaly_type="High Power Usage",
                    severity="critical",
                    description="Power draw reached 1,450 W (continuous high inductive load for > 45 mins).",
                    detected_at=datetime.utcnow() - timedelta(hours=2)
                ),
                Anomaly(
                    appliance_id=main_appliance.appliance_id,
                    reading_id=latest_reading.reading_id if latest_reading else None,
                    anomaly_type="Unusual Usage",
                    severity="warning",
                    description="Heavy load detected at 02:30 AM outside typical active schedule.",
                    detected_at=datetime.utcnow() - timedelta(hours=6)
                ),
            ]
            db.add_all(anomalies)
            db.commit()
            anomaly_obj = anomalies[0]
        else:
            anomaly_obj = existing_anomaly

        # ─── 9. tbl_ai_recommendation ─────────────────────────────────────────
        print("[Seeder] Seeding tbl_ai_recommendation...")
        existing_rec = db.query(AiRecommendation).first()
        if not existing_rec:
            recommendations = [
                AiRecommendation(
                    appliance_id=main_appliance.appliance_id,
                    anomaly_id=anomaly_obj.anomaly_id if anomaly_obj else None,
                    recommendation="You can save up to ₹ 245 this month by shifting your 1.5 Ton AC cooling cycle away from peak hours (18:00-22:00).",
                    source_type="RAG_PEAK_SHAVING",
                    created_at=datetime.utcnow()
                ),
                AiRecommendation(
                    appliance_id=created_appliances[1].appliance_id if len(created_appliances) > 1 else main_appliance.appliance_id,
                    anomaly_id=None,
                    recommendation="Inverter Refrigerator compressor duty cycle is nominal (22 mins on, 38 mins off). Power factor 0.98 is optimal.",
                    source_type="RAG_DIAGNOSTICS",
                    created_at=datetime.utcnow()
                ),
            ]
            db.add_all(recommendations)
            db.commit()

        # ─── 10. tbl_knowledge_document ───────────────────────────────────────
        print("[Seeder] Seeding tbl_knowledge_document...")
        existing_doc = db.query(KnowledgeDocument).first()
        if not existing_doc:
            docs = [
                KnowledgeDocument(
                    title="PZEM-004T & ESP32 Smart Plug Circuit Specs",
                    document_type="Hardware Specs",
                    appliance_category="Hardware",
                    source="PowerSense Hardware Lab",
                    file_path="The smart plug unit utilizes an ESP32 microcontroller interfaced with a PZEM-004T v3 sensor over TTL serial (GPIO 16/17). It reads Voltage (80-260V), Current (0-10A safe range), Active Power, and Energy.",
                    created_at=datetime.utcnow()
                ),
                KnowledgeDocument(
                    title="Time-of-Use (TOU) Tariff & Peak Shaving Algorithms",
                    document_type="Optimization",
                    appliance_category="Energy",
                    source="Grid Intelligence Engine",
                    file_path="Configure tariff rates in the Admin Dashboard. The system computes real-time spend from cumulative kWh sensor telemetry, alerting you when power surges or peak tariff windows occur.",
                    created_at=datetime.utcnow()
                ),
                KnowledgeDocument(
                    title="Air Conditioner Inrush Current Behavior",
                    document_type="Appliance Guide",
                    appliance_category="Air Conditioner",
                    source="Thermal HVAC Research",
                    file_path="AC compressor startup draws 3x to 5x nominal running current for 200-500ms. If sustained for > 5 seconds, an overload alert is triggered.",
                    created_at=datetime.utcnow()
                ),
            ]
            db.add_all(docs)
            db.commit()

        # ─── 11. tbl_notification ─────────────────────────────────────────────
        print("[Seeder] Seeding tbl_notification...")
        existing_notif = db.query(Notification).first()
        if not existing_notif:
            notifications = [
                Notification(
                    user_id=target_user_id,
                    appliance_id=main_appliance.appliance_id,
                    notification_type="critical",
                    message="High Power Usage: AC load exceeded 1450 W.",
                    status="UNREAD",
                    created_at=datetime.utcnow() - timedelta(minutes=15)
                ),
                Notification(
                    user_id=target_user_id,
                    appliance_id=main_appliance.appliance_id,
                    notification_type="warning",
                    message="Unusual Usage: Device active at 02:30 AM.",
                    status="UNREAD",
                    created_at=datetime.utcnow() - timedelta(hours=3)
                ),
                Notification(
                    user_id=target_user_id,
                    appliance_id=None,
                    notification_type="info",
                    message="Target Achieved: 78% of your monthly 100 kWh goal.",
                    status="READ",
                    created_at=datetime.utcnow() - timedelta(hours=12)
                ),
                Notification(
                    user_id=target_user_id,
                    appliance_id=main_appliance.appliance_id,
                    notification_type="info",
                    message="Living Room Plug turned ON automatically via Schedule.",
                    status="READ",
                    created_at=datetime.utcnow() - timedelta(days=1)
                ),
            ]
            db.add_all(notifications)
            db.commit()

        print("[Seeder] Successfully seeded all 11 database tables!")
    except Exception as e:
        print(f"[Seeder Error] Failed to seed database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
