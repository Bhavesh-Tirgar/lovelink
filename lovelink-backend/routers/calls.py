import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from database import get_db
from models.user import User
from models.couple import Couple
from models.call_log import CallType, CallStatus
from schemas.call import CallInitiate, CallResponse
from crud.call import create_call, end_call, get_call_history, get_call
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
    room_id = f"lovelink_{couple_id_str.replace('-', '')[:12]}"
    print(f"[DEBUG] Initiating call for user: {current_user.id}, couple: {couple_id_str}")
    try:
        caller_token = generate_zego_token(
            ZEGO_APP_ID, ZEGO_SERVER_SECRET,
            str(current_user.id), room_id
        )
        
        partner_id = str(couple.user2_id if str(couple.user1_id) == str(current_user.id) else couple.user1_id)
        
        partner_token = generate_zego_token(
            ZEGO_APP_ID, ZEGO_SERVER_SECRET,
            partner_id, room_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Zegocloud token: {e}")

    print(f"[DEBUG] Tokens generated. Creating call record...")
    call = await create_call(
        db=db,
        couple_id=couple_id_str,
        started_by=str(current_user.id),
        room_id=room_id,
        call_type=payload.call_type
    )
    new_call_id = str(call.id)
    print(f"[DEBUG] Call record created: {new_call_id}")

    # Notify partner via global chat WebSocket
    await manager.broadcast(
        couple_id_str,
        {
            "type": "incoming_call",
            "call_id": new_call_id,
            "room_id": room_id,
            "caller_token": partner_token,
            "caller_name": current_user.name,
            "caller_photo": current_user.photo_url,
            "call_type": "voice" if "voice" in str(payload.call_type).lower() else "video",
            "zego_app_id": ZEGO_APP_ID
        },
        exclude=None
    )
    
    # Notify partner via Push Notification
    receiver_id = couple.user2_id if str(current_user.id) == str(couple.user1_id) else couple.user1_id
    receiver_user = await db.execute(select(User).where(User.id == receiver_id))
    receiver = receiver_user.scalar_one_or_none()
    
    if receiver and receiver.fcm_token:
        body = f"Incoming {payload.call_type} call from {current_user.name}"
        await send_push(
            fcm_token=receiver.fcm_token,
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
        "call_type": "voice" if "voice" in str(payload.call_type).lower() else "video"
    }


@router.post("/{call_id}/answer")
async def answer_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    call = await end_call(db, call_id, status=CallStatus.answered)
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
        
    token = generate_zego_token(
        ZEGO_APP_ID, ZEGO_SERVER_SECRET,
        str(current_user.id), call.room_id
    )

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
    
    return {
        "token": token,
        "room_id": call.room_id,
        "zego_app_id": ZEGO_APP_ID,
        "user_id": str(current_user.id),
        "user_name": current_user.name,
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
