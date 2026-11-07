import uuid
from datetime import datetime
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select

from models.call_log import CallLogLegacy as CallLog, CallType, CallStatus


def _hydrate(c: CallLog) -> CallLog:
    c.caller_name = c.caller.name if c.caller else "Unknown"
    c.caller_photo = getattr(c.caller, "photo_url", None)
    return c


async def create_call(
    db: AsyncSession,
    couple_id: str,
    started_by: str,
    room_id: str,
    call_type: CallType = CallType.video,
) -> CallLog:
    call = CallLog(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        started_by=started_by,
        room_id=room_id,
        call_type=call_type,
        status=CallStatus.initiated,
    )
    db.add(call)
    await db.commit()

    result = await db.execute(
        select(CallLog).options(joinedload(CallLog.caller)).where(CallLog.id == call.id)
    )
    return _hydrate(result.scalar_one())


async def get_call(db: AsyncSession, call_id: str) -> CallLog:
    result = await db.execute(
        select(CallLog).options(joinedload(CallLog.caller)).where(CallLog.id == call_id)
    )
    call = result.scalar_one_or_none()
    return _hydrate(call) if call else None


async def answer_call_db(db: AsyncSession, call_id: str) -> CallLog:
    result = await db.execute(
        select(CallLog).options(joinedload(CallLog.caller)).where(CallLog.id == call_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        return None

    call.status = CallStatus.answered
    await db.commit()
    await db.refresh(call)
    return _hydrate(call)


async def end_call(db: AsyncSession, call_id: str, status: CallStatus) -> CallLog:
    result = await db.execute(
        select(CallLog).options(joinedload(CallLog.caller)).where(CallLog.id == call_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        return None

    call.ended_at = datetime.utcnow()
    # Ensure timezone awareness consistency if started_at is timezone-aware
    now_ts = call.ended_at.replace(tzinfo=call.started_at.tzinfo) if call.started_at.tzinfo else call.ended_at

    duration = (now_ts - call.started_at).total_seconds()
    call.duration_secs = int(max(0, duration))
    call.status = status

    await db.commit()
    await db.refresh(call)
    return _hydrate(call)


async def get_call_history(db: AsyncSession, couple_id: str, limit: int = 20) -> List[CallLog]:
    result = await db.execute(
        select(CallLog)
        .options(joinedload(CallLog.caller))
        .where(CallLog.couple_id == couple_id)
        .order_by(CallLog.started_at.desc())
        .limit(limit)
    )
    return [_hydrate(c) for c in result.scalars().all()]
