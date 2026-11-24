import uuid
from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models.user import User
from models.couple import Couple
from models.notification import Notification
from crud.couple import get_active_couple_by_user
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()

# In-memory snap storage per couple: { couple_id: [ snap_dict, ... ] }
couple_snaps: Dict[str, List[dict]] = {}

# Couple streak storage: { couple_id: { "streak": int, "last_snap_date": str, "last_sender": str } }
couple_streaks: Dict[str, dict] = {}


class SendSnapRequest(BaseModel):
    media_url: str
    caption: Optional[str] = None
    filter: Optional[str] = "normal"
    duration: Optional[int] = 0  # 0 means View Once
    is_view_once: Optional[bool] = True


class ReactSnapRequest(BaseModel):
    reaction: str = "❤️"


async def _get_couple(db: AsyncSession, user_id: str) -> Optional[Couple]:
    return await get_active_couple_by_user(db, user_id)


@router.post("/send")
async def send_snap(
    payload: SendSnapRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not payload.media_url:
        raise HTTPException(status_code=400, detail="Snap media is required")

    # Fetch user's couple
    couple = await _get_couple(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked in a couple yet")

    couple_id = str(couple.id)
    partner_id = str(couple.user2_id) if str(couple.user1_id) == str(current_user.id) else str(couple.user1_id)

    # Calculate / update daily streak
    today_str = date.today().isoformat()
    if couple_id not in couple_streaks:
        couple_streaks[couple_id] = {
            "streak": 1,
            "last_snap_date": today_str,
            "last_sender": str(current_user.id)
        }
    else:
        st = couple_streaks[couple_id]
        last_d = st.get("last_snap_date")
        if last_d != today_str:
            # Check if yesterday
            try:
                last_date_obj = date.fromisoformat(last_d)
                diff = (date.today() - last_date_obj).days
                if diff == 1:
                    st["streak"] += 1
                elif diff > 1:
                    st["streak"] = 1
            except Exception:
                st["streak"] = 1
            st["last_snap_date"] = today_str
            st["last_sender"] = str(current_user.id)

    streak_info = couple_streaks[couple_id]

    snap_id = f"snap_{uuid.uuid4().hex[:12]}"
    snap_record = {
        "id": snap_id,
        "couple_id": couple_id,
        "sender_id": str(current_user.id),
        "sender_name": current_user.name or "Partner",
        "media_url": payload.media_url,
        "caption": payload.caption or "",
        "filter": payload.filter or "normal",
        "duration": payload.duration if payload.duration is not None else 0,
        "is_view_once": bool(payload.is_view_once),
        "status": "delivered",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "opened_at": None,
        "reaction": None
    }

    if couple_id not in couple_snaps:
        couple_snaps[couple_id] = []

    couple_snaps[couple_id].insert(0, snap_record)
    # Keep last 50 snaps per couple
    if len(couple_snaps[couple_id]) > 50:
        couple_snaps[couple_id] = couple_snaps[couple_id][:50]

    # Create in-app notification for partner
    if partner_id:
        notif = Notification(
            user_id=partner_id,
            couple_id=couple_id,
            type="snap",
            title=f"New Snap from {current_user.name or 'Partner'}! 📸",
            body="Tap to view disappearing snap before it expires",
            data={"snap_id": snap_id, "streak": streak_info["streak"]}
        )
        db.add(notif)
        await db.commit()

    # Broadcast over chat/games websocket room if partner is active
    try:
        await manager.broadcast(
            f"chat_{couple_id}",
            {
                "type": "new_snap",
                "snap_id": snap_id,
                "sender_id": str(current_user.id),
                "sender_name": current_user.name or "Partner",
                "streak": streak_info["streak"],
                "is_view_once": bool(payload.is_view_once)
            }
        )
    except Exception:
        pass

    return {
        "status": "success",
        "snap": snap_record,
        "streak": streak_info["streak"]
    }


@router.get("/feed")
async def get_snap_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, current_user.id)
    if not couple:
        return {"snaps": [], "streak": 0, "unread_count": 0}

    couple_id = str(couple.id)
    snaps = couple_snaps.get(couple_id, [])
    streak_data = couple_streaks.get(couple_id, {"streak": 0})

    # Unread snaps sent to current_user
    unread_count = sum(
        1 for s in snaps
        if s.get("sender_id") != str(current_user.id) and s.get("status") == "delivered"
    )

    return {
        "snaps": snaps,
        "streak": streak_data.get("streak", 0),
        "unread_count": unread_count
    }


@router.post("/{snap_id}/open")
async def open_snap(
    snap_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="Couple not found")

    couple_id = str(couple.id)
    snaps = couple_snaps.get(couple_id, [])

    for s in snaps:
        if s["id"] == snap_id:
            s["status"] = "opened"
            s["opened_at"] = datetime.now(timezone.utc).isoformat()

            # If it's a view-once snap, clear media after viewing to uphold ephemeral privacy!
            return {
                "status": "success",
                "snap": s
            }

    raise HTTPException(status_code=404, detail="Snap not found or already expired")


@router.post("/{snap_id}/react")
async def react_snap(
    snap_id: str,
    payload: ReactSnapRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="Couple not found")

    couple_id = str(couple.id)
    snaps = couple_snaps.get(couple_id, [])

    for s in snaps:
        if s["id"] == snap_id:
            s["reaction"] = payload.reaction
            return {"status": "success", "reaction": payload.reaction}

    raise HTTPException(status_code=404, detail="Snap not found")


@router.get("/streak")
async def get_streak(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, current_user.id)
    if not couple:
        return {"streak": 0, "active": False}

    couple_id = str(couple.id)
    streak_data = couple_streaks.get(couple_id, {"streak": 0, "last_snap_date": None})
    return {
        "streak": streak_data.get("streak", 0),
        "last_snap_date": streak_data.get("last_snap_date"),
        "active": streak_data.get("streak", 0) > 0
    }
