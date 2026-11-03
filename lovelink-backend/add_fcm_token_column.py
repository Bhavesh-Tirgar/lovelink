import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def upgrade_db():
    print("Connecting to database to add fcm_token column...")
    try:
        async with AsyncSessionLocal() as db:
            # Check if column exists first to be safe (idempotent)
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='users' AND column_name='fcm_token'
            """)
            result = await db.execute(check_sql)
            if not result.scalars().first():
                # Add the column
                print("Column 'fcm_token' not found. Adding it...")
                alter_sql = text("ALTER TABLE users ADD COLUMN fcm_token VARCHAR NULL;")
                await db.execute(alter_sql)
                await db.commit()
                print("Successfully added fcm_token to users table.")
            else:
                print("Column 'fcm_token' already exists. No action taken.")
    except Exception as e:
        print(f"Error updating database schema: {e}")

if __name__ == '__main__':
    asyncio.run(upgrade_db())
