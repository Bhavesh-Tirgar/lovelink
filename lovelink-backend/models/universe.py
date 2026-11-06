from sqlalchemy import String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from database import Base
import uuid


class MemoryStar(Base):
    __tablename__ = "memory_stars"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    couple_id: Mapped[str] = mapped_column(
        String, ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True
    )
    creator_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    star_name: Mapped[str] = mapped_column(String(120), nullable=False)
    memory_text: Mapped[str] = mapped_column(Text, nullable=False)
    date_str: Mapped[str | None] = mapped_column(String(50), nullable=True)
    color: Mapped[str] = mapped_column(String(30), default="gold") # gold, pink, cyan, purple, emerald
    star_type: Mapped[str] = mapped_column(String(30), default="single") # single, supernova, binary, diamond
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    coord_x: Mapped[float] = mapped_column(Float, default=0.0)
    coord_y: Mapped[float] = mapped_column(Float, default=0.0)
    coord_z: Mapped[float] = mapped_column(Float, default=0.0)
    brightness: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class CosmicWish(Base):
    __tablename__ = "cosmic_wishes"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    couple_id: Mapped[str] = mapped_column(
        String, ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True
    )
    creator_id: Mapped[str] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    wish_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
