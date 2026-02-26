import os
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from database import get_db
from models.user import User
from models.couple import Couple
from schemas.user import (
    SignupRequest,
    LoginRequest,
    OTPVerifyRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from utils.email import send_otp_email

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_DAYS = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))

security = HTTPBearer()


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def generate_otp() -> str:
    return str(random.randint(100000, 999999))


async def get_user_by_identifier(identifier: str, db: AsyncSession) -> User | None:
    if "@" in identifier:
        result = await db.execute(select(User).where(User.email == identifier))
    else:
        result = await db.execute(select(User).where(User.phone == identifier))
    return result.scalars().first()


@router.post("/signup")
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check for existing email/phone
    if data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

    if data.phone:
        result = await db.execute(select(User).where(User.phone == data.phone))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Phone already registered")

    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    password_hash = None
    if data.password:
        password_hash = pwd_context.hash(data.password)

    user = User(
        email=data.email,
        phone=data.phone,
        password_hash=password_hash,
        name=data.name,
        city=data.city,
        timezone=data.timezone,
        otp_code=otp,
        otp_expires_at=expires_at,
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if user.email:
        try:
            await send_otp_email(user.email, otp, purpose="verification")
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Failed to send verification email. Please try again.",
            )

    return {"message": "OTP sent to your email/phone", "user_id": user.id}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No OTP requested")

    if user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Password login
    if data.password:
        if not user.password_hash or not pwd_context.verify(
            data.password, user.password_hash
        ):
            raise HTTPException(status_code=401, detail="Wrong password")

        if not user.is_verified:
            # Resend verification OTP automatically
            otp = generate_otp()
            user.otp_code = otp
            user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
            db.add(user)
            await db.commit()

            if user.email:
                try:
                    await send_otp_email(user.email, otp, purpose="verification")
                except Exception:
                    raise HTTPException(
                        status_code=500,
                        detail=(
                            "User not verified and email send failed. "
                            "Please request a new OTP later."
                        ),
                    )

            raise HTTPException(
                status_code=403,
                detail="User not verified. We have sent a new OTP to your email.",
            )

        token = create_token(user.id)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    # OTP login request (no password)
    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.add(user)
    await db.commit()

    if user.email:
        try:
            await send_otp_email(user.email, otp, purpose="login")
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Failed to send login OTP. Please try again.",
            )

    return {"message": "OTP sent", "requires_otp": True}


@router.post("/login-verify-otp", response_model=TokenResponse)
async def login_verify_otp(
    data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No OTP requested")

    if user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.post("/send-otp")
async def send_otp(data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.add(user)
    await db.commit()

    if user.email:
        try:
            await send_otp_email(user.email, otp, purpose="verification")
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Failed to send OTP. Please try again.",
            )

    return {"message": "OTP sent"}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    otp = generate_otp()
    user.otp_code = otp
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.add(user)
    await db.commit()

    if user.email:
        try:
            await send_otp_email(user.email, otp, purpose="password reset")
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Failed to send password reset OTP. Please try again.",
            )

    return {"message": "Password reset OTP sent"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No OTP requested")

    if user.otp_code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.utcnow() > user.otp_expires_at:
        raise HTTPException(status_code=400, detail="OTP expired")

    user.password_hash = pwd_context.hash(data.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    db.add(user)
    await db.commit()

    return {"message": "Password reset successful"}


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@router.get("/me")
async def me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Couple).where(
            or_(
                Couple.user1_id == current_user.id,
                Couple.user2_id == current_user.id,
            )
        )
    )
    couple = result.scalars().first()

    linked = False
    couple_id = None
    invite_code = None
    partner_payload = None

    if couple:
        couple_id = couple.id
        invite_code = couple.invite_code
        partner_id = (
            couple.user2_id if couple.user1_id == current_user.id else couple.user1_id
        )
        if partner_id:
            result_partner = await db.execute(
                select(User).where(User.id == partner_id)
            )
            partner = result_partner.scalars().first()
            if partner:
                linked = True
                partner_payload = {
                    "name": partner.name,
                    "email": partner.email,
                    "photo_url": partner.photo_url,
                }

    user_payload = UserResponse.model_validate(current_user).model_dump()

    response: dict = {
        "user": user_payload,
        "linked": linked,
    }
    if couple_id:
        response["couple_id"] = couple_id
    if invite_code:
        response["invite_code"] = invite_code
    if partner_payload:
        response["partner"] = partner_payload

    return response


@router.get("/test-email")
async def test_email():
    """Send a test email using the configured SMTP credentials."""
    to = os.getenv("MAIL_USERNAME")
    if not to:
        raise HTTPException(
            status_code=500, detail="MAIL_USERNAME not configured in environment."
        )
    otp = generate_otp()
    try:
        await send_otp_email(to, otp, purpose="test")
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send test email: {exc}",
        )
    return {"message": f"Test email sent to {to}", "otp_preview": otp}