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

from routes.data import get_ist_now, resolve_target_user, IST

router = APIRouter()

@router.get("/usage/pdf")
def generate_pdf_usage_report(
    period: str = Query("day", description="Period type: 'day', 'week', 'month', 'year'"),
    email: Optional[str] = Query(None, description="User email for personalized report"),
    offset: int = Query(0, ge=0, description="Period offset (0=current, 1=previous)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    include_anomalies: bool = Query(True, description="Include flagged anomalies"),
    include_ai: bool = Query(True, description="Include AI energy-saving recommendations"),
    db: Session = Depends(get_db)
):
    """
    Generates and streams a personalized PDF Usage Report for PowerSense AI based on actual database records.
    """
    try:
        # 1. Fetch Target User & Device
        user = resolve_target_user(db, email)
        u_id = user.user_id if user else 1
        user_info = {
            "name": user.full_name or user.name if user and (user.full_name or user.name) else "Resident",
            "email": user.email if user and user.email else "user@powersense.ai",
            "role": user.role if user else "user"
        }

        device = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first() or db.query(Device).first()
        device_name = device.device_name if device and device.device_name else "ESP32 Smart Plug"

        # 2. Determine Filter Date Range in Indian Standard Time (IST)
        now_ist = get_ist_now()
        now = now_ist.replace(tzinfo=None)
        today_date = now_ist.date()

        if period == "day":
            target_day = today_date - timedelta(days=offset)
            if offset == 0:
                period_label = f"Today ({target_day.strftime('%d %b %Y')})"
                period_start = datetime.combine(target_day, datetime.min.time())
                period_end = now
            elif offset == 1:
                period_label = f"Yesterday ({target_day.strftime('%d %b %Y')})"
                period_start = datetime.combine(target_day, datetime.min.time())
                period_end = datetime.combine(target_day, datetime.max.time())
            else:
                period_label = target_day.strftime("%d %b %Y")
                period_start = datetime.combine(target_day, datetime.min.time())
                period_end = datetime.combine(target_day, datetime.max.time())

        elif period == "week":
            week_end_dt = now - timedelta(days=7 * offset)
            week_start_dt = week_end_dt - timedelta(days=7)
            period_start = week_start_dt
            period_end = week_end_dt
            if offset == 0:
                period_label = "This Week"
            elif offset == 1:
                period_label = f"Last Week ({week_start_dt.strftime('%d %b')} – {week_end_dt.strftime('%d %b')})"
            else:
                period_label = f"{week_start_dt.strftime('%d %b')} – {week_end_dt.strftime('%d %b')}"

        elif period == "month":
            tot_m = (today_date.year * 12 + today_date.month - 1) - offset
            t_year = tot_m // 12
            t_month = (tot_m % 12) + 1
            import calendar
            _, last_day = calendar.monthrange(t_year, t_month)
            period_start = datetime(t_year, t_month, 1, 0, 0, 0)
            period_end = datetime(t_year, t_month, last_day, 23, 59, 59)
            period_label = period_start.strftime("%B %Y")

        else:
            t_year = today_date.year - offset
            period_label = str(t_year)
            period_start = datetime(t_year, 1, 1, 0, 0, 0)
            period_end = datetime(t_year, 12, 31, 23, 59, 59)

        period_info = {
            "label": period_label,
            "period_type": period.upper(),
            "device": device_name,
        }

        # 3. Query Energy Readings strictly for this user
        readings_query = db.query(EnergyReading).filter(
            EnergyReading.user_id == u_id,
            EnergyReading.recorded_at >= period_start,
            EnergyReading.recorded_at <= period_end
        ).order_by(desc(EnergyReading.recorded_at)).all()

        readings_data = []
        total_power = 0.0
        total_voltage = 0.0
        total_current = 0.0
        total_pf = 0.0
        peak_watts = 0.0
        max_kwh = 0.0
        min_kwh = 999999.0

        for r in readings_query[:40]:
            pwr = float(r.power) if r.power else 0.0
            vlt = float(r.voltage) if r.voltage else 230.0
            cur = float(r.current) if r.current else 0.0
            pf = float(r.power_factor) if r.power_factor else 0.98
            kwh = float(r.energy) if r.energy else 0.0

            if pwr > peak_watts:
                peak_watts = pwr
            if kwh > max_kwh:
                max_kwh = kwh
            if kwh < min_kwh and kwh > 0:
                min_kwh = kwh

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
        avg_voltage = round(total_voltage / count, 1) if count > 0 and total_voltage > 0 else 230.0
        avg_current = round(total_current / count, 2) if count > 0 and total_current > 0 else 0.0
        avg_pf = round(total_pf / count, 2) if count > 0 and total_pf > 0 else 0.98

        # 4. Fetch Tariff & Bill Calculation
        active_tariff = db.query(Tariff).first()
        tariff_rate = float(active_tariff.rate_per_kwh) if active_tariff and active_tariff.rate_per_kwh else 6.50
        
        # Calculate summary total kWh strictly from user readings
        if readings_query:
            if max_kwh > min_kwh and min_kwh < 999999.0:
                total_kwh = round(max_kwh - min_kwh, 3)
            else:
                total_kwh = round(max_kwh, 3)
        else:
            summary_rec = db.query(UsageSummary).filter(
                UsageSummary.user_id == u_id,
                UsageSummary.period_type == period.upper()
            ).first()
            total_kwh = float(summary_rec.total_energy) if summary_rec and summary_rec.total_energy and offset == 0 else 0.0

        estimated_bill = round(total_kwh * tariff_rate, 2)

        metrics_info = {
            "total_kwh": total_kwh,
            "estimated_bill": estimated_bill,
            "peak_watts": peak_watts if peak_watts > 0 else 0.0,
            "avg_voltage": avg_voltage,
            "avg_current": avg_current,
            "avg_pf": avg_pf,
            "tariff_rate": tariff_rate
        }

        # 5. Fetch User Appliances
        appliances_db = db.query(Appliance).filter(Appliance.user_id == u_id).all()
        if not appliances_db:
            appliances_db = db.query(Appliance).all()
        appliances_data = []
        for app in appliances_db:
            rated_pwr = float(app.rated_power) if getattr(app, 'rated_power', None) is not None else 0.0
            appliances_data.append({
                "name": app.appliance_name,
                "category": app.category or "Smart Plug Load",
                "power_rating": rated_pwr,
                "standby_power": 1.2,
                "daily_kwh": round(rated_pwr * 4 / 1000, 2) if rated_pwr > 0 else 0.05
            })

        # 6. Fetch User Anomalies & AI Recommendations
        anomalies_data = []
        if include_anomalies:
            anoms = db.query(Anomaly).filter(
                (Anomaly.user_id == u_id) | (Anomaly.user_id == None)
            ).order_by(desc(Anomaly.anomaly_id)).limit(5).all()
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
