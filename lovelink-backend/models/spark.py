import uuid
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, Text
from sqlalchemy.sql import func
from database import Base

class CoupleSpark(Base):
    __tablename__ = "couple_sparks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id: Mapped[str] = mapped_column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), unique=True, index=True)

    # Real-time Love Battery & Status
    user1_battery: Mapped[int] = mapped_column(Integer, default=85)
    user2_battery: Mapped[int] = mapped_column(Integer, default=85)
    user1_status: Mapped[str] = mapped_column(String(100), default="Thinking of you 💭")
    user2_status: Mapped[str] = mapped_column(String(100), default="Thinking of you 💭")
    user1_battery_updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    user2_battery_updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Daily Spark Streaks
    streak: Mapped[int] = mapped_column(Integer, default=1)
    last_streak_date: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Active Accepted Date Night Card
    active_date_idea: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)

    # Time Capsules (Sealed Letters)
    time_capsules: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class SparkDailyAnswer(Base):
    __tablename__ = "spark_daily_answers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id: Mapped[str] = mapped_column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), index=True)
    day_key: Mapped[str] = mapped_column(String(20), index=True) # e.g. "2026-11-20"

    question_id: Mapped[int] = mapped_column(Integer, default=1)
    question_text: Mapped[str] = mapped_column(String(500))
    question_category: Mapped[str] = mapped_column(String(50), default="Intimacy & Connection")

    # Blind-reveal answers
    user1_answer: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    user1_answered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    user2_answer: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    user2_answered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)

    # Interactive emoji reactions & comments
    reactions: Mapped[dict] = mapped_column(JSON, default=dict)
    comments: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
