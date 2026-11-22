import os
import socket
import ssl
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(_ENV_PATH)
load_dotenv()


def _create_connection_ipv4(address, timeout=12):
    """
    Force IPv4 connection to prevent '[Errno 101] Network is unreachable'
    on cloud environments (like Render or Docker containers) without IPv6 default routes.
    """
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

    # Try Port 587 STARTTLS (standard for cloud hosts like Render)
    try:
        server = SMTP_IPv4("smtp.gmail.com", 587, timeout=12)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(mail_user, mail_pass)
        server.sendmail(mail_from, [email], msg.as_string())
        server.quit()
        return
    except Exception as e587:
        print(f"[EMAIL] Port 587 STARTTLS failed ({e587}). Falling back to Port 465 SSL...")

    # Fallback to Port 465 SSL
    server = SMTP_SSL_IPv4("smtp.gmail.com", 465, timeout=12)
    server.login(mail_user, mail_pass)
    server.sendmail(mail_from, [email], msg.as_string())
    server.quit()


async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    print(f"Sending OTP email to {email} for {purpose} via IPv4 SMTP...")
    try:
        await asyncio.to_thread(_send_sync, email, otp, purpose)
        print(f"OTP email sent successfully to {email}!")
    except Exception as exc:
        print(f"Email send failed: {exc}")
        raise
