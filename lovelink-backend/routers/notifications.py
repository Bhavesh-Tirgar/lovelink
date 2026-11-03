from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, desc, update
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

from database import get_db
from models.user import User
from models.couple import Couple
from models.notification import Notification
from routers.auth import get_current_user

router = APIRouter()

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    data: Optional[Any] = None
    is_read: bool
    created_at: datetime


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == str(current_user.id))
        .order_by(desc(Notification.created_at))
        .limit(50)
    )
    return result.scalars().all()


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Notification)
        .where(Notification.id == notification_id, Notification.user_id == str(current_user.id))
    )
    notif = result.scalar_one_or_none()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    await db.commit()
    return {"status": "success"}


@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == str(current_user.id), Notification.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}
