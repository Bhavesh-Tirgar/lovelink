from datetime import datetime

from sqlalchemy import String, DateTime, Boolean, Text, Integer, ForeignKey
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
    otp_attempts: Mapped[int] = mapped_column(Integer, default=0)
    otp_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    fcm_token: Mapped[str | None] = mapped_column(String, nullable=True)
    public_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    encrypted_private_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(
        String, unique=True, index=True
    )
    device_info: Mapped[str | None] = mapped_column(
        String, nullable=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False
    )
    revoked: Mapped[bool] = mapped_column(
        Boolean, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
