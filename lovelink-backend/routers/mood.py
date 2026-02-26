from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, or_, and_, desc
from database import get_db
from models.user import User
from models.couple import Couple
from models.mood import Mood
from routers.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta
import uuid

router = APIRouter()

class MoodRequest(BaseModel):
    emoji: str
    note: Optional[str] = None

class MoodResponse(BaseModel):
    emoji: str
    note: Optional[str]
    created_at: str

@router.post("/checkin")
def checkin_mood(
    request: MoodRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find couple
    couple = db.execute(
        select(Couple).where(
            or_(Couple.user1_id == current_user.id, Couple.user2_id == current_user.id)
        )
    ).scalar_one_or_none()

    if not couple:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must be linked to a partner first"
        )
    
    today = date.today()
    # Check if mood exists for today
    existing_mood = db.execute(
        select(Mood).where(
            and_(
                Mood.user_id == current_user.id,
                # In SQLite/Postgres we can cast to date, but let's just do a date range for safety to avoid DB specific func
                Mood.created_at >= today,
                Mood.created_at < today + timedelta(days=1)
            )
        )
    ).scalar_one_or_none()

    if existing_mood:
        existing_mood.emoji = request.emoji
        existing_mood.note = request.note
        db.commit()
        return {"message": "Mood saved!", "emoji": request.emoji, "note": request.note}
    else:
        new_mood = Mood(
            user_id=current_user.id,
            couple_id=couple.id,
            emoji=request.emoji,
            note=request.note
        )
        db.add(new_mood)
        db.commit()
        return {"message": "Mood saved!", "emoji": request.emoji, "note": request.note}

@router.get("/today")
def get_today_mood(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    couple = db.execute(
        select(Couple).where(
            or_(Couple.user1_id == current_user.id, Couple.user2_id == current_user.id)
        )
    ).scalar_one_or_none()

    if not couple:
        return {"my_mood": None, "partner_mood": None}

    partner_id = couple.user2_id if couple.user1_id == current_user.id else couple.user1_id
    today = date.today()

    my_mood_db = db.execute(
        select(Mood).where(
            and_(
                Mood.user_id == current_user.id,
                Mood.created_at >= today,
                Mood.created_at < today + timedelta(days=1)
            )
        )
    ).scalar_one_or_none()

    partner_mood_db = db.execute(
        select(Mood).where(
            and_(
                Mood.user_id == partner_id,
                Mood.created_at >= today,
                Mood.created_at < today + timedelta(days=1)
            )
        )
    ).scalar_one_or_none()

    my_mood = None
    if my_mood_db:
        my_mood = {
            "emoji": my_mood_db.emoji,
            "note": my_mood_db.note,
            "created_at": my_mood_db.created_at.isoformat()
        }
    
    partner_mood = None
    if partner_mood_db:
        partner_mood = {
            "emoji": partner_mood_db.emoji,
            "note": partner_mood_db.note,
            "created_at": partner_mood_db.created_at.isoformat()
        }

    return {"my_mood": my_mood, "partner_mood": partner_mood}

@router.get("/history")
def get_mood_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    couple = db.execute(
        select(Couple).where(
            or_(Couple.user1_id == current_user.id, Couple.user2_id == current_user.id)
        )
    ).scalar_one_or_none()

    if not couple:
        return {"my_moods": [], "partner_moods": []}

    partner_id = couple.user2_id if couple.user1_id == current_user.id else couple.user1_id
    seven_days_ago = date.today() - timedelta(days=7)

    my_moods = db.execute(
        select(Mood).where(
            and_(
                Mood.user_id == current_user.id,
                Mood.created_at >= seven_days_ago
            )
        ).order_by(desc(Mood.created_at))
    ).scalars().all()

    partner_moods = db.execute(
        select(Mood).where(
            and_(
                Mood.user_id == partner_id,
                Mood.created_at >= seven_days_ago
            )
        ).order_by(desc(Mood.created_at))
    ).scalars().all()

    return {
        "my_moods": [{"emoji": m.emoji, "note": m.note, "created_at": m.created_at.isoformat()} for m in my_moods],
        "partner_moods": [{"emoji": m.emoji, "note": m.note, "created_at": m.created_at.isoformat()} for m in partner_moods]
    }
