import asyncio
from sqlalchemy import text
from database import AsyncSessionLocal

async def upgrade_db_couples():
    print("Connecting to database to add missing couples columns...")
    try:
        async with AsyncSessionLocal() as db:
            
            columns_to_add = [
                "partner_city",
                "partner_timezone",
                "comfort_message",
                "spotify_url"
            ]
            
            for col in columns_to_add:
                # Check if column exists first to be safe (idempotent)
                check_sql = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='couples' AND column_name='{col}'
                """)
                result = await db.execute(check_sql)
                if not result.scalars().first():
                    # Add the column
                    print(f"Column '{col}' not found in 'couples'. Adding it...")
                    alter_sql = text(f"ALTER TABLE couples ADD COLUMN {col} VARCHAR NULL;")
                    await db.execute(alter_sql)
                    await db.commit()
                    print(f"Successfully added '{col}'.")
                else:
                    print(f"Column '{col}' already exists in 'couples'. No action taken.")
                    
            print("Successfully updated couples schema.")
    except Exception as e:
        print(f"Error updating database schema: {e}")

if __name__ == '__main__':
    asyncio.run(upgrade_db_couples())
