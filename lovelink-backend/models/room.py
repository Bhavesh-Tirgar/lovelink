from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base
import uuid
from datetime import datetime

class CoupleRoom(Base):
    __tablename__ = "couple_rooms"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    couple_id: Mapped[str] = mapped_column(String, ForeignKey("couples.id", ondelete="CASCADE"), unique=True)
    
    # Customization & Decor
    theme: Mapped[str] = mapped_column(String(50), default="warm-sunset")
    flooring: Mapped[str] = mapped_column(String(50), default="cozy-hardwood")
    
    # Love Plant
    plant_name: Mapped[str] = mapped_column(String(50), default="Our Love Plant 🌱")
    plant_level: Mapped[int] = mapped_column(Integer, default=1)
    plant_watered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    plant_watered_by: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Virtual Pet
    pet_name: Mapped[str] = mapped_column(String(50), default="Mochi 🐾")
    pet_type: Mapped[str] = mapped_column(String(20), default="cat")
    pet_happiness: Mapped[int] = mapped_column(Integer, default=70)
    pet_petted_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Fridge Sticky Notes & Wall Photos
    sticky_notes: Mapped[dict] = mapped_column(JSON, default=list)
    wall_photos: Mapped[dict] = mapped_column(JSON, default=list)
    
    # Avatar states (e.g. "couch", "bed", "window", "kitchen")
    user1_action: Mapped[str] = mapped_column(String(50), default="couch")
    user2_action: Mapped[str] = mapped_column(String(50), default="couch")
    
    # Jukebox
    music_playing: Mapped[bool] = mapped_column(default=False)
    current_track: Mapped[str] = mapped_column(String(100), default="Cozy Midnight Lo-Fi")
    
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
