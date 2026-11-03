from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CouponCreate(BaseModel):
    title: str = Field(..., max_length=100)
    description: str = Field(..., max_length=500)

class CouponResponse(BaseModel):
    id: str
    couple_id: str
    created_by: str
    title: str
    description: str
    is_scratched: bool
    is_redeemed: bool
    scratched_at: Optional[datetime]
    redeemed_at: Optional[datetime]
    created_at: datetime
    creator_name: Optional[str] = None
    
    class Config:
        from_attributes = True
