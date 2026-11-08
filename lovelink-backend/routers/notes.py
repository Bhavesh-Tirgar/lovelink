import os
import uuid
import boto3
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from routers.auth import get_current_user
from schemas.love_note import NoteCreate, NoteResponse
from crud.love_note import (
    create_note,
    get_inbox,
    get_capsules,
    get_sent,
    get_note_by_id,
    mark_note_read,
    delete_note,
    get_unread_count,
)
from ws_manager.manager import manager

router = APIRouter()

# ── R2 / S3 client (shared env vars) ─────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_R2_ACCESS_KEY = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY", "")
CLOUDFLARE_R2_SECRET_KEY = os.environ.get("CLOUDFLARE_R2_SECRET_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "lovelink")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")

s3_client = boto3.client(
    service_name="s3",
    endpoint_url=f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" if CLOUDFLARE_ACCOUNT_ID else None,
    aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY,
    aws_secret_access_key=CLOUDFLARE_R2_SECRET_KEY,
    region_name="auto",
)


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(
            or_(Couple.user1_id == user_id, Couple.user2_id == user_id)
        )
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


# ── POST /notes ───────────────────────────────────────────────────────────────
@router.post("", response_model=NoteResponse, status_code=201)
async def send_note(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))

    # Determine recipient — the OTHER user in the couple
    if str(current_user.id) == str(couple.user1_id):
        recipient_id = couple.user2_id
    else:
        recipient_id = couple.user1_id

    if recipient_id is None:
        raise HTTPException(status_code=400, detail="Your partner hasn't joined yet")

    note = await create_note(
        db=db,
        couple_id=str(couple.id),
        sender_id=str(current_user.id),
        recipient_id=str(recipient_id),
        title=payload.title,
        text=payload.text,
        photo_url=payload.photo_url,
        scheduled_at=payload.scheduled_at,
    )

    # If delivered immediately, broadcast to both users in the couple room
    if note.delivered_at is not None:
        note_data = NoteResponse.model_validate(note).model_dump(mode="json")
        await manager.broadcast(str(couple.id), {"type": "new_note", "note": note_data})

    return note


# ── GET /notes/inbox ──────────────────────────────────────────────────────────
@router.get("/inbox", response_model=List[NoteResponse])
async def inbox(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    return await get_inbox(db, str(current_user.id), str(couple.id), skip=skip, limit=limit)

# ── POST /notes/capsule ───────────────────────────────────────────────────────
@router.post("/capsule", response_model=NoteResponse, status_code=201)
async def create_capsule(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    if str(current_user.id) == str(couple.user1_id):
        recipient_id = couple.user2_id
    else:
        recipient_id = couple.user1_id

    if not payload.open_at:
        raise HTTPException(status_code=400, detail="Time Capsules require an unlock date (open_at)")

    note = await create_note(
        db=db,
        couple_id=str(couple.id),
        sender_id=str(current_user.id),
        recipient_id=str(recipient_id),
        title=payload.title,
        text=payload.text,
        photo_url=payload.photo_url,
        is_capsule=True,
        open_at=payload.open_at
    )
    return note

# ── GET /notes/capsules ───────────────────────────────────────────────────────
@router.get("/capsules", response_model=List[NoteResponse])
async def list_capsules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    return await get_capsules(db, str(couple.id))


# ── GET /notes/sent ───────────────────────────────────────────────────────────
@router.get("/sent", response_model=List[NoteResponse])
async def sent(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_sent(db, str(current_user.id), skip=skip, limit=limit)


# ── GET /notes/unread-count ───────────────────────────────────────────────────
@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    count = await get_unread_count(db, str(current_user.id), str(couple.id))
    return {"unread_count": count}


# ── GET /notes/{note_id} ──────────────────────────────────────────────────────
@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await get_note_by_id(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    couple = await _get_couple(db, str(current_user.id))
    if str(note.couple_id) != str(couple.id):
        raise HTTPException(status_code=403, detail="Access denied")

    # Auto mark as read if recipient opens it
    if str(note.recipient_id) == str(current_user.id) and not note.is_read:
        note = await mark_note_read(db, note_id, str(current_user.id))

    return note


# ── DELETE /notes/{note_id} ───────────────────────────────────────────────────
@router.delete("/{note_id}", status_code=204)
async def remove_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await get_note_by_id(db, note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if str(note.sender_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the sender can delete a note")
    await delete_note(db, note_id)


# ── POST /notes/upload-photo ──────────────────────────────────────────────────
@router.post("/upload-photo")
async def upload_note_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))

    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    valid_exts = {"jpg", "jpeg", "png", "gif", "webp"}
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail="Only jpg, png, gif, webp images are supported")

    file_id = str(uuid.uuid4())
    object_key = f"notes/{couple.id}/{file_id}.{ext}"

    try:
        if CLOUDFLARE_ACCOUNT_ID:
            s3_client.upload_fileobj(
                file.file,
                R2_BUCKET_NAME,
                object_key,
                ExtraArgs={"ContentType": file.content_type},
            )
            photo_url = f"{R2_PUBLIC_URL}/{object_key}"
        else:
            photo_url = f"https://lovelink-sfzx.onrender.com/uploads/{object_key}"
    except Exception as e:
        print(f"R2 upload error: {e}")
        raise HTTPException(status_code=500, detail="Could not upload photo")

    return {"photo_url": photo_url}
