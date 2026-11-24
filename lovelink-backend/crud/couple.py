from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from models.couple import Couple


async def get_active_couple_by_user(db: AsyncSession, user_id: str) -> Optional[Couple]:
    """
    Safely retrieves the user's active linked couple first.
    If no linked couple exists, falls back to their most recent pending couple.
    Guarantees that MultipleResultsFound is never raised even if legacy duplicate rows exist.
    """
    # 1. Prefer fully linked active couple (user2_id is not None)
    res = await db.execute(
        select(Couple)
        .where(
            or_(Couple.user1_id == user_id, Couple.user2_id == user_id),
            Couple.user2_id.is_not(None),
        )
        .order_by(Couple.created_at.desc())
    )
    couple = res.scalars().first()
    if couple:
        return couple

    # 2. Fallback to unlinked / pending couple where user is user1 or user2
    res_pending = await db.execute(
        select(Couple)
        .where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
        .order_by(Couple.created_at.desc())
    )
    return res_pending.scalars().first()


async def get_linked_couple_by_user(db: AsyncSession, user_id: str) -> Optional[Couple]:
    """
    Retrieves ONLY a fully linked couple (user2_id is not None).
    Returns None if the user is unlinked or pending.
    """
    res = await db.execute(
        select(Couple)
        .where(
            or_(Couple.user1_id == user_id, Couple.user2_id == user_id),
            Couple.user2_id.is_not(None),
        )
        .order_by(Couple.created_at.desc())
    )
    return res.scalars().first()


async def get_couple_by_id(db: AsyncSession, couple_id: str) -> Optional[Couple]:
    """
    Fetches a couple by primary key ID.
    """
    res = await db.execute(select(Couple).where(Couple.id == couple_id))
    return res.scalars().first()
