import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class LoveCoupon(Base):
    __tablename__ = "love_coupons"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    
    is_scratched = Column(Boolean, default=False, nullable=False)
    is_redeemed = Column(Boolean, default=False, nullable=False)
    
    scratched_at = Column(DateTime(timezone=True), nullable=True)
    redeemed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("ix_coupons_couple_created", "couple_id", "created_at"),
    )
