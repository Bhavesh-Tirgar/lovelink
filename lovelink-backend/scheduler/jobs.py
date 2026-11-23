import logging
import asyncio
from typing import List
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import select

from database import AsyncSessionLocal
from models.couple import Couple
from models.user import User
from models.notification import Notification
from ws_manager.manager import manager
from utils.firebase import send_push

logger = logging.getLogger(__name__)

async def check_milestones():
    """Batched milestone processor: prevents RAM spikes and DB pool exhaustion at 9 AM"""
    logger.info("Checking couple milestones in batches...")
    milestones = [7, 30, 50, 100, 200, 365, 500, 730, 1000]
    now = datetime.now()
    offset = 0
    batch_size = 50

    while True:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Couple).limit(batch_size).offset(offset))
            couples = result.scalars().all()
            if not couples:
                break

            for couple in couples:
                if not couple.created_at:
                    continue
                delta = now - couple.created_at.replace(tzinfo=None)
                days = delta.days
                if days in milestones:
                    existing = await db.execute(
                        select(Notification).where(
                            Notification.couple_id == str(couple.id),
                            Notification.type == "milestone",
                        )
                    )
                    existing_notes = existing.scalars().all()
                    already_notified = any(n.data and n.data.get("days") == days for n in existing_notes)
                    if not already_notified:
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
            await db.commit()
            offset += batch_size


async def ping_keep_alive():
    """Keeps the Render free tier awake by pinging its health endpoint every 12 minutes."""
    import httpx
    import os
    base_url = os.getenv("API_BASE_URL", "https://lovelink-sfzx.onrender.com").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{base_url}/")
            logger.info(f"Keep-alive ping to {base_url}/ -> status {resp.status_code}")
    except Exception as e:
        logger.warning(f"Keep-alive ping notice: {e}")

async def prune_stale_sessions():
    """Evicts old game sessions from memory to prevent RAM exhaustion on 512MB hosts."""
    try:
        from routers.games import game_sessions
        if len(game_sessions) > 40:
            keys = list(game_sessions.keys())
            for k in keys[:-20]:
                game_sessions.pop(k, None)
            logger.info("Evicted stale game sessions from memory")
    except Exception as e:
        logger.warning(f"Session prune notice: {e}")


async def prune_stale_sensitive_data():
    """Periodically purges call logs older than 30 days and clears stale GPS coordinates."""
    from datetime import datetime, timedelta
    from sqlalchemy import text
    from database import AsyncSessionLocal

    # 1. Purge call logs older than 30 days to limit raw signaling metadata storage
    async with AsyncSessionLocal() as db:
        try:
            cutoff = datetime.utcnow() - timedelta(days=30)
            res = await db.execute(
                text("DELETE FROM calls WHERE started_at < :cutoff"),
                {"cutoff": cutoff}
            )
            deleted_count = res.rowcount
            if deleted_count and deleted_count > 0:
                logger.info(f"Purged {deleted_count} call logs older than 30 days for data privacy")
            await db.commit()
        except Exception as e:
            logger.warning(f"Call log retention prune notice: {e}")

    # 2. Clear expired location points (> 15 minutes) from in-memory couple_status_store
    try:
        from routers.dashboard import couple_status_store, LOCATION_TTL_MINUTES
        now = datetime.utcnow()
        for couple_id, statuses in list(couple_status_store.items()):
            for user_id, status in list(statuses.items()):
                if "updated_at" in status:
                    try:
                        up_dt = datetime.fromisoformat(status["updated_at"])
                        if (now - up_dt).total_seconds() > (LOCATION_TTL_MINUTES * 60):
                            status["latitude"] = None
                            status["longitude"] = None
                            status["encrypted_location"] = None
                            status["is_stale"] = True
                    except Exception:
                        pass
    except Exception as le:
        logger.warning(f"Location TTL prune notice: {le}")
