from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
import os
from dotenv import load_dotenv

# Load .env from backend directory as well as current working directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Production Connection Pooling Configuration
# Prevents expensive TCP + TLS handshakes on every request, with pool_pre_ping for reconnect resilience
use_nullpool = os.getenv("USE_NULL_POOL", "false").lower() == "true"
if use_nullpool or "sqlite" in (DATABASE_URL or ""):
    engine_kwargs = {"poolclass": NullPool}
else:
    engine_kwargs = {
        "pool_size": int(os.getenv("DB_POOL_SIZE", "10")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "15")),
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

connect_args = {}
if DATABASE_URL and "sqlite" not in DATABASE_URL:
    connect_args["ssl"] = "require"

engine = create_async_engine(
    DATABASE_URL, 
    connect_args=connect_args,
    **engine_kwargs
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
