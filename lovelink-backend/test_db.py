import asyncio
from sqlalchemy import select
from database import AsyncSessionLocal
from models.user import User
import sys
import traceback

async def test():
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.email == 'tirgarbhavesh99@gmail.com'))
            user = result.scalars().first()
            if not user:
                print('User not found')
                return
            print(f'User found: {user.name}')
            user.otp_code = '123456'
            db.add(user)
            await db.commit()
            print('commit ok')
    except Exception as e:
        print('DB ERROR:')
        traceback.print_exc()

asyncio.run(test())
