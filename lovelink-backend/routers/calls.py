import os
import uuid
import time
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from models.call_log import CallType, CallStatus
from schemas.call import CallInitiate, CallResponse
from crud.call import create_call, end_call, get_call_history, get_call, answer_call_db
from utils.zego import generate_zego_token
from utils.firebase import send_push
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()

ZEGO_APP_ID = int(os.getenv("ZEGO_APP_ID", "0"))
ZEGO_SERVER_SECRET = os.getenv("ZEGO_SERVER_SECRET", "")


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


@router.post("/initiate")
async def initiate_call(
    payload: CallInitiate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not ZEGO_APP_ID or not ZEGO_SERVER_SECRET:
        raise HTTPException(status_code=500, detail="Zegocloud credentials not configured on server")

    couple = await _get_couple(db, str(current_user.id))
    couple_id_str = str(couple.id)
    
    # Generate an isolated, unique WebRTC room ID per call to avoid session collisions
    call_id_short = str(uuid.uuid4())[:8]
    room_id = f"ll_{couple_id_str.replace('-', '')[:6]}_{call_id_short}"
    
    partner_id = str(couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id)
    partner_res = await db.execute(select(User).where(User.id == partner_id))
    partner_user = partner_res.scalar_one_or_none()

    try:
        caller_token = generate_zego_token(
            ZEGO_APP_ID, ZEGO_SERVER_SECRET,
            str(current_user.id), room_id
        )
        partner_token = generate_zego_token(
            ZEGO_APP_ID, ZEGO_SERVER_SECRET,
            partner_id, room_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Zegocloud token: {e}")

    call = await create_call(
        db=db,
        couple_id=couple_id_str,
        started_by=str(current_user.id),
        room_id=room_id,
        call_type=payload.call_type
    )
    new_call_id = str(call.id)

    # Broadcast incoming call to partner
    await manager.broadcast(
        couple_id_str,
        {
            "type": "incoming_call",
            "call_id": new_call_id,
            "caller_id": str(current_user.id),
            "room_id": room_id,
            "caller_token": partner_token,
            "caller_name": current_user.name,
            "caller_photo": current_user.photo_url,
            "call_type": "voice" if "voice" in str(payload.call_type).lower() else "video",
            "zego_app_id": ZEGO_APP_ID
        },
        exclude=None
    )
    
    # Push notification
    if partner_user and partner_user.fcm_token:
        body = f"Incoming {payload.call_type} call from {current_user.name}"
        await send_push(
            fcm_token=partner_user.fcm_token,
            title="LoveLink Call",
            body=body,
            data={"type": "incoming_call", "call_id": str(new_call_id), "room_id": str(room_id)}
        )

    return {
        "call_id": str(call.id),
        "room_id": room_id,
        "token": caller_token,
        "zego_app_id": ZEGO_APP_ID,
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "partner_id": partner_id,
        "partner_name": partner_user.name if partner_user else "Partner",
        "partner_photo": partner_user.photo_url if partner_user else None,
        "call_type": "voice" if "voice" in str(payload.call_type).lower() else "video"
    }


@router.post("/{call_id}/answer")
async def answer_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # CRITICAL BUG FIX: Update status to answered without ending the call or setting duration to 0!
    call = await answer_call_db(db, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
        
    token = generate_zego_token(
        ZEGO_APP_ID, ZEGO_SERVER_SECRET,
        str(current_user.id), call.room_id
    )

    couple = await _get_couple(db, str(current_user.id))
    partner_id = str(couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id)
    partner_res = await db.execute(select(User).where(User.id == partner_id))
    partner_user = partner_res.scalar_one_or_none()

    await manager.broadcast(
        str(call.couple_id),
        {
            'type': 'call_answered',
            'call_id': call_id,
            'answered_by': str(current_user.id)
        }
    )
    
    return {
        "token": token,
        "room_id": call.room_id,
        "zego_app_id": ZEGO_APP_ID,
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "partner_id": partner_id,
        "partner_name": partner_user.name if partner_user else "Partner",
        "partner_photo": partner_user.photo_url if partner_user else None,
        "call_type": "voice" if "voice" in str(call.call_type).lower() else "video"
    }


@router.get("/{call_id}/token")
async def get_call_token(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    call = await get_call(db, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
        
    token = generate_zego_token(
        ZEGO_APP_ID, ZEGO_SERVER_SECRET,
        str(current_user.id), call.room_id
    )

    couple = await _get_couple(db, str(current_user.id))
    partner_id = str(couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id)
    partner_res = await db.execute(select(User).where(User.id == partner_id))
    partner_user = partner_res.scalar_one_or_none()
    
    return {
        "token": token,
        "room_id": call.room_id,
        "zego_app_id": ZEGO_APP_ID,
        "user_id": str(current_user.id),
        "user_name": current_user.name,
        "partner_id": partner_id,
        "partner_name": partner_user.name if partner_user else "Partner",
        "partner_photo": partner_user.photo_url if partner_user else None,
        "call_type": "voice" if "voice" in str(call.call_type).lower() else "video"
    }


@router.post("/{call_id}/decline")
async def decline_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    call = await end_call(db, call_id, status=CallStatus.declined)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    await manager.broadcast(
        str(call.couple_id),
        {"type": "call_declined", "call_id": call_id}
    )
    return {"declined": True}


@router.post("/{call_id}/end")
async def terminate_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    call = await end_call(db, call_id, status=CallStatus.ended)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")

    await manager.broadcast(
        str(call.couple_id),
        {"type": "call_ended", "call_id": call_id}
    )
    return {"ended": True, "duration_secs": call.duration_secs}


@router.get("/history", response_model=List[CallResponse])
async def list_call_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await _get_couple(db, str(current_user.id))
    calls = await get_call_history(db, str(couple.id), limit=20)
    return calls
