import uuid
import enum
from sqlalchemy import Column, String, Integer, BigInteger, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class SourceType(str, enum.Enum):
    upload = "upload"
    youtube = "youtube"


class Movie(Base):
    __tablename__ = "movies"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)
    added_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=False)
    source_type = Column(Enum(SourceType), default=SourceType.upload, nullable=False)

    file_url = Column(String, nullable=True)
    youtube_url = Column(String, nullable=True)
    youtube_id = Column(String(20), nullable=True)
    thumbnail_url = Column(String, nullable=True)

    duration_secs = Column(Integer, nullable=True)
    file_size_bytes = Column(BigInteger, nullable=True)

    watched_at = Column(DateTime(timezone=True), nullable=True)
    rating = Column(Integer, nullable=True)  # 1–5

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    adder = relationship("User", foreign_keys=[added_by])
