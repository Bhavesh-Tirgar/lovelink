import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from database import Base


class Reel(Base):
    __tablename__ = "reels"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=True)
    added_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=False)
    caption = Column(Text, nullable=True)
    video_id = Column(String(100), nullable=False)
    source_type = Column(String(20), default="youtube", nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    category = Column(String(50), default="couple", nullable=False)
    likes_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
