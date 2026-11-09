import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Index, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class LoveNote(Base):
    __tablename__ = "love_notes"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recipient_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String, nullable=True)
    text = Column(Text, nullable=False)
    photo_url = Column(String, nullable=True)

    # Secret Vault (Client-side E2EE)
    is_secret = Column(Boolean, default=False, nullable=False)
    secret_ciphertext = Column(Text, nullable=True)
    secret_iv = Column(String(64), nullable=True)

    # Ephemeral / Self-Destruct
    is_ephemeral = Column(Boolean, default=False, nullable=False)
    burn_after_seconds = Column(Integer, nullable=True)
    burned_at = Column(DateTime(timezone=True), nullable=True)
    is_burned = Column(Boolean, default=False, nullable=False)

    is_scheduled = Column(Boolean, default=False, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    is_capsule = Column(Boolean, default=False, nullable=False)
    open_at = Column(DateTime(timezone=True), nullable=True)

    is_read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])

    __table_args__ = (
        Index("ix_love_notes_couple_delivered", "couple_id", "delivered_at"),
    )
