from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional


class CountdownCreate(BaseModel):
    label: str
    emoji: str = "🗓️"
    target_date: datetime


class CountdownResponse(BaseModel):
    id: str
    couple_id: str
    created_by: str
    label: str
    emoji: str
    target_date: datetime
    created_at: datetime
    seconds_remaining: int = 0
    is_past: bool = False

    model_config = ConfigDict(from_attributes=True)
