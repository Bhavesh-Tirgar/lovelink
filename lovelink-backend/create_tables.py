import asyncio
from database import engine, Base
from models.user import User  # ensures users table exists
from models.couple import Couple  # ensures couples table exists


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created successfully!")


asyncio.run(main())