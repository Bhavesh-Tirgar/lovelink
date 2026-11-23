MAX_FRAME_SIZE = 65536  # 64 KB
MAX_MSGS_PER_SEC = 30
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

# Curated romantic & lofi audio channels (Bollywood, Hindi Lo-Fi & Romantic soundscapes)
DEFAULT_CHANNELS = [
    {
        "id": "bollywood-romance",
        "name": "💖 Bollywood Romance & Arijit Hits",
        "description": "Soulful romantic Hindi hits for you and your partner to sing along",
        "tracks": [
            {
                "id": "bw-1",
                "title": "Kesariya",
                "artist": "Arijit Singh & Pritam",
                "cover": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c976cc9479.mp3?filename=acoustic-guitars-ambient-126154.mp3",
                "videoId": "BddP6PYo2gs",
                "type": "youtube",
                "duration": 268
            },
            {
                "id": "bw-2",
                "title": "Tum Hi Ho",
                "artist": "Arijit Singh (Aashiqui 2)",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2021/09/06/audio_731557d344.mp3?filename=tender-feeling-10707.mp3",
                "videoId": "IJq0yyWug1k",
                "type": "youtube",
                "duration": 262
            },
            {
                "id": "bw-3",
                "title": "Raataan Lambiyan",
                "artist": "Jubin Nautiyal & Asees Kaur",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=empty-mind-118973.mp3",
                "videoId": "gvyUuxdRdR4",
                "type": "youtube",
                "duration": 230
            },
            {
                "id": "bw-4",
                "title": "Apna Bana Le",
                "artist": "Arijit Singh & Sachin-Jigar",
                "cover": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=soft-piano-ambient-110037.mp3",
                "videoId": "ElZfdU54Cp8",
                "type": "youtube",
                "duration": 261
            },
            {
                "id": "bw-5",
                "title": "Pehle Bhi Main",
                "artist": "Vishal Mishra (Animal)",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77626.mp3?filename=rain-and-nostalgia-chill-lofi-song-8058.mp3",
                "videoId": "iAIBF2ngbWY",
                "type": "youtube",
                "duration": 250
            },
            {
                "id": "bw-6",
                "title": "Tera Ban Jaunga",
                "artist": "Akhil Sachdeva & Tulsi Kumar",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
                "videoId": "eLmMomv753E",
                "type": "youtube",
                "duration": 236
            }
        ]
    },
    {
        "id": "hindi-lofi",
        "name": "🌙 Late Night Hindi Lo-Fi & Chill",
        "description": "Slowed & reverb Hindi lo-fi aesthetic beats for 2 AM talks",
        "tracks": [
            {
                "id": "hl-1",
                "title": "Kabira (Late Night Lo-Fi)",
                "artist": "Hindi Lo-Fi Collective",
                "cover": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
                "videoId": "jHNNMj5bNQw",
                "type": "youtube",
                "duration": 215
            },
            {
                "id": "hl-2",
                "title": "Iktara (Midnight Lo-Fi Reverb)",
                "artist": "Bollywood Chill Room",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=empty-mind-118973.mp3",
                "videoId": "fSS_R91Nimw",
                "type": "youtube",
                "duration": 230
            },
            {
                "id": "hl-3",
                "title": "Agar Tum Saath Ho (Rainy Lo-Fi)",
                "artist": "Cozy Monsoon Lo-Fi",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77626.mp3?filename=rain-and-nostalgia-chill-lofi-song-8058.mp3",
                "videoId": "sK7riqg2mr4",
                "type": "youtube",
                "duration": 240
            },
            {
                "id": "hl-4",
                "title": "Hawayein (Lo-Fi Acoustic)",
                "artist": "Desi Lo-Fi Hub",
                "cover": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2021/09/06/audio_731557d344.mp3?filename=tender-feeling-10707.mp3",
                "videoId": "cYOB941gyXI",
                "type": "youtube",
                "duration": 210
            },
            {
                "id": "hl-5",
                "title": "O Sanam (Nostalgic Chillout)",
                "artist": "Lucky Ali Chill Tribute",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c976cc9479.mp3?filename=acoustic-guitars-ambient-126154.mp3",
                "videoId": "1eO74UmRBs",
                "type": "youtube",
                "duration": 205
            }
        ]
    },
    {
        "id": "bollywood-nostalgia",
        "name": "🎧 90s & 2000s Bollywood Nostalgia",
        "description": "Timeless golden era romance and nostalgic memories",
        "tracks": [
            {
                "id": "bn-1",
                "title": "Tujhe Dekha To (DDLJ)",
                "artist": "Kumar Sanu & Lata Mangeshkar",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c976cc9479.mp3?filename=acoustic-guitars-ambient-126154.mp3",
                "videoId": "cNV5hLKh9Sg",
                "type": "youtube",
                "duration": 280
            },
            {
                "id": "bn-2",
                "title": "Kal Ho Naa Ho",
                "artist": "Sonu Nigam & Shankar-Ehsaan-Loy",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=soft-piano-ambient-110037.mp3",
                "videoId": "g0eO74UmRBs",
                "type": "youtube",
                "duration": 290
            },
            {
                "id": "bn-3",
                "title": "Suraj Hua Maddham",
                "artist": "Sonu Nigam & Alka Yagnik",
                "cover": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/02/07/audio_d0c6ff1bab.mp3?filename=emotional-piano-10837.mp3",
                "videoId": "L0zKs8i7Nc8",
                "type": "youtube",
                "duration": 310
            },
            {
                "id": "bn-4",
                "title": "Zara Zara (RHTDM)",
                "artist": "Bombay Jayashri",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77626.mp3?filename=rain-and-nostalgia-chill-lofi-song-8058.mp3",
                "videoId": "0b9zS8c-B-E",
                "type": "youtube",
                "duration": 275
            },
            {
                "id": "bn-5",
                "title": "Pee Loon",
                "artist": "Mohit Chauhan (OUATIM)",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3?filename=empty-mind-118973.mp3",
                "videoId": "Y_SdtLms1e0",
                "type": "youtube",
                "duration": 285
            }
        ]
    },
    {
        "id": "acoustic-love",
        "name": "☕ Bollywood Acoustic Romance",
        "description": "Soft acoustic guitars and sweet gentle Hindi melodies",
        "tracks": [
            {
                "id": "acoustic-1",
                "title": "Dil Diyan Gallan (Acoustic)",
                "artist": "Acoustic Breeze",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/11/06/audio_c976cc9479.mp3?filename=acoustic-guitars-ambient-126154.mp3",
                "type": "audio",
                "duration": 220
            },
            {
                "id": "acoustic-2",
                "title": "Raabta (Unplugged)",
                "artist": "Melody Strings",
                "cover": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2021/09/06/audio_731557d344.mp3?filename=tender-feeling-10707.mp3",
                "type": "audio",
                "duration": 215
            },
            {
                "id": "acoustic-3",
                "title": "Hasi (Acoustic Soul)",
                "artist": "Ami Mishra Chill",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=soft-piano-ambient-110037.mp3",
                "type": "audio",
                "duration": 235
            }
        ]
    },
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

async def search_youtube_full_tracks(query: str, limit: int = 15):
    """Searches YouTube to provide complete, full-duration songs without 30-second limitations."""
    tracks = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(query + ' audio')}"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            res = await client.get(url, headers=headers)
            html = res.text
            match = re.search(r'var ytInitialData = ({.*?});</script>', html)
            if match:
                raw_data = json.loads(match.group(1))
                contents = (
                    raw_data.get("contents", {})
                    .get("twoColumnSearchResultsRenderer", {})
                    .get("primaryContents", {})
                    .get("sectionListRenderer", {})
                    .get("contents", [])
                )
                for section in contents:
                    items = section.get("itemSectionRenderer", {}).get("contents", [])
                    for item in items:
                        v = item.get("videoRenderer")
                        if v and "videoId" in v:
                            title = v.get("title", {}).get("runs", [{}])[0].get("text", "Unknown Song")
                            artist = v.get("ownerText", {}).get("runs", [{}])[0].get("text", "Artist")
                            duration_text = v.get("lengthText", {}).get("simpleText", "3:30")
                            video_id = v["videoId"]
                            thumbnails = v.get("thumbnail", {}).get("thumbnails", [{}])
                            cover = thumbnails[-1].get("url") if thumbnails else f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
                            
                            parts = duration_text.split(":")
                            dur_sec = 0
                            for p in parts:
                                if p.isdigit():
                                    dur_sec = dur_sec * 60 + int(p)

                            tracks.append({
                                "id": f"yt-{video_id}",
                                "title": title,
                                "artist": artist,
                                "videoId": video_id,
                                "cover": cover,
                                "duration": dur_sec,
                                "duration_text": duration_text,
                                "type": "youtube",
                                "url": f"https://www.youtube.com/watch?v={video_id}"
                            })
                            if len(tracks) >= limit:
                                return tracks
    except Exception as e:
        print("YouTube search error:", e)
    return tracks


async def fetch_music_search(query: str, limit: int = 15):
    """Searches music catalog: prefers full YouTube songs, falls back to catalog preview."""
    # 1. First attempt full YouTube songs
    yt_tracks = await search_youtube_full_tracks(query, limit=limit)
    if yt_tracks and len(yt_tracks) > 0:
        return yt_tracks

    # 2. Fallback to iTunes catalog
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
    from routers.auth import decode_token
    user_id = decode_token(token)
    if not user_id:
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Verify user belongs to this couple
    from database import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as db:
            c_res = await db.execute(select(Couple).where(Couple.id == couple_id))
            couple = c_res.scalars().first()
            if not couple or (str(couple.user1_id) != user_id and str(couple.user2_id) != user_id):
                await websocket.close(code=4003, reason="Forbidden: User does not belong to this couple")
                return
    except Exception as e:
        await websocket.close(code=4001, reason="Authentication error")
        return

    # Accept connection only after authentication and authorization succeed
    await websocket.accept()
    room = f"music_{couple_id}"
    await manager.connect(websocket, room)

    # If state exists, send current playback state to sync newcomer
    state = music_states.get(couple_id)
    if state:
        await manager.send_personal(websocket, {"type": "sync_state", **state})
    else:
        await manager.send_personal(websocket, {"type": "connected", "couple_id": couple_id})

    import json
    import time
    MAX_FRAME_SIZE = 65536
    RATE_LIMIT_WINDOW = 1.0
    MAX_MSGS_PER_SEC = 30
    msg_timestamps = []

    try:
        while True:
            raw_text = await websocket.receive_text()
            if len(raw_text.encode("utf-8")) > MAX_FRAME_SIZE:
                await websocket.close(code=1009, reason="Message exceeds 64KB size limit")
                break

            now = time.time()
            msg_timestamps = [t for t in msg_timestamps if now - t < RATE_LIMIT_WINDOW]
            if len(msg_timestamps) >= MAX_MSGS_PER_SEC:
                await websocket.close(code=1008, reason="Rate limit exceeded")
                break
            msg_timestamps.append(now)

            data = json.loads(raw_text)
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
