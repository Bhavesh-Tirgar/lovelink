import asyncio
from database import engine
from sqlalchemy import text


async def main():
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR DEFAULT 'Unknown'"
            )
        )
    print("✅ City column added!")


asyncio.run(main())

