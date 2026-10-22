import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
import models
from populate_all_required_data import seed_all_required_data

def seed_database():
    print("[Database] Verifying database tables and seeding all required data...")
    Base.metadata.create_all(bind=engine)
    seed_all_required_data()

if __name__ == "__main__":
    seed_database()
