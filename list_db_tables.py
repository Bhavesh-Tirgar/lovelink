import asyncio
import os
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Point to the backend .env
load_dotenv('lovelink-backend/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

async def list_tables():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in environment")
        return
        
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        print("TABLES_START")
        for t in sorted(tables):
            print(t)
        print("TABLES_END")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(list_tables())
