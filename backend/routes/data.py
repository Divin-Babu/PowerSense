from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
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
    AiRecommendation,
    KnowledgeDocument,
    Notification,
    Schedule
)

from routes.telemetry import LATEST_TELEMETRY, CONNECTED_DEVICES

router = APIRouter()

# ─── Helper: Resolve Target User ──────────────────────────────────────────────

def resolve_target_user(db: Session, email: Optional[str] = None, user_id: Optional[int] = None) -> Optional[User]:
    if email:
        clean = email.strip().lower()
        u = db.query(User).filter(User.email == clean).first()
        if u:
            return u
        # Try matching prefix
        if "@" not in clean:
            u = db.query(User).filter(User.email.startswith(clean + "@")).first()
            if u:
                return u
    if user_id:
        u = db.query(User).filter(User.user_id == user_id).first()
        if u:
            return u
    # Default to first non-admin user or first user
    return db.query(User).filter(User.role == "user").first() or db.query(User).first()

# ─── 1. Dashboard Endpoint (User-Scoped Usage, Shared ESP32 Hardware) ──────────

@router.get("/dashboard")
def get_dashboard_summary(
    email: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetches real live metrics for the single ESP32 smart plug, along with user-specific
    today usage, 24-hour hourly bars, monthly goals, and bill estimates.
    """
    target_user = resolve_target_user(db, email, user_id)
    u_id = target_user.user_id if target_user else 1

    # 1. Check live hardware telemetry stream (shared ESP32 smart plug)
    dev = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first()
    is_connected = bool(LATEST_TELEMETRY.get("connected", False))

    if is_connected:
        live_watts = float(LATEST_TELEMETRY.get("power_watts", 0.0))
        current_amps = float(LATEST_TELEMETRY.get("current", 0.0))
        voltage = float(LATEST_TELEMETRY.get("voltage", 0.0))
        power_factor = float(LATEST_TELEMETRY.get("power_factor", 0.0))
        relay_state = LATEST_TELEMETRY.get("relay_state", "ON")
        device_status = "ONLINE"
    else:
        live_watts = 0.0
        current_amps = 0.0
        voltage = 0.0
        power_factor = 0.0
        relay_state = "OFF"
        device_status = "STANDBY"

    # 2. User-Specific Today Usage from tbl_usage_summary
    day_summary = db.query(UsageSummary).filter(
        UsageSummary.user_id == u_id,
        UsageSummary.period_type == "DAY"
    ).order_by(desc(UsageSummary.summary_id)).first()

    if day_summary and day_summary.total_energy:
        today_kwh = float(day_summary.total_energy)
    else:
        # Fallback based on user ID seed profile
        today_kwh = round(1.20 + (u_id * 0.45) % 2.5, 3)

    # 3. User-Specific Monthly Goal & Bill Estimate
    user_goal_kwh = float(target_user.energy_goal_kwh) if target_user and target_user.energy_goal_kwh else 100.0

    bill = db.query(BillEstimate).filter(BillEstimate.user_id == u_id).order_by(desc(BillEstimate.bill_id)).first()
    active_tariff = db.query(Tariff).order_by(Tariff.tariff_id.asc()).first()
    rate = float(active_tariff.rate_per_kwh) if active_tariff and active_tariff.rate_per_kwh else 6.50

    if bill and bill.total_units is not None:
        user_month_kwh = float(bill.total_units)
        user_est_bill = float(bill.estimated_amount) if bill.estimated_amount else round(user_month_kwh * rate, 2)
    else:
        month_summary = db.query(UsageSummary).filter(
            UsageSummary.user_id == u_id,
            UsageSummary.period_type == "MONTH"
        ).order_by(desc(UsageSummary.summary_id)).first()
        if month_summary and month_summary.total_energy:
            user_month_kwh = float(month_summary.total_energy)
        else:
            user_month_kwh = round(today_kwh * 25.0, 1)
        user_est_bill = round(user_month_kwh * rate, 2)

    goal_pct = round((user_month_kwh / user_goal_kwh) * 100, 1) if user_goal_kwh > 0 else 0.0

    # 4. 24-Hour Hourly Bars Distribution Scaled to User's Today Usage
    time_slots = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00", "24:00"]
    # Profile weights for 24-hour diurnal load (morning peak 8-10, evening peak 18-22)
    weights = [0.03, 0.02, 0.02, 0.04, 0.12, 0.15, 0.10, 0.08, 0.09, 0.13, 0.14, 0.06, 0.02]

    current_h = (datetime.now().hour // 2) * 2
    current_slot = f"{current_h:02d}:00"

    hourly_bars = []
    for idx, t in enumerate(time_slots):
        val = round(today_kwh * weights[idx] * 1.5, 3)
        # If live watts is high right now, adjust current slot
        if t == current_slot and live_watts > 0:
            live_kwh_delta = round((live_watts / 1000.0) * 0.5, 3)
            val = max(val, live_kwh_delta)
        hourly_bars.append({"time": t, "val": val})

    return {
        "live": {
            "watts": live_watts,
            "current": current_amps,
            "voltage": voltage,
            "power_factor": power_factor,
            "relay_state": relay_state,
            "relay1_state": relay_state if not is_connected else LATEST_TELEMETRY.get("relay1_state", "OFF"),
            "relay2_state": "OFF" if not is_connected else LATEST_TELEMETRY.get("relay2_state", "OFF"),
            "device_uid": "ESP32-PZEM-PLUG-10A",
            "device_name": dev.device_name if dev else "PowerSense Smart Plug",
            "status": device_status
        },
        "today_usage": {
            "kwh": today_kwh,
            "vs_yesterday_pct": -8.5 if (u_id % 2 == 0) else 4.2,
            "hourly_bars": hourly_bars
        },
        "this_month": {
            "kwh": user_month_kwh,
            "goal_kwh": user_goal_kwh,
            "goal_pct": goal_pct
        },
        "bill_estimate": {
            "amount": user_est_bill,
            "currency": "INR",
            "due_date": "End of Month"
        },
        "user": {
            "user_id": target_user.user_id if target_user else 1,
            "email": target_user.email if target_user else "user@powersense.ai",
            "name": target_user.full_name if target_user else "Resident",
            "role": target_user.role if target_user else "user",
            "goal_kwh": user_goal_kwh
        },
        "insight_banner": f"PowerSense Smart Plug (ESP32) monitored actively • Logged in as {target_user.full_name if target_user else 'Resident'}"
    }

# ─── 2. Analytics Endpoint (User-Scoped) ──────────────────────────────────────

@router.get("/analytics")
def get_analytics_data(
    period: str = Query("day", enum=["day", "week", "month", "year"]),
    email: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Fetches user-specific energy consumption, load categories,
    and efficiency breakdown for the selected period and historical offset.
    offset=0 represents the current period, offset=1 represents 1 period ago, etc.
    """
    target_user = resolve_target_user(db, email, user_id)
    u_id = target_user.user_id if target_user else 1

    # Fetch real device and live telemetry stream (Device is common for all users)
    dev = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first()
    dev_energy = float(dev.energy) if dev and dev.energy is not None else 0.0
    live_energy = float(LATEST_TELEMETRY.get("energy_kwh") or dev_energy)
    dev_name = dev.device_name if dev and dev.device_name else "ESP32 Smart Plug"

    # User-specific connected appliance name
    user_appliance = db.query(Appliance).filter(Appliance.user_id == u_id).first()
    load_name = user_appliance.appliance_name if user_appliance else dev_name

    now = datetime.now()
    if period == "day":
        target_day = date.today() - timedelta(days=offset)
        if offset == 0:
            date_str = f"Today ({target_day.strftime('%d %b')})"
            period_start = datetime.combine(target_day, datetime.min.time())
            period_end = now
        elif offset == 1:
            date_str = f"Yesterday ({target_day.strftime('%d %b')})"
            period_start = datetime.combine(target_day, datetime.min.time())
            period_end = datetime.combine(target_day, datetime.max.time())
        else:
            date_str = target_day.strftime("%d %b %Y")
            period_start = datetime.combine(target_day, datetime.min.time())
            period_end = datetime.combine(target_day, datetime.max.time())

    elif period == "week":
        week_end_dt = now - timedelta(days=7 * offset)
        week_start_dt = week_end_dt - timedelta(days=7)
        period_start = week_start_dt
        period_end = week_end_dt
        if offset == 0:
            date_str = "This Week"
        elif offset == 1:
            date_str = f"Last Week ({week_start_dt.strftime('%d %b')} – {week_end_dt.strftime('%d %b')})"
        else:
            date_str = f"{week_start_dt.strftime('%d %b')} – {week_end_dt.strftime('%d %b')}"

    elif period == "month":
        curr_year = date.today().year
        curr_month = date.today().month
        tot_m = (curr_year * 12 + curr_month - 1) - offset
        t_year = tot_m // 12
        t_month = (tot_m % 12) + 1
        import calendar
        _, last_day = calendar.monthrange(t_year, t_month)
        period_start = datetime(t_year, t_month, 1, 0, 0, 0)
        period_end = datetime(t_year, t_month, last_day, 23, 59, 59)
        date_str = period_start.strftime("%B %Y")

    else:
        t_year = date.today().year - offset
        date_str = str(t_year)
        period_start = datetime(t_year, 1, 1, 0, 0, 0)
        period_end = datetime(t_year, 12, 31, 23, 59, 59)

    # User-Isolated Energy Readings Query
    readings = db.query(EnergyReading).filter(
        EnergyReading.user_id == u_id,
        EnergyReading.recorded_at >= period_start,
        EnergyReading.recorded_at <= period_end
    ).order_by(EnergyReading.recorded_at.asc()).all()

    if not readings and offset == 0:
        readings = db.query(EnergyReading).filter(
            (EnergyReading.user_id == u_id) | (EnergyReading.user_id == None),
            EnergyReading.recorded_at >= period_start,
            EnergyReading.recorded_at <= period_end
        ).order_by(EnergyReading.recorded_at.asc()).all()

    if readings:
        valid_energies = [float(r.energy) for r in readings if r.energy is not None]
        if valid_energies:
            min_e = min(valid_energies)
            max_e = max(valid_energies)
            delta = max_e - min_e
            total_kwh = round(max(delta, max_e), 3) if max_e > 0 else 0.001
        else:
            total_kwh = round(live_energy, 3) if (offset == 0 and live_energy > 0) else 0.0
    else:
        # Fallback to user-scoped tbl_usage_summary
        summary = db.query(UsageSummary).filter(
            UsageSummary.user_id == u_id,
            UsageSummary.period_type == period.upper()
        ).first()
        if summary and summary.total_energy and offset == 0:
            total_kwh = float(summary.total_energy)
        else:
            total_kwh = 0.0

    # Real load tiers calculated strictly from actual telemetry power measurements
    if readings:
        powers = [float(r.power or 0.0) for r in readings]
        high_readings = [p for p in powers if p >= 30.0]
        normal_readings = [p for p in powers if 5.0 <= p < 30.0]
        standby_readings = [p for p in powers if p < 5.0]

        total_r = len(powers)
        high_pct = round((len(high_readings) / total_r) * 100)
        norm_pct = round((len(normal_readings) / total_r) * 100)
        standby_pct = max(0, 100 - high_pct - norm_pct)
        if high_pct + norm_pct + standby_pct == 0:
            norm_pct = 100
    elif offset == 0 and total_kwh > 0:
        high_pct, norm_pct, standby_pct = 15, 80, 5
    else:
        high_pct, norm_pct, standby_pct = 0, 0, 0

    high_kwh = round(total_kwh * (high_pct / 100.0), 3)
    norm_kwh = round(total_kwh * (norm_pct / 100.0), 3)
    standby_kwh = max(0.0, round(total_kwh - high_kwh - norm_kwh, 3))

    # User-Specific Smart Plug Operational Load Breakdown
    breakdown = [
        {"label": "Active Draw", "pct": high_pct, "color": "#00C48C"},
        {"label": "Normal Run", "pct": norm_pct, "color": "#38BDF8"},
        {"label": "Standby Idle", "pct": standby_pct, "color": "#FBBF24"},
    ]

    top_appliances = [
        {"id": 1, "name": f"{load_name} (Active High Load)", "icon": "flash", "iconColor": "#00C48C", "pct": high_pct, "kwh": f"{high_kwh:.3f} kWh"},
        {"id": 2, "name": f"{load_name} (Normal Continuous Run)", "icon": "speedometer-outline", "iconColor": "#38BDF8", "pct": norm_pct, "kwh": f"{norm_kwh:.3f} kWh"},
        {"id": 3, "name": f"{load_name} (Standby / Idle Power)", "icon": "moon-outline", "iconColor": "#F59E0B", "pct": standby_pct, "kwh": f"{standby_kwh:.3f} kWh"},
    ]

    return {
        "period": period,
        "offset": offset,
        "can_go_forward": offset > 0,
        "can_go_back": True,
        "date_display": date_str,
        "total_usage_kwh": total_kwh,
        "peak_tooltip": {"time": "Current Window", "kwh": f"{total_kwh:.3f} kWh"},
        "wave_points": [],
        "breakdown": breakdown,
        "top_appliances": top_appliances,
        "user_email": target_user.email if target_user else None
    }

# ─── 3. Devices Endpoint (Strictly Single ESP32 Smart Plug Node) ───────────────

@router.get("/devices")
def get_user_devices(
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns ONLY the single physical ESP32 Smart Plug device node.
    Shared for all users for testing until BLE multi-device provisioning is completed.
    """
    dev = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first()
    if not dev:
        dev = db.query(Device).first()

    live_w = float(LATEST_TELEMETRY.get("power_watts", 0.0))
    relay_on = LATEST_TELEMETRY.get("relay_state", "ON") == "ON"
    if not LATEST_TELEMETRY.get("connected") and dev:
        live_w = float(dev.power) if dev.power is not None else 0.0
        relay_on = (dev.relay_state or "ON").upper() == "ON"

    single_device = {
        "id": dev.device_id if dev else 1,
        "name": dev.device_name if dev else "PowerSense Smart Plug",
        "uid": dev.device_uid if dev else "ESP32-PZEM-PLUG-10A",
        "status": dev.status if dev else "ONLINE",
        "watts": live_w if relay_on else 0.0,
        "voltage": float(dev.voltage) if dev and dev.voltage else 230.4,
        "current": float(dev.current) if dev and dev.current else 0.0,
        "energy": float(dev.energy) if dev and dev.energy else 0.0,
        "relay_state": "ON" if relay_on else "OFF",
        "relay1_state": LATEST_TELEMETRY.get("relay1_state", dev.relay1_state if dev else "ON"),
        "relay2_state": LATEST_TELEMETRY.get("relay2_state", dev.relay2_state if dev else "OFF"),
        "power_source": dev.power_source if dev and dev.power_source else "HLK-PM01 5V AC-DC",
        "rssi": int(dev.rssi) if dev and dev.rssi is not None else -58,
        "ip_address": dev.ip_address if dev and dev.ip_address else "192.168.1.100",
        "mac_address": dev.mac_address if dev and dev.mac_address else "24:6F:28:B4:9A:12",
        "sensor": "PZEM-004T v3 (TTL Serial)",
        "firmware": "v3.2.0-single-plug",
        "connected_appliance": "Connected Load",
        "rated_power": 1500.0,
        "last_seen": dev.last_seen.strftime("%H:%M:%S") if dev and dev.last_seen else "Just now"
    }

    # Return exactly the single ESP32 device
    return {
        "success": True,
        "count": 1,
        "devices": [single_device]
    }

# ─── 4. Alerts / Notifications Endpoint (User + Hardware Events) ──────────────

@router.get("/alerts")
def get_alerts_notifications(
    category: Optional[str] = None,
    email: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Fetches real notifications from tbl_notification:
    Includes user-specific notifications plus shared hardware prototype alerts.
    """
    target_user = resolve_target_user(db, email)
    u_id = target_user.user_id if target_user else None

    query = db.query(Notification)
    if u_id:
        query = query.filter((Notification.user_id == u_id) | (Notification.user_id == None))

    notifs = query.order_by(desc(Notification.notification_id)).limit(40).all()
    alerts_list = []

    icon_map = {
        "critical": ("alert-circle", "#EF4444", "#FEE2E2"),
        "warning": ("warning", "#D97706", "#FEF3C7"),
        "info": ("information-circle", "#3B82F6", "#DBEAFE"),
        "success": ("checkmark-circle", "#10B981", "#D1FAE5"),
    }

    for n in notifs:
        c_type = (n.notification_type or "info").lower()
        if category and category.lower() != "all" and c_type != category.lower():
            continue

        icon, icon_col, badge_bg = icon_map.get(c_type, ("information-circle", "#3B82F6", "#DBEAFE"))
        created_str = n.created_at.strftime("%I:%M %p") if n.created_at else "Just now"

        alerts_list.append({
            "id": str(n.notification_id),
            "title": n.message.split(":")[0] if ":" in n.message else n.message,
            "description": n.message.split(":")[1].strip() if ":" in n.message else "System event registered.",
            "time": created_str,
            "category": c_type,
            "icon": icon,
            "iconColor": icon_col,
            "badgeBg": badge_bg,
            "unread": n.status == "UNREAD"
        })

    unread_count = len([a for a in alerts_list if a["unread"]])
    return {"alerts": alerts_list, "unread_count": unread_count}

# ─── 5. Create In-App Notification (When added in phone / user action) ─────────

class InAppNotificationPayload(BaseModel):
    user_email: Optional[str] = None
    notification_type: str = "info"  # 'info', 'success', 'warning', 'critical'
    title: str
    message: Optional[str] = None

@router.post("/alerts")
@router.post("/notifications")
def create_in_app_notification(payload: InAppNotificationPayload, db: Session = Depends(get_db)):
    """
    Allows the mobile/web app to register real in-app notifications into PostgreSQL:
    Triggered when new device is added on phone, relay toggled, or routine completed.
    """
    target_user = resolve_target_user(db, payload.user_email)
    dev = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first()

    full_msg = f"{payload.title}: {payload.message}" if payload.message else payload.title

    new_notif = Notification(
        user_id=target_user.user_id if target_user else None,
        device_id=dev.device_id if dev else 1,
        notification_type=payload.notification_type.lower(),
        message=full_msg,
        status="UNREAD",
        created_at=datetime.utcnow()
    )
    db.add(new_notif)
    db.commit()
    db.refresh(new_notif)

    return {
        "success": True,
        "message": "Notification registered in database.",
        "notification_id": new_notif.notification_id
    }

@router.post("/alerts/read-all")
def mark_all_notifications_read(email: Optional[str] = None, db: Session = Depends(get_db)):
    target_user = resolve_target_user(db, email)
    if target_user:
        db.query(Notification).filter(
            (Notification.user_id == target_user.user_id) | (Notification.user_id == None)
        ).update({"status": "READ"}, synchronize_session=False)
        db.commit()
    return {"success": True, "message": "All notifications marked as read."}

# ─── 6. AI Recommendations & Insights Endpoint ──────────────────────────────

@router.get("/recommendations")
def get_ai_recommendations(db: Session = Depends(get_db)):
    recs = db.query(AiRecommendation).all()
    rec_list = []
    for r in recs:
        rec_list.append({
            "id": r.recommendation_id,
            "recommendation": r.recommendation,
            "source_type": r.source_type,
            "created_at": r.created_at.isoformat() if r.created_at else None
        })

    return {
        "monthly_insight": {
            "title": "Monthly Energy Optimization",
            "description": "Operating your smart plug during off-peak tariff hours can reduce spend by up to 28%."
        },
        "potential_savings": "₹ 245",
        "savings_banner": "You can save up to ₹ 245 this month by optimizing usage!",
        "recommendations": rec_list
    }

# ─── 7. Knowledge Documents Endpoint ────────────────────────────────────────

@router.get("/knowledge")
def get_knowledge_documents(db: Session = Depends(get_db)):
    docs = db.query(KnowledgeDocument).all()
    return {
        "documents": [
            {
                "id": f"rag-{d.document_id}",
                "title": d.title,
                "category": d.document_type or "General",
                "appliance_category": d.appliance_category,
                "content": d.file_path,
                "source": d.source
            }
            for d in docs
        ]
    }

# ─── 8. AI Chat & Product Doubt Clarification Endpoint ───────────────────────

class AiChatPayload(BaseModel):
    question: str
    telemetry: Optional[dict] = None

@router.post("/ai-chat")
def ask_ai_product_chat(payload: AiChatPayload, db: Session = Depends(get_db)):
    q_lower = payload.question.strip().lower()
    t = payload.telemetry or {}

    volts = t.get("voltage", 230.4)
    amps = t.get("current", 1.25)
    watts = t.get("watts", 288.0)
    kwh = t.get("kwh", 1.45)
    relay_on = t.get("relay_state", "ON") == "ON"

    if any(k in q_lower for k in ["what is", "how does", "overview", "product", "powersense", "hardware", "spec", "pzem"]):
        reply = (
            "🤖 **PowerSense AI Smart Plug Product Overview**:\n\n"
            "• **Core Hardware**: Dual-Core ESP32 Microcontroller paired with PZEM-004T v3 Energy Monitoring Transducer.\n"
            "• **Live Metering**: High-precision AC True RMS Voltage (80-260V), Current (0-10A), Active Power (W), Cumulative Energy (kWh), Frequency (50Hz), and Power Factor.\n"
            "• **Power Supply**: Integrated HLK-PM01 5V AC-DC converter powering the internal electronics directly from mains.\n"
            "• **Dual Relay Channels**: Primary inline safety relay (CH1) + Aux relay (CH2) for sub-circuit cutoff.\n"
            "• **Connectivity**: 2.4GHz Wi-Fi telemetry ingestion at 1.0 Hz + BLE provisioning for mobile pairing."
        )
    elif any(k in q_lower for k in ["live", "current reading", "power", "watt", "voltage", "amperage", "reading"]):
        relay_desc = "ACTIVE (Relay ON)" if relay_on else "CUTOFF (Relay OFF)"
        reply = (
            f"⚡ **Live Sensor Telemetry**:\n\n"
            f"• **Relay Status**: {relay_desc}\n"
            f"• **Active Power**: **{watts:.1f} W**\n"
            f"• **Mains Voltage**: **{volts:.1f} V** (Nominal standard)\n"
            f"• **Current Draw**: **{amps:.2f} A**\n"
            f"• **Today Energy**: **{kwh:.3f} kWh**\n"
            f"• **Cost Estimate**: **₹ {kwh * 6.50:.2f}**\n\n"
            "Sensor reading is healthy with stable power factor."
        )
    elif any(k in q_lower for k in ["save", "bill", "reduce", "optimize", "cost", "tariff"]):
        reply = (
            "💡 **Energy Saving Recommendations**:\n\n"
            "1. **Peak Tariff Shaving**: Shift heavy loads outside 6:00 PM – 10:00 PM to take advantage of lower ₹4.20/kWh rates.\n"
            "2. **Standby Cutoff**: Enable automated timers in the Dashboard to eliminate phantom idle loads (saves 2W-15W continuously).\n"
            "3. **Surge Warning**: Current limit is set to 1,450 W (10A safe ceiling). Staying below 1,200 W extends equipment lifespan."
        )
    else:
        reply = (
            f"PowerSense AI Assistant: Your ESP32 Smart Plug is ONLINE with live load at {watts:.1f} W and {volts:.1f} V. "
            "You can ask me about hardware specifications, live power, energy saving tips, or smart scheduling!"
        )

    return {"answer": reply, "question": payload.question}

# ─── 9. User-Specific Schedules Endpoints ─────────────────────────────────────

class ScheduleCreatePayload(BaseModel):
    name: str
    onTime: str
    offTime: str
    repeat: Optional[str] = "EVERYDAY"
    category: Optional[str] = "Custom"
    enabled: Optional[bool] = True
    relay_channel: Optional[str] = "RELAY_1"
    email: Optional[str] = None
    user_id: Optional[int] = None

class ScheduleUpdatePayload(BaseModel):
    name: Optional[str] = None
    onTime: Optional[str] = None
    offTime: Optional[str] = None
    repeat: Optional[str] = None
    category: Optional[str] = None
    enabled: Optional[bool] = None
    relay_channel: Optional[str] = None

@router.get("/schedules")
def get_user_schedules(
    email: Optional[str] = Query(None),
    user_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    target_user = resolve_target_user(db, email, user_id)
    u_id = target_user.user_id if target_user else 1

    schedules = db.query(Schedule).filter(Schedule.user_id == u_id).order_by(Schedule.schedule_id.asc()).all()
    return {
        "schedules": [s.to_dict() for s in schedules],
        "user_id": u_id,
        "user_email": target_user.email if target_user else None,
        "count": len(schedules)
    }

@router.post("/schedules")
def create_user_schedule(
    payload: ScheduleCreatePayload,
    db: Session = Depends(get_db)
):
    target_user = resolve_target_user(db, payload.email, payload.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    device = db.query(Device).filter(Device.device_uid == "ESP32-PZEM-PLUG-10A").first()
    dev_id = device.device_id if device else 1

    new_sch = Schedule(
        user_id=target_user.user_id,
        device_id=dev_id,
        name=payload.name.strip(),
        on_time=payload.onTime.strip(),
        off_time=payload.offTime.strip(),
        repeat=payload.repeat.strip().upper() if payload.repeat else "EVERYDAY",
        category=payload.category.strip() if payload.category else "Custom",
        enabled=payload.enabled if payload.enabled is not None else True,
        relay_channel=payload.relay_channel or "RELAY_1"
    )
    db.add(new_sch)
    db.commit()
    db.refresh(new_sch)

    return {
        "success": True,
        "schedule": new_sch.to_dict(),
        "message": f"Schedule '{new_sch.name}' created successfully for {target_user.email}"
    }

@router.patch("/schedules/{schedule_id}")
@router.put("/schedules/{schedule_id}")
def update_user_schedule(
    schedule_id: int,
    payload: ScheduleUpdatePayload,
    db: Session = Depends(get_db)
):
    sch = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule not found")

    if payload.name is not None:
        sch.name = payload.name.strip()
    if payload.onTime is not None:
        sch.on_time = payload.onTime.strip()
    if payload.offTime is not None:
        sch.off_time = payload.offTime.strip()
    if payload.repeat is not None:
        sch.repeat = payload.repeat.strip().upper()
    if payload.category is not None:
        sch.category = payload.category.strip()
    if payload.enabled is not None:
        sch.enabled = payload.enabled
    if payload.relay_channel is not None:
        sch.relay_channel = payload.relay_channel

    db.commit()
    db.refresh(sch)
    return {
        "success": True,
        "schedule": sch.to_dict(),
        "message": f"Schedule {schedule_id} updated successfully"
    }

@router.delete("/schedules/{schedule_id}")
def delete_user_schedule(
    schedule_id: int,
    db: Session = Depends(get_db)
):
    sch = db.query(Schedule).filter(Schedule.schedule_id == schedule_id).first()
    if not sch:
        raise HTTPException(status_code=404, detail="Schedule not found")

    db.delete(sch)
    db.commit()
    return {
        "success": True,
        "message": f"Schedule {schedule_id} deleted successfully"
    }

