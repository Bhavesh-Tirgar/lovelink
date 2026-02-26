from pydantic import BaseModel


class UserSummary(BaseModel):
    name: str
    email: str
    timezone: str
    city: str


class DashboardResponse(BaseModel):
    my_user: UserSummary
    partner_user: UserSummary | None
    days_together: int
    linked: bool

