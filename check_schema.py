import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('lovelink-backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

async def check_schema():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        schema = await conn.execute(text("SELECT current_schema()"))
        path = await conn.execute(text("SHOW search_path"))
        print(f"Current schema: {schema.scalar()}")
        print(f"Search path: {path.scalar()}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_schema())
