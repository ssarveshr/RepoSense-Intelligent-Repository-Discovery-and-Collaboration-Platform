import random
import time
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

class ZoomService:
    """
    Service for creating hostable Zoom meetings, generating credentials,
    and managing email invitation dispatches to project collaborators.
    """
    def __init__(self):
        self._active_meetings: Dict[str, Dict[str, Any]] = {}
        self._sent_invitations_log: List[Dict[str, Any]] = []

    def format_meeting_id(self, raw_id: str) -> str:
        clean = ''.join(filter(str.isdigit, str(raw_id)))
        if len(clean) >= 9:
            return f"{clean[:3]} {clean[3:6]} {clean[6:10]}"
        return raw_id

    def create_meeting(
        self,
        host_name: str,
        host_email: str,
        topic: str,
        repo_name: str = "RepoSense Project",
        collaborators: Optional[List[Dict[str, Any]]] = None,
        custom_zoom_url: Optional[str] = None
    ) -> Dict[str, Any]:
        raw_id = str(random.randint(1000000000, 9999999999))
        formatted_id = self.format_meeting_id(raw_id)
        passcode = f"repo{random.randint(100, 999)}"
        host_key = str(random.randint(100000, 999999))

        # Default join_url to RepoSense Web Application meeting studio route to ensure valid link access
        if custom_zoom_url and custom_zoom_url.strip():
            join_url = custom_zoom_url.strip()
        else:
            join_url = f"http://localhost:5173/zoom-meeting/{raw_id}"

        web_client_url = f"http://localhost:5173/zoom-meeting/{raw_id}"
        desktop_app_url = join_url
        embed_viewport_url = f"http://localhost:5173/zoom-meeting/{raw_id}"

        meeting_data = {
            "meeting_id": formatted_id,
            "raw_id": raw_id,
            "passcode": passcode,
            "host_key": host_key,
            "host_name": host_name or "Shashidhar",
            "host_email": host_email or "5656shashidhar@gmail.com",
            "topic": topic or f"Live Collaboration - {repo_name}",
            "repo_name": repo_name,
            "join_url": join_url,
            "web_client_url": web_client_url,
            "desktop_app_url": desktop_app_url,
            "embed_viewport_url": embed_viewport_url,
            "status": "active",
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "collaborators": collaborators or []
        }

        self._active_meetings[raw_id] = meeting_data
        return meeting_data


    def get_meeting(self, raw_id: str) -> Optional[Dict[str, Any]]:
        return self._active_meetings.get(raw_id)

    def list_active_meetings(self) -> List[Dict[str, Any]]:
        return list(self._active_meetings.values())

    def update_smtp_config(
        self,
        smtp_user: str,
        smtp_password: str,
        smtp_host: str = "smtp.gmail.com",
        smtp_port: int = 587
    ) -> Dict[str, Any]:
        """Dynamically updates environment SMTP configuration."""
        os.environ["SMTP_USER"] = smtp_user
        os.environ["SMTP_PASSWORD"] = smtp_password
        os.environ["SMTP_HOST"] = smtp_host
        os.environ["SMTP_PORT"] = str(smtp_port)

        # Update .env file if it exists
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        try:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write(f"# RepoSense Backend SMTP Configuration\n")
                f.write(f"SMTP_HOST={smtp_host}\n")
                f.write(f"SMTP_PORT={smtp_port}\n")
                f.write(f"SMTP_USER={smtp_user}\n")
                f.write(f"SMTP_PASSWORD={smtp_password}\n")
        except Exception as e:
            print(f"Could not save .env: {e}")

        return {
            "status": "success",
            "message": f"SMTP configuration updated for {smtp_user}",
            "smtp_enabled": bool(smtp_host and smtp_user and smtp_password)
        }

    def send_invitations(
        self,
        meeting_id: str,
        host_email: str,
        host_name: str,
        repo_name: str,
        collaborators: List[Dict[str, Any]],
        custom_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dispatches email invitations for a specific Zoom meeting to all listed collaborators.
        Attempts real SMTP transport with multi-part HTML/Text if SMTP is configured, otherwise returns dispatches + client fallbacks.
        """
        raw_id = meeting_id.replace(" ", "")
        meeting = self._active_meetings.get(raw_id)

        passcode = meeting["passcode"] if meeting else "repo123"
        join_url = meeting["join_url"] if meeting else f"http://localhost:5173/zoom-meeting/{raw_id}"


        smtp_host = os.environ.get("SMTP_HOST")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_pass = os.environ.get("SMTP_PASSWORD")

        smtp_enabled = bool(smtp_host and smtp_user and smtp_pass)

        dispatched_recipients = []
        for c in collaborators:
            email = c.get("email") or f"{c.get('name', 'user').lower().replace(' ', '.')}@dev.org"
            name = c.get("name", "Collaborator")

            subject = f"🎥 Zoom Meeting Invitation: {repo_name} Collaboration"
            
            note_str = custom_message or "Please join promptly for pair programming and live code sync."

            # Plain text body fallback
            body_plain = (
                f"Hello {name},\n\n"
                f"{host_name} ({host_email}) has invited you to join a live Zoom meeting to collaborate on {repo_name}.\n\n"
                f"--------------------------------------------------\n"
                f"Meeting ID: {meeting_id}\n"
                f"Passcode: {passcode}\n"
                f"Host Email: {host_email}\n"
                f"Direct Join Link: {join_url}\n"
                f"--------------------------------------------------\n\n"
                f"Note: {note_str}\n\n"
                f"Best regards,\nRepoSense Collaboration Engine"
            )

            # Rich HTML email template
            body_html = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e1e4e8; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #2563eb; margin: 0;">🎥 Zoom Meeting Invitation</h2>
                  <p style="color: #6b7280; font-size: 14px; margin-top: 4px;">RepoSense Intelligent Collaboration Engine</p>
                </div>
                
                <p>Hello <strong>{name}</strong>,</p>
                <p><strong>{host_name}</strong> (<a href="mailto:{host_email}" style="color:#2563eb;">{host_email}</a>) has invited you to a live pair programming Zoom session for <strong>{repo_name}</strong>.</p>
                
                <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Repository:</strong> {repo_name}</p>
                  <p style="margin: 4px 0;"><strong>Meeting ID:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #1e40af;">{meeting_id}</span></p>
                  <p style="margin: 4px 0;"><strong>Passcode:</strong> <span style="font-family: monospace; font-size: 16px; font-weight: bold; color: #1e40af;">{passcode}</span></p>
                  <p style="margin: 4px 0;"><strong>Host:</strong> {host_name} ({host_email})</p>
                </div>

                {f'<p style="background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px italic #e5e7eb; font-size: 13px;"><strong>Note from Host:</strong> {note_str}</p>' if note_str else ''}

                <div style="text-align: center; margin: 30px 0;">
                  <a href="{join_url}" target="_blank" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);">
                    🚀 Join Zoom Meeting Now
                  </a>
                </div>

                <p style="font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 25px;">
                  If the button above does not work, copy and paste this link into your browser:<br>
                  <a href="{join_url}" style="color: #2563eb; word-break: break-all;">{join_url}</a>
                </p>
              </div>
            </body>
            </html>
            """

            # Build Gmail Web & Mailto fallback URLs
            import urllib.parse
            encoded_subj = urllib.parse.quote(subject)
            encoded_body = urllib.parse.quote(body_plain)
            gmail_link = f"https://mail.google.com/mail/?view=cm&fs=1&to={urllib.parse.quote(email)}&su={encoded_subj}&body={encoded_body}"
            mailto_link = f"mailto:{email}?subject={encoded_subj}&body={encoded_body}"

            status = "Log/Simulated"
            error_details = None

            if smtp_enabled:
                try:
                    msg = MIMEMultipart('alternative')
                    msg['From'] = smtp_user
                    msg['To'] = email
                    msg['Subject'] = subject

                    part1 = MIMEText(body_plain, 'plain')
                    part2 = MIMEText(body_html, 'html')
                    msg.attach(part1)
                    msg.attach(part2)

                    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_pass)
                        server.send_message(msg)
                    status = "Sent via SMTP"
                except Exception as err:
                    status = "SMTP Delivery Failed"
                    error_details = str(err)
            else:
                status = "Logged (SMTP Config Missing)"

            log_entry = {
                "recipient_name": name,
                "recipient_email": email,
                "status": status,
                "error": error_details,
                "timestamp": time.strftime("%H:%M:%S"),
                "gmail_link": gmail_link,
                "mailto_link": mailto_link,
                "email_preview": body_plain[:150] + "..."
            }
            dispatched_recipients.append(log_entry)
            self._sent_invitations_log.append(log_entry)

        return {
            "status": "success",
            "meeting_id": meeting_id,
            "host_email": host_email,
            "smtp_enabled": smtp_enabled,
            "total_sent": len(dispatched_recipients),
            "recipients": dispatched_recipients,
            "broadcast_message": f"Dispatched invitations to {len(dispatched_recipients)} collaborator(s)."
        }

zoom_service = ZoomService()

