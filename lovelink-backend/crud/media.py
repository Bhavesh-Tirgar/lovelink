import uuid
import os
import io
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, extract, and_, func
import boto3

from models.media import Media, FileType
from models.album import Album
from schemas.media import MediaResponse, AlbumResponse

# R2 client (same env vars as chat.py)
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


def _hydrate(m: Media) -> Media:
    m.uploader_name = m.uploader.name if m.uploader else "Unknown"
    return m


def _key_from_url(url: str) -> Optional[str]:
    """Extract R2 object key from public URL."""
    if R2_PUBLIC_URL and url.startswith(R2_PUBLIC_URL):
        return url[len(R2_PUBLIC_URL):].lstrip("/")
    return None


async def upload_media(
    db: AsyncSession,
    couple_id: str,
    uploaded_by: str,
    file_url: str,
    thumbnail_url: Optional[str],
    file_type: FileType,
    caption: Optional[str] = None,
    taken_at: Optional[datetime] = None,
    album_id: Optional[str] = None,
) -> Media:
    item = Media(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        uploaded_by=uploaded_by,
        file_url=file_url,
        thumbnail_url=thumbnail_url,
        file_type=file_type,
        caption=caption,
        taken_at=taken_at,
        album_id=album_id,
    )
    db.add(item)
    await db.commit()

    result = await db.execute(
        select(Media).options(joinedload(Media.uploader)).where(Media.id == item.id)
    )
    return _hydrate(result.scalar_one())


async def get_media(
    db: AsyncSession,
    couple_id: str,
    album_id: Optional[str] = None,
    file_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 24,
) -> List[Media]:
    q = (
        select(Media)
        .options(joinedload(Media.uploader))
        .where(Media.couple_id == couple_id)
    )
    if album_id:
        q = q.where(Media.album_id == album_id)
    if file_type:
        q = q.where(Media.file_type == file_type)
    q = q.order_by(Media.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(q)
    return [_hydrate(m) for m in result.scalars().all()]


async def get_on_this_day(db: AsyncSession, couple_id: str) -> List[Media]:
    today = datetime.utcnow()
    q = (
        select(Media)
        .options(joinedload(Media.uploader))
        .where(
            and_(
                Media.couple_id == couple_id,
                Media.file_type == FileType.photo,
                extract("month", Media.taken_at) == today.month,
                extract("day", Media.taken_at) == today.day,
                extract("year", Media.taken_at) < today.year,
            )
        )
        .order_by(Media.taken_at.desc())
    )
    result = await db.execute(q)
    return [_hydrate(m) for m in result.scalars().all()]


async def delete_media(db: AsyncSession, media_id: str, user_id: str) -> bool:
    result = await db.execute(select(Media).where(Media.id == media_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    if str(item.uploaded_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Only the uploader can delete this")
    # Delete from R2
    for url in [item.file_url, item.thumbnail_url]:
        if url:
            key = _key_from_url(url)
            if key and CLOUDFLARE_ACCOUNT_ID:
                try:
                    s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
                except Exception as e:
                    print(f"R2 delete warning: {e}")
    await db.delete(item)
    await db.commit()
    return True


async def create_album(
    db: AsyncSession, couple_id: str, created_by: str, name: str
) -> Album:
    album = Album(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        created_by=created_by,
        name=name,
    )
    db.add(album)
    await db.commit()
    await db.refresh(album)
    return album


async def get_albums(db: AsyncSession, couple_id: str) -> List[dict]:
    result = await db.execute(
        select(Album).where(Album.couple_id == couple_id).order_by(Album.created_at.asc())
    )
    albums = result.scalars().all()
    out = []
    for album in albums:
        count_res = await db.execute(
            select(func.count()).where(Media.album_id == album.id)
        )
        count = count_res.scalar() or 0
        # Resolve cover_url
        cover_url = None
        if album.cover_photo_id:
            cr = await db.execute(select(Media.file_url).where(Media.id == album.cover_photo_id))
            cover_url = cr.scalar_one_or_none()
        if not cover_url:
            # Use first photo in album as implicit cover
            fr = await db.execute(
                select(Media.thumbnail_url, Media.file_url)
                .where(Media.album_id == album.id)
                .order_by(Media.created_at.asc())
                .limit(1)
            )
            row = fr.first()
            if row:
                cover_url = row[0] or row[1]
        out.append(AlbumResponse(
            id=album.id,
            couple_id=album.couple_id,
            created_by=album.created_by,
            name=album.name,
            cover_photo_id=album.cover_photo_id,
            created_at=album.created_at,
            photo_count=count,
            cover_url=cover_url,
        ))
    return out


async def update_album_cover(db: AsyncSession, album_id: str, cover_photo_id: str) -> Album:
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    album.cover_photo_id = cover_photo_id
    await db.commit()
    await db.refresh(album)
    return album


async def delete_album(db: AsyncSession, album_id: str, user_id: str) -> bool:
    result = await db.execute(select(Album).where(Album.id == album_id))
    album = result.scalar_one_or_none()
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    if str(album.created_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Only the creator can delete this album")
    # Unlink media items
    await db.execute(
        Media.__table__.update().where(Media.album_id == album_id).values(album_id=None)  # type: ignore
    )
    await db.delete(album)
    await db.commit()
    return True


async def assign_to_album(
    db: AsyncSession, media_id: str, album_id: Optional[str], user_id: str
) -> Media:
    result = await db.execute(
        select(Media).options(joinedload(Media.uploader)).where(Media.id == media_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Media not found")
    item.album_id = album_id
    await db.commit()
    await db.refresh(item)
    return _hydrate(item)
