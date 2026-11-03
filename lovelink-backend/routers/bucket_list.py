import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from zoneinfo import ZoneInfo

from database import get_db
from models.user import User
from models.couple import Couple
from models.bucket_list import BucketListItem
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()


class BucketListCreate(BaseModel):
    text: str


class BucketListResponse(BaseModel):
    id: str
    couple_id: str
    added_by: str
    text: str
    completed: bool
    completed_at: Optional[datetime]
    completed_by: Optional[str]
    created_at: datetime


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


@router.get("", response_model=List[BucketListResponse])
async def get_bucket_list(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    result = await db.execute(
        select(BucketListItem)
        .where(BucketListItem.couple_id == str(couple.id))
        .order_by(desc(BucketListItem.created_at))
    )
    return result.scalars().all()


@router.post("", response_model=BucketListResponse)
async def create_bucket_list_item(
    payload: BucketListCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    
    item = BucketListItem(
        couple_id=str(couple.id),
        added_by=str(current_user.id),
        text=payload.text
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    return item


@router.put("/{item_id}/complete", response_model=BucketListResponse)
async def complete_bucket_list_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    
    result = await db.execute(
        select(BucketListItem)
        .where(BucketListItem.id == item_id, BucketListItem.couple_id == str(couple.id))
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Bucket list item not found")
        
    if item.completed:
        raise HTTPException(status_code=400, detail="Item is already completed")
        
    item.completed = True
    item.completed_at = datetime.now(ZoneInfo("UTC"))
    item.completed_by = str(current_user.id)
    
    await db.commit()
    await db.refresh(item)
    
    await manager.broadcast(
        str(couple.id),
        {
            "type": "bucket_complete",
            "item_id": item_id,
            "text": item.text
        }
    )
    
    return item


@router.delete("/{item_id}")
async def delete_bucket_list_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    
    result = await db.execute(
        select(BucketListItem)
        .where(BucketListItem.id == item_id, BucketListItem.couple_id == str(couple.id))
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(status_code=404, detail="Bucket list item not found")
        
    if item.added_by != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the creator can delete this item")
        
    await db.delete(item)
    await db.commit()
    return {"deleted": True}
