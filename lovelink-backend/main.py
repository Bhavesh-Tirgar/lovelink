from dotenv import load_dotenv

load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
import sys
print(f"DEBUG sys.path: {sys.path}")
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from routers import auth, couples, dashboard
from routers.mood import router as mood_router
from routers.chat import router as chat_router, ws_router as chat_ws_router
from routers.notes import router as notes_router
from routers.countdowns import router as countdowns_router
from routers.media import router as media_router
from routers.movies import router as movies_router
from routers.calls import router as calls_router
from routers.bucket_list import router as bucket_router
from routers.questions import router as questions_router
from routers.comfort import router as comfort_router
from routers.notifications import router as notifs_router
from routers.coupons import router as coupons_router
from routers.countdowns import router as countdowns_router
from scheduler.jobs import deliver_scheduled_notes, check_milestones

scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        deliver_scheduled_notes,
        "interval",
        minutes=5,
        id="deliver_notes",
    )
    scheduler.add_job(check_milestones, "cron", hour=9, minute=0, timezone="Asia/Kolkata")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="LoveLink API", lifespan=lifespan)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin", "http://localhost:3000")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin", "http://localhost:3000")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    error_msg = f"Unhandled Exception: {str(exc)}\n{traceback.format_exc()}"
    print(error_msg)
    origin = request.headers.get("origin", "http://localhost:3000")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


app.include_router(auth.router)
app.include_router(couples.router)
app.include_router(dashboard.router)
app.include_router(mood_router, prefix="/mood", tags=["mood"])
app.include_router(chat_router, prefix="/chat", tags=["chat"])
app.include_router(chat_ws_router, prefix="/ws/chat", tags=["ws_chat"])
app.include_router(notes_router, prefix="/notes", tags=["notes"])
app.include_router(countdowns_router, prefix="/countdowns", tags=["countdowns"])
app.include_router(media_router, prefix="/media", tags=["media"])
app.include_router(movies_router, prefix="/movies", tags=["movies"])
app.include_router(calls_router, prefix="/calls", tags=["calls"])
app.include_router(bucket_router, prefix="/bucket-list", tags=["bucket-list"])
app.include_router(questions_router, prefix="/questions", tags=["questions"])
app.include_router(comfort_router, prefix="/comfort", tags=["comfort"])
app.include_router(notifs_router, prefix="/notifications", tags=["notifications"])
app.include_router(coupons_router, prefix="/coupons", tags=["coupons"])


@app.get("/health")
async def health():
    return {"status": "ok", "app": "LoveLink"}

@app.get("/debug/table")
async def debug_table():
    from models.call_log import CallLogLegacy
    return {"tablename": CallLogLegacy.__tablename__}
