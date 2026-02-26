from pydantic import BaseModel


class GenerateInviteResponse(BaseModel):
    invite_code: str
    couple_id: str


class JoinRequest(BaseModel):
    invite_code: str


class PartnerSummary(BaseModel):
    name: str
    email: str
    photo_url: str | None = None


class CoupleMeResponse(BaseModel):
    linked: bool
    couple_id: str | None = None
    invite_code: str | None = None
    partner: PartnerSummary | None = None

