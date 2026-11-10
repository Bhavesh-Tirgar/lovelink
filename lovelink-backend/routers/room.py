import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from models.room import CoupleRoom
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()

class StickyNoteCreate(BaseModel):
    text: str
    color: Optional[str] = "yellow"

class WallPhotoCreate(BaseModel):
    url: str
    caption: Optional[str] = "Our Favorite Moment"

class AvatarActionRequest(BaseModel):
    action: str # "couch", "bed", "window", "fireplace", "reading"

class RoomThemeRequest(BaseModel):
    theme: Optional[str] = None
    flooring: Optional[str] = None

async def _get_or_create_room(db: AsyncSession, couple_id: str) -> CoupleRoom:
    res = await db.execute(select(CoupleRoom).where(CoupleRoom.couple_id == couple_id))
    room = res.scalar_one_or_none()
    if not room:
        room = CoupleRoom(
            couple_id=couple_id,
            sticky_notes=[
                {
                    "id": str(uuid.uuid4()),
                    "text": "Welcome to our cozy virtual home! 💕",
                    "color": "pink",
                    "author": "LoveLink",
                    "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
                }
            ],
            wall_photos=[]
        )
        db.add(room)
        await db.commit()
        await db.refresh(room)
    return room

async def _get_user_couple(db: AsyncSession, user_id: str) -> Couple:
    res = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = res.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You must be linked with a partner first")
    return couple

@router.get("")
async def get_room(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    # Get partner user info
    partner_id = couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id
    res_p = await db.execute(select(User).where(User.id == partner_id))
    partner = res_p.scalar_one_or_none()

    is_user1 = str(couple.user1_id) == str(current_user.id)

    return {
        "id": room.id,
        "couple_id": room.couple_id,
        "theme": room.theme,
        "flooring": room.flooring,
        "plant_name": room.plant_name,
        "plant_level": room.plant_level,
        "plant_watered_at": room.plant_watered_at.isoformat() if room.plant_watered_at else None,
        "plant_watered_by": room.plant_watered_by,
        "pet_name": room.pet_name,
        "pet_type": room.pet_type,
        "pet_happiness": room.pet_happiness,
        "sticky_notes": room.sticky_notes or [],
        "wall_photos": room.wall_photos or [],
        "music_playing": room.music_playing,
        "current_track": room.current_track,
        "my_action": room.user1_action if is_user1 else room.user2_action,
        "partner_action": room.user2_action if is_user1 else room.user1_action,
        "my_name": current_user.name,
        "partner_name": partner.name if partner else "Partner",
    }

@router.post("/water-plant")
async def water_plant(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    room.plant_watered_at = datetime.utcnow()
    room.plant_watered_by = current_user.name
    if room.plant_level < 10:
        room.plant_level += 1

    await db.commit()
    await db.refresh(room)

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "water_plant",
        "plant_level": room.plant_level,
        "watered_by": current_user.name,
        "message": f"{current_user.name} watered your love plant! 🌱✨"
    })

    return {"message": "Plant watered!", "plant_level": room.plant_level}

@router.post("/pet")
async def pet_animal(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    room.pet_petted_at = datetime.utcnow()
    room.pet_happiness = min(100, (room.pet_happiness or 50) + 10)

    await db.commit()
    await db.refresh(room)

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "pet_animal",
        "pet_happiness": room.pet_happiness,
        "pet_by": current_user.name,
        "message": f"{current_user.name} cuddled {room.pet_name}! 🐾❤️"
    })

    return {"message": f"You loved {room.pet_name}!", "pet_happiness": room.pet_happiness}

@router.post("/sticky-note")
async def add_sticky_note(
    payload: StickyNoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    notes = list(room.sticky_notes or [])
    new_note = {
        "id": str(uuid.uuid4()),
        "text": payload.text.strip(),
        "color": payload.color or "yellow",
        "author": current_user.name,
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    }
    notes.insert(0, new_note)
    # keep last 20
    room.sticky_notes = notes[:20]

    await db.commit()
    await db.refresh(room)

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "new_sticky_note",
        "note": new_note,
        "message": f"{current_user.name} stuck a new note on the fridge! 📝"
    })

    return new_note

@router.delete("/sticky-note/{note_id}")
async def delete_sticky_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    notes = [n for n in (room.sticky_notes or []) if n.get("id") != note_id]
    room.sticky_notes = notes

    await db.commit()

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "delete_sticky_note",
        "note_id": note_id
    })

    return {"deleted": True}

@router.post("/avatar")
async def set_avatar_action(
    payload: AvatarActionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    is_user1 = str(couple.user1_id) == str(current_user.id)
    if is_user1:
        room.user1_action = payload.action
    else:
        room.user2_action = payload.action

    await db.commit()

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "avatar_moved",
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "new_action": payload.action
    })

    return {"action": payload.action}

@router.post("/wall-photo")
async def add_wall_photo(
    payload: WallPhotoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    photos = list(room.wall_photos or [])
    new_photo = {
        "id": str(uuid.uuid4()),
        "url": payload.url,
        "caption": payload.caption or "Our Memory",
        "added_by": current_user.name
    }
    photos.insert(0, new_photo)
    room.wall_photos = photos[:8] # max 8 frames

    await db.commit()

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "framed_photo",
        "photo": new_photo,
        "message": f"{current_user.name} framed a new photo on the wall! 🖼️"
    })

    return new_photo

@router.post("/theme")
async def change_theme(
    payload: RoomThemeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    if payload.theme:
        room.theme = payload.theme
    if payload.flooring:
        room.flooring = payload.flooring

    await db.commit()

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "theme_changed",
        "theme": room.theme,
        "flooring": room.flooring
    })

    return {"theme": room.theme, "flooring": room.flooring}

@router.post("/music-toggle")
async def toggle_jukebox(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_user_couple(db, current_user.id)
    room = await _get_or_create_room(db, couple.id)

    room.music_playing = not room.music_playing
    await db.commit()

    await manager.broadcast(str(couple.id), {
        "type": "room_update",
        "action": "jukebox_toggled",
        "music_playing": room.music_playing,
        "by": current_user.name
    })

    return {"music_playing": room.music_playing}
