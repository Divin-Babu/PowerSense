import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "powersense2026@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "uclv uxaz knki tvvy")
SMTP_FROM = os.getenv("SMTP_FROM", "powersense2026@gmail.com")
APP_URL = os.getenv("APP_URL", "http://localhost:8081")

def get_clean_smtp_password() -> str:
    """Return clean password with spaces removed (for Gmail app passwords)."""
    return SMTP_PASSWORD.replace(" ", "").strip()

def send_password_reset_email(
    to_email: str,
    recipient_name: Optional[str],
    reset_token: str,
    custom_app_url: Optional[str] = None
) -> bool:
    """
    Sends a branded HTML password reset email to the user.
    """
    clean_to_email = to_email.strip().lower()
    display_name = recipient_name.strip() if recipient_name and recipient_name.strip() else "PowerSense User"
    base_url = (custom_app_url or APP_URL).rstrip("/")
    
    # Construct reset links
    reset_link = f"{base_url}/reset-password?token={reset_token}&email={clean_to_email}"
    
    # Create MIME message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "🔐 PowerSense AI - Password Reset Request"
    msg["From"] = f"PowerSense AI <{SMTP_FROM}>"
    msg["To"] = clean_to_email

    # Plain text version for non-HTML clients
    text_content = f"""Hello {display_name},

You requested to reset your password for your PowerSense AI account ({clean_to_email}).

To reset your password, please open the following link in your browser:
{reset_link}

Your Security Token:
{reset_token}

This link is valid for 30 minutes. If you did not request a password reset, you can safely ignore this email.

Best regards,
PowerSense AI Support Team
powersense2026@gmail.com
"""

    # Rich HTML version with PowerSense cyber-energy branding
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B111A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E2E8F0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0B111A; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #141D29; border: 1px solid #1E2D3D; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f2b23 0%, #141D29 100%); padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #1F3830;">
              <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; background-color: rgba(0, 196, 140, 0.15); border: 1.5px solid #00C48C; border-radius: 18px; text-align: center; font-size: 28px; color: #00C48C; margin-bottom: 12px;">
                ⚡
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">
                Power<span style="color: #00C48C;">Sense</span> AI
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8; font-weight: 500;">
                Smart Energy, Smarter You
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 14px 0; font-size: 19px; font-weight: 700; color: #F8FAFC;">
                Password Reset Request
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
                Hello <strong style="color: #00C48C;">{display_name}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94A3B8;">
                We received a request to reset the password for your PowerSense account associated with <span style="color: #F1F5F9; font-weight: 600;">{clean_to_email}</span>.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="{reset_link}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00D589 0%, #00A86B 100%); color: #FFFFFF; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0, 196, 140, 0.35); letter-spacing: 0.3px;">
                  Reset My Password &rarr;
                </a>
              </div>

              <!-- Security Info Box -->
              <div style="background-color: #0D1520; border: 1px solid #1E2D3D; border-radius: 12px; padding: 16px; margin: 24px 0;">
                <div style="font-size: 12px; font-weight: 700; color: #00C48C; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px;">
                  Security Details
                </div>
                <div style="font-size: 12px; color: #94A3B8; line-height: 1.5;">
                  • This link is valid for <strong>30 minutes</strong>.<br>
                  • If the button above doesn't work, copy and paste this URL into your browser:<br>
                  <span style="word-break: break-all; color: #38BDF8; font-family: monospace; font-size: 11px;">{reset_link}</span>
                </div>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                If you did not request this password reset, please disregard this email. Your account credentials will remain safe and unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0D1520; padding: 20px 32px; text-align: center; border-top: 1px solid #1E2D3D;">
              <p style="margin: 0; font-size: 12px; color: #64748B;">
                PowerSense AI Smart Plug Energy Intelligence Platform<br>
                Contact: <a href="mailto:{SMTP_FROM}" style="color: #00C48C; text-decoration: none;">{SMTP_FROM}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    password = get_clean_smtp_password()
    
    try:
        # Create secure context
        context = ssl.create_default_context()
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
                server.login(SMTP_USER, password)
                server.sendmail(SMTP_FROM, clean_to_email, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
                server.starttls(context=context)
                server.login(SMTP_USER, password)
                server.sendmail(SMTP_FROM, clean_to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[Email Service Error] Failed to send password reset email to {clean_to_email}: {e}")
        raise e
