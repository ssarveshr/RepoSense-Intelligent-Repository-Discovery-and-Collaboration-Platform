import pytest

from src.services.meeting_invitation_service import (
    MeetingInvitationService,
    build_meeting_join_url,
    normalize_email,
    validate_external_url,
)


def test_normalize_email_valid():
    assert normalize_email("  User@Example.com ") == "user@example.com"


def test_normalize_email_rejects_invalid():
    assert normalize_email("not-an-email") is None
    assert normalize_email("bad\nheader") is None


def test_validate_external_url_requires_https():
    assert validate_external_url("https://meet.example.com/room") == "https://meet.example.com/room"
    with pytest.raises(ValueError):
        validate_external_url("http://insecure.example.com")


def test_build_meeting_join_url_uses_settings(monkeypatch):
    from src.config import settings

    monkeypatch.setattr(settings, "frontend_base_url", "https://app.reposense.io")
    assert build_meeting_join_url("abc-123") == "https://app.reposense.io/meetings/abc-123"


def test_prepare_recipients_dedupes_and_excludes_host():
    service = MeetingInvitationService()
    recipients = [
        {"name": "Host Person", "email": "host@example.com"},
        {"name": "Alice", "email": "alice@example.com"},
        {"name": "Alice Duplicate", "email": "alice@example.com"},
        {"name": "Bob", "email": None},
    ]
    prepared, stats = service.prepare_recipients(recipients, host_email="host@example.com")
    assert stats["valid_email"] == 1
    assert stats["skipped_host"] == 1
    assert stats["skipped_duplicate"] == 1
    assert stats["missing_email"] == 1
    host_entry = next(p for p in prepared if p.get("email") == "host@example.com")
    alice_entry = next(p for p in prepared if p.get("name") == "Alice")
    assert host_entry["status"] == "SKIPPED_HOST"
    assert alice_entry["status"] == "NOT_SENT"
    duplicate_entry = next(p for p in prepared if p.get("name") == "Alice Duplicate")
    assert duplicate_entry["status"] == "SKIPPED_DUPLICATE"


def test_send_invitations_without_smtp_marks_failed(monkeypatch):
    from src.config import settings

    monkeypatch.setattr(settings, "smtp_host", None)
    monkeypatch.setattr(settings, "smtp_user", None)
    monkeypatch.setattr(settings, "smtp_password", None)
    monkeypatch.setattr(settings, "frontend_base_url", "https://app.example.com")

    service = MeetingInvitationService()
    result = service.send_invitations(
        meeting_id="meet-1",
        short_code="ABCD-EFGH",
        meeting_title="Sync",
        host_name="Host",
        host_email="host@example.com",
        repo_name="RepoSense",
        recipients=[{"name": "Alice", "email": "alice@example.com"}],
    )
    assert result["summary"]["sent"] == 0
    assert result["summary"]["failed"] == 1
    assert result["recipients"][0]["status"] == "FAILED"
    assert result["join_url"] == "https://app.example.com/meetings/meet-1"


def test_invitations_api_requires_host(authenticated_client, monkeypatch):
    from src.config import settings

    client, user = authenticated_client
    monkeypatch.setattr(settings, "smtp_host", None)
    monkeypatch.setattr(settings, "smtp_user", None)
    monkeypatch.setattr(settings, "smtp_password", None)
    monkeypatch.setattr(settings, "frontend_base_url", "https://app.example.com")

    create_resp = client.post(
        "/api/meetings",
        json={"title": "Invite Test", "host_display_name": "Host"},
        headers={"Authorization": "Bearer test-token"},
    )
    assert create_resp.status_code == 201
    meeting_id = create_resp.json()["id"]

    invite_resp = client.post(
        f"/api/meetings/{meeting_id}/invitations",
        json={
            "host_email": "host@example.com",
            "host_name": "Host",
            "repo_name": "RepoSense",
            "recipients": [
                {"name": "Alice", "email": "alice@example.com"},
                {"name": "Host", "email": "host@example.com"},
            ],
        },
        headers={"Authorization": "Bearer test-token"},
    )
    assert invite_resp.status_code == 200
    body = invite_resp.json()
    assert body["meeting_id"] == meeting_id
    assert body["summary"]["skipped_host"] == 1
    assert body["reposense_join_url"].endswith(f"/meetings/{meeting_id}")

