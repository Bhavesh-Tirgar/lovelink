from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from models.coupon import LoveCoupon
from datetime import datetime

async def create_coupon(
    db: AsyncSession,
    couple_id: str,
    created_by: str,
    title: str,
    description: str
) -> LoveCoupon:
    coupon = LoveCoupon(
        couple_id=couple_id,
        created_by=created_by,
        title=title,
        description=description
    )
    db.add(coupon)
    await db.commit()
    
    query = select(LoveCoupon).options(joinedload(LoveCoupon.creator)).where(LoveCoupon.id == coupon.id)
    res = await db.execute(query)
    coupon = res.scalar_one()
    coupon.creator_name = coupon.creator.name if coupon.creator else None
    return coupon

async def get_coupons(db: AsyncSession, couple_id: str) -> List[LoveCoupon]:
    query = select(LoveCoupon).options(joinedload(LoveCoupon.creator)).where(LoveCoupon.couple_id == couple_id).order_by(LoveCoupon.created_at.desc())
    res = await db.execute(query)
    coupons = res.scalars().all()
    for c in coupons:
        c.creator_name = c.creator.name if c.creator else None
    return coupons

async def get_coupon(db: AsyncSession, coupon_id: str) -> Optional[LoveCoupon]:
    query = select(LoveCoupon).options(joinedload(LoveCoupon.creator)).where(LoveCoupon.id == coupon_id)
    res = await db.execute(query)
    coupon = res.scalar_one_or_none()
    if coupon:
        coupon.creator_name = coupon.creator.name if coupon.creator else None
    return coupon

async def scratch_coupon(db: AsyncSession, coupon_id: str) -> Optional[LoveCoupon]:
    coupon = await get_coupon(db, coupon_id)
    if coupon and not coupon.is_scratched:
        coupon.is_scratched = True
        coupon.scratched_at = datetime.utcnow()
        await db.commit()
        await db.refresh(coupon)
    return coupon

async def redeem_coupon(db: AsyncSession, coupon_id: str) -> Optional[LoveCoupon]:
    coupon = await get_coupon(db, coupon_id)
    if coupon and not coupon.is_redeemed:
        coupon.is_redeemed = True
        coupon.redeemed_at = datetime.utcnow()
        await db.commit()
        await db.refresh(coupon)
    return coupon

async def delete_coupon(db: AsyncSession, coupon_id: str) -> bool:
    coupon = await get_coupon(db, coupon_id)
    if coupon:
        await db.delete(coupon)
        await db.commit()
        return True
    return False
