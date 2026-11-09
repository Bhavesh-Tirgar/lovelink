from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from datetime import datetime


class NoteCreate(BaseModel):
    title: Optional[str] = None
    text: str
    photo_url: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    is_capsule: bool = False
    open_at: Optional[datetime] = None
    # Secret Vault & Ephemeral parameters
    is_secret: bool = False
    secret_ciphertext: Optional[str] = None
    secret_iv: Optional[str] = None
    is_ephemeral: bool = False
    burn_after_seconds: Optional[int] = None


class NoteResponse(BaseModel):
    id: str
    couple_id: str
    sender_id: str
    recipient_id: str
    title: Optional[str]
    text: str
    photo_url: Optional[str]
    # Secret Vault & Ephemeral parameters
    is_secret: bool = False
    secret_ciphertext: Optional[str] = None
    secret_iv: Optional[str] = None
    is_ephemeral: bool = False
    burn_after_seconds: Optional[int] = None
    is_burned: bool = False
    burned_at: Optional[datetime] = None
    
    is_scheduled: bool
    scheduled_at: Optional[datetime]
    delivered_at: Optional[datetime]
    is_capsule: bool
    open_at: Optional[datetime]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    sender_name: Optional[str] = None
    sender_photo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
