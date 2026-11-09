import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, update, and_
from models.love_note import LoveNote


def _hydrate(note: LoveNote) -> LoveNote:
    """Attach transient sender_name / sender_photo from the joined User."""
    note.sender_name = note.sender.name if note.sender else "Unknown"
    note.sender_photo = note.sender.photo_url if note.sender else None
    return note


async def create_note(
    db: AsyncSession,
    couple_id: str,
    sender_id: str,
    recipient_id: str,
    text: str,
    title: Optional[str] = None,
    photo_url: Optional[str] = None,
    scheduled_at: Optional[datetime] = None,
    is_capsule: bool = False,
    open_at: Optional[datetime] = None,
    is_secret: bool = False,
    secret_ciphertext: Optional[str] = None,
    secret_iv: Optional[str] = None,
    is_ephemeral: bool = False,
    burn_after_seconds: Optional[int] = None,
) -> LoveNote:
    # Basic message delivered immediately unless scheduled
    is_scheduled = scheduled_at is not None or is_capsule
    delivered_at = None if is_scheduled else datetime.utcnow()

    note = LoveNote(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        sender_id=sender_id,
        recipient_id=recipient_id,
        title=title,
        text=text,
        photo_url=photo_url,
        is_secret=is_secret,
        secret_ciphertext=secret_ciphertext,
        secret_iv=secret_iv,
        is_ephemeral=is_ephemeral,
        burn_after_seconds=burn_after_seconds,
        is_scheduled=is_scheduled,
        scheduled_at=scheduled_at if scheduled_at else (open_at if is_capsule else None),
        delivered_at=delivered_at,
        is_capsule=is_capsule,
        open_at=open_at
    )
    db.add(note)
    await db.commit()

    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(LoveNote.id == note.id)
    )
    note = result.scalar_one()
    return _hydrate(note)


async def get_inbox(
    db: AsyncSession,
    user_id: str,
    couple_id: str,
    skip: int = 0,
    limit: int = 20,
) -> List[LoveNote]:
    # Normal inbox excludes capsules completely. Capsules have their own UI space.
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(
            and_(
                LoveNote.recipient_id == user_id,
                LoveNote.couple_id == couple_id,
                LoveNote.delivered_at.isnot(None),
                LoveNote.is_capsule == False,
            )
        )
        .order_by(LoveNote.delivered_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notes = result.scalars().all()
    return [_hydrate(n) for n in notes]


async def get_capsules(
    db: AsyncSession,
    couple_id: str,
) -> List[LoveNote]:
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(
            and_(
                LoveNote.couple_id == couple_id,
                LoveNote.is_capsule == True,
            )
        )
        .order_by(LoveNote.open_at.asc())
    )
    notes = result.scalars().all()
    return [_hydrate(n) for n in notes]


async def get_sent(
    db: AsyncSession,
    user_id: str,
    skip: int = 0,
    limit: int = 20,
) -> List[LoveNote]:
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(LoveNote.sender_id == user_id)
        .order_by(LoveNote.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    notes = result.scalars().all()
    return [_hydrate(n) for n in notes]


async def get_pending_scheduled(db: AsyncSession) -> List[LoveNote]:
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(
            and_(
                LoveNote.is_scheduled == True,
                LoveNote.scheduled_at <= datetime.utcnow(),
                LoveNote.delivered_at.is_(None),
            )
        )
    )
    return list(result.scalars().all())


async def mark_note_read(db: AsyncSession, note_id: str, user_id: str) -> Optional[LoveNote]:
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(LoveNote.id == note_id)
    )
    note = result.scalar_one_or_none()
    if note is None:
        return None
    if str(note.recipient_id) == str(user_id) and not note.is_read:
        note.is_read = True
        note.read_at = datetime.utcnow()
        await db.commit()
        await db.refresh(note)
    return _hydrate(note)


async def burn_note(db: AsyncSession, note_id: str) -> Optional[LoveNote]:
    """Permanently burn/destroy the ephemeral note content."""
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(LoveNote.id == note_id)
    )
    note = result.scalar_one_or_none()
    if not note:
        return None
    note.is_burned = True
    note.burned_at = datetime.utcnow()
    note.text = "🔥 [This note has self-destructed]"
    note.title = "🔥 Self-Destructed Note"
    note.photo_url = None
    note.secret_ciphertext = None
    note.secret_iv = None
    await db.commit()
    await db.refresh(note)
    return _hydrate(note)


async def deliver_note(db: AsyncSession, note_id: str) -> Optional[LoveNote]:
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(LoveNote.id == note_id)
    )
    note = result.scalar_one_or_none()
    if note and note.delivered_at is None:
        note.delivered_at = datetime.utcnow()
        await db.commit()
        await db.refresh(note)
    return _hydrate(note) if note else None


async def get_note_by_id(db: AsyncSession, note_id: str) -> Optional[LoveNote]:
    result = await db.execute(
        select(LoveNote)
        .options(joinedload(LoveNote.sender), joinedload(LoveNote.recipient))
        .where(LoveNote.id == note_id)
    )
    note = result.scalar_one_or_none()
    return _hydrate(note) if note else None


async def delete_note(db: AsyncSession, note_id: str) -> bool:
    result = await db.execute(select(LoveNote).where(LoveNote.id == note_id))
    note = result.scalar_one_or_none()
    if note:
        await db.delete(note)
        await db.commit()
        return True
    return False


async def get_unread_count(db: AsyncSession, user_id: str, couple_id: str) -> int:
    result = await db.execute(
        select(LoveNote)
        .where(
            and_(
                LoveNote.recipient_id == user_id,
                LoveNote.couple_id == couple_id,
                LoveNote.delivered_at.isnot(None),
                LoveNote.is_read == False,
            )
        )
    )
    return len(result.scalars().all())
