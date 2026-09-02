import html
import re
import smtplib
import time
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any
from urllib.parse import urlparse

from src.config.settings import settings
from src.utils.github_collaborator_utils import recipient_matches_host_github_identity

EMAIL_PATTERN = re.compile(
    r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
    r"[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?"
    r"(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$"
)

INVITATION_STATUSES = frozenset(
    {"NOT_SENT", "SENDING", "SENT", "FAILED", "EMAIL_UNAVAILABLE", "SKIPPED_HOST", "SKIPPED_DUPLICATE"}
)


def normalize_email(value: str | None) -> str | None:
    if not value:
        return None
    cleaned = value.strip().lower()
    if not cleaned or "\n" in cleaned or "\r" in cleaned:
        return None
    if not EMAIL_PATTERN.match(cleaned):
        return None
    return cleaned


def validate_external_url(value: str | None) -> str | None:
    if not value or not value.strip():
        return None
    parsed = urlparse(value.strip())
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("External meeting link must be a valid HTTPS URL")
    return value.strip()


def build_meeting_join_url(meeting_id: str) -> str:
    base = settings.frontend_base_url.rstrip("/")
    return f"{base}/meetings/{meeting_id}"


def _smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_user and settings.smtp_password)


def _sanitize_header(value: str) -> str:
    return value.replace("\r", "").replace("\n", "").strip()


class MeetingInvitationService:
    """Server-side RepoSense meeting invitation emails via configured SMTP."""

    def __init__(self) -> None:
        self._dispatch_log: list[dict[str, Any]] = []

    @property
    def dispatch_log(self) -> list[dict[str, Any]]:
        return list(self._dispatch_log)

    def prepare_recipients(
        self,
        recipients: list[dict[str, Any]],
        *,
        host_email: str,
        host_github_user_id: str | None = None,
        host_github_login: str | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, int]]:
        """Validate, dedupe, and exclude host email/GitHub identity from outbound invitations."""
        host_norm = normalize_email(host_email)
        seen: set[str] = set()
        prepared: list[dict[str, Any]] = []
        stats = {
            "total": len(recipients),
            "valid_email": 0,
            "missing_email": 0,
            "skipped_host": 0,
            "skipped_duplicate": 0,
        }

        for item in recipients:
            if recipient_matches_host_github_identity(
                item,
                host_github_user_id=host_github_user_id,
                host_github_login=host_github_login,
            ):
                stats["skipped_host"] += 1
                continue

            raw_email = item.get("email")
            norm = normalize_email(raw_email) if raw_email else None

            if not norm:
                stats["missing_email"] += 1
                prepared.append(
                    {
                        **item,
                        "email": raw_email,
                        "status": "EMAIL_UNAVAILABLE",
                    }
                )
                continue

            if host_norm and norm == host_norm:
                stats["skipped_host"] += 1
                prepared.append({**item, "email": norm, "status": "SKIPPED_HOST"})
                continue

            if norm in seen:
                stats["skipped_duplicate"] += 1
                prepared.append({**item, "email": norm, "status": "SKIPPED_DUPLICATE"})
                continue

            seen.add(norm)
            stats["valid_email"] += 1
            prepared.append({**item, "email": norm, "status": item.get("status", "NOT_SENT")})

        return prepared, stats

    def send_invitations(
        self,
        *,
        meeting_id: str,
        short_code: str,
        meeting_title: str,
        host_name: str,
        host_email: str,
        repo_name: str | None,
        recipients: list[dict[str, Any]],
        custom_message: str | None = None,
        external_meeting_url: str | None = None,
        meeting_created_at: datetime | None = None,
        host_github_user_id: str | None = None,
        host_github_login: str | None = None,
    ) -> dict[str, Any]:
        host_email_norm = normalize_email(host_email)
        if not host_email_norm:
            raise ValueError("Invalid host email address")

        host_name_clean = _sanitize_header(host_name or "Host")
        prepared, prep_stats = self.prepare_recipients(
            recipients,
            host_email=host_email_norm,
            host_github_user_id=host_github_user_id,
            host_github_login=host_github_login,
        )

        join_url = validate_external_url(external_meeting_url) or build_meeting_join_url(meeting_id)
        reposense_join_url = build_meeting_join_url(meeting_id)
        smtp_enabled = _smtp_configured()

        sent = 0
        failed = 0
        unavailable = prep_stats["missing_email"]
        results: list[dict[str, Any]] = []

        for recipient in prepared:
            status = recipient.get("status", "NOT_SENT")
            email = recipient.get("email")
            name = _sanitize_header(recipient.get("name") or "Collaborator")

            if status in {"EMAIL_UNAVAILABLE", "SKIPPED_HOST", "SKIPPED_DUPLICATE"}:
                results.append(
                    {
                        "recipient_name": name,
                        "recipient_email": email,
                        "github_login": recipient.get("github_login"),
                        "status": status,
                        "error": None,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
                continue

            if not email:
                unavailable += 1
                results.append(
                    {
                        "recipient_name": name,
                        "recipient_email": None,
                        "github_login": recipient.get("github_login"),
                        "status": "EMAIL_UNAVAILABLE",
                        "error": None,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
                continue

            subject = f"Invitation to RepoSense Collaboration Meeting — {meeting_title}"
            meeting_time = ""
            if meeting_created_at:
                dt = meeting_created_at
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                meeting_time = dt.astimezone(timezone.utc).strftime("%B %d, %Y at %H:%M UTC")

            note = custom_message.strip() if custom_message else ""
            repo_line = repo_name or "your repository"

            body_plain = (
                f"Hello {name},\n\n"
                f"{host_name_clean} ({host_email_norm}) has invited you to a RepoSense collaboration meeting.\n\n"
                f"Meeting topic: {meeting_title}\n"
                f"Meeting code: {short_code}\n"
                f"Repository: {repo_line}\n"
            )
            if meeting_time:
                body_plain += f"Scheduled: {meeting_time}\n"
            body_plain += (
                f"\nJoin the meeting: {join_url}\n"
            )
            if external_meeting_url and join_url != reposense_join_url:
                body_plain += f"\nRepoSense room (LiveKit): {reposense_join_url}\n"
            if note:
                body_plain += f"\nNote from host: {note}\n"
            body_plain += "\nBest regards,\nRepoSense Collaboration Studio\n"

            safe_name = html.escape(name)
            safe_host = html.escape(host_name_clean)
            safe_host_email = html.escape(host_email_norm)
            safe_title = html.escape(meeting_title)
            safe_code = html.escape(short_code)
            safe_repo = html.escape(repo_line)
            safe_join = html.escape(join_url)
            safe_note = html.escape(note) if note else ""

            body_html = f"""
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 30px; border: 1px solid #e1e4e8;">
                <div style="text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px;">
                  <h2 style="color: #2563eb; margin: 0;">RepoSense Collaboration Meeting</h2>
                  <p style="color: #6b7280; font-size: 14px;">Real-time video collaboration powered by LiveKit</p>
                </div>
                <p>Hello <strong>{safe_name}</strong>,</p>
                <p><strong>{safe_host}</strong> (<a href="mailto:{safe_host_email}">{safe_host_email}</a>) invited you to collaborate on <strong>{safe_repo}</strong>.</p>
                <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 4px 0;"><strong>Topic:</strong> {safe_title}</p>
                  <p style="margin: 4px 0;"><strong>Meeting code:</strong> {safe_code}</p>
                  {"<p style='margin: 4px 0;'><strong>When:</strong> " + html.escape(meeting_time) + "</p>" if meeting_time else ""}
                </div>
                {f"<p style='background:#f9fafb;padding:12px;border-radius:8px;font-size:13px;'><strong>Note:</strong> {safe_note}</p>" if safe_note else ""}
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{safe_join}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: bold; display: inline-block;">
                    Join Meeting
                  </a>
                </div>
                <p style="font-size: 12px; color: #6b7280; text-align: center;">
                  Or copy this link: <a href="{safe_join}">{safe_join}</a>
                </p>
              </div>
            </body>
            </html>
            """

            entry = {
                "recipient_name": name,
                "recipient_email": email,
                "github_login": recipient.get("github_login"),
                "status": "SENDING",
                "error": None,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            if not smtp_enabled:
                entry["status"] = "FAILED"
                entry["error"] = "SMTP is not configured on the server"
                failed += 1
                results.append(entry)
                self._dispatch_log.append({**entry, "meeting_id": meeting_id, "short_code": short_code})
                continue

            try:
                msg = MIMEMultipart("alternative")
                msg["From"] = _sanitize_header(settings.smtp_user or "")
                msg["To"] = email
                msg["Subject"] = _sanitize_header(subject)
                msg.attach(MIMEText(body_plain, "plain", "utf-8"))
                msg.attach(MIMEText(body_html, "html", "utf-8"))

                with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                    server.starttls()
                    server.login(settings.smtp_user, settings.smtp_password)
                    server.send_message(msg)

                entry["status"] = "SENT"
                sent += 1
            except Exception as exc:
                entry["status"] = "FAILED"
                entry["error"] = str(exc)
                failed += 1

            results.append(entry)
            self._dispatch_log.append(
                {
                    **entry,
                    "meeting_id": meeting_id,
                    "short_code": short_code,
                    "sender": host_email_norm,
                }
            )
            time.sleep(0.05)

        return {
            "meeting_id": meeting_id,
            "short_code": short_code,
            "join_url": join_url,
            "reposense_join_url": reposense_join_url,
            "smtp_enabled": smtp_enabled,
            "summary": {
                "total": prep_stats["total"],
                "sent": sent,
                "failed": failed,
                "email_unavailable": unavailable,
                "skipped_host": prep_stats["skipped_host"],
                "skipped_duplicate": prep_stats["skipped_duplicate"],
                "valid_email": prep_stats["valid_email"],
            },
            "recipients": results,
        }


meeting_invitation_service = MeetingInvitationService()
