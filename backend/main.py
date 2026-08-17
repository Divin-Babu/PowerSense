import sys
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

# Add backend directory to sys.path for clean module imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base
import models  # Registers all 11 models in Base.metadata
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.telemetry import router as telemetry_router
from routes.data import router as data_router
from seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic: create/verify all 11 tables and seed if necessary
    try:
        seed_database()
        print("[Database] Successfully verified and initialized all 11 database tables.")
    except Exception as e:
        print(f"[Database Warning] Could not auto-seed tables: {e}")
    yield

app = FastAPI(
    title="PowerSense AI Backend API",
    description="FastAPI Backend for Intelligent IoT Smart Plug Energy Monitoring System",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local development (Vite web app, Expo React Native, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(telemetry_router, prefix="/api", tags=["ESP32 Telemetry"])
app.include_router(data_router, prefix="/api/data", tags=["Database Data"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "PowerSense AI Smart Plug API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    db_status = "healthy"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM tbl_user LIMIT 1"))
    except Exception as e:
        db_status = f"notice: {str(e)}"

    return {
        "status": "ok",
        "database": db_status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)