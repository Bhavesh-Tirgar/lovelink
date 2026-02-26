from pydantic import BaseModel, EmailStr, ConfigDict, field_validator, model_validator


class SignupRequest(BaseModel):
    name: str
    city: str = "Unknown"
    timezone: str = "Asia/Kolkata"
    email: EmailStr | None = None
    phone: str | None = None
    password: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if not v:
            return v
        
        # strip spaces
        v = v.replace(" ", "")
        
        # if 10 digits exactly, auto format to +91
        if v.isdigit() and len(v) == 10:
            return f"+91{v}"
        
        # if it starts with + and has digits, keep as is (plus potential basic length check)
        if v.startswith("+") and v[1:].isdigit() and len(v) >= 11:
            return v
            
        raise ValueError("Invalid phone format. Please provide a valid 10-digit number.")

    @model_validator(mode="after")
    def check_email_or_phone(self):
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")
        return self


class LoginRequest(BaseModel):
    identifier: str  # email or phone
    password: str | None = None


class OTPVerifyRequest(BaseModel):
    identifier: str
    otp: str


class ForgotPasswordRequest(BaseModel):
    identifier: str


class ResetPasswordRequest(BaseModel):
    identifier: str
    otp: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str | None
    phone: str | None
    name: str
    city: str
    timezone: str
    photo_url: str | None
    is_verified: bool

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse