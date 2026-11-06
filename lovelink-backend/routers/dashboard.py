from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from models.notification import Notification
from routers.auth import get_current_user
from schemas.dashboard import DashboardResponse, UserSummary
from ws_manager.manager import manager

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Prefer a fully linked couple if multiple exist
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            ),
            Couple.user2_id.is_not(None),
        )
    )
    couple = result.scalars().first()

    if not couple:
        # Fallback: any couple row (e.g. pending invite)
        result = await db.execute(
            select(Couple).where(
                or_(
                    Couple.user1_id == current_user.id,
                    Couple.user2_id == current_user.id,
                )
            )
        )
        couple = result.scalars().first()

    days_together = 0
    partner_user = None
    linked = False

    if couple:
        days_together = (datetime.utcnow() - couple.created_at).days
        partner_id = (
            couple.user2_id
            if couple.user1_id == current_user.id
            else couple.user1_id
        )
        if partner_id:
            p_result = await db.execute(
                select(User).where(User.id == partner_id)
            )
            partner = p_result.scalars().first()
            if partner:
                linked = True
                partner_user = UserSummary(
                    id=str(partner.id),
                    name=partner.name,
                    email=partner.email,
                    timezone=partner.timezone,
                    city=partner.city,
                )

    return DashboardResponse(
        my_user=UserSummary(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            timezone=current_user.timezone,
            city=current_user.city,
        ),
        partner_user=partner_user,
        days_together=days_together,
        linked=linked,
        couple_id=str(couple.id) if couple else None,
    )


@router.post("/nudge", status_code=201)
async def send_nudge(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            ),
            Couple.user2_id.is_not(None),
        )
    )
    couple = result.scalars().first()
    if not couple:
        return {"nudge_sent": False, "reason": "No partner"}
        
    partner_id = str(couple.user2_id if couple.user1_id == current_user.id else couple.user1_id)
    
    # 1. Create a persistent notification in the DB
    notif = Notification(
        user_id=partner_id,
        couple_id=str(couple.id),
        type="nudge",
        title="Thinking of you! 💖",
        body=f"{current_user.name} sent you a nudge.",
        data={"sender_name": current_user.name}
    )
    db.add(notif)
    await db.commit()
    
    # 2. Broadcast realtime WS event globally
    await manager.broadcast(str(couple.id), {
        "type": "nudge",
        "sender_name": current_user.name
    })
    
    return {"nudge_sent": True}



# ── COUPLE LIVE STATUS (BATTERY & LOCATION RADAR) ─────────────────────────
import math
from pydantic import BaseModel
from typing import Optional

class LiveStatusUpdate(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    battery_level: Optional[int] = None
    is_charging: Optional[bool] = None
    device_label: Optional[str] = None

# In-memory status store: couple_id -> { user_id: status_dict }
couple_status_store = {}

def calculate_distance_km(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return None
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
        R = 6371.0 # Earth radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 1)
    except Exception:
        return None

@router.post("/status")
async def update_status(
    payload: LiveStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            ),
            Couple.user2_id.is_not(None),
        )
    )
    couple = result.scalars().first()
    if not couple:
        return {"error": "Not linked with partner yet"}

    couple_id = str(couple.id)
    user_id = str(current_user.id)
    partner_id = str(couple.user2_id if couple.user1_id == current_user.id else couple.user1_id)

    if couple_id not in couple_status_store:
        couple_status_store[couple_id] = {}

    status_data = {
        "user_id": user_id,
        "name": current_user.name,
        "battery_level": payload.battery_level,
        "is_charging": payload.is_charging,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "device_label": payload.device_label or "Mobile",
        "updated_at": datetime.utcnow().isoformat()
    }
    couple_status_store[couple_id][user_id] = status_data

    partner_status = couple_status_store[couple_id].get(partner_id)
    distance_km = None
    if partner_status and status_data.get("latitude") and partner_status.get("latitude"):
        distance_km = calculate_distance_km(
            status_data["latitude"], status_data["longitude"],
            partner_status["latitude"], partner_status["longitude"]
        )

    # Real-time WebSocket broadcast to partner
    await manager.broadcast(couple_id, {
        "type": "partner_status_updated",
        "sender_id": user_id,
        "partner_name": current_user.name,
        "status": status_data,
        "distance_km": distance_km
    })

    return {
        "my_status": status_data,
        "partner_status": partner_status,
        "distance_km": distance_km,
        "distance_miles": round(distance_km * 0.621371, 1) if distance_km is not None else None
    }

@router.get("/status")
async def get_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            ),
            Couple.user2_id.is_not(None),
        )
    )
    couple = result.scalars().first()
    if not couple:
        return {"error": "Not linked with partner yet"}

    couple_id = str(couple.id)
    user_id = str(current_user.id)
    partner_id = str(couple.user2_id if couple.user1_id == current_user.id else couple.user1_id)

    store = couple_status_store.get(couple_id, {})
    my_status = store.get(user_id)
    partner_status = store.get(partner_id)

    distance_km = None
    if my_status and partner_status and my_status.get("latitude") and partner_status.get("latitude"):
        distance_km = calculate_distance_km(
            my_status["latitude"], my_status["longitude"],
            partner_status["latitude"], partner_status["longitude"]
        )

    return {
        "my_status": my_status,
        "partner_status": partner_status,
        "distance_km": distance_km,
        "distance_miles": round(distance_km * 0.621371, 1) if distance_km is not None else None
    }
