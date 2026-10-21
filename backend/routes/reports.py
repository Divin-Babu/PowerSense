from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from models import (
    User,
    Device,
    Appliance,
    EnergyReading,
    UsageSummary,
    Tariff,
    BillEstimate,
    Anomaly,
    AiRecommendation
)
from services.pdf_generator import pdf_report_generator

router = APIRouter()

@router.get("/usage/pdf")
def generate_pdf_usage_report(
    period: str = Query("day", description="Period type: 'day', 'week', 'month', 'year'"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    include_anomalies: bool = Query(True, description="Include flagged anomalies"),
    include_ai: bool = Query(True, description="Include AI energy-saving recommendations"),
    db: Session = Depends(get_db)
):
    """
    Generates and streams a PDF Usage Report for PowerSense AI.
    """
    try:
        # 1. Fetch Primary User & Device
        user = db.query(User).filter(User.role == "user").first() or db.query(User).first()
        user_info = {
            "name": user.name if user and user.name else "Demo Resident",
            "email": user.email if user and user.email else "user@powersense.com",
            "role": user.role if user else "user"
        }

        device = db.query(Device).first()
        device_name = device.device_uid if device else "ESP32-PZEM-PLUG-10A"

        # 2. Determine Filter Date Range
        now = datetime.utcnow()
        if period == "day":
            period_label = "Today (24 Hours)"
            since_time = now - timedelta(days=1)
        elif period == "week":
            period_label = "Past 7 Days"
            since_time = now - timedelta(days=7)
        elif period == "month":
            period_label = "Current Month"
            since_time = now - timedelta(days=30)
        elif period == "year":
            period_label = "Current Year"
            since_time = now - timedelta(days=365)
        else:
            period_label = "Custom Period"
            since_time = now - timedelta(days=1)

        period_info = {
            "label": period_label,
            "period_type": period.upper(),
            "device": device_name,
        }

        # 3. Query Energy Readings
        readings_query = db.query(EnergyReading).filter(
            EnergyReading.recorded_at >= since_time
        ).order_by(desc(EnergyReading.recorded_at)).limit(30).all()

        readings_data = []
        total_power = 0.0
        total_voltage = 0.0
        total_current = 0.0
        total_pf = 0.0
        peak_watts = 0.0
        max_kwh = 0.0

        for r in readings_query:
            pwr = float(r.power) if r.power else 0.0
            vlt = float(r.voltage) if r.voltage else 230.0
            cur = float(r.current) if r.current else 0.0
            pf = float(r.power_factor) if r.power_factor else 0.98
            kwh = float(r.energy) if r.energy else 0.0

            if pwr > peak_watts:
                peak_watts = pwr
            if kwh > max_kwh:
                max_kwh = kwh

            total_power += pwr
            total_voltage += vlt
            total_current += cur
            total_pf += pf

            readings_data.append({
                "timestamp": r.recorded_at.strftime("%b %d, %H:%M") if r.recorded_at else "-",
                "power": pwr,
                "voltage": vlt,
                "current": cur,
                "power_factor": pf,
                "energy": kwh
            })

        count = len(readings_query) if readings_query else 1
        avg_voltage = total_voltage / count if count > 0 else 230.0
        avg_current = total_current / count if count > 0 else 1.62
        avg_pf = total_pf / count if count > 0 else 0.98

        # 4. Fetch Tariff & Bill Calculation
        active_tariff = db.query(Tariff).first()
        tariff_rate = float(active_tariff.rate_per_kwh) if active_tariff and active_tariff.rate_per_kwh else 6.50
        
        # Calculate summary total kWh
        summary_rec = db.query(UsageSummary).filter(UsageSummary.period_type == period.upper()).first()
        total_kwh = float(summary_rec.total_energy) if summary_rec and summary_rec.total_energy else (max_kwh if max_kwh > 0 else 4.25)
        estimated_bill = round(total_kwh * tariff_rate, 2)

        metrics_info = {
            "total_kwh": total_kwh,
            "estimated_bill": estimated_bill,
            "peak_watts": peak_watts if peak_watts > 0 else 1450.0,
            "avg_voltage": avg_voltage,
            "avg_current": avg_current,
            "avg_pf": avg_pf,
            "tariff_rate": tariff_rate
        }

        # 5. Fetch Appliances
        appliances_db = db.query(Appliance).all()
        appliances_data = []
        for app in appliances_db:
            rated_pwr = float(app.rated_power) if getattr(app, 'rated_power', None) is not None else 0.0
            appliances_data.append({
                "name": app.appliance_name,
                "category": app.category or "General",
                "power_rating": rated_pwr,
                "standby_power": 2.5,
                "daily_kwh": round(rated_pwr * 4 / 1000, 2) if rated_pwr > 0 else 0.5
            })

        # 6. Fetch Anomalies & AI Recommendations
        anomalies_data = []
        if include_anomalies:
            anoms = db.query(Anomaly).order_by(desc(Anomaly.anomaly_id)).limit(5).all()
            for a in anoms:
                anomalies_data.append({
                    "type": a.anomaly_type or "Power Spike",
                    "description": a.description or "High draw anomaly",
                    "severity": a.severity or "HIGH"
                })

        recommendations_data = []
        if include_ai:
            recs = db.query(AiRecommendation).limit(5).all()
            for rec in recs:
                rec_text = getattr(rec, 'recommendation', 'Shift non-essential loads off-peak')
                source = getattr(rec, 'source_type', 'RAG AI Engine')
                recommendations_data.append({
                    "title": f"AI Insight ({source})",
                    "description": rec_text
                })

        # 7. Generate PDF bytes
        pdf_bytes = pdf_report_generator.generate_report(
            user_info=user_info,
            period_info=period_info,
            metrics=metrics_info,
            readings=readings_data,
            appliances=appliances_data,
            anomalies=anomalies_data,
            recommendations=recommendations_data
        )

        filename = f"PowerSense_Usage_Report_{period}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )

    except Exception as e:
        print(f"[PDF Report Error] {e}")
        raise HTTPException(status_code=500, detail=f"Could not generate PDF report: {str(e)}")
