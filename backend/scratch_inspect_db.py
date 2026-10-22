import sys
import os
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.getcwd())
from database import engine, SessionLocal
from sqlalchemy import text, inspect

inspector = inspect(engine)
tables = inspector.get_table_names()
print("Connected to:", engine.url)
print("Tables in DB:", tables)
print("=" * 60)
with engine.connect() as conn:
    for t in sorted(tables):
        count = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
        print(f"\n--- TABLE: {t} ({count} rows) ---")
        if count > 0 and count <= 15:
            rows = conn.execute(text(f"SELECT * FROM {t} LIMIT 15")).fetchall()
            for r in rows:
                print(r)
        elif count > 15:
            rows = conn.execute(text(f"SELECT * FROM {t} ORDER BY 1 DESC LIMIT 3")).fetchall()
            print(f"Latest 3 rows:")
            for r in rows:
                print(r)
