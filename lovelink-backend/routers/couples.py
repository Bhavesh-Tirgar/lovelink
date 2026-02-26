from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import random
import string

from database import get_db
from models.user import User
from models.couple import Couple
from routers.auth import get_current_user
from schemas.couple import (
    GenerateInviteResponse,
    JoinRequest,
    CoupleMeResponse,
    PartnerSummary,
)

router = APIRouter(prefix="/couples", tags=["couples"])


def _generate_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


@router.post("/generate-invite", response_model=GenerateInviteResponse)
async def generate_invite(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if an existing couple record already exists for this user as user1
    result = await db.execute(select(Couple).where(Couple.user1_id == current_user.id))
    couple = result.scalars().first()

    if not couple:
        # Create a new couple with a fresh invite code
        invite_code = _generate_code()
        couple = Couple(user1_id=current_user.id, invite_code=invite_code)
        db.add(couple)
        await db.commit()
        await db.refresh(couple)

    return GenerateInviteResponse(invite_code=couple.invite_code, couple_id=couple.id)


@router.post("/join", response_model=CoupleMeResponse)
async def join_couple(
    data: JoinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    code = data.invite_code.strip().upper()

    result = await db.execute(
        select(Couple).where(Couple.invite_code == code, Couple.user2_id.is_(None))
    )
    couple = result.scalars().first()
    if not couple:
        raise HTTPException(status_code=404, detail="Invite code not found or already used")

    if couple.user1_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="You cannot join your own invite code"
        )

    couple.user2_id = current_user.id
    db.add(couple)
    await db.commit()
    await db.refresh(couple)

    # Determine partner relative to the current user
    partner_id = couple.user1_id if couple.user2_id == current_user.id else couple.user2_id
    partner = None
    if partner_id:
        result_partner = await db.execute(select(User).where(User.id == partner_id))
        partner = result_partner.scalars().first()

    partner_summary = None
    if partner:
        partner_summary = PartnerSummary(
            name=partner.name,
            email=partner.email,
            photo_url=partner.photo_url,
        )

    return CoupleMeResponse(
        linked=True,
        couple_id=couple.id,
        invite_code=couple.invite_code,
        partner=partner_summary,
    )


@router.get("/me", response_model=CoupleMeResponse)
async def get_my_couple(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Prefer a fully linked couple if multiple rows exist
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

    if not couple:
        # No couple record at all
        return CoupleMeResponse(linked=False)

    # Decide partner id relative to current user
    partner_id = None
    if couple.user1_id == current_user.id:
        partner_id = couple.user2_id
    else:
        partner_id = couple.user1_id

    partner_summary = None
    if partner_id:
        result_partner = await db.execute(select(User).where(User.id == partner_id))
        partner = result_partner.scalars().first()
        if partner:
            partner_summary = PartnerSummary(
                name=partner.name,
                email=partner.email,
                photo_url=partner.photo_url,
            )

    linked = partner_summary is not None

    return CoupleMeResponse(
        linked=linked,
        couple_id=couple.id,
        invite_code=couple.invite_code,
        partner=partner_summary,
    )

