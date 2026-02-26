from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, couples, dashboard
from routers.mood import router as mood_router

app = FastAPI(title="LoveLink API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(couples.router)
app.include_router(dashboard.router)
app.include_router(mood_router, prefix="/mood", tags=["mood"])


@app.get("/health")
async def health():
    return {"status": "ok", "app": "LoveLink"}
