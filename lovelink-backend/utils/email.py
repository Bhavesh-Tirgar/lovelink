import os

from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv

load_dotenv()

def get_fastmail():
    conf = ConnectionConfig(
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
        MAIL_FROM=os.getenv("MAIL_FROM"),
        MAIL_PORT=587,
        MAIL_SERVER="smtp.gmail.com",
        MAIL_STARTTLS=True,
        MAIL_SSL_TLS=False,
        USE_CREDENTIALS=True,
        VALIDATE_CERTS=True
    )
    return FastMail(conf)


async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    subject = f"LoveLink - Your OTP for {purpose}"
    body = f"""
    <div style="font-family: Arial, sans-serif; background-color: #080612; padding: 24px; color: #f9fafb;">
      <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(145deg,#111827,#020617); border-radius: 18px; padding: 24px; border: 1px solid rgba(168,85,247,0.4);">
        <h2 style="color:#e9d5ff; text-align:center; font-size:24px; margin-bottom:4px;">LoveLink 💑</h2>
        <p style="color:#9ca3af; text-align:center; margin-top:0; margin-bottom:24px;">
          Your one-time code for {purpose}.
        </p>
        <p style="color:#e5e7eb; font-size:14px; margin-bottom:12px;">Your OTP is:</p>
        <div style="text-align:center; margin-bottom:20px;">
          <span style="display:inline-block; padding:12px 24px; border-radius:999px; background:linear-gradient(90deg,#8b5cf6,#ec4899); color:#f9fafb; font-size:28px; letter-spacing:0.5em; font-weight:bold;">
            {otp}
          </span>
        </div>
        <p style="color:#9ca3af; font-size:13px; margin-bottom:8px;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="color:#6b7280; font-size:12px; line-height:1.5;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    </div>
    """
    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=body,
        subtype="html",
    )
    try:
        fm = get_fastmail()
        print(f"Sending OTP email to {email} for {purpose}...")
        await fm.send_message(message)
        print("Email sent successfully.")
    except Exception as exc:  # pragma: no cover - logging only
        print(f"Email send failed: {exc}")
        raise

