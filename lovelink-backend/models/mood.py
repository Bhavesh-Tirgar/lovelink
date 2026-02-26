from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base
import uuid
from datetime import datetime

class Mood(Base):
    __tablename__ = "moods"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"))
    couple_id: Mapped[str] = mapped_column(String, ForeignKey("couples.id", ondelete="CASCADE"))
    emoji: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
