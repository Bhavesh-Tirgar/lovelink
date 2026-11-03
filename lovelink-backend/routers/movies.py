import os
import io
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Body, WebSocket, WebSocketDisconnect, Response
from fastapi.responses import StreamingResponse
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

# ── R2 client ─────────────────────────────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
CLOUDFLARE_R2_ACCESS_KEY = os.environ.get("CLOUDFLARE_R2_ACCESS_KEY", "")
CLOUDFLARE_R2_SECRET_KEY = os.environ.get("CLOUDFLARE_R2_SECRET_KEY", "")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "lovelink")
R2_PUBLIC_URL = os.environ.get("R2_PUBLIC_URL", "")

s3_client = boto3.client(
    service_name="s3",
    endpoint_url=f"https://{CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com" if CLOUDFLARE_ACCOUNT_ID else None,
    aws_access_key_id=CLOUDFLARE_R2_ACCESS_KEY,
    aws_secret_access_key=CLOUDFLARE_R2_SECRET_KEY,
    region_name="auto",
)

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

    if CLOUDFLARE_ACCOUNT_ID:
        s3_client.upload_fileobj(
            io.BytesIO(file_bytes), R2_BUCKET_NAME, key,
            ExtraArgs={"ContentType": content_type},
        )
    file_url = f"{R2_PUBLIC_URL}/{key}" if R2_PUBLIC_URL else f"https://mock.storage/{key}"

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
    movie = await create_movie(
        db=db,
        couple_id=str((await _get_couple(db, str(current_user.id))).id),
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
    return _movie_to_response(movie)


# ── DELETE /movies/{movie_id} ──────────────────────────────────────────────────
@router.delete("/{movie_id}")
async def remove_movie(
    movie_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    movie = await delete_movie(db, movie_id, str(current_user.id))
    # Delete from R2 if uploaded
    if movie.source_type == SourceType.upload and movie.file_url and CLOUDFLARE_ACCOUNT_ID:
        try:
            key = movie.file_url.replace(f"{R2_PUBLIC_URL}/", "")
            s3_client.delete_object(Bucket=R2_BUCKET_NAME, Key=key)
        except Exception as e:
            print(f"R2 delete warning: {e}")
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
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    movie = await get_movie(db, movie_id)
    if movie.source_type != SourceType.upload or not movie.file_url:
        raise HTTPException(status_code=400, detail="This movie is not a streamable upload")

    key = movie.file_url.replace(f"{R2_PUBLIC_URL}/", "")
    try:
        obj = s3_client.get_object(Bucket=R2_BUCKET_NAME, Key=key)
        content_length = obj["ContentLength"]
        content_type = obj.get("ContentType", "video/mp4")
        body_stream = obj["Body"]

        def iter_content():
            while True:
                chunk = body_stream.read(1024 * 512)  # 512 KB chunks
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Streaming error: {e}")


# ── WebSocket /ws/watch/{couple_id} ───────────────────────────────────────────
@router.websocket("/ws/{couple_id}")
async def watch_ws(
    websocket: WebSocket,
    couple_id: str,
    token: str,
    db: AsyncSession = Depends(get_db),
):
    from routers.auth import get_current_user_from_token
    try:
        user = await get_current_user_from_token(token, db)
    except Exception:
        await websocket.close(code=4003, reason="Unauthorized")
        return

    await websocket.accept()
    await manager.connect(websocket, f"watch_{couple_id}")

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
                # Update in-memory state
                watch_states[couple_id] = {
                    "movie_id": movie_id,
                    "source_type": source_type,
                    "is_playing": msg_type in ("play", "yt_play"),
                    "position": position,
                    "last_update": datetime.utcnow().isoformat(),
                }
                # Broadcast to partner (exclude sender)
                await manager.broadcast(
                    f"watch_{couple_id}",
                    {"type": msg_type, "position": position, "movie_id": movie_id},
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

    except WebSocketDisconnect:
        manager.disconnect(websocket, f"watch_{couple_id}")
