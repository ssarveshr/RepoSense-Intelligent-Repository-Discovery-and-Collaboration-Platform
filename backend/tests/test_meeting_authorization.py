"""Meeting endpoint authorization and public metadata exposure tests."""

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.main import app
from helpers import auth_headers


def _override_clerk_user(user_id: str, display_name: str = "User"):
    async def override():
        return ClerkUser(user_id=user_id, display_name=display_name)

    app.dependency_overrides[require_clerk_user] = override


def _clear_clerk_override():
    app.dependency_overrides.pop(require_clerk_user, None)


class FakeTokenService:
    livekit_url = "wss://test.livekit.cloud"

    def mint_join_token(self, *, room_name, participant_id, participant_display_name):
        return f"fake-token:{room_name}:{participant_id}"


def test_anonymous_get_meeting_rejected(client):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Private", "host_display_name": "Host"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    denied = client.get(f"/api/meetings/{meeting_id}")
    assert denied.status_code == 401


def test_non_host_cannot_get_meeting(client):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Host only", "host_display_name": "Host"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    _override_clerk_user("user_other", "Other")
    try:
        denied = client.get(f"/api/meetings/{meeting_id}", headers=auth_headers())
        assert denied.status_code == 403
    finally:
        _clear_clerk_override()


def test_anonymous_participants_roster_rejected(client):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Roster protected", "host_display_name": "Host"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    denied = client.get(f"/api/meetings/{meeting_id}/participants")
    assert denied.status_code == 401


def test_resolve_returns_public_fields_only(client):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Public resolve", "host_display_name": "Host", "passcode": "secret1234"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
        short_code = create_resp.json()["short_code"]
    finally:
        _clear_clerk_override()

    resolve_resp = client.get(f"/api/meetings/resolve/{short_code}")
    assert resolve_resp.status_code == 200
    body = resolve_resp.json()
    assert body["id"] == meeting_id
    assert body["short_code"] == short_code
    assert body["title"] == "Public resolve"
    assert body["status"] in {"scheduled", "active"}
    assert body["passcode_required"] is True
    assert "is_joinable" in body
    assert "host_clerk_user_id" not in body
    assert "participants" not in body
    assert "passcode_hash" not in resolve_resp.text


def test_guest_join_still_works(client, monkeypatch):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Guest join", "host_display_name": "Host"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    monkeypatch.setattr("src.services.meeting_service.LiveKitTokenService", lambda: FakeTokenService())

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Guest"},
    )
    assert join_resp.status_code == 200
    assert join_resp.json()["token"].startswith("fake-token:")
    assert "livekit_api_secret" not in join_resp.text.lower()


def test_join_rejects_privilege_escalation_fields(client, monkeypatch):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Join guard", "host_display_name": "Host"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    monkeypatch.setattr("src.services.meeting_service.LiveKitTokenService", lambda: FakeTokenService())

    rejected = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Intruder", "is_host": True, "role": "admin"},
    )
    assert rejected.status_code == 422


def test_rate_limiter_reset_allows_sequential_meeting_creation(client):
    """Prove test isolation: limiter reset prevents cross-test 429 collisions."""
    _override_clerk_user("user_rate", "Rate")
    try:
        for index in range(3):
            response = client.post(
                "/api/meetings",
                json={"title": f"Rate test {index}", "host_display_name": "Host"},
                headers=auth_headers(),
            )
            assert response.status_code == 201, response.text
    finally:
        _clear_clerk_override()


def test_participant_token_grants_roster_access(client, monkeypatch):
    _override_clerk_user("user_host", "Host")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Roster token", "host_display_name": "Host"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    monkeypatch.setattr("src.services.meeting_service.LiveKitTokenService", lambda: FakeTokenService())
    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Guest"},
    )
    body = join_resp.json()

    roster_resp = client.get(
        f"/api/meetings/{meeting_id}/participants",
        headers={
            "X-Participant-Id": body["participant_id"],
            "X-Participant-Token": body["participant_token"],
        },
    )
    assert roster_resp.status_code == 200
    assert isinstance(roster_resp.json(), list)
    assert "leave_token_hash" not in roster_resp.text
