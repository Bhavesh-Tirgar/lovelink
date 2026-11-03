from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.user import User
from models.couple import Couple
from models.media import Media
from models.love_note import LoveNote
from routers.auth import get_current_user

router = APIRouter()

class ComfortMessageUpdate(BaseModel):
    message: str

class SpotifyUrlUpdate(BaseModel):
    url: str

class ComfortBoxResponse(BaseModel):
    comfort_message: Optional[str] = None
    spotify_url: Optional[str] = None
    pinned_photos: list = []
    latest_note: Optional[dict] = None

async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


@router.get("", response_model=ComfortBoxResponse)
async def get_comfort_box(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    
    # 1. Get latest 3 photos
    photo_result = await db.execute(
        select(Media)
        .where(
            Media.couple_id == str(couple.id),
            Media.file_type == "photo"
        )
        .order_by(desc(Media.created_at))
        .limit(3)
    )
    photos = photo_result.scalars().all()
    
    # 2. Get latest delivered love note received by current user
    note_result = await db.execute(
        select(LoveNote)
        .where(
            LoveNote.couple_id == str(couple.id),
            LoveNote.recipient_id == str(current_user.id),
            LoveNote.delivered_at.isnot(None)
        )
        .order_by(desc(LoveNote.delivered_at))
        .limit(1)
    )
    latest_note = note_result.scalar_one_or_none()
    
    note_dict = None
    if latest_note:
        # Fetch sender info manually to keep it simple
        sender_result = await db.execute(select(User).where(User.id == latest_note.sender_id))
        sender = sender_result.scalar_one_or_none()
        note_dict = {
            "id": latest_note.id,
            "title": latest_note.title,
            "text": latest_note.text,
            "photo_url": latest_note.photo_url,
            "sender_name": sender.name if sender else "Partner",
            "delivered_at": latest_note.delivered_at
        }
    
    return {
        "comfort_message": couple.comfort_message,
        "spotify_url": couple.spotify_url,
        "pinned_photos": [{"id": p.id, "url": p.file_url} for p in photos],
        "latest_note": note_dict
    }

@router.post("/message")
async def update_comfort_message(
    payload: ComfortMessageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    couple.comfort_message = payload.message
    await db.commit()
    return {"status": "success"}

@router.post("/spotify")
async def update_spotify_url(
    payload: SpotifyUrlUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    couple.spotify_url = payload.url
    await db.commit()
    return {"status": "success"}
