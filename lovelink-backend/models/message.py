import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum, Index, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
from database import Base

class MessageType(str, enum.Enum):
    text = "text"
    image = "image"
    voice = "voice"

class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    text = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    message_type = Column(Enum(MessageType), default=MessageType.text, nullable=False)

    # Ephemeral / Self-destructing Chat Message
    is_ephemeral = Column(Boolean, default=False, nullable=False)
    burn_after_seconds = Column(Integer, nullable=True)
    burned_at = Column(DateTime(timezone=True), nullable=True)
    is_burned = Column(Boolean, default=False, nullable=False)
    
    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    sender = relationship("User", foreign_keys=[sender_id])

    __table_args__ = (
        Index("ix_messages_couple_created", "couple_id", "created_at"),
    )
