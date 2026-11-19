from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import secrets
import string
import time
import asyncio
from typing import Dict, List

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

# In-memory sliding window rate limiter for invite code brute-force protection
JOIN_ATTEMPTS: Dict[str, List[float]] = {}
MAX_JOIN_ATTEMPTS = 5
LOCKOUT_WINDOW_SECONDS = 900  # 15 minutes


def _is_rate_limited(user_id: str) -> bool:
    now = time.time()
    attempts = [t for t in JOIN_ATTEMPTS.get(user_id, []) if now - t < LOCKOUT_WINDOW_SECONDS]
    JOIN_ATTEMPTS[user_id] = attempts
    return len(attempts) >= MAX_JOIN_ATTEMPTS


def _record_failure(user_id: str):
    now = time.time()
    if user_id not in JOIN_ATTEMPTS:
        JOIN_ATTEMPTS[user_id] = []
    JOIN_ATTEMPTS[user_id].append(now)


def _reset_attempts(user_id: str):
    JOIN_ATTEMPTS.pop(user_id, None)


def _generate_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


@router.post("/generate-invite", response_model=GenerateInviteResponse)
async def generate_invite(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if an existing couple record already exists for this user as user1
    result = await db.execute(select(Couple).where(Couple.user1_id == current_user.id))
    couple = result.scalars().first()

    if not couple:
        # Create a new couple with a cryptographically secure fresh invite code
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
    user_key = str(current_user.id)
    if _is_rate_limited(user_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed join attempts. Please wait 15 minutes before trying again."
        )

    code = data.invite_code.strip().upper()

    result = await db.execute(
        select(Couple).where(Couple.invite_code == code, Couple.user2_id.is_(None))
    )
    couple = result.scalars().first()
    if not couple:
        _record_failure(user_key)
        await asyncio.sleep(1.0)  # Cryptographic timing defense
        raise HTTPException(status_code=404, detail="Invite code not found or already used")

    if couple.user1_id == current_user.id:
        raise HTTPException(
            status_code=400, detail="You cannot join your own invite code"
        )

    couple.user2_id = current_user.id
    db.add(couple)
    await db.commit()
    await db.refresh(couple)

    _reset_attempts(user_key)

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



@router.get("/partner-key")
async def get_partner_public_key(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetches the linked partner's public key (JWK) for client-side ECDH shared secret derivation."""
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
        return {"linked": False, "partner_id": None, "public_key": None, "has_key": False}

    partner_id = couple.user2_id if couple.user1_id == current_user.id else couple.user1_id
    if not partner_id:
        return {"linked": False, "partner_id": None, "public_key": None, "has_key": False}

    res_partner = await db.execute(select(User).where(User.id == partner_id))
    partner = res_partner.scalars().first()
    if not partner:
        return {"linked": False, "partner_id": None, "public_key": None, "has_key": False}

    return {
        "linked": True,
        "partner_id": str(partner.id),
        "partner_name": partner.name,
        "public_key": partner.public_key,
        "has_key": partner.public_key is not None,
    }
