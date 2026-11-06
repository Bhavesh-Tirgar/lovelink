import os
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(_ENV_PATH)
load_dotenv()


def _send_sync(email: str, otp: str, purpose: str):
    mail_user = os.getenv("MAIL_USERNAME", "tirgarbhavesh2005@gmail.com")
    mail_pass = os.getenv("MAIL_PASSWORD", "hjncxqctsbgtlsyu")
    mail_from = os.getenv("MAIL_FROM", mail_user)

    subject = f"LoveLink - Your OTP for {purpose}"
    html_body = f"""
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

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"LoveLink <{mail_from}>"
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html"))

    # Gmail SMTP Port 465 SSL connection
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=12) as server:
        server.login(mail_user, mail_pass)
        server.sendmail(mail_from, [email], msg.as_string())


async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    print(f"Sending OTP email to {email} for {purpose} via Gmail SSL (Port 465)...")
    try:
        await asyncio.to_thread(_send_sync, email, otp, purpose)
        print(f"OTP email sent successfully to {email}!")
    except Exception as exc:
        print(f"Email send failed: {exc}")
        raise
