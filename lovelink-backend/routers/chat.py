import os
import boto3
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from jose import jwt, JWTError

from database import get_db
from models.user import User
from models.couple import Couple
from models.message import Message, MessageType
from schemas.message import MessageCreate, MessageResponse
from routers.auth import get_current_user, ALGORITHM, SECRET_KEY
from crud.message import get_messages, create_message, mark_messages_read
from utils.firebase import send_push
from ws_manager.manager import manager
from utils.storage import save_file

router = APIRouter()
ws_router = APIRouter()

CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_R2_ACCESS_KEY = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY", "")
CLOUDFLARE_R2_SECRET_KEY = os.environ.get("CLOUDFLARE_R2_SECRET_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "lovelink")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")

s3_client = boto3.client(
    service_name='s3',
    endpoint_url=f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" if CLOUDFLARE_ACCOUNT_ID else None,
    aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY,
    aws_secret_access_key=CLOUDFLARE_R2_SECRET_KEY,
    region_name="auto"
)

async def get_couple_by_user(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(Couple).where(
            or_(Couple.user1_id == user_id, Couple.user2_id == user_id)
        )
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple

@router.get("/messages", response_model=List[MessageResponse])
async def get_chat_history(
    limit: int = 50,
    before_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_couple_by_user(db, current_user.id)
    await mark_messages_read(db, couple.id, current_user.id)
    messages = await get_messages(db, couple.id, limit=limit, before_id=before_id)
    return messages

@router.post("/messages", response_model=MessageResponse)
async def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_couple_by_user(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    
    message = await create_message(
        db, 
        couple.id, 
        current_user.id, 
        payload.text, 
        payload.photo_url, 
        payload.voice_url
    )
    
    # Broadcast to the couple's WebSocket room
    msg_data = MessageResponse.model_validate(message).model_dump(mode="json")
    await manager.broadcast(str(couple.id), {"type": "message", "message": msg_data})
    
    # Send FCM Push Notification to the partner
    receiver_id = couple.user2_id if str(current_user.id) == str(couple.user1_id) else couple.user1_id
    receiver_user = await db.execute(select(User).where(User.id == receiver_id))
    receiver = receiver_user.scalar_one_or_none()
    
    if receiver and receiver.fcm_token:
        # Determine notification body
        if payload.photo_url:
            body = "Sent a photo 📸"
        elif payload.voice_url:
            body = "Sent a voice message 🎙️"
        else:
            body = payload.text
            
        await send_push(
            fcm_token=receiver.fcm_token,
            title=current_user.name,
            body=body,
            data={"type": "chat", "couple_id": str(couple.id), "message_id": str(message.id)}
        )
    
    return message

@router.put("/messages/mark-read")
async def mark_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_couple_by_user(db, current_user.id)
    updated_count = await mark_messages_read(db, couple.id, current_user.id)
    if updated_count > 0:
        await manager.broadcast(couple.id, {
            "type": "read_receipt",
            "reader_id": str(current_user.id)
        })
    return {"marked": True}

@router.post("/upload", response_model=MessageResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    couple = await get_couple_by_user(db, current_user.id)
    
    ext = file.filename.split('.')[-1].lower()
    valid_images = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    valid_audio = ['webm', 'mp3', 'm4a', 'ogg', 'wav']
    
    if ext in valid_images:
        msg_type = MessageType.image
    elif ext in valid_audio:
        msg_type = MessageType.voice
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
        
    try:
        file_url, _ = await save_file(file, subfolder="chat")
    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail="Could not upload file")

    saved_message = await create_message(
        db=db,
        couple_id=couple.id,
        sender_id=current_user.id,
        text=None,
        message_type=msg_type,
        file_url=file_url
    )
    
    msg_dict = MessageResponse.model_validate(saved_message).model_dump(mode="json")
        
    await manager.broadcast(couple.id, {
        "type": "message",
        "message": msg_dict
    })
    
    return saved_message

@ws_router.websocket("/{couple_id}")
async def websocket_chat(websocket: WebSocket, couple_id: str, token: str = Query(...), db: AsyncSession = Depends(get_db)):
    await websocket.accept()
    
    try:
        # Validate JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.close(code=4001, reason="Invalid credentials")
            return
            
        # Verify user belongs to couple
        result = await db.execute(
            select(Couple).where(Couple.id == couple_id)
        )
        couple = result.scalar_one_or_none()
        
        if not couple or (str(couple.user1_id) != str(user_id) and str(couple.user2_id) != str(user_id)):
            dbg = f"U:{user_id} C1:{couple.user1_id if couple else 'N'} C2:{couple.user2_id if couple else 'N'}"
            await websocket.close(code=4003, reason=dbg[:120])
            return
            
    except JWTError:
        await websocket.close(code=4001, reason="Invalid credentials")
        return
        
    await manager.connect(websocket, couple_id)
    await manager.send_personal(websocket, {"type": "connected", "couple_id": couple_id})
    
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            
            if msg_type == "message":
                content = data.get("content", "")
                message_type_str = data.get("message_type", "text")
                if content:
                    try:
                        saved = await create_message(
                            db=db,
                            couple_id=couple_id,
                            sender_id=user_id,
                            text=content,
                            message_type=MessageType(message_type_str)
                        )
                        # Use mode="json" to auto-serialize datetime -> ISO string
                        msg_dict = MessageResponse.model_validate(saved).model_dump(mode="json")
                        await manager.broadcast(couple_id, {
                            "type": "message",
                            "message": msg_dict
                        })
                        
                        # Send Push Notification
                        receiver_id = couple.user2_id if str(user_id) == str(couple.user1_id) else couple.user1_id
                        receiver_user = await db.execute(select(User).where(User.id == receiver_id))
                        receiver = receiver_user.scalar_one_or_none()
                        
                        if receiver and receiver.fcm_token:
                            sender_user = await db.execute(select(User).where(User.id == user_id))
                            sender = sender_user.scalar_one_or_none()
                            sender_name = sender.name if sender else "Partner"

                            if message_type_str == "image":
                                body = "Sent a photo 📸"
                            elif message_type_str == "voice":
                                body = "Sent a voice message 🎙️"
                            else:
                                body = content
                                
                            await send_push(
                                fcm_token=receiver.fcm_token,
                                title=sender_name,
                                body=body,
                                data={"type": "chat", "couple_id": str(couple_id), "message_id": str(saved.id)}
                            )
                    except Exception as msg_err:
                        import traceback
                        print(f"WS Message Handler Error: {msg_err}")
                        traceback.print_exc()
                        await manager.send_personal(websocket, {
                            "type": "error",
                            "detail": "Failed to save message"
                        })

            elif msg_type == "typing":
                await manager.broadcast(couple_id, {
                    "type": "typing",
                    "user_id": user_id
                }, exclude=websocket)
                
            elif msg_type == "ping":
                await manager.send_personal(websocket, {"type": "pong"})
                
            elif msg_type == "read":
                await mark_messages_read(db, couple_id, user_id)
                await manager.broadcast(couple_id, {
                    "type": "read_receipt",
                    "reader_id": user_id
                })

            # ── REAL-TIME HEARTBEAT TOUCH / THUMBKISS ───────────────────────
            elif msg_type == "touch_move":
                await manager.broadcast(couple_id, {
                    "type": "touch_move",
                    "user_id": user_id,
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "is_touching": data.get("is_touching", True)
                }, exclude=websocket)

            elif msg_type == "touch_end":
                await manager.broadcast(couple_id, {
                    "type": "touch_end",
                    "user_id": user_id
                }, exclude=websocket)

            elif msg_type == "touch_kiss":
                await manager.broadcast(couple_id, {
                    "type": "touch_kiss",
                    "user_id": user_id,
                    "x": data.get("x"),
                    "y": data.get("y")
                })

            # ── REAL-TIME SNAP MAP LOCATION SYNC ───────────────────────────
            elif msg_type == "location_update":
                await manager.broadcast(couple_id, {
                    "type": "location_update",
                    "user_id": user_id,
                    "latitude": data.get("latitude"),
                    "longitude": data.get("longitude"),
                    "battery_level": data.get("battery_level"),
                    "is_charging": data.get("is_charging"),
                    "speed": data.get("speed"),
                    "heading": data.get("heading")
                }, exclude=websocket)

            # ── NATIVE P2P WEBRTC SIGNALING RELAY ──────────────────────────
            elif msg_type == "webrtc_offer":
                await manager.broadcast(couple_id, {
                    "type": "webrtc_offer",
                    "call_id": data.get("call_id"),
                    "sender_id": user_id,
                    "sdp": data.get("sdp")
                }, exclude=websocket)

            elif msg_type == "webrtc_answer":
                await manager.broadcast(couple_id, {
                    "type": "webrtc_answer",
                    "call_id": data.get("call_id"),
                    "sender_id": user_id,
                    "sdp": data.get("sdp")
                }, exclude=websocket)

            elif msg_type == "webrtc_ice_candidate":
                await manager.broadcast(couple_id, {
                    "type": "webrtc_ice_candidate",
                    "call_id": data.get("call_id"),
                    "sender_id": user_id,
                    "candidate": data.get("candidate")
                }, exclude=websocket)

            elif msg_type == "webrtc_ready":
                await manager.broadcast(couple_id, {
                    "type": "webrtc_ready",
                    "call_id": data.get("call_id"),
                    "sender_id": user_id
                }, exclude=websocket)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, couple_id)
    except Exception as e:
        print(f"WebSocket Error: {e}")
        manager.disconnect(websocket, couple_id)
        await websocket.close()
