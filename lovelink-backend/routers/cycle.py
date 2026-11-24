from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from database import get_db
from models.user import User
from models.couple import Couple
from models.cycle import CycleSetting, CycleLog
from crud.couple import get_active_couple_by_user
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta, datetime

router = APIRouter()

class CycleSetupRequest(BaseModel):
    last_period_date: str # YYYY-MM-DD
    cycle_length: Optional[int] = 28
    period_length: Optional[int] = 5

class CycleLogRequest(BaseModel):
    flow: Optional[str] = None
    cramps: Optional[str] = None
    mood: Optional[str] = None
    cravings: Optional[str] = None
    energy: Optional[str] = None
    notes: Optional[str] = None
    encrypted_payload: Optional[str] = None

def calculate_cycle_data(last_date: date, cycle_len: int, period_len: int, client_today: Optional[date] = None):
    today = client_today or date.today()
    days_diff = (today - last_date).days

    if days_diff < 0:
        days_diff = 0

    current_day = (days_diff % cycle_len) + 1
    days_left = cycle_len - current_day + 1
    if days_left == cycle_len + 1:
        days_left = 1
    next_date = today + timedelta(days=days_left)

    ovulation_day = cycle_len - 14

    if current_day <= period_len:
        phase = "Menstrual Phase (Period)"
        phase_code = "period"
        color = "#f43f5e"
        badge = "🩸 Period"
        care_tip = "Her period is here. She may be dealing with painful cramps and low energy. Bring a warm heating pad, gentle back rubs, and warm herbal tea 🍵"
    elif current_day < (ovulation_day - 4):
        phase = "Follicular Phase"
        phase_code = "follicular"
        color = "#a855f7"
        badge = "✨ High Energy"
        care_tip = "Estrogen is rising! Her energy, optimism, and mood are soaring. Great time for dinner dates, outdoor adventures, and fun talks 🌟"
    elif current_day <= (ovulation_day + 1):
        phase = "Ovulation Window (Peak Glow)"
        phase_code = "ovulation"
        color = "#ec4899"
        badge = "🌸 Peak Glow"
        care_tip = "Peak romantic confidence and radiant energy! Surprise her with flowers, give genuine compliments, and plan a dreamy evening together 💐"
    else:
        phase = "Luteal Phase (PMS)"
        phase_code = "luteal"
        color = "#f59e0b"
        badge = "🍫 PMS & Cravings"
        care_tip = "Hormone shifts can cause sensitivity, fatigue, and cravings. Give extra tight hugs, be patient, and surprise her with chocolate or her favorite snacks 🍫"

    return {
        "current_day": current_day,
        "days_left": days_left,
        "next_period_date": next_date.isoformat(),
        "phase": phase,
        "phase_code": phase_code,
        "color": color,
        "badge": badge,
        "care_tip": care_tip,
        "ovulation_day": ovulation_day
    }

@router.get("")
async def get_cycle(
    client_date: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_active_couple_by_user(db, current_user.id)
    if not couple:
        return {"has_cycle": False}

    # Fetch Cycle Settings for this couple
    res_set = await db.execute(
        select(CycleSetting).where(CycleSetting.couple_id == couple.id)
    )
    setting = res_set.scalar_one_or_none()

    if not setting:
        return {"has_cycle": False}

    # Timezone-aware date resolution: honors client date if provided, fallback to server date
    today = date.today()
    if client_date:
        try:
            today = date.fromisoformat(client_date)
        except Exception:
            pass

    cycle_info = calculate_cycle_data(
        setting.last_period_date,
        setting.cycle_length,
        setting.period_length,
        client_today=today
    )

    # Fetch today's log if any
    res_log = await db.execute(
        select(CycleLog).where(
            and_(
                CycleLog.couple_id == couple.id,
                CycleLog.log_date == today
            )
        )
    )
    today_log = res_log.scalar_one_or_none()

    return {
        "has_cycle": True,
        "is_owner": str(setting.user_id) == str(current_user.id),
        "last_period_date": setting.last_period_date.isoformat(),
        "cycle_length": setting.cycle_length,
        "period_length": setting.period_length,
        **cycle_info,
        "today_log": {
            "flow": today_log.flow,
            "cramps": today_log.cramps,
            "mood": today_log.mood,
            "cravings": today_log.cravings,
            "energy": today_log.energy,
            "notes": today_log.notes,
            "encrypted_payload": today_log.encrypted_payload
        } if today_log else None
    }

@router.post("/setup")
async def setup_cycle(
    request: CycleSetupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_active_couple_by_user(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="You must be linked with a partner first")

    try:
        parsed_date = datetime.strptime(request.last_period_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    res_set = await db.execute(
        select(CycleSetting).where(CycleSetting.couple_id == couple.id)
    )
    setting = res_set.scalar_one_or_none()

    if setting:
        setting.last_period_date = parsed_date
        setting.cycle_length = request.cycle_length or 28
        setting.period_length = request.period_length or 5
        setting.user_id = current_user.id
    else:
        setting = CycleSetting(
            couple_id=couple.id,
            user_id=current_user.id,
            last_period_date=parsed_date,
            cycle_length=request.cycle_length or 28,
            period_length=request.period_length or 5
        )
        db.add(setting)

    await db.commit()
    return {"message": "Cycle configured successfully!"}

@router.post("/log")
async def log_symptoms(
    request: CycleLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_active_couple_by_user(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="Linked partner required")

    today = date.today()
    res_log = await db.execute(
        select(CycleLog).where(
            and_(
                CycleLog.couple_id == couple.id,
                CycleLog.log_date == today
            )
        )
    )
    existing_log = res_log.scalar_one_or_none()

    # If client-side encrypted payload is provided, zero-out plaintext fields for maximum privacy
    if request.encrypted_payload:
        f_val, c_val, m_val, cr_val, e_val, n_val = None, None, None, None, None, None
    else:
        f_val, c_val, m_val, cr_val, e_val, n_val = request.flow, request.cramps, request.mood, request.cravings, request.energy, request.notes

    if existing_log:
        existing_log.flow = f_val
        existing_log.cramps = c_val
        existing_log.mood = m_val
        existing_log.cravings = cr_val
        existing_log.energy = e_val
        existing_log.notes = n_val
        existing_log.encrypted_payload = request.encrypted_payload
    else:
        new_log = CycleLog(
            couple_id=couple.id,
            user_id=current_user.id,
            log_date=today,
            flow=f_val,
            cramps=c_val,
            mood=m_val,
            cravings=cr_val,
            energy=e_val,
            notes=n_val,
            encrypted_payload=request.encrypted_payload
        )
        db.add(new_log)

    await db.commit()
    return {"message": "Today's symptoms logged with love 💕"}
