from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os
import socket
from dotenv import load_dotenv

# Resilient DNS resolution fallback for Neon on Windows/restricted ISP DNS
_orig_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    try:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)
    except socket.gaierror:
        if 'neon.tech' in str(host):
            return _orig_getaddrinfo('13.228.184.177', port, family, type, proto, flags)
        raise

socket.getaddrinfo = _patched_getaddrinfo

# Load .env from backend directory as well as current working directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_async_engine(
    DATABASE_URL, 
    echo=True, 
    connect_args={"ssl": "require"},
    pool_pre_ping=True,
    pool_recycle=300,
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
