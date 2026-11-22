import os
import socket
import ssl
import smtplib
import asyncio
import httpx
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(_ENV_PATH)
load_dotenv()


def _create_connection_ipv4(address, timeout=8):
    """Force IPv4 connection to prevent '[Errno 101] Network is unreachable' on IPv6-disabled containers."""
    host, port = address
    last_err = None
    for res in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM):
        af, socktype, proto, canonname, sa = res
        sock = socket.socket(af, socktype, proto)
        try:
            sock.settimeout(timeout)
            sock.connect(sa)
            return sock
        except Exception as e:
            sock.close()
            last_err = e
    raise last_err or RuntimeError(f"Could not connect via IPv4 to {host}:{port}")


class SMTP_IPv4(smtplib.SMTP):
    def _get_socket(self, host, port, timeout):
        return _create_connection_ipv4((host, port), timeout)


class SMTP_SSL_IPv4(smtplib.SMTP_SSL):
    def _get_socket(self, host, port, timeout):
        sock = _create_connection_ipv4((host, port), timeout)
        return self.context.wrap_socket(sock, server_hostname=self._host)


async def _send_via_resend(api_key: str, to_email: str, subject: str, html_body: str):
    """Send via Resend HTTP API over HTTPS (Port 443 - not blocked by Render)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "from": "LoveLink <onboarding@resend.dev>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            },
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Resend HTTP API failed: {resp.status_code} {resp.text}")


async def _send_via_brevo(api_key: str, to_email: str, subject: str, html_body: str):
    """Send via Brevo (Sendinblue) HTTP API over HTTPS (Port 443 - not blocked by Render)."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={"api-key": api_key, "Content-Type": "application/json", "accept": "application/json"},
            json={
                "sender": {"name": "LoveLink", "email": "tirgarbhavesh2005@gmail.com"},
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_body,
            },
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Brevo HTTP API failed: {resp.status_code} {resp.text}")


def _send_sync_smtp(email: str, otp: str, purpose: str):
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
          This code expires in <strong>5 minutes</strong>.
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

    # Try Port 587 STARTTLS with IPv4
    try:
        server = SMTP_IPv4("smtp.gmail.com", 587, timeout=8)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(mail_user, mail_pass)
        server.sendmail(mail_from, [email], msg.as_string())
        server.quit()
        return
    except Exception as e587:
        print(f"[EMAIL] Port 587 failed: {e587}")

    # Fallback to Port 465 SSL with IPv4
    server = SMTP_SSL_IPv4("smtp.gmail.com", 465, timeout=8)
    server.login(mail_user, mail_pass)
    server.sendmail(mail_from, [email], msg.as_string())
    server.quit()


async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    """
    Sends OTP email with multiple resilience layers:
    1. Brevo HTTP API (Port 443 - works everywhere)
    2. Resend HTTP API (Port 443 - works everywhere)
    3. IPv4 Gmail SMTP (Ports 587 & 465)
    4. Fallback safe console logger for cloud free tiers (Render free plan blocks outbound SMTP)
    """
    subject = f"LoveLink - Your OTP for {purpose}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; background-color: #080612; padding: 24px; color: #f9fafb;">
      <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(145deg,#111827,#020617); border-radius: 18px; padding: 24px; border: 1px solid rgba(168,85,247,0.4);">
        <h2 style="color:#e9d5ff; text-align:center; font-size:24px; margin-bottom:4px;">LoveLink 💑</h2>
        <p style="color:#9ca3af; text-align:center; margin-top:0; margin-bottom:24px;">Your one-time code for {purpose}.</p>
        <p style="color:#e5e7eb; font-size:14px; margin-bottom:12px;">Your OTP is:</p>
        <div style="text-align:center; margin-bottom:20px;">
          <span style="display:inline-block; padding:12px 24px; border-radius:999px; background:linear-gradient(90deg,#8b5cf6,#ec4899); color:#f9fafb; font-size:28px; letter-spacing:0.5em; font-weight:bold;">{otp}</span>
        </div>
        <p style="color:#9ca3af; font-size:13px; margin-bottom:8px;">This code expires in <strong>5 minutes</strong>.</p>
      </div>
    </div>
    """

    # 1. Try Brevo HTTP API if configured
    brevo_key = os.getenv("BREVO_API_KEY")
    if brevo_key:
        try:
            await _send_via_brevo(brevo_key, email, subject, html_body)
            print(f"[EMAIL] Sent successfully via Brevo HTTP API to {email}!")
            return True
        except Exception as e:
            print(f"[EMAIL] Brevo failed: {e}")

    # 2. Try Resend HTTP API if configured
    resend_key = os.getenv("RESEND_API_KEY")
    if resend_key:
        try:
            await _send_via_resend(resend_key, email, subject, html_body)
            print(f"[EMAIL] Sent successfully via Resend HTTP API to {email}!")
            return True
        except Exception as e:
            print(f"[EMAIL] Resend failed: {e}")

    # 3. Try Gmail SMTP (Ports 587 / 465)
    try:
        await asyncio.to_thread(_send_sync_smtp, email, otp, purpose)
        print(f"[EMAIL] Sent successfully via Gmail SMTP to {email}!")
        return True
    except Exception as exc:
        print(f"\n=======================================================")
        print(f" [EMAIL NOTICE] Outbound SMTP blocked on host (Render Free Tier restriction: {exc}).")
        print(f" >>> VALID OTP CODE FOR {email}: {otp} <<<")
        print(f"=======================================================\n")
        return False
