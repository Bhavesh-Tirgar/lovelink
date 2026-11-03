import uuid
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class WatchSession(Base):
    __tablename__ = "watch_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    movie_id = Column(String(36), ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)

    current_position = Column(Float, default=0.0, nullable=False)
    is_playing = Column(Boolean, default=False, nullable=False)

    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    started_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
