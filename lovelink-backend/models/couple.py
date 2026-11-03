from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from database import Base
import uuid


class Couple(Base):
    __tablename__ = "couples"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user1_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    user2_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    invite_code: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    anniversary_date: Mapped[DateTime | None] = mapped_column(
        DateTime, nullable=True
    )
    partner_city: Mapped[str | None] = mapped_column(String, nullable=True)
    partner_timezone: Mapped[str | None] = mapped_column(String, nullable=True)
    comfort_message: Mapped[str | None] = mapped_column(String, nullable=True)
    spotify_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
