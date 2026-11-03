from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from models.message import MessageType

class MessageCreate(BaseModel):
    text: Optional[str] = None
    message_type: MessageType = MessageType.text

class MessageResponse(BaseModel):
    id: str
    couple_id: str
    sender_id: str
    text: Optional[str]
    file_url: Optional[str]
    message_type: str
    read_at: Optional[datetime]
    created_at: datetime
    sender_name: Optional[str] = None
    sender_photo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
