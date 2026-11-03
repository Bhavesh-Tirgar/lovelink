from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from models.notification import Notification
from routers.auth import get_current_user
from schemas.dashboard import DashboardResponse, UserSummary
from ws_manager.manager import manager

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Prefer a fully linked couple if multiple exist
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            ),
            Couple.user2_id.is_not(None),
        )
    )
    couple = result.scalars().first()

    if not couple:
        # Fallback: any couple row (e.g. pending invite)
        result = await db.execute(
            select(Couple).where(
                or_(
                    Couple.user1_id == current_user.id,
                    Couple.user2_id == current_user.id,
                )
            )
        )
        couple = result.scalars().first()

    days_together = 0
    partner_user = None
    linked = False

    if couple:
        days_together = (datetime.utcnow() - couple.created_at).days
        partner_id = (
            couple.user2_id
            if couple.user1_id == current_user.id
            else couple.user1_id
        )
        if partner_id:
            p_result = await db.execute(
                select(User).where(User.id == partner_id)
            )
            partner = p_result.scalars().first()
            if partner:
                linked = True
                partner_user = UserSummary(
                    id=str(partner.id),
                    name=partner.name,
                    email=partner.email,
                    timezone=partner.timezone,
                    city=partner.city,
                )

    return DashboardResponse(
        my_user=UserSummary(
            id=str(current_user.id),
            name=current_user.name,
            email=current_user.email,
            timezone=current_user.timezone,
            city=current_user.city,
        ),
        partner_user=partner_user,
        days_together=days_together,
        linked=linked,
        couple_id=str(couple.id) if couple else None,
    )


@router.post("/nudge", status_code=201)
async def send_nudge(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            ),
            Couple.user2_id.is_not(None),
        )
    )
    couple = result.scalars().first()
    if not couple:
        return {"nudge_sent": False, "reason": "No partner"}
        
    partner_id = str(couple.user2_id if couple.user1_id == current_user.id else couple.user1_id)
    
    # 1. Create a persistent notification in the DB
    notif = Notification(
        user_id=partner_id,
        couple_id=str(couple.id),
        type="nudge",
        title="Thinking of you! 💖",
        body=f"{current_user.name} sent you a nudge.",
        data={"sender_name": current_user.name}
    )
    db.add(notif)
    await db.commit()
    
    # 2. Broadcast realtime WS event globally
    await manager.broadcast(str(couple.id), {
        "type": "nudge",
        "sender_name": current_user.name
    })
    
    return {"nudge_sent": True}

