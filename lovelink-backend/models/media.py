import uuid
import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class FileType(str, enum.Enum):
    photo = "photo"
    video = "video"


class Media(Base):
    __tablename__ = "media"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    file_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    file_type = Column(Enum(FileType), default=FileType.photo, nullable=False)
    caption = Column(String, nullable=True)
    taken_at = Column(DateTime(timezone=True), nullable=True)

    album_id = Column(
        String(36),
        ForeignKey("albums.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    uploader = relationship("User", foreign_keys=[uploaded_by])
    album = relationship("Album", foreign_keys=[album_id], backref="media_items")

    __table_args__ = (
        Index("ix_media_couple_created", "couple_id", "created_at"),
    )
