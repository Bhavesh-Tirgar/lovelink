from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class MovieCreate(BaseModel):
    title: str
    source_type: str = "upload"
    youtube_url: Optional[str] = None


class MovieResponse(BaseModel):
    id: str
    couple_id: str
    added_by: str
    title: str
    source_type: str
    file_url: Optional[str] = None
    youtube_url: Optional[str] = None
    youtube_id: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration_secs: Optional[int] = None
    file_size_bytes: Optional[int] = None
    watched_at: Optional[datetime] = None
    rating: Optional[int] = None
    created_at: datetime
    adder_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class WatchSessionResponse(BaseModel):
    id: str
    movie_id: str
    couple_id: str
    current_position: float
    is_playing: bool
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)
