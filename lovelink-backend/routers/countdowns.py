from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from routers.auth import get_current_user
from schemas.countdown import CountdownCreate, CountdownResponse
from crud.countdown import get_countdowns, create_countdown, delete_countdown

router = APIRouter()


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(
            or_(Couple.user1_id == user_id, Couple.user2_id == user_id)
        )
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


def _to_response(cd) -> CountdownResponse:
    now = datetime.utcnow()
    # Make target_date naive for comparison if it has tzinfo
    target = cd.target_date.replace(tzinfo=None) if cd.target_date.tzinfo else cd.target_date
    diff = (target - now).total_seconds()
    seconds_remaining = max(0, int(diff))
    return CountdownResponse(
        id=cd.id,
        couple_id=cd.couple_id,
        created_by=cd.created_by,
        label=cd.label,
        emoji=cd.emoji,
        target_date=cd.target_date,
        created_at=cd.created_at,
        seconds_remaining=seconds_remaining,
        is_past=seconds_remaining == 0,
    )


@router.get("", response_model=List[CountdownResponse])
async def list_countdowns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    countdowns = await get_countdowns(db, str(couple.id))
    return [_to_response(cd) for cd in countdowns]


@router.post("", response_model=CountdownResponse, status_code=201)
async def add_countdown(
    payload: CountdownCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))

    # Strip tzinfo for comparison if provided as aware datetime
    target = payload.target_date.replace(tzinfo=None) if payload.target_date.tzinfo else payload.target_date
    if target <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Target date must be in the future")

    cd = await create_countdown(
        db=db,
        couple_id=str(couple.id),
        created_by=str(current_user.id),
        label=payload.label,
        emoji=payload.emoji,
        target_date=payload.target_date,
    )
    return _to_response(cd)


@router.delete("/{countdown_id}")
async def remove_countdown(
    countdown_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await delete_countdown(db, countdown_id, str(current_user.id))
    return {"deleted": True}
