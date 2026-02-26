import asyncio

from sqlalchemy import text

from database import engine


async def main():
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR UNIQUE"
            )
        )
        await conn.execute(
            text("ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR")
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL"
            )
        )
        await conn.execute(
            text("ALTER TABLE users ALTER COLUMN email DROP NOT NULL")
        )
    print("✅ Auth migration done!")


asyncio.run(main())

