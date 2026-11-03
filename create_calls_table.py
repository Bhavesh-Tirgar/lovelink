import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('lovelink-backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

async def create_calls_table():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found.")
        return
        
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as conn:
        print("Creating 'calls' table as a copy of 'call_logs'...")
        # Check if call_logs exists
        res = await conn.execute(text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_logs')"))
        if res.scalar():
            await conn.execute(text("CREATE TABLE IF NOT EXISTS calls (LIKE call_logs INCLUDING ALL)"))
            print("Table 'calls' created successfully.")
        else:
            print("Error: 'call_logs' table not found.")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_calls_table())
