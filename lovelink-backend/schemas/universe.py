from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StarCreate(BaseModel):
    star_name: str
    memory_text: str
    date_str: Optional[str] = None
    color: Optional[str] = "gold"
    coord_x: Optional[float] = None
    coord_y: Optional[float] = None
    coord_z: Optional[float] = None
    brightness: Optional[float] = 1.0


class StarResponse(BaseModel):
    id: str
    couple_id: str
    creator_id: str
    creator_name: Optional[str] = None
    star_name: str
    memory_text: str
    date_str: Optional[str] = None
    color: str
    coord_x: float
    coord_y: float
    coord_z: float
    brightness: float
    created_at: datetime

    class Config:
        from_attributes = True
