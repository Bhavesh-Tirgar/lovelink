import os
import io
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import boto3

from database import get_db
from models.user import User
from models.couple import Couple
from models.media import FileType
from routers.auth import get_current_user
from schemas.media import MediaResponse, AlbumCreate, AlbumResponse
from crud.media import (
    upload_media, get_media, get_on_this_day, delete_media,
    create_album, get_albums, update_album_cover, delete_album, assign_to_album,
)

router = APIRouter()

# ── R2 client ─────────────────────────────────────────────────────────────────
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

IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
VIDEO_EXTS = {"mp4", "mov", "avi", "webm"}


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
BASE_URL = os.getenv("API_BASE_URL", "https://lovelink-sfzx.onrender.com")

def _upload_to_r2(file_obj, key: str, content_type: str) -> str:
    if CLOUDFLARE_ACCOUNT_ID and s3_client and R2_PUBLIC_URL:
        try:
            s3_client.upload_fileobj(
                file_obj, R2_BUCKET_NAME, key,
                ExtraArgs={"ContentType": content_type},
            )
            return f"{R2_PUBLIC_URL.rstrip('/')}/{key}"
        except Exception as e:
            print(f"R2 upload failed: {e}")

    # Fallback to local static storage served via /uploads
    local_path = os.path.join(UPLOAD_DIR, key)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    file_obj.seek(0)
    with open(local_path, "wb") as f:
        f.write(file_obj.read())
    return f"{BASE_URL.rstrip('/')}/uploads/{key}"


def _make_thumbnail(file_bytes: bytes) -> Optional[bytes]:
    """Resize image to max 600px wide, quality 85, return JPEG bytes."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(file_bytes))
        img = img.convert("RGB")
        max_w = 600
        if img.width > max_w:
            ratio = max_w / img.width
            img = img.resize((max_w, int(img.height * ratio)), Image.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85, optimize=True)
        return buf.getvalue()
    except Exception as e:
        print(f"Thumbnail generation failed: {e}")
        return None


# ── POST /media/upload ─────────────────────────────────────────────────────────
@router.post("/upload", response_model=MediaResponse, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    album_id: Optional[str] = Form(None),
    taken_at: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()

    if ext in IMAGE_EXTS:
        file_type = FileType.photo
    elif ext in VIDEO_EXTS:
        file_type = FileType.video
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    file_bytes = await file.read()
    file_id = str(uuid.uuid4())
    key = f"media/{couple.id}/{file_id}.{ext}"
    content_type = file.content_type or "application/octet-stream"

    file_url = _upload_to_r2(io.BytesIO(file_bytes), key, content_type)

    # Thumbnail for images
    thumbnail_url = None
    if file_type == FileType.photo:
        thumb_bytes = _make_thumbnail(file_bytes)
        if thumb_bytes:
            thumb_key = f"media/{couple.id}/thumb_{file_id}.jpg"
            thumbnail_url = _upload_to_r2(io.BytesIO(thumb_bytes), thumb_key, "image/jpeg")

    # Parse taken_at
    parsed_taken_at = None
    if taken_at:
        try:
            parsed_taken_at = datetime.fromisoformat(taken_at.replace("Z", "+00:00"))
        except Exception:
            pass

    item = await upload_media(
        db=db,
        couple_id=str(couple.id),
        uploaded_by=str(current_user.id),
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        file_type=file_type,
        caption=caption,
        taken_at=parsed_taken_at,
        album_id=album_id or None,
    )
    resp = MediaResponse.model_validate(item)
    resp.uploader_name = item.uploader_name
    return resp


# ── GET /media ─────────────────────────────────────────────────────────────────
@router.get("", response_model=List[MediaResponse])
async def list_media(
    album_id: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    items = await get_media(db, str(couple.id), album_id=album_id, file_type=file_type, skip=skip, limit=limit)
    return [MediaResponse.model_validate(m) for m in items]


# ── GET /media/on-this-day ─────────────────────────────────────────────────────
@router.get("/on-this-day")
async def on_this_day(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    items = await get_on_this_day(db, str(couple.id))

    # Group by year
    grouped: dict = {}
    for m in items:
        year = (m.taken_at or m.created_at).year
        grouped.setdefault(year, []).append(MediaResponse.model_validate(m))

    return [
        {"year": y, "photos": photos}
        for y, photos in sorted(grouped.items(), reverse=True)
    ]


# ── DELETE /media/{media_id} ───────────────────────────────────────────────────
@router.delete("/{media_id}")
async def remove_media(
    media_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_media(db, media_id, str(current_user.id))
    return {"deleted": True}


# ── GET /albums ────────────────────────────────────────────────────────────────
@router.get("/albums", response_model=List[AlbumResponse])
async def list_albums(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    return await get_albums(db, str(couple.id))


# ── POST /albums ───────────────────────────────────────────────────────────────
@router.post("/albums", response_model=AlbumResponse, status_code=201)
async def add_album(
    payload: AlbumCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    album = await create_album(db, str(couple.id), str(current_user.id), payload.name)
    return AlbumResponse(
        id=album.id,
        couple_id=album.couple_id,
        created_by=album.created_by,
        name=album.name,
        cover_photo_id=album.cover_photo_id,
        created_at=album.created_at,
        photo_count=0,
        cover_url=None,
    )


# ── DELETE /albums/{album_id} ──────────────────────────────────────────────────
@router.delete("/albums/{album_id}")
async def remove_album(
    album_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_album(db, album_id, str(current_user.id))
    return {"deleted": True}


# ── PUT /media/{media_id}/album ────────────────────────────────────────────────
@router.put("/{media_id}/album", response_model=MediaResponse)
async def set_album(
    media_id: str,
    body: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    album_id = body.get("album_id")
    item = await assign_to_album(db, media_id, album_id, str(current_user.id))
    return MediaResponse.model_validate(item)


# ── PUT /albums/{album_id}/cover ───────────────────────────────────────────────
@router.put("/albums/{album_id}/cover", response_model=AlbumResponse)
async def set_cover(
    album_id: str,
    body: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cover_photo_id = body.get("cover_photo_id")
    album = await update_album_cover(db, album_id, cover_photo_id)
    albums = await get_albums(db, album.couple_id)
    for a in albums:
        if a.id == album_id:
            return a
    raise HTTPException(status_code=404, detail="Album not found after update")
