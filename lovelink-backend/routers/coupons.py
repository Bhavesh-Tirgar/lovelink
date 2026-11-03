from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from routers.auth import get_current_user
from schemas.coupon import CouponCreate, CouponResponse
from crud.coupon import (
    create_coupon,
    get_coupons,
    get_coupon,
    scratch_coupon,
    redeem_coupon,
    delete_coupon
)
from ws_manager.manager import manager

router = APIRouter()

async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple

@router.post("", response_model=CouponResponse, status_code=201)
async def create_new_coupon(
    payload: CouponCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    coupon = await create_coupon(
        db=db,
        couple_id=str(couple.id),
        created_by=str(current_user.id),
        title=payload.title,
        description=payload.description
    )
    
    # Notify partner they got a new scratch-off coupon!
    await manager.broadcast(str(couple.id), {
        "type": "new_coupon",
        "coupon_id": coupon.id,
        "title": coupon.title
    }, exclude=None)
    
    return coupon

@router.get("", response_model=List[CouponResponse])
async def list_coupons(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    return await get_coupons(db, str(couple.id))

@router.put("/{coupon_id}/scratch", response_model=CouponResponse)
async def scratch_off(
    coupon_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    coupon = await get_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    couple = await _get_couple(db, str(current_user.id))
    if coupon.couple_id != str(couple.id):
        raise HTTPException(status_code=403, detail="Access denied")
        
    # Only the receiver should technically scratch it, but we'll let either do it for fun
    scratched = await scratch_coupon(db, coupon_id)
    
    await manager.broadcast(str(couple.id), {
        "type": "coupon_scratched",
        "coupon_id": coupon_id
    }, exclude=None)
    
    return scratched

@router.put("/{coupon_id}/redeem", response_model=CouponResponse)
async def redeem(
    coupon_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    coupon = await get_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    couple = await _get_couple(db, str(current_user.id))
    if coupon.couple_id != str(couple.id):
        raise HTTPException(status_code=403, detail="Access denied")
        
    redeemed = await redeem_coupon(db, coupon_id)
    
    await manager.broadcast(str(couple.id), {
        "type": "coupon_redeemed",
        "coupon_id": coupon_id
    }, exclude=None)
    
    return redeemed

@router.delete("/{coupon_id}", status_code=204)
async def remove_coupon(
    coupon_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    coupon = await get_coupon(db, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
        
    if coupon.created_by != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only creator can delete")
        
    await delete_coupon(db, coupon_id)
