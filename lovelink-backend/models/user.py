from datetime import datetime

from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, default="Unknown")
    timezone: Mapped[str] = mapped_column(String, default="Asia/Kolkata")
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)
    otp_code: Mapped[str | None] = mapped_column(String, nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )