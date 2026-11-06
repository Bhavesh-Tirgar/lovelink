from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from database import get_db
from models.user import User
from models.couple import Couple
from routers.auth import get_current_user
from ws_manager.manager import manager
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import uuid
import re
import urllib.parse
import httpx

router = APIRouter()

# In-memory music playback state per couple: {couple_id: {track, is_playing, position, last_update, dj_name}}
music_states: dict = {}

# Curated romantic & lofi audio channels (High-quality public domain / open streaming tracks)
DEFAULT_CHANNELS = [
    {
        "id": "lofi-rain",
        "name": "🌧️ Late Night Lofi & Rain",
        "description": "Chill lofi beats, rain soundscape, cozy late-night talks",
        "tracks": [
            {
                "id": "lofi-1",
                "title": "Midnight In Tokyo",
                "artist": "Lofi Cozy Cafe",
                "cover": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
                "type": "audio",
                "duration": 147
            },
            {
                "id": "lofi-2",
                "title": "Stargazing With You",
                "artist": "Purrple Cat",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=empty-mind-118973.mp3",
                "type": "audio",
                "duration": 172
            },
            {
                "id": "lofi-3",
                "title": "Warm Blankets & Rain",
                "artist": "Chill Beats",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77626.mp3?filename=rain-and-nostalgia-chill-lofi-song-8058.mp3",
                "type": "audio",
                "duration": 150
            }
        ]
    },
    {
        "id": "acoustic-love",
        "name": "☕ Acoustic Romance",
        "description": "Soft acoustic guitars and sweet gentle melodies",
        "tracks": [
            {
                "id": "acoustic-1",
                "title": "Sunset Memories",
                "artist": "Acoustic Breeze",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c976cc9479.mp3?filename=acoustic-guitars-ambient-126154.mp3",
                "type": "audio",
                "duration": 160
            },
            {
                "id": "acoustic-2",
                "title": "Coffee For Two",
                "artist": "Melody Strings",
                "cover": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2021/09/06/audio_731557d344.mp3?filename=tender-feeling-10707.mp3",
                "type": "audio",
                "duration": 182
            }
        ]
    },
    {
        "id": "piano-hugs",
        "name": "🎹 Soft Piano & Hugs",
        "description": "Emotional, calming piano chords for deep conversations",
        "tracks": [
            {
                "id": "piano-1",
                "title": "Eternal Promise",
                "artist": "Soleil Piano",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=soft-piano-ambient-110037.mp3",
                "type": "audio",
                "duration": 195
            },
            {
                "id": "piano-2",
                "title": "Whispers in the Dark",
                "artist": "Nocturne Hearts",
                "cover": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d0c6ff1bab.mp3?filename=emotional-piano-10837.mp3",
                "type": "audio",
                "duration": 165
            }
        ]
    }
]

# In-memory couple playlists store
custom_playlists: dict = {}

class TrackCreate(BaseModel):
    title: str
    artist: str
    url: Optional[str] = None
    videoId: Optional[str] = None
    cover: Optional[str] = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80"
    duration: Optional[int] = 180
    type: Optional[str] = "youtube"

async def fetch_music_search(query: str, limit: int = 15):
    """Searches official music catalog and returns instant streaming audio tracks."""
    results = []
    try:
        url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query)}&entity=song&limit={limit}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                for item in data.get("results", []):
                    preview_url = item.get("previewUrl")
                    if preview_url:
                        duration_sec = int(item.get("trackTimeMillis", 180000) / 1000)
                        m = duration_sec // 60
                        s = duration_sec % 60
                        results.append({
                            "id": f"track-{item.get('trackId')}",
                            "title": item.get("trackName"),
                            "artist": item.get("artistName"),
                            "cover": (item.get("artworkUrl100") or "").replace("100x100bb", "300x300bb"),
                            "url": preview_url,
                            "duration": duration_sec,
                            "duration_text": f"{m}:{s:02d}",
                            "type": "audio"
                        })
    except Exception as e:
        print("Music search error:", e)

    return results

@router.get("/search")
async def search_music(q: str = Query(..., min_length=1)):
    """Search for any song in the world (Instant streaming results)."""
    return await fetch_music_search(q)

@router.get("/channels")
async def get_channels():
    """Returns curated channels and their tracks."""
    return DEFAULT_CHANNELS

@router.get("/playlist")
async def get_couple_playlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches custom saved songs for this couple."""
    res = await db.execute(
        select(Couple).where(or_(Couple.user1_id == current_user.id, Couple.user2_id == current_user.id))
    )
    couple = res.scalar_one_or_none()
    if not couple:
        return []
    return custom_playlists.get(couple.id, [])

@router.post("/playlist")
async def add_to_couple_playlist(
    track: TrackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Adds a song (YouTube or audio URL) to the shared couple playlist."""
    res = await db.execute(
        select(Couple).where(or_(Couple.user1_id == current_user.id, Couple.user2_id == current_user.id))
    )
    couple = res.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="Not linked to a partner")

    track_item = {
        "id": track.videoId or f"custom-{uuid.uuid4().hex[:8]}",
        "title": track.title,
        "artist": track.artist,
        "url": track.url,
        "videoId": track.videoId,
        "cover": track.cover,
        "duration": track.duration,
        "type": track.type or ("youtube" if track.videoId else "audio"),
        "added_by": current_user.name
    }
    
    if couple.id not in custom_playlists:
        custom_playlists[couple.id] = []
    custom_playlists[couple.id].insert(0, track_item)

    return {"message": "Track added to playlist", "track": track_item}

@router.websocket("/ws/{couple_id}")
async def music_sync_websocket(websocket: WebSocket, couple_id: str, token: str = Query(...)):
    """WebSocket for real-time synchronized music playback."""
    await websocket.accept()
    from routers.auth import decode_token
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001)
        return

    room = f"music_{couple_id}"
    await manager.connect(websocket, room)

    # If state exists, send current playback state to sync newcomer
    state = music_states.get(couple_id)
    if state:
        await manager.send_personal(websocket, {"type": "sync_state", **state})
    else:
        await manager.send_personal(websocket, {"type": "connected", "couple_id": couple_id})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            track = data.get("track")
            position = data.get("position", 0.0)
            dj_name = data.get("dj_name", "Partner")

            if msg_type == "sync_request":
                current_state = music_states.get(couple_id)
                if current_state:
                    await manager.send_personal(websocket, {"type": "sync_state", **current_state})

            elif msg_type in ("play", "pause", "seek", "change_track"):
                # Update shared state
                music_states[couple_id] = {
                    "track": track or (music_states.get(couple_id, {}).get("track")),
                    "is_playing": msg_type in ("play", "change_track"),
                    "position": position,
                    "dj_name": dj_name,
                    "last_update": datetime.utcnow().isoformat(),
                }

                # Broadcast to partner
                await manager.broadcast(
                    room,
                    {
                        "type": msg_type,
                        "track": music_states[couple_id]["track"],
                        "position": position,
                        "is_playing": music_states[couple_id]["is_playing"],
                        "dj_name": dj_name
                    },
                    exclude=websocket
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, room)
