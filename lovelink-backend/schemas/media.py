from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class MediaResponse(BaseModel):
    id: str
    couple_id: str
    uploaded_by: str
    file_url: str
    thumbnail_url: Optional[str] = None
    file_type: str
    caption: Optional[str] = None
    taken_at: Optional[datetime] = None
    album_id: Optional[str] = None
    created_at: datetime
    uploader_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AlbumCreate(BaseModel):
    name: str


class AlbumResponse(BaseModel):
    id: str
    couple_id: str
    created_by: str
    name: str
    cover_photo_id: Optional[str] = None
    created_at: datetime
    photo_count: int = 0
    cover_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
