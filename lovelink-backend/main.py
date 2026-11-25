import os
from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
import sys
print(f"DEBUG sys.path: {sys.path}")
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import auth, couples, dashboard
from routers.mood import router as mood_router
from routers.chat import router as chat_router, ws_router as chat_ws_router
from routers.countdowns import router as countdowns_router
from routers.games import router as games_router
from routers.cycle import router as cycle_router
from routers.room import router as room_router
from routers.media import router as media_router
from routers.movies import router as movies_router
from routers.calls import router as calls_router
from routers.notifications import router as notifs_router
from routers.music import router as music_router
from routers.snap import router as snap_router
from scheduler.jobs import check_milestones, prune_stale_sessions, prune_stale_sensitive_data
from starlette.middleware.gzip import GZipMiddleware

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from utils.firebase import init_firebase
    init_firebase()
    scheduler.add_job(check_milestones, "cron", hour=9, minute=0, timezone="Asia/Kolkata")
    scheduler.add_job(prune_stale_sessions, "interval", minutes=30, id="prune_sessions")
    scheduler.add_job(prune_stale_sensitive_data, "interval", hours=1, id="prune_sensitive_data")
    scheduler.start()
    try:
        from database import engine, Base
        from sqlalchemy import text
        import models.cycle
        import models.room
        import models.reel
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT"))
                await conn.execute(text("ALTER TABLE cycle_logs ADD COLUMN IF NOT EXISTS encrypted_payload TEXT"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_sent_at TIMESTAMP"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_config JSON"))
                await conn.execute(text("ALTER TABLE couple_rooms ADD COLUMN IF NOT EXISTS couple_action VARCHAR(50)"))
                await conn.execute(text("ALTER TABLE couple_rooms ADD COLUMN IF NOT EXISTS couple_action_by VARCHAR(100)"))
                await conn.execute(text("ALTER TABLE couple_rooms ADD COLUMN IF NOT EXISTS couple_action_updated_at TIMESTAMP"))
            except Exception as me:
                print(f"Column migration notice: {me}")
    except Exception as e:
        print(f"Error creating tables on startup: {e}")
    yield
    scheduler.shutdown()


app = FastAPI(title="LoveLink API", lifespan=lifespan)

import re

ALLOWED_ORIGIN_REGEX = re.compile(r"^https://lovelink-pearl(-git-[a-zA-Z0-9_-]+)?\.vercel\.app$")
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://localhost",
    "https://localhost",
    "capacitor://localhost",
    "https://lovelink-pearl.vercel.app",
    "https://lovelink.vercel.app",
]

def get_cors_origin(request: Request) -> str:
    origin = request.headers.get("origin")
    if not origin:
        return ""
    if origin in ALLOWED_ORIGINS or ALLOWED_ORIGIN_REGEX.match(origin):
        return origin
    return ""

def get_cors_headers(request: Request) -> dict:
    origin = get_cors_origin(request)
    if not origin:
        return {}
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
    }

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://lovelink-pearl(-git-[a-zA-Z0-9_-]+)?\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Authorization"],
    max_age=600,
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=headers,
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = f"Unhandled Exception: {str(exc)} - {traceback.format_exc()}"
    print(error_msg)
    headers = get_cors_headers(request)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
        headers=headers,
    )


app.include_router(auth.router)
app.include_router(couples.router)
app.include_router(dashboard.router)
app.include_router(mood_router, prefix="/mood", tags=["mood"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(chat_ws_router, prefix="/ws/chat", tags=["ws_chat"])
app.include_router(countdowns_router, prefix="/countdowns", tags=["countdowns"])
app.include_router(media_router, prefix="/media", tags=["media"])
app.include_router(movies_router, prefix="/movies", tags=["movies"])
app.include_router(calls_router, prefix="/calls", tags=["calls"])
app.include_router(notifs_router, prefix="/notifications", tags=["notifications"])
app.include_router(music_router, prefix="/music", tags=["music"])
app.include_router(games_router, prefix="/games", tags=["games"])
app.include_router(cycle_router, prefix="/cycle", tags=["cycle"])
app.include_router(room_router, prefix="/room", tags=["room"])
app.include_router(snap_router, prefix="/snap", tags=["snap"])

# Mount uploads directory for images, media, and voice notes
from fastapi.staticfiles import StaticFiles
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(os.path.join(uploads_dir, "chat"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "media"), exist_ok=True)
os.makedirs(os.path.join(uploads_dir, "thumbnails"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.api_route("/", methods=["GET", "HEAD"])
async def root():
    return PlainTextResponse("OK", status_code=200, headers={"Content-Length": "2"})

@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    """Lightweight, unauthenticated health check endpoint for external uptime pingers (UptimeRobot, cron-job.org)."""
    return JSONResponse(
        status_code=200,
        content={"status": "ok", "service": "LoveLink Backend API"}
    )

@app.api_route("/ping", methods=["GET", "HEAD"])
async def ping():
    return PlainTextResponse("OK", status_code=200, headers={"Content-Length": "2"})
