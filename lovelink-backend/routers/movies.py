import os
import io
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body, WebSocket, WebSocketDisconnect, Header
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import boto3

from database import get_db
from models.user import User
from models.couple import Couple
from models.movie import Movie, SourceType
from routers.auth import get_current_user
from schemas.movie import MovieCreate, MovieResponse, WatchSessionResponse
from crud.movie import (
    create_movie, get_movies, get_movie, mark_watched,
    delete_movie, get_or_create_session, update_session,
)
from utils.youtube import extract_youtube_id, get_youtube_thumbnail
from ws_manager.manager import manager

router = APIRouter()

# ── Storage Configuration ──────────────────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_R2_ACCESS_KEY = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY", "")
CLOUDFLARE_R2_SECRET_KEY = os.environ.get("CLOUDFLARE_R2_SECRET_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "lovelink")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
BASE_URL = os.getenv("API_BASE_URL", "https://lovelink-sfzx.onrender.com")

s3_client = boto3.client(
    service_name="s3",
    endpoint_url=f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" if CLOUDFLARE_ACCOUNT_ID else None,
    aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY,
    aws_secret_access_key=CLOUDFLARE_R2_SECRET_KEY,
    region_name="auto",
) if (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_R2_ACCESS_KEY and CLOUDFLARE_R2_SECRET_KEY) else None

VIDEO_EXTS = {"mp4", "mov", "avi", "mkv", "webm"}
MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024  # 4 GB

# In-memory watch state per couple: {couple_id: {movie_id, source_type, is_playing, position, last_update}}
watch_states: dict = {}


async def _get_couple(db: AsyncSession, user_id: str) -> Couple:
    result = await db.execute(
        select(Couple).where(or_(Couple.user1_id == user_id, Couple.user2_id == user_id))
    )
    couple = result.scalar_one_or_none()
    if not couple:
        raise HTTPException(status_code=400, detail="You are not linked to a partner yet")
    return couple


def _movie_to_response(movie: Movie) -> MovieResponse:
    return MovieResponse(
        id=movie.id,
        couple_id=movie.couple_id,
        added_by=movie.added_by,
        title=movie.title,
        source_type=movie.source_type,
        file_url=movie.file_url,
        youtube_url=movie.youtube_url,
        youtube_id=movie.youtube_id,
        thumbnail_url=movie.thumbnail_url,
        duration_secs=movie.duration_secs,
        file_size_bytes=movie.file_size_bytes,
        watched_at=movie.watched_at,
        rating=movie.rating,
        created_at=movie.created_at,
        adder_name=getattr(movie, "adder_name", None),
    )


def _store_movie_file(file_bytes: bytes, key: str, content_type: str) -> str:
    """Store video in Cloudflare R2 if configured; otherwise store locally in uploads/movies."""
    if CLOUDFLARE_ACCOUNT_ID and s3_client and R2_PUBLIC_URL:
        try:
            s3_client.upload_fileobj(
                io.BytesIO(file_bytes), R2_BUCKET_NAME, key,
                ExtraArgs={"ContentType": content_type},
            )
            return f"{R2_PUBLIC_URL.rstrip('/')}/{key}"
        except Exception as e:
            print(f"R2 upload failed: {e}")

    # Fallback to local static storage served via /uploads
    local_path = os.path.join(UPLOAD_DIR, key)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, "wb") as f:
        f.write(file_bytes)
    return f"{BASE_URL.rstrip('/')}/uploads/{key}"


# ── POST /movies/upload ────────────────────────────────────────────────────────
@router.post("/upload", response_model=MovieResponse, status_code=201)
async def upload_movie(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in VIDEO_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported video type: .{ext}")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    if file_size > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Max 4 GB.")

    video_title = title or (file.filename or "Untitled").rsplit(".", 1)[0]
    file_id = str(uuid.uuid4())
    key = f"movies/{couple.id}/{file_id}.{ext}"
    content_type = file.content_type or "video/mp4"

    file_url = _store_movie_file(file_bytes, key, content_type)

    # Try to get duration via pymediainfo (optional)
    duration_secs = None
    try:
        from pymediainfo import MediaInfo
        info = MediaInfo.parse(io.BytesIO(file_bytes))
        for track in info.tracks:
            if track.track_type == "General" and track.duration:
                duration_secs = int(float(track.duration) / 1000)
                break
    except Exception:
        pass

    movie = await create_movie(
        db=db,
        couple_id=str(couple.id),
        added_by=str(current_user.id),
        title=video_title,
        source_type=SourceType.upload,
        file_url=file_url,
        file_size_bytes=file_size,
        duration_secs=duration_secs,
    )
    return _movie_to_response(movie)


# ── POST /movies/add-youtube ───────────────────────────────────────────────────
@router.post("/add-youtube", response_model=MovieResponse, status_code=201)
async def add_youtube(
    payload: MovieCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not payload.youtube_url:
        raise HTTPException(status_code=400, detail="youtube_url is required")

    video_id = extract_youtube_id(payload.youtube_url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL")

    thumbnail_url = get_youtube_thumbnail(video_id)
    couple = await _get_couple(db, str(current_user.id))
    movie = await create_movie(
        db=db,
        couple_id=str(couple.id),
        added_by=str(current_user.id),
        title=payload.title,
        source_type=SourceType.youtube,
        youtube_url=payload.youtube_url,
        youtube_id=video_id,
        thumbnail_url=thumbnail_url,
    )
    return _movie_to_response(movie)


# ── GET /movies ────────────────────────────────────────────────────────────────
@router.get("", response_model=List[MovieResponse])
async def list_movies(
    watched: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    couple = await _get_couple(db, str(current_user.id))
    movies = await get_movies(db, str(couple.id), watched=watched)
    return [_movie_to_response(m) for m in movies]


# ── GET /movies/{movie_id} ─────────────────────────────────────────────────────
@router.get("/{movie_id}", response_model=MovieResponse)
async def get_single_movie(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    movie = await get_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return _movie_to_response(movie)


# ── DELETE /movies/{movie_id} ──────────────────────────────────────────────────
@router.delete("/{movie_id}")
async def remove_movie(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    movie = await delete_movie(db, movie_id, str(current_user.id))
    # Delete from R2 or local storage if uploaded
    if movie.source_type == SourceType.upload and movie.file_url:
        if CLOUDFLARE_ACCOUNT_ID and s3_client and R2_PUBLIC_URL in movie.file_url:
            try:
                key = movie.file_url.replace(f"{R2_PUBLIC_URL}/", "")
                s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
            except Exception as e:
                print(f"R2 delete warning: {e}")
        else:
            try:
                key = movie.file_url.replace(f"{BASE_URL.rstrip('/')}/uploads/", "")
                local_path = os.path.join(UPLOAD_DIR, key)
                if os.path.exists(local_path):
                    os.remove(local_path)
            except Exception as e:
                print(f"Local delete warning: {e}")
    return {"deleted": True}


# ── PUT /movies/{movie_id}/watched ─────────────────────────────────────────────
@router.put("/{movie_id}/watched", response_model=MovieResponse)
async def set_watched(
    movie_id: str,
    body: dict = Body(default={}),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    movie = await mark_watched(db, movie_id, rating=body.get("rating"))
    return _movie_to_response(movie)


# ── GET /movies/{movie_id}/stream ──────────────────────────────────────────────
@router.get("/{movie_id}/stream")
async def stream_movie(
    movie_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Stream uploaded movie video file.
    Supports both Authorization header and ?token=... query parameter for HTML5 <video> tags.
    Supports HTTP 206 Partial Content Range requests natively.
    """
    movie = await get_movie(db, movie_id)
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
        
    if movie.source_type != SourceType.upload or not movie.file_url:
        raise HTTPException(status_code=400, detail="This movie is not a streamable upload")

    # 1. Check if the file is stored locally on disk
    key = movie.file_url.replace(f"{BASE_URL.rstrip('/')}/uploads/", "")
    local_path = os.path.join(UPLOAD_DIR, key)
    if os.path.exists(local_path):
        return FileResponse(
            local_path,
            media_type="video/mp4",
            filename=f"{movie.title}.mp4"
        )

    # 2. Check if stored on Cloudflare R2
    if CLOUDFLARE_ACCOUNT_ID and s3_client and R2_PUBLIC_URL:
        r2_key = movie.file_url.replace(f"{R2_PUBLIC_URL}/", "")
        try:
            obj = s3_client.get_object(Bucket=R2_BUCKET_NAME, Key=r2_key)
            content_length = obj["ContentLength"]
            content_type = obj.get("ContentType", "video/mp4")
            body_stream = obj["Body"]

            def iter_content():
                while True:
                    chunk = body_stream.read(1024 * 512)
                    if not chunk:
                        break
                    yield chunk

            return StreamingResponse(
                iter_content(),
                status_code=206,
                media_type=content_type,
                headers={
                    "Content-Length": str(content_length),
                    "Accept-Ranges": "bytes",
                },
            )
        except Exception:
            if movie.file_url.startswith("http"):
                return RedirectResponse(movie.file_url)

    # 3. Direct URL fallback
    if movie.file_url.startswith("http"):
        return RedirectResponse(movie.file_url)

    raise HTTPException(status_code=404, detail="Video stream source not found")


# ── WebSocket /movies/ws/{couple_id} ───────────────────────────────────────────
@router.websocket("/ws/{couple_id}")
async def watch_ws(
    websocket: WebSocket,
    couple_id: str,
    token: Optional[str] = None,
    ticket: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    from routers.auth import get_current_user_from_token
    from utils.tickets import verify_and_consume_ticket
    user = None
    if ticket:
        user_id = verify_and_consume_ticket(ticket)
        if user_id:
            res = await db.execute(select(User).where(User.id == user_id))
            user = res.scalar_one_or_none()
    if not user and token:
        try:
            user = await get_current_user_from_token(token, db)
        except Exception:
            pass
    if not user:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    await websocket.accept()
    await manager.connect(websocket, f"watch_{couple_id}")

    # Broadcast seat presence so partner knows user took a seat on stage
    await manager.broadcast(
        f"watch_{couple_id}",
        {
            "type": "seat_update",
            "user_id": str(user.id),
            "user_name": user.name,
            "user_photo": getattr(user, "photo_url", None),
            "status": "seated"
        },
        exclude=websocket
    )

    # Send current watch state to new joiner
    state = watch_states.get(couple_id)
    if state:
        await manager.send_personal(websocket, {"type": "sync_state", **state})
    else:
        await manager.send_personal(websocket, {"type": "connected", "couple_id": couple_id})

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            position = data.get("position", 0.0)
            movie_id = data.get("movie_id")
            source_type = data.get("source_type", "upload")

            if msg_type == "sync_request":
                state = watch_states.get(couple_id)
                if state:
                    await manager.send_personal(websocket, {"type": "sync_state", **state})

            elif msg_type in ("play", "pause", "seek", "yt_play", "yt_pause", "yt_seek"):
                watch_states[couple_id] = {
                    "movie_id": movie_id,
                    "source_type": source_type,
                    "is_playing": msg_type in ("play", "yt_play"),
                    "position": position,
                    "last_update": datetime.utcnow().isoformat(),
                }
                await manager.broadcast(
                    f"watch_{couple_id}",
                    {"type": msg_type, "position": position, "movie_id": movie_id},
                    exclude=websocket,
                )

            elif msg_type == "change_movie":
                new_movie_id = data.get("movie_id")
                new_source = data.get("source_type", "upload")
                watch_states[couple_id] = {
                    "movie_id": new_movie_id,
                    "source_type": new_source,
                    "is_playing": False,
                    "position": 0.0,
                    "last_update": datetime.utcnow().isoformat(),
                }
                await manager.broadcast(
                    f"watch_{couple_id}",
                    {
                        "type": "change_movie",
                        "movie_id": new_movie_id,
                        "movie": data.get("movie"),
                        "source_type": new_source
                    },
                    exclude=websocket,
                )

            elif msg_type == "seat_nudge":
                await manager.broadcast(
                    f"watch_{couple_id}",
                    {"type": "seat_nudge", "from_name": user.name},
                    exclude=websocket,
                )

            elif msg_type == "reaction":
                emoji = data.get("emoji", "❤️")
                await manager.broadcast(
                    f"watch_{couple_id}",
                    {"type": "reaction", "emoji": emoji, "from": str(user.id)},
                    exclude=websocket,
                )

            elif msg_type == "chat":
                text = data.get("text", "")
                await manager.broadcast(
                    f"watch_{couple_id}",
                    {"type": "chat", "text": text, "from": str(user.id), "name": user.name},
                    exclude=websocket,
                )

            elif msg_type in ("watch_cam_offer", "watch_cam_answer", "watch_cam_candidate", "watch_cam_join", "watch_cam_leave"):
                await manager.broadcast(
                    f"watch_{couple_id}",
                    data,
                    exclude=websocket,
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"watch_{couple_id}")
        await manager.broadcast(
            f"watch_{couple_id}",
            {"type": "seat_update", "user_id": str(user.id), "status": "left"}
        )
