from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models.user import User
from models.couple import Couple
from crud.couple import get_active_couple_by_user
from routers.auth import get_current_user
from ws_manager.manager import manager
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import uuid
import re
import urllib.parse
import httpx

MAX_FRAME_SIZE = 65536  # 64 KB
MAX_MSGS_PER_SEC = 30

router = APIRouter()

# In-memory music playback state per couple: {couple_id: {track, is_playing, position, last_update, dj_name}}
music_states: dict = {}

# Curated romantic & lofi audio channels (Verified live full-length audio/mpeg streams + fallback CDN)
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
                "url": "https://api.audius.co/v1/tracks/NvXwOB4/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                "type": "audio",
                "duration": 283
            },
            {
                "id": "bw-2",
                "title": "Tum Hi Ho (Acoustic)",
                "artist": "Arijit Singh (Aashiqui 2)",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/blQ8b/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
                "type": "audio",
                "duration": 241
            },
            {
                "id": "bw-3",
                "title": "Raataan Lambiyan (Lo-Fi)",
                "artist": "Jubin Nautiyal & Asees Kaur",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/ZEJjy/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
                "type": "audio",
                "duration": 267
            },
            {
                "id": "bw-4",
                "title": "Apna Bana Le",
                "artist": "Arijit Singh & Sachin-Jigar",
                "cover": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/B5EGGzm/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
                "type": "audio",
                "duration": 204
            },
            {
                "id": "bw-5",
                "title": "Tera Ban Jaunga",
                "artist": "Akhil Sachdeva & Tulsi Kumar",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/WVzoK/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
                "type": "audio",
                "duration": 237
            },
            {
                "id": "bw-6",
                "title": "Agar Tum Saath Ho",
                "artist": "Alka Yagnik & Arijit Singh",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/93w61yj/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
                "type": "audio",
                "duration": 341
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
                "title": "Kesariya x Saibo (Slowed + Reverb Lo-Fi)",
                "artist": "Hindi Lo-Fi Collective",
                "cover": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/ZO0yNA6/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
                "type": "audio",
                "duration": 437
            },
            {
                "id": "hl-2",
                "title": "Kabira (Late Night Chill)",
                "artist": "Bollywood Chill Room",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/Eq7JRXM/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
                "type": "audio",
                "duration": 251
            },
            {
                "id": "hl-3",
                "title": "Ye Tune Kya Kiya x Pee Loon",
                "artist": "Cozy Monsoon Lo-Fi",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/6aPmv0Q/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
                "type": "audio",
                "duration": 79
            },
            {
                "id": "hl-4",
                "title": "Midnight Chill Hip Hop Beat",
                "artist": "Desi Lo-Fi Hub",
                "cover": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/2RlV2/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
                "type": "audio",
                "duration": 196
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
                "title": "Dekha Tujhe Toh (90s Romantic Collection)",
                "artist": "Kumar Sanu & 90s Classics",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/9R02BPk/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
                "type": "audio",
                "duration": 452
            },
            {
                "id": "bn-2",
                "title": "Dil Diyan Gallan",
                "artist": "Atif Aslam & Vishal-Shekhar",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/x23Q8R2/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
                "type": "audio",
                "duration": 261
            },
            {
                "id": "bn-3",
                "title": "Agar Tum Saath Ho (Classic Mix)",
                "artist": "Alka Yagnik & Arijit Singh",
                "cover": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/PbvrKAR/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3",
                "type": "audio",
                "duration": 341
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
                "title": "Tum Hi Ho (Fingerstyle Acoustic)",
                "artist": "Yulio & Acoustic Breeze",
                "cover": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/blQ8b/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3",
                "type": "audio",
                "duration": 241
            },
            {
                "id": "acoustic-2",
                "title": "More Than Enough (Romantic Chill)",
                "artist": "Melody Strings",
                "cover": "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/y8NWZ/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3",
                "type": "audio",
                "duration": 152
            },
            {
                "id": "acoustic-3",
                "title": "Starlight Guitar Ballad",
                "artist": "LoveLink Studio",
                "cover": "https://images.unsplash.com/photo-1520523839898-507127027581?w=300&auto=format&fit=crop&q=80",
                "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
                "type": "audio",
                "duration": 372
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
                "title": "Sleet (Rainy Night Lo-Fi)",
                "artist": "Byte & Lofi Cozy Cafe",
                "cover": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/B0aQj/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3",
                "type": "audio",
                "duration": 103
            },
            {
                "id": "lofi-2",
                "title": "Snow (Midnight Chill)",
                "artist": "Byte",
                "cover": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
                "url": "https://api.audius.co/v1/tracks/k4mWX/stream?app_name=lovelink",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
                "type": "audio",
                "duration": 120
            },
            {
                "id": "lofi-3",
                "title": "Warm Blankets & Rain",
                "artist": "Chill Beats",
                "cover": "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=300&auto=format&fit=crop&q=80",
                "url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
                "fallback_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
                "type": "audio",
                "duration": 302
            }
        ]
    }
]

# In-memory cache synchronized with Couple.spotify_url JSON column for durability across restarts
custom_playlists: dict = {}

class TrackCreate(BaseModel):
    title: str
    artist: str
    url: Optional[str] = None
    fallback_url: Optional[str] = None
    videoId: Optional[str] = None
    cover: Optional[str] = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80"
    duration: Optional[int] = 180
    type: Optional[str] = "audio"

async def search_audius_tracks(query: str, limit: int = 12):
    """Searches Audius for direct full-length MP3 audio streams (works seamlessly in Android background)."""
    tracks = []
    default_cover = "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80"
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.audius.co/v1/tracks/search",
                params={"query": query, "app_name": "lovelink", "limit": limit}
            )
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                for idx, item in enumerate(data):
                    if not item.get("is_streamable", True):
                        continue
                    if not (item.get("access") or {}).get("stream", True):
                        continue
                    if item.get("is_stream_gated"):
                        continue
                    tid = item.get("id")
                    if not tid:
                        continue
                    dur_sec = int(item.get("duration") or 180)
                    art = (item.get("artwork") or {}).get("480x480") or (item.get("artwork") or {}).get("150x150") or default_cover
                    m, s = dur_sec // 60, dur_sec % 60
                    tracks.append({
                        "id": f"audius-{tid}",
                        "title": item.get("title") or "Untitled Track",
                        "artist": (item.get("user") or {}).get("name") or "Artist",
                        "cover": art,
                        "url": f"https://api.audius.co/v1/tracks/{tid}/stream?app_name=lovelink",
                        "fallback_url": f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{(idx % 16) + 1}.mp3",
                        "duration": dur_sec,
                        "duration_text": f"{m}:{s:02d}",
                        "type": "audio"
                    })
                    if len(tracks) >= limit:
                        break
    except Exception as e:
        print("Audius search error:", e)
    return tracks

async def search_youtube_full_tracks(query: str, limit: int = 10):
    """Fallback search via YouTube if no direct audio stream results exist."""
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
                                "url": ""
                            })
                            if len(tracks) >= limit:
                                return tracks
    except Exception as e:
        print("YouTube search error:", e)
    return tracks


async def fetch_music_search(query: str, limit: int = 15):
    """Searches music catalog: prefers full direct audio streams (background safe), falls back to iTunes / YouTube."""
    audius_tracks = await search_audius_tracks(query, limit=limit)
    if audius_tracks:
        return audius_tracks

    # 2. Fallback to iTunes direct M4A catalog
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
                        duration_sec = int(item.get("trackTimeMillis", 30000) / 1000)
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

    if results:
        return results

    # 3. Final fallback to YouTube embeddable results
    return await search_youtube_full_tracks(query, limit=limit)

@router.get("/search")
async def search_music(q: str = Query(..., min_length=1)):
    """Search for any song in the world (Instant streaming results)."""
    return await fetch_music_search(q)

@router.get("/channels")
async def get_channels():
    """Returns curated channels and their tracks."""
    return DEFAULT_CHANNELS

def _load_persisted_playlist(couple: Couple) -> list:
    cid = str(couple.id)
    if cid in custom_playlists:
        return custom_playlists[cid]
    if couple.spotify_url:
        try:
            parsed = json.loads(couple.spotify_url)
            if isinstance(parsed, list):
                custom_playlists[cid] = parsed
                return parsed
        except Exception:
            pass
    return []

@router.get("/playlist")
async def get_couple_playlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches custom saved songs for this couple."""
    couple = await get_active_couple_by_user(db, current_user.id)
    if not couple:
        return []
    return _load_persisted_playlist(couple)

@router.post("/playlist")
async def add_to_couple_playlist(
    track: TrackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Adds a song (direct audio or YouTube) to the shared couple playlist."""
    couple = await get_active_couple_by_user(db, current_user.id)
    if not couple:
        raise HTTPException(status_code=400, detail="Not linked to a partner")

    has_direct_audio = bool(track.url and "youtube.com" not in track.url and "youtu.be" not in track.url)
    resolved_type = "audio" if has_direct_audio else (track.type or ("youtube" if track.videoId else "audio"))

    track_item = {
        "id": track.videoId or f"custom-{uuid.uuid4().hex[:8]}",
        "title": track.title,
        "artist": track.artist,
        "url": track.url if has_direct_audio else None,
        "fallback_url": track.fallback_url,
        "videoId": None if has_direct_audio else track.videoId,
        "cover": track.cover,
        "duration": track.duration,
        "type": resolved_type,
        "added_by": current_user.name
    }

    cid = str(couple.id)
    playlist = list(_load_persisted_playlist(couple))
    playlist.insert(0, track_item)
    playlist = playlist[:100]
    custom_playlists[cid] = playlist

    couple.spotify_url = json.dumps(playlist)
    db.add(couple)
    await db.commit()

    return {"message": "Track added to playlist", "track": track_item}

@router.websocket("/ws/{couple_id}")
async def music_sync_websocket(
    websocket: WebSocket,
    couple_id: str,
    ticket: Optional[str] = Query(default=None),
    token: Optional[str] = Query(default=None),
):
    """WebSocket for real-time synchronized music playback (single-use ticket or JWT token)."""
    from routers.auth import decode_token
    from utils.tickets import verify_and_consume_ws_ticket

    user_id = None
    if ticket:
        user_id = verify_and_consume_ws_ticket(ticket)
    if not user_id and token:
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
