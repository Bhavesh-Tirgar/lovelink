import asyncio
from dotenv import load_dotenv
load_dotenv()
from database import engine
from sqlalchemy import text

async def alter():
    async with engine.begin() as conn:
        try:
            await conn.execute(text('ALTER TABLE couples ADD COLUMN comfort_message VARCHAR;'))
            print("Added comfort_message")
        except Exception as e:
            print("comfort_message might exist", e)
        try:
            await conn.execute(text('ALTER TABLE couples ADD COLUMN spotify_url VARCHAR;'))
            print("Added spotify_url")
        except Exception as e:
            print("spotify_url might exist", e)

asyncio.run(alter())
