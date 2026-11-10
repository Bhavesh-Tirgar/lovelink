from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base
import uuid
from datetime import datetime, date

class CycleSetting(Base):
    __tablename__ = "cycle_settings"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id: Mapped[str] = mapped_column(String, ForeignKey("couples.id", ondelete="CASCADE"), unique=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    last_period_date: Mapped[date] = mapped_column(Date)
    cycle_length: Mapped[int] = mapped_column(Integer, default=28)
    period_length: Mapped[int] = mapped_column(Integer, default=5)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

class CycleLog(Base):
    __tablename__ = "cycle_logs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id: Mapped[str] = mapped_column(String, ForeignKey("couples.id", ondelete="CASCADE"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    log_date: Mapped[date] = mapped_column(Date, default=date.today)
    flow: Mapped[str] = mapped_column(String(20), nullable=True)
    cramps: Mapped[str] = mapped_column(String(20), nullable=True)
    mood: Mapped[str] = mapped_column(String(30), nullable=True)
    cravings: Mapped[str] = mapped_column(String(100), nullable=True)
    energy: Mapped[str] = mapped_column(String(20), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
