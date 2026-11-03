from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from models.call_log import CallType, CallStatus


class CallInitiate(BaseModel):
    call_type: CallType = CallType.video


class CallResponse(BaseModel):
    id: str
    couple_id: str
    started_by: str
    room_id: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_secs: Optional[int] = None
    call_type: CallType
    status: CallStatus
    caller_name: Optional[str] = None
    caller_photo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
