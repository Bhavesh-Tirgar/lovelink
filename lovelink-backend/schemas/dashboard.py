from pydantic import BaseModel


class UserSummary(BaseModel):
    id: str | None = None
    name: str
    email: str
    timezone: str
    city: str


class DashboardResponse(BaseModel):
    my_user: UserSummary
    partner_user: UserSummary | None
    days_together: int
    linked: bool
    couple_id: str | None = None

