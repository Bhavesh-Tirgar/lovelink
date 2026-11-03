import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.countdown import Countdown


async def get_countdowns(db: AsyncSession, couple_id: str) -> List[Countdown]:
    result = await db.execute(
        select(Countdown)
        .where(Countdown.couple_id == couple_id)
        .order_by(Countdown.target_date.asc())
    )
    return list(result.scalars().all())


async def create_countdown(
    db: AsyncSession,
    couple_id: str,
    created_by: str,
    label: str,
    emoji: str,
    target_date: datetime,
) -> Countdown:
    countdown = Countdown(
        id=str(uuid.uuid4()),
        couple_id=couple_id,
        created_by=created_by,
        label=label,
        emoji=emoji,
        target_date=target_date,
    )
    db.add(countdown)
    await db.commit()
    await db.refresh(countdown)
    return countdown


async def delete_countdown(db: AsyncSession, countdown_id: str, user_id: str) -> bool:
    result = await db.execute(
        select(Countdown).where(Countdown.id == countdown_id)
    )
    countdown = result.scalar_one_or_none()
    if countdown is None:
        raise HTTPException(status_code=404, detail="Countdown not found")
    if str(countdown.created_by) != str(user_id):
        raise HTTPException(status_code=403, detail="Only the creator can delete this countdown")
    await db.delete(countdown)
    await db.commit()
    return True
