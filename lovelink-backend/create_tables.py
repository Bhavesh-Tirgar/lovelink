import asyncio
from database import engine, Base, AsyncSessionLocal
from models.user import User  # ensures users table exists
from models.couple import Couple  # ensures couples table exists
from models.mood import Mood
from models.message import Message
from models.love_note import LoveNote  # ensures love_notes table exists
from models.countdown import Countdown  # ensures countdowns table exists
from models.bucket_list import BucketListItem # ensures bucket_list table exists
from models.album import Album          # ensures albums table exists (before media for FK)
from models.media import Media as MediaModel  # ensures media table exists
from models.movie import Movie          # ensures movies table exists
from models.watch_session import WatchSession  # ensures watch_sessions table exists
from models.call_log import CallLogLegacy as CallLog
from models.daily_question import DailyQuestion
from models.question_answer import QuestionAnswer
from models.notification import Notification
from models.coupon import LoveCoupon
from models.countdown import Countdown


QUESTIONS_TO_SEED = [
    "What's your happiest memory of us?",
    "If we could travel anywhere tomorrow, where would you go?",
    "What song reminds you of me?",
    "What's something you want us to try together?",
    "What's your favorite thing about our relationship?",
    "If you could relive one day with me, which would it be?",
    "What's a dream you haven't told me yet?",
    "What small thing do I do that makes you smile?",
    "What's your favorite way to spend time with me?",
    "If we had a theme song, what would it be?",
    "What's something new you'd like to learn together?",
    "What movie best describes our love story?",
    "What's one thing you wish we did more of?",
    "What's a place you want to take me someday?",
    "What do you love most about our conversations?",
    "What's a future goal you're excited about sharing?",
    "If you wrote me a letter, what would it say?",
    "What's the best gift I've ever given you?",
    "What habit of mine do you find adorable?",
    "What's a silly inside joke only we'd understand?",
    "What would our perfect day together look like?",
    "What's something I do that instantly makes you feel loved?",
    "If we had a couples superpower, what would it be?",
    "What's something you're proud of me for?",
    "What's a fear I've helped you overcome?",
    "What's one thing you hope never changes about us?",
    "What's your favorite photo of us?",
    "What's something you learned from me?",
    "How have I changed your life?",
    "What would you do to surprise me?",
    "What's your love language with me?",
    "What's something that made you fall more in love with me?",
    "What do you think is our greatest strength as a couple?",
    "What's a challenge we overcame together?",
    "What's something you want to achieve together in 5 years?",
    "What's the most romantic thing I've ever done?",
    "What's a book or movie you want us to experience together?",
    "What made you first realize you had feelings for me?",
    "What's something you want to tell me but haven't yet?",
    "What's your favorite time of day to talk to me?",
    "What's a tradition you want us to start?",
    "What's your favorite memory from a trip or date with me?",
    "What's something you admire about how I handle challenges?",
    "How do you imagine our life together in 10 years?",
    "What's a compromise we made that made us stronger?",
    "What's something that still gives you butterflies about me?",
    "What's a secret talent of mine you love?",
    "What's the most meaningful conversation we've ever had?",
    "What do you want our home to feel like someday?",
    "What would you do if you could give me anything?"
]


async def main():
    async with engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tables created successfully!")

    async with AsyncSessionLocal() as session:
        from sqlalchemy import select
        result = await session.execute(select(DailyQuestion).limit(1))
        if not result.scalar_one_or_none():
            print("Seeding daily questions...")
            for text in QUESTIONS_TO_SEED:
                session.add(DailyQuestion(question_text=text))
            await session.commit()
            print("Successfully seeded questions!")


asyncio.run(main())