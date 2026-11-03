import logging
import asyncio
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select

from database import AsyncSessionLocal
from crud.love_note import get_pending_scheduled, deliver_note
from schemas.love_note import NoteResponse
from models.love_note import LoveNote
from models.couple import Couple
from models.user import User
from models.notification import Notification
from ws_manager.manager import manager
from utils.firebase import send_push

logger = logging.getLogger(__name__)


async def deliver_scheduled_notes():
    """Runs every 5 minutes — delivers any scheduled notes whose time has come."""
    logger.info("Running deliver_scheduled_notes job...")
    async with AsyncSessionLocal() as db:
        try:
            pending = await get_pending_scheduled(db)
            for note in pending:
                delivered = await deliver_note(db, note.id)
                if delivered:
                    # Build serialisable dict for WebSocket broadcast
                    note_data = NoteResponse.model_validate(delivered).model_dump(mode="json")
                    await manager.broadcast(str(delivered.couple_id), {
                        "type": "new_note",
                        "note": note_data,
                    })
                    
                    # Send Push Notification
                    try:
                        recipient_user = await db.execute(select(User).where(User.id == delivered.recipient_id))
                        recipient = recipient_user.scalar_one_or_none()
                        
                        if recipient and recipient.fcm_token:
                            await send_push(
                                fcm_token=recipient.fcm_token,
                                title=f"Time Capsule Unlocked! 🕰️" if delivered.is_capsule else "New Love Note! 💌",
                                body=delivered.title if delivered.title else "Open the app to read it now.",
                                data={"type": "capsule" if delivered.is_capsule else "love_note", "note_id": str(delivered.id)}
                            )
                    except Exception as pe:
                        logger.error(f"Failed sending FCM for note: {pe}")
                        
                    logger.info(f"Delivered scheduled note {delivered.id} to couple {delivered.couple_id}")
                print(f"Scheduled note {note.id} delivered.")
            await db.commit()
        except Exception as e:
            logger.error(f"Error in deliver_scheduled_notes: {e}", exc_info=True)

async def check_milestones():
    print("Checking milestones...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Couple))
        couples = result.scalars().all()
        now = datetime.now()
        
        milestones = [7, 30, 50, 100, 200, 365, 500, 730, 1000]
        
        for couple in couples:
            if not couple.created_at: continue
            
            # Simple days calc (ignores timezones, can be refined)
            delta = now - couple.created_at.replace(tzinfo=None)
            days = delta.days
            
            if days in milestones:
                # Check if notification already exists for this milestone
                existing = await db.execute(
                    select(Notification)
                    .where(
                        Notification.couple_id == str(couple.id),
                        Notification.type == "milestone",
                        # We use title as a hack to find existing milestone notifications for this days
                        # or we can use JSON data. Let's use data to be clean.
                    )
                )
                existing_notes = existing.scalars().all()
                already_notified = any(n.data and n.data.get("days") == days for n in existing_notes)
                
                if not already_notified:
                    # Create notification for BOTH users
                    for user_id in [couple.user1_id, couple.user2_id]:
                        notif = Notification(
                            user_id=str(user_id),
                            couple_id=str(couple.id),
                            type="milestone",
                            title=f"Happy {days} days! 🎉",
                            body=f"You and your partner have been together for {days} beautiful days.",
                            data={"days": days}
                        )
                        db.add(notif)
                        
                        # Add FCM Push Notification
                        try:
                            user_db = await db.execute(select(User).where(User.id == str(user_id)))
                            u = user_db.scalar_one_or_none()
                            if u and u.fcm_token:
                                await send_push(
                                    fcm_token=u.fcm_token,
                                    title=f"Happy {days} days! 🎉",
                                    body=f"You and your partner have been together for {days} beautiful days.",
                                    data={"type": "milestone", "days": str(days)}
                                )
                        except Exception as e:
                            logger.error(f"FCM Milestone Push failed: {e}")
                        
                    print(f"Milestone notification generated for couple {couple.id} ({days} days)")
                    
        await db.commit()
