import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

load_dotenv()
db_url = os.getenv("DATABASE_URL")

async def run_migration():
    print("Connecting to live database...")
    engine = create_async_engine(db_url, echo=True)
    
    async with engine.begin() as conn:
        print("Migrating love_notes...")
        await conn.execute(text("ALTER TABLE love_notes ADD COLUMN IF NOT EXISTS is_capsule BOOLEAN DEFAULT FALSE NOT NULL;"))
        await conn.execute(text("ALTER TABLE love_notes ADD COLUMN IF NOT EXISTS open_at TIMESTAMP WITH TIME ZONE;"))
        
        print("Migrating users...")
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token VARCHAR;"))
        
    print("Migration complete!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(run_migration())
