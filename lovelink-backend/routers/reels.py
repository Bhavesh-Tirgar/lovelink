import re
import uuid
import asyncio
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, AsyncSessionLocal
from models.user import User
from models.couple import Couple
from models.reel import Reel
from routers.auth import get_current_user
from ws_manager.manager import manager

router = APIRouter()

# In-memory session state for couple reel co-watching
couple_reel_state = {}

# Rich, curated high-retention viral couple shorts & clips
PERMANENT_CURATED_FEED = [
    {
        "id": "curated-1",
        "title": "When you steal your partner's hoodie and refuse to return it 🧥",
        "caption": "It just smells like you and it's 100x cozier! Officially confiscated forever 💕",
        "video_id": "kJQP7kiw5Fk",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg",
        "category": "funny",
        "likes_count": 14200,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-2",
        "title": "Late night drives singing our favorite song at top of our lungs 🚗🎶",
        "caption": "Windows down, cold breeze, and your hand in mine under the stars ✨",
        "video_id": "3JZ_D3ELwOQ",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/3JZ_D3ELwOQ/hqdefault.jpg",
        "category": "wholesome",
        "likes_count": 28900,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-3",
        "title": "When they say 'I'm not hungry' and eat all your fries 🍟😂",
        "caption": "Relationship tax: 50% of whatever food is ordered. No exceptions! 🍟",
        "video_id": "fJ9rUzIMcZQ",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg",
        "category": "relatable",
        "likes_count": 35400,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-4",
        "title": "The Golden Retriever Boyfriend & Black Cat Girlfriend dynamic 🐶🐱",
        "caption": "Pure chaos meets pure patience. Best combo ever ❤️",
        "video_id": "L_LUpnjgPso",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/L_LUpnjgPso/hqdefault.jpg",
        "category": "couple",
        "likes_count": 41200,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-5",
        "title": "How he looks at her when she's passionately talking about her day 🥺",
        "caption": "Find someone who listens to your random rants like you're reciting poetry 💖",
        "video_id": "2Vv-BfVoq4g",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/2Vv-BfVoq4g/hqdefault.jpg",
        "category": "wholesome",
        "likes_count": 52100,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-6",
        "title": "Couples trying to decide what to eat for dinner for 45 minutes 🍕🍜",
        "caption": "'I don't mind, whatever you want.' 'Okay tacos?' 'No not tacos.' 😂",
        "video_id": "kXYiU_JCYtU",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg",
        "category": "funny",
        "likes_count": 39800,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-7",
        "title": "When your partner falls asleep on your shoulder and you can't move 🥰",
        "caption": "My arm is completely numb, but I am legally not allowed to move for 3 hours.",
        "video_id": "CevxZvSJLk8",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/CevxZvSJLk8/hqdefault.jpg",
        "category": "wholesome",
        "likes_count": 18400,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-8",
        "title": "Going grocery shopping together turns into an adventure 🛒✨",
        "caption": "We went in for milk and eggs, came out with snacks, plants and zero self control.",
        "video_id": "9bZkp7q19f0",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg",
        "category": "relatable",
        "likes_count": 27300,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-9",
        "title": "When they try to be mad at you but make eye contact and start laughing 😂",
        "caption": "Arguments never last more than 30 seconds when you both have zero poker face 💕",
        "video_id": "q3e8n9W2y8M",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/q3e8n9W2y8M/hqdefault.jpg",
        "category": "funny",
        "likes_count": 46100,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    },
    {
        "id": "curated-10",
        "title": "Slow dancing in the kitchen while dinner is cooking in the oven 🕯️✨",
        "caption": "The simplest moments together are always the ones that stick in your heart. 💖",
        "video_id": "dQw4w9WgXcQ",
        "source_type": "youtube",
        "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
        "category": "wholesome",
        "likes_count": 61200,
        "is_custom": False,
        "added_by_name": "LoveLink Hot"
    }
]

# Cache for dynamic Reddit memes & video clips
dynamic_reddit_cache = {
    "items": [],
    "last_fetched": 0
}

async def fetch_dynamic_reddit_clips() -> List[dict]:
    """Dynamically fetches real wholesome & funny couple clips from Reddit public API with caching."""
    import time
    now = time.time()
    # Cache for 10 minutes to prevent rate limiting
    if dynamic_reddit_cache["items"] and (now - dynamic_reddit_cache["last_fetched"]) < 600:
        return dynamic_reddit_cache["items"]

    clips = []
    try:
        import httpx
        headers = {"User-Agent": "LoveLinkCoupleApp/1.0"}
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get("https://www.reddit.com/r/CoupleMemes/hot.json?limit=15", headers=headers)
            if res.status_code == 200:
                data = res.json()
                children = data.get("data", {}).get("children", [])
                for idx, child in enumerate(children):
                    post = child.get("data", {})
                    # Look for vertical video or high quality media
                    media = post.get("media") or {}
                    reddit_video = media.get("reddit_video") or {}
                    video_url = reddit_video.get("fallback_url")
                    
                    # Or check for direct image / gif
                    url = post.get("url_overridden_by_dest") or post.get("url", "")
                    title = post.get("title", "Couple Meme")
                    score = post.get("score", 1200)

                    if video_url:
                        clips.append({
                            "id": f"reddit-vid-{post.get('id', idx)}",
                            "title": title,
                            "caption": f"Trending on r/CoupleMemes • {score:,} upvotes",
                            "video_id": video_url,
                            "source_type": "mp4",
                            "thumbnail_url": post.get("thumbnail") or "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500",
                            "category": "funny",
                            "likes_count": score,
                            "is_custom": False,
                            "added_by_name": "Trending Reddit"
                        })
                    elif url and (url.endswith('.jpg') or url.endswith('.png') or url.endswith('.gif')):
                        clips.append({
                            "id": f"reddit-img-{post.get('id', idx)}",
                            "title": title,
                            "caption": f"Trending on r/CoupleMemes • {score:,} upvotes",
                            "video_id": url,
                            "source_type": "image",
                            "thumbnail_url": url,
                            "category": "funny",
                            "likes_count": score,
                            "is_custom": False,
                            "added_by_name": "Trending Reddit"
                        })

        if clips:
            dynamic_reddit_cache["items"] = clips
            dynamic_reddit_cache["last_fetched"] = now
    except Exception as e:
        print(f"Notice: Dynamic Reddit feed fallback: {e}")

    return dynamic_reddit_cache["items"]


def extract_youtube_video_id(url_or_id: str) -> Optional[str]:
    """Extract 11-char YouTube ID from Shorts, Watch URLs, or direct IDs."""
    if not url_or_id:
        return None
    raw = url_or_id.strip()
    if re.match(r"^[a-zA-Z0-9_-]{11}$", raw):
        return raw
    patterns = [
        r"(?:v=|\/shorts\/|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})",
        r"youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        match = re.search(p, raw)
        if match:
            return match.group(1)
    return None


class AddCustomReelRequest(BaseModel):
    url: str
    title: str
    caption: Optional[str] = None
    category: Optional[str] = "custom"


@router.get("/feed")
async def get_reels_feed(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns couple's custom queued reels + dynamic Reddit memes/clips + curated viral feed."""
    custom_reels = []
    if current_user.couple_id:
        stmt = (
            select(Reel, User.name.label("added_by_name"))
            .outerjoin(User, Reel.added_by == User.id)
            .where(Reel.couple_id == current_user.couple_id)
            .order_by(Reel.created_at.desc())
        )
        res = await db.execute(stmt)
        rows = res.all()
        for r, author_name in rows:
            custom_reels.append({
                "id": str(r.id),
                "title": r.title,
                "caption": r.caption or "",
                "video_id": r.video_id,
                "source_type": r.source_type,
                "thumbnail_url": r.thumbnail_url or f"https://img.youtube.com/vi/{r.video_id}/hqdefault.jpg",
                "category": r.category,
                "likes_count": r.likes_count,
                "is_custom": True,
                "added_by_id": str(r.added_by) if r.added_by else None,
                "added_by_name": author_name or "Partner",
                "created_at": r.created_at.isoformat() if r.created_at else None
            })

    # Fetch dynamic viral clips
    dynamic_clips = await fetch_dynamic_reddit_clips()

    # Combine: Couple's custom reels -> curated hot clips -> dynamic reddit clips
    feed = custom_reels + PERMANENT_CURATED_FEED + dynamic_clips
    return {"reels": feed, "count": len(feed)}


@router.post("/custom")
async def add_custom_reel(
    req: AddCustomReelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a YouTube Short, MP4 or video link to couple's shared co-scroll queue."""
    if not current_user.couple_id:
        raise HTTPException(status_code=400, detail="You must be linked in a couple to add shared reels.")

    video_id = extract_youtube_video_id(req.url)
    source_type = "youtube"
    thumb = None
    if not video_id:
        # Check if direct mp4/webm link
        if req.url.endswith('.mp4') or req.url.endswith('.webm'):
            video_id = req.url
            source_type = "mp4"
            thumb = "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=500"
        else:
            raise HTTPException(status_code=400, detail="Invalid video link. Paste a YouTube Short or video link.")
    else:
        thumb = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

    new_reel = Reel(
        id=str(uuid.uuid4()),
        couple_id=current_user.couple_id,
        added_by=current_user.id,
        title=req.title.strip() or "Cute Reel ❤️",
        caption=req.caption.strip() if req.caption else None,
        video_id=video_id,
        source_type=source_type,
        thumbnail_url=thumb,
        category=req.category or "custom",
        likes_count=0
    )
    db.add(new_reel)
    await db.commit()
    await db.refresh(new_reel)

    # Broadcast real-time notification to partner
    room = f"reels_{current_user.couple_id}"
    broadcast_payload = {
        "type": "reel_added",
        "reel": {
            "id": str(new_reel.id),
            "title": new_reel.title,
            "caption": new_reel.caption,
            "video_id": new_reel.video_id,
            "source_type": new_reel.source_type,
            "thumbnail_url": new_reel.thumbnail_url,
            "category": new_reel.category,
            "likes_count": new_reel.likes_count,
            "is_custom": True,
            "added_by_id": str(current_user.id),
            "added_by_name": current_user.name
        }
    }
    await manager.broadcast(broadcast_payload, room)

    return {"message": "Reel added to couple queue! 🎬", "reel": broadcast_payload["reel"]}


@router.delete("/custom/{reel_id}")
async def delete_custom_reel(
    reel_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom reel from couple's queue."""
    if not current_user.couple_id:
        raise HTTPException(status_code=400, detail="Not linked in a couple.")

    res = await db.execute(
        select(Reel).where(Reel.id == reel_id, Reel.couple_id == current_user.couple_id)
    )
    reel = res.scalars().first()
    if not reel:
        raise HTTPException(status_code=404, detail="Reel not found in couple queue.")

    await db.delete(reel)
    await db.commit()

    room = f"reels_{current_user.couple_id}"
    await manager.broadcast({"type": "reel_deleted", "reel_id": reel_id}, room)
    return {"message": "Reel removed from queue."}


@router.post("/{reel_id}/like")
async def toggle_like_reel(
    reel_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Like or cheer a reel."""
    res = await db.execute(select(Reel).where(Reel.id == reel_id))
    reel = res.scalars().first()
    if reel:
        reel.likes_count = (reel.likes_count or 0) + 1
        await db.commit()
        likes = reel.likes_count
    else:
        likes = 1
        for cr in PERMANENT_CURATED_FEED:
            if cr["id"] == reel_id:
                cr["likes_count"] += 1
                likes = cr["likes_count"]
                break

    if current_user.couple_id:
        room = f"reels_{current_user.couple_id}"
        await manager.broadcast({
            "type": "reel_liked",
            "reel_id": reel_id,
            "likes_count": likes,
            "by_name": current_user.name
        }, room)

    return {"likes_count": likes}


# ── WEBSOCKET FOR SYNCHRONIZED CO-SCROLL & LIVE REACTIONS ─────────────────────

@router.websocket("/ws/{couple_id}")
async def reels_websocket(
    websocket: WebSocket,
    couple_id: str,
    ticket: Optional[str] = Query(None),
    token: Optional[str] = Query(None)
):
    """Real-time vertical co-scroll sync & floating reaction WebSocket."""
    user_id = None
    if ticket:
        from utils.tickets import verify_and_consume_ws_ticket
        user_id = verify_and_consume_ws_ticket(ticket)
    elif token:
        from routers.auth import decode_token
        user_id = decode_token(token)

    if not user_id:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    try:
        async with AsyncSessionLocal() as db:
            c_res = await db.execute(select(Couple).where(Couple.id == couple_id))
            couple = c_res.scalars().first()
            if not couple or (str(couple.user1_id) != user_id and str(couple.user2_id) != user_id):
                await websocket.close(code=4003, reason="Forbidden")
                return
            u_res = await db.execute(select(User).where(User.id == user_id))
            user_obj = u_res.scalars().first()
            user_name = user_obj.name if user_obj else "Partner"
    except Exception as e:
        print(f"Error validating couple for reels ws: {e}")
        await websocket.close(code=4001, reason="Authentication error")
        return

    await websocket.accept()
    room = f"reels_{couple_id}"
    await manager.connect(websocket, room)

    if couple_id not in couple_reel_state:
        couple_reel_state[couple_id] = {
            "active_index": 0,
            "active_reel_id": None,
            "is_playing": True,
            "users": set()
        }
    couple_reel_state[couple_id]["users"].add(user_id)

    await websocket.send_json({
        "type": "reels_init",
        "active_index": couple_reel_state[couple_id]["active_index"],
        "active_reel_id": couple_reel_state[couple_id]["active_reel_id"],
        "partner_online": len(couple_reel_state[couple_id]["users"]) > 1
    })

    await manager.broadcast({
        "type": "partner_presence",
        "online_count": len(couple_reel_state[couple_id]["users"]),
        "partner_online": len(couple_reel_state[couple_id]["users"]) > 1,
        "joined_user": user_name
    }, room)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "scroll_to":
                new_index = data.get("index", 0)
                reel_id = data.get("reel_id")
                couple_reel_state[couple_id]["active_index"] = new_index
                couple_reel_state[couple_id]["active_reel_id"] = reel_id

                await manager.broadcast({
                    "type": "scroll_to",
                    "index": new_index,
                    "reel_id": reel_id,
                    "sender_id": user_id,
                    "sender_name": user_name
                }, room)

            elif msg_type == "reaction":
                emoji = data.get("emoji", "❤️")
                x = data.get("x", 0.5)
                y = data.get("y", 0.5)
                await manager.broadcast({
                    "type": "reaction",
                    "emoji": emoji,
                    "x": x,
                    "y": y,
                    "sender_id": user_id,
                    "sender_name": user_name
                }, room)

            elif msg_type == "playback_state":
                is_playing = data.get("is_playing", True)
                couple_reel_state[couple_id]["is_playing"] = is_playing
                await manager.broadcast({
                    "type": "playback_state",
                    "is_playing": is_playing,
                    "sender_id": user_id
                }, room)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
        if couple_id in couple_reel_state:
            couple_reel_state[couple_id]["users"].discard(user_id)
            is_partner_online = len(couple_reel_state[couple_id]["users"]) > 1
            await manager.broadcast({
                "type": "partner_presence",
                "online_count": len(couple_reel_state[couple_id]["users"]),
                "partner_online": is_partner_online
            }, room)
    except Exception as e:
        print(f"Reels WS error: {e}")
        manager.disconnect(websocket, room)
