import httpx
import uuid
import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, update
from passlib.context import CryptContext
from jose import jwt, JWTError
from dotenv import load_dotenv
from pydantic import BaseModel
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from database import get_db
from models.user import User, RefreshToken
from models.couple import Couple
from schemas.user import (
    SignupRequest,
    LoginRequest,
    OTPVerifyRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    RefreshTokenRequest,
    GoogleAuthRequest,
    UserResponse,
)
from utils.email import send_otp_email

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 30

security = HTTPBearer()


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def create_token(user_id: str) -> str:
    # Backwards compatibility alias
    return create_access_token(user_id)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


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


async def get_current_user_from_token(token: str, db: AsyncSession) -> User:
    """Validate a raw JWT string (used by WebSocket endpoints)."""
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



def generate_secure_otp() -> str:
    """Generates a cryptographically secure 6-digit OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def generate_otp() -> str:
    # Backwards compatibility alias
    return generate_secure_otp()


def hash_token(token: str) -> str:
    """Computes SHA-256 hash for secure storage of refresh tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_otp(otp: str) -> str:
    """Computes SHA-256 hash for secure storage of OTP codes."""
    return hashlib.sha256(otp.encode("utf-8")).hexdigest()


async def get_user_by_identifier(identifier: str, db: AsyncSession) -> User | None:
    result = await db.execute(
        select(User).where(
            or_(
                User.email == identifier,
                User.phone == identifier,
            )
        )
    )
    return result.scalars().first()


async def _build_token_response(user: User, db: AsyncSession) -> TokenResponse:
    couple_res = await db.execute(
        select(Couple).where(
            or_(Couple.user1_id == user.id, Couple.user2_id == user.id)
        )
    )
    couple = couple_res.scalars().first()
    couple_id = str(couple.id) if couple else None

    user_resp = UserResponse.model_validate(user)
    user_resp.couple_id = couple_id

    # Create access token (30 min) + rotating refresh token (30 days)
    access_tok = create_access_token(user.id)
    raw_refresh = secrets.token_urlsafe(64)
    hashed_refresh = hash_token(raw_refresh)

    refresh_rec = RefreshToken(
        user_id=user.id,
        token_hash=hashed_refresh,
        device_info="Web/App Client",
        expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        revoked=False
    )
    db.add(refresh_rec)
    await db.commit()

    return TokenResponse(
        access_token=access_tok,
        token_type="bearer",
        user=user_resp,
        couple_id=couple_id,
        refresh_token=raw_refresh,
    )


@router.post("/signup")
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check for existing email/phone
    if data.email:
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An account with this email already exists")

    if data.phone:
        result = await db.execute(select(User).where(User.phone == data.phone))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="An account with this phone already exists")

    raw_otp = generate_secure_otp()
    hashed_otp = hash_otp(raw_otp)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    password_hash = None
    if data.password:
        password_hash = hash_password(data.password)

    user = User(
        email=data.email,
        phone=data.phone,
        password_hash=password_hash,
        name=data.name,
        city=data.city,
        timezone=data.timezone,
        otp_code=hashed_otp,
        otp_expires_at=expires_at,
        otp_attempts=0,
        otp_sent_at=datetime.utcnow(),
        is_verified=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    if user.email:
        try:
            await send_otp_email(user.email, raw_otp, purpose="verification")
        except Exception as e:
            print(f"\n=======================================================")
            print(f" [DEV AUTH] EMAIL SEND FAILED: {e}")
            print(f" >>> REGISTRATION OTP for {user.email}: {raw_otp} <<<")
            print(f"=======================================================\n")

    return {"message": f"OTP sent to your email {user.email}", "user_id": user.id}


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid OTP or identifier")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No active OTP requested. Please request a new one.")

    # Check expiration (5 min TTL)
    if datetime.utcnow() > user.otp_expires_at:
        user.otp_code = None
        user.otp_expires_at = None
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    # Check maximum attempts (5 attempts limit)
    current_attempts = user.otp_attempts or 0
    if current_attempts >= 5:
        user.otp_code = None
        user.otp_expires_at = None
        db.add(user)
        await db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."
        )

    # Constant-time comparison
    entered_hash = hash_otp(data.otp.strip())
    is_valid = False
    if user.otp_code and len(user.otp_code) == 64:
        is_valid = hmac.compare_digest(user.otp_code, entered_hash)
    elif user.otp_code:
        is_valid = hmac.compare_digest(user.otp_code, data.otp.strip())

    if not is_valid:
        user.otp_attempts = current_attempts + 1
        if user.otp_attempts >= 5:
            user.otp_code = None
            user.otp_expires_at = None
            db.add(user)
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."
            )
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {5 - user.otp_attempts} attempts remaining.")

    # Successfully verified: Invalidate OTP immediately and reset counters
    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return await _build_token_response(user, db)


@router.post("/google", response_model=TokenResponse)
async def google_auth(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not payload.credential:
        raise HTTPException(status_code=400, detail="Missing Google credential")

    email = None
    name = None
    picture = None

    try:
        request = google_requests.Request()
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        if client_id:
            google_data = google_id_token.verify_oauth2_token(
                payload.credential, request, audience=client_id
            )
        else:
            google_data = google_id_token.verify_oauth2_token(
                payload.credential, request
            )
            # Verify valid Google issuers
            if google_data.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
                raise ValueError("Untrusted Google token issuer.")
        email = google_data.get("email")
        name = google_data.get("name") or (email.split("@")[0] if email else "Partner")
        picture = google_data.get("picture")
    except Exception as e:
        # Fallback: Attempt verification using Firebase Admin Auth (for Firebase Google Sign-In)
        try:
            from firebase_admin import auth as fb_auth
            fb_data = fb_auth.verify_id_token(payload.credential)
            email = fb_data.get("email")
            name = fb_data.get("name") or (email.split("@")[0] if email else "Partner")
            picture = fb_data.get("picture")
        except Exception as fb_err:
            raise HTTPException(
                status_code=400,
                detail=f"Google token cryptographic verification failed: {str(e)} (Firebase check: {str(fb_err)})"
            )

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no verified email")

    # Find existing user by email
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user:
        # Create brand new user via Google
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            name=name,
            photo_url=picture,
            is_verified=True,
            city="Unknown",
            timezone="Asia/Kolkata"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update user verified status & avatar if newly available
        updated = False
        if not user.is_verified:
            user.is_verified = True
            updated = True
        if not user.photo_url and picture:
            user.photo_url = picture
            updated = True
        if updated:
            await db.commit()
            await db.refresh(user)

    return await _build_token_response(user, db)


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_identifier(data.identifier, db)

    # Check lockout
    if user and user.locked_until:
        if datetime.utcnow() < user.locked_until:
            remaining_mins = max(1, int((user.locked_until - datetime.utcnow()).total_seconds() / 60))
            raise HTTPException(
                status_code=429,
                detail=f"Account temporarily locked due to repeated failed attempts. Please try again in {remaining_mins} minutes."
            )
        else:
            user.locked_until = None
            user.failed_login_attempts = 0
            db.add(user)
            await db.commit()

    # Password login
    if data.password:
        is_pw_valid = False
        if user and user.password_hash:
            is_pw_valid = verify_password(data.password, user.password_hash)
        else:
            # Constant-time dummy verification to mitigate timing attacks on non-existent users
            verify_password(data.password, "$2b$12$e80MvYJ37qZ5l/n7aPqvqOxK7BvO.5c7sK9O6vS0w2cT8i2e6M6Gy")

        if not is_pw_valid:
            if user:
                user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = datetime.utcnow() + timedelta(minutes=15)
                    user.failed_login_attempts = 0
                db.add(user)
                await db.commit()
            # Generic error message to prevent user enumeration
            raise HTTPException(status_code=401, detail="Invalid email or password")

        if not user.is_verified:
            # Resend verification OTP automatically
            raw_otp = generate_secure_otp()
            user.otp_code = hash_otp(raw_otp)
            user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
            user.otp_attempts = 0
            user.otp_sent_at = datetime.utcnow()
            db.add(user)
            await db.commit()

            if user.email:
                try:
                    await send_otp_email(user.email, raw_otp, purpose="verification")
                except Exception as e:
                    print(f"\n=======================================================")
                    print(f" [DEV AUTH] EMAIL SEND FAILED: {e}")
                    print(f" >>> VERIFICATION OTP for {user.email}: {raw_otp} <<<")
                    print(f"=======================================================\n")

            raise HTTPException(
                status_code=403,
                detail="Account not verified. We sent a new OTP. Please verify first.",
            )

        # Successful password login: reset failed counters
        user.failed_login_attempts = 0
        user.locked_until = None
        db.add(user)
        await db.commit()

        return await _build_token_response(user, db)

    # OTP login request (no password provided)
    if not user:
        # Generic message so attacker cannot enumerate emails
        return {
            "message": "If an account is associated with this identifier, a login code has been sent.",
            "requires_otp": True
        }

    # Rate limiting on OTP send (cooldown 30s)
    if user.otp_sent_at and (datetime.utcnow() - user.otp_sent_at).total_seconds() < 30:
        raise HTTPException(
            status_code=429,
            detail="Please wait 30 seconds before requesting another code."
        )

    raw_otp = generate_secure_otp()
    user.otp_code = hash_otp(raw_otp)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
    user.otp_attempts = 0
    user.otp_sent_at = datetime.utcnow()
    db.add(user)
    await db.commit()

    if user.email:
        try:
            await send_otp_email(user.email, raw_otp, purpose="login")
        except Exception as e:
            print(f"\n=======================================================")
            print(f" [DEV AUTH] EMAIL SEND FAILED: {e}")
            print(f" >>> LOGIN OTP for {user.email}: {raw_otp} <<<")
            print(f"=======================================================\n")

    return {
        "message": f"OTP sent to your email {user.email}",
        "requires_otp": True
    }


@router.post("/login-verify-otp", response_model=TokenResponse)
async def login_verify_otp(
    data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid OTP or identifier")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No active OTP requested. Please request a new one.")

    if datetime.utcnow() > user.otp_expires_at:
        user.otp_code = None
        user.otp_expires_at = None
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    current_attempts = user.otp_attempts or 0
    if current_attempts >= 5:
        user.otp_code = None
        user.otp_expires_at = None
        db.add(user)
        await db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."
        )

    entered_hash = hash_otp(data.otp.strip())
    is_valid = False
    if user.otp_code and len(user.otp_code) == 64:
        is_valid = hmac.compare_digest(user.otp_code, entered_hash)
    elif user.otp_code:
        is_valid = hmac.compare_digest(user.otp_code, data.otp.strip())

    if not is_valid:
        user.otp_attempts = current_attempts + 1
        if user.otp_attempts >= 5:
            user.otp_code = None
            user.otp_expires_at = None
            db.add(user)
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."
            )
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {5 - user.otp_attempts} attempts remaining.")

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return await _build_token_response(user, db)


@router.post("/send-otp")
async def send_otp(data: OTPVerifyRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        # Generic response to prevent enumeration
        return {"message": "If this account exists, an OTP has been sent."}

    # Cooldown check
    if user.otp_sent_at and (datetime.utcnow() - user.otp_sent_at).total_seconds() < 30:
        raise HTTPException(
            status_code=429,
            detail="Please wait 30 seconds before requesting another code."
        )

    raw_otp = generate_secure_otp()
    user.otp_code = hash_otp(raw_otp)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
    user.otp_attempts = 0
    user.otp_sent_at = datetime.utcnow()
    db.add(user)
    await db.commit()

    if user.email:
        try:
            await send_otp_email(user.email, raw_otp, purpose="verification")
        except Exception as e:
            print(f"\n=======================================================")
            print(f" [DEV AUTH] EMAIL SEND FAILED: {e}")
            print(f" >>> RESENT OTP for {user.email}: {raw_otp} <<<")
            print(f"=======================================================\n")

    return {"message": f"OTP sent to your email {user.email}"}


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        # Generic response to prevent user enumeration
        return {"message": "If this account exists, a password reset code has been sent."}

    # Cooldown check
    if user.otp_sent_at and (datetime.utcnow() - user.otp_sent_at).total_seconds() < 30:
        raise HTTPException(
            status_code=429,
            detail="Please wait 30 seconds before requesting another code."
        )

    raw_otp = generate_secure_otp()
    user.otp_code = hash_otp(raw_otp)
    user.otp_expires_at = datetime.utcnow() + timedelta(minutes=5)
    user.otp_attempts = 0
    user.otp_sent_at = datetime.utcnow()
    db.add(user)
    await db.commit()

    if user.email:
        try:
            await send_otp_email(user.email, raw_otp, purpose="password reset")
        except Exception as e:
            print(f"\n=======================================================")
            print(f" [DEV AUTH] EMAIL SEND FAILED: {e}")
            print(f" >>> PASSWORD RESET OTP for {user.email}: {raw_otp} <<<")
            print(f"=======================================================\n")

    return {"message": f"OTP sent to your email {user.email}"}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)
):
    user = await get_user_by_identifier(data.identifier, db)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid OTP or identifier")

    if not user.otp_code or not user.otp_expires_at:
        raise HTTPException(status_code=400, detail="No active password reset OTP requested")

    if datetime.utcnow() > user.otp_expires_at:
        user.otp_code = None
        user.otp_expires_at = None
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new one.")

    current_attempts = user.otp_attempts or 0
    if current_attempts >= 5:
        user.otp_code = None
        user.otp_expires_at = None
        db.add(user)
        await db.commit()
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."
        )

    entered_hash = hash_otp(data.otp.strip())
    is_valid = False
    if user.otp_code and len(user.otp_code) == 64:
        is_valid = hmac.compare_digest(user.otp_code, entered_hash)
    elif user.otp_code:
        is_valid = hmac.compare_digest(user.otp_code, data.otp.strip())

    if not is_valid:
        user.otp_attempts = current_attempts + 1
        if user.otp_attempts >= 5:
            user.otp_code = None
            user.otp_expires_at = None
            db.add(user)
            await db.commit()
            raise HTTPException(
                status_code=429,
                detail="Too many failed attempts. This OTP has been invalidated for your security. Please request a new one."
            )
        db.add(user)
        await db.commit()
        raise HTTPException(status_code=400, detail=f"Invalid OTP. {5 - user.otp_attempts} attempts remaining.")

    # Successful OTP verification: reset password & invalidate OTP
    user.password_hash = hash_password(data.new_password)
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_attempts = 0
    user.failed_login_attempts = 0
    user.locked_until = None
    db.add(user)

    # Invalidate all existing refresh tokens for security on password reset
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id)
        .values(revoked=True)
    )

    await db.commit()

    return {"message": "Password reset successful"}


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refreshes a short-lived access token using a rotating refresh token."""
    h = hash_token(payload.refresh_token.strip())
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == h,
            RefreshToken.revoked == False
        )
    )
    rec = result.scalars().first()
    if not rec:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    if datetime.utcnow() > rec.expires_at:
        rec.revoked = True
        db.add(rec)
        await db.commit()
        raise HTTPException(status_code=401, detail="Refresh token expired. Please log in again.")

    # Token rotation: invalidate the old refresh token immediately
    rec.revoked = True
    db.add(rec)

    # Fetch user
    user_res = await db.execute(select(User).where(User.id == rec.user_id))
    user = user_res.scalars().first()
    if not user:
        await db.commit()
        raise HTTPException(status_code=401, detail="User not found")

    # Issue a brand new access token and rotating refresh token
    return await _build_token_response(user, db)


@router.post("/logout")
async def logout(
    payload: RefreshTokenRequest | None = None,
    db: AsyncSession = Depends(get_db)
):
    """Revokes the current refresh token session."""
    if payload and payload.refresh_token:
        h = hash_token(payload.refresh_token.strip())
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == h)
        )
        rec = result.scalars().first()
        if rec:
            rec.revoked = True
            db.add(rec)
            await db.commit()
    return {"message": "Logged out successfully"}


@router.post("/logout-all")
async def logout_all_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Revokes all refresh tokens for the current user across all devices."""
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == current_user.id)
        .values(revoked=True)
    )
    await db.commit()
    return {"message": "Logged out from all devices"}




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
    raw_otp = generate_secure_otp()
    try:
        await send_otp_email(to, raw_otp, purpose="test")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e),
        )
    return {"message": f"Test email sent to {to}", "otp_preview": raw_otp}


class FCMTokenRequest(BaseModel):
    fcm_token: str


@router.post("/fcm-token")
async def register_fcm_token(
    payload: FCMTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Registers a Firebase Cloud Messaging token for push notifications."""
    current_user.fcm_token = payload.fcm_token
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return {"saved": True}


@router.post("/ws-ticket")
async def generate_websocket_ticket(
    current_user: User = Depends(get_current_user)
):
    """Generates a single-use high-entropy ticket for secure WebSocket connection without exposing JWT in URL."""
    from utils.tickets import create_ws_ticket
    ticket = create_ws_ticket(str(current_user.id), ttl_seconds=30)
    return {"ticket": ticket, "expires_in": 30}


class PublicKeyUpdateRequest(BaseModel):
    public_key: str


class KeyBackupRequest(BaseModel):
    encrypted_private_key: str


@router.put("/e2ee/public-key")
async def update_public_key(
    payload: PublicKeyUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stores the device ECDH P-256 public key (JWK format). Server never sees the private key."""
    current_user.public_key = payload.public_key
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return {"saved": True, "public_key": current_user.public_key}


@router.post("/e2ee/backup")
async def save_encrypted_private_key_backup(
    payload: KeyBackupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Stores the client-side encrypted private key blob (wrapped by user PIN). Server cannot decrypt."""
    current_user.encrypted_private_key = payload.encrypted_private_key
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return {"saved": True}


@router.get("/e2ee/backup")
async def get_encrypted_private_key_backup(
    current_user: User = Depends(get_current_user)
):
    """Returns the encrypted private key bundle for new-device restoration."""
    return {
        "has_backup": current_user.encrypted_private_key is not None,
        "encrypted_private_key": current_user.encrypted_private_key,
        "public_key": current_user.public_key,
    }
