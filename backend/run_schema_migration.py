import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal
from sqlalchemy import text

def run_migration():
    print("Running migration on database...")
    with engine.connect() as conn:
        # 1. Update tbl_device columns
        device_cols = [
            ("relay_state", "VARCHAR(20) DEFAULT 'ON'"),
            ("relay1_state", "VARCHAR(20) DEFAULT 'ON'"),
            ("relay2_state", "VARCHAR(20) DEFAULT 'OFF'"),
            ("voltage", "NUMERIC(8, 2) DEFAULT 230.0"),
            ("current", "NUMERIC(8, 2) DEFAULT 0.0"),
            ("power", "NUMERIC(10, 2) DEFAULT 0.0"),
            ("energy", "NUMERIC(12, 3) DEFAULT 0.0"),
            ("frequency", "NUMERIC(6, 2) DEFAULT 50.0"),
            ("power_factor", "NUMERIC(4, 2) DEFAULT 1.0"),
            ("power_source", "VARCHAR(100) DEFAULT 'HLK-PM01 5V AC-DC'"),
            ("rssi", "BIGINT DEFAULT -60"),
            ("ip_address", "VARCHAR(50) DEFAULT '192.168.1.100'"),
            ("mac_address", "VARCHAR(50) DEFAULT '24:6F:28:B4:9A:12'"),
        ]
        for col_name, col_type in device_cols:
            try:
                conn.execute(text(f"ALTER TABLE tbl_device ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
            except Exception as e:
                print(f"Notice tbl_device {col_name}: {e}")

        # 2. Update tbl_user columns
        try:
            conn.execute(text("ALTER TABLE tbl_user ADD COLUMN IF NOT EXISTS energy_goal_kwh NUMERIC(10, 2) DEFAULT 100.0;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_user energy_goal_kwh: {e}")

        # 3. Update tbl_energy_reading columns
        try:
            conn.execute(text("ALTER TABLE tbl_energy_reading ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES tbl_user(user_id) ON DELETE SET NULL;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_energy_reading user_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_energy_reading ALTER COLUMN appliance_id DROP NOT NULL;"))
            conn.commit()
        except Exception as e:
            pass

        # 4. Update tbl_usage_summary columns
        try:
            conn.execute(text("ALTER TABLE tbl_usage_summary ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES tbl_user(user_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_usage_summary user_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_usage_summary ADD COLUMN IF NOT EXISTS device_id BIGINT REFERENCES tbl_device(device_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_usage_summary device_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_usage_summary ALTER COLUMN appliance_id DROP NOT NULL;"))
            conn.commit()
        except Exception as e:
            pass

        # 5. Update tbl_notification columns
        try:
            conn.execute(text("ALTER TABLE tbl_notification ADD COLUMN IF NOT EXISTS device_id BIGINT REFERENCES tbl_device(device_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_notification device_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_notification ALTER COLUMN appliance_id DROP NOT NULL;"))
            conn.commit()
        except Exception as e:
            pass

        # 6. Update tbl_anomaly columns
        try:
            conn.execute(text("ALTER TABLE tbl_anomaly ADD COLUMN IF NOT EXISTS device_id BIGINT REFERENCES tbl_device(device_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_anomaly device_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_anomaly ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES tbl_user(user_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_anomaly user_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_anomaly ALTER COLUMN appliance_id DROP NOT NULL;"))
            conn.commit()
        except Exception as e:
            pass

        # 7. Update tbl_ai_recommendation columns
        try:
            conn.execute(text("ALTER TABLE tbl_ai_recommendation ADD COLUMN IF NOT EXISTS device_id BIGINT REFERENCES tbl_device(device_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_ai_recommendation device_id: {e}")

        try:
            conn.execute(text("ALTER TABLE tbl_ai_recommendation ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES tbl_user(user_id) ON DELETE CASCADE;"))
            conn.commit()
        except Exception as e:
            print(f"Notice tbl_ai_recommendation user_id: {e}")

    print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migration()
