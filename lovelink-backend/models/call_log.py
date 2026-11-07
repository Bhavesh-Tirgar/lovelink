import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
from models.user import User


class CallType(str, enum.Enum):
    video = "video"
    voice = "voice"


class CallStatus(str, enum.Enum):
    initiated = "initiated"
    answered = "answered"
    declined = "declined"
    missed = "missed"
    ended = "ended"


class CallLogLegacy(Base):
    __tablename__ = "calls"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id = Column(String(36), ForeignKey("couples.id", ondelete="CASCADE"), nullable=False)
    started_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    room_id = Column(String, nullable=False)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_secs = Column(Integer, nullable=True)

    call_type = Column(Enum(CallType), default=CallType.video, nullable=False)
    status = Column(Enum(CallStatus), default=CallStatus.initiated, nullable=False)

    caller = relationship("User", foreign_keys=[started_by])
