"""Cross-user authorization and identity isolation regression tests."""

import base64
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config import settings
from src.main import app
from src.services.github_connection_service import GitHubConnectionService
from src.services.github_oauth_service import GitHubOAuthError, GitHubOAuthService
from helpers import auth_headers


@pytest.fixture
def github_oauth_settings(monkeypatch):
    key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-client-secret")
    monkeypatch.setattr(settings, "github_oauth_redirect_uri", "http://localhost:8000/api/github/oauth/callback")
    monkeypatch.setattr(settings, "github_token_encryption_key", key)
    return key


def _override_clerk_user(user_id: str, display_name: str = "User"):
    async def override():
        return ClerkUser(user_id=user_id, display_name=display_name)

    app.dependency_overrides[require_clerk_user] = override


def _clear_clerk_override():
    app.dependency_overrides.pop(require_clerk_user, None)


def _connect_github_for_user(client, github_oauth_settings, clerk_user_id: str, login: str, token: str):
    del github_oauth_settings
    _override_clerk_user(clerk_user_id, login.title())
    try:
        authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
        state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]
    finally:
        _clear_clerk_override()

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": token, "token_type": "bearer", "scope": "read:user repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {
                    "id": abs(hash(login)) % 100000,
                    "login": login,
                    "name": login.title(),
                    "avatar_url": f"https://example/{login}.png",
                },
            )
            client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)


async def _save_github_connection(client, github_oauth_settings, clerk_user_id: str, login: str, token: str):
    """Persist a GitHub connection through the OAuth callback (same DB as TestClient)."""
    _connect_github_for_user(client, github_oauth_settings, clerk_user_id, login, token)


@pytest.mark.asyncio
async def test_user_b_cannot_read_user_a_github_connection(client, github_oauth_settings):
    await _save_github_connection(client, github_oauth_settings, "user_a", "alice", "gho_alice")

    _override_clerk_user("user_b", "Bob")
    try:
        response = client.get("/api/github/connection", headers=auth_headers())
        assert response.status_code == 200
        assert response.json()["connected"] is False
    finally:
        _clear_clerk_override()


@pytest.mark.asyncio
async def test_user_b_disconnect_does_not_remove_user_a_github_connection(client, github_oauth_settings):
    await _save_github_connection(client, github_oauth_settings, "user_a", "alice", "gho_alice")

    _override_clerk_user("user_b", "Bob")
    try:
        delete_resp = client.delete("/api/github/connection", headers=auth_headers())
        assert delete_resp.status_code == 200
    finally:
        _clear_clerk_override()

    _override_clerk_user("user_a", "Alice")
    try:
        connection_resp = client.get("/api/github/connection", headers=auth_headers())
        assert connection_resp.status_code == 200
        assert connection_resp.json()["connected"] is True
        assert connection_resp.json()["github_user"]["login"] == "alice"
        assert "access_token" not in connection_resp.text
    finally:
        _clear_clerk_override()


@pytest.mark.asyncio
async def test_github_api_uses_clerk_user_scoped_token(client, github_oauth_settings):
    await _save_github_connection(client, github_oauth_settings, "user_a", "alice", "gho_alice")
    await _save_github_connection(client, github_oauth_settings, "user_b", "bob", "gho_bob")

    seen_user_ids: list[str] = []

    async def fake_run_with_analyzer(self, clerk_user_id, operation):
        seen_user_ids.append(clerk_user_id)
        token = await self.get_access_token(clerk_user_id)
        assert token in {"gho_alice", "gho_bob"}
        mock_analyzer = MagicMock()
        mock_analyzer.list_authenticated_user_repositories.return_value = ([], False)
        return operation(mock_analyzer)

    _override_clerk_user("user_b", "Bob")
    try:
        with patch.object(GitHubConnectionService, "run_with_analyzer", fake_run_with_analyzer):
            response = client.get("/api/github/repositories", headers=auth_headers())
        assert response.status_code == 200
        assert seen_user_ids == ["user_b"]
    finally:
        _clear_clerk_override()


@pytest.mark.asyncio
async def test_oauth_callback_binds_to_state_user_not_current_session(client, github_oauth_settings):
    """OAuth callback must associate GitHub with the user who started the flow (state owner)."""
    _override_clerk_user("user_a", "Alice")
    try:
        authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
        state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]
    finally:
        _clear_clerk_override()

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_alice", "token_type": "bearer", "scope": "read:user repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 1, "login": "alice", "name": "Alice", "avatar_url": "https://example/a.png"},
            )
            callback = client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)
    assert callback.status_code == 302

    _override_clerk_user("user_a", "Alice")
    try:
        a_conn = client.get("/api/github/connection", headers=auth_headers())
        assert a_conn.json()["connected"] is True
    finally:
        _clear_clerk_override()

    _override_clerk_user("user_b", "Bob")
    try:
        b_conn = client.get("/api/github/connection", headers=auth_headers())
        assert b_conn.json()["connected"] is False
    finally:
        _clear_clerk_override()


@pytest.mark.asyncio
async def test_oauth_state_expires(async_session, github_oauth_settings):
    from src.models.github_connection import GitHubOAuthState

    connection_service = GitHubConnectionService(async_session)
    oauth_service = GitHubOAuthService(connection_service)

    async_session.add(
        GitHubOAuthState(
            state="expired-state-token",
            clerk_user_id="user_a",
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        )
    )
    await async_session.flush()

    with pytest.raises(GitHubOAuthError):
        await oauth_service.handle_callback(code="code-1", state="expired-state-token", error=None)


def test_user_b_cannot_list_user_a_meetings(client):
    _override_clerk_user("user_a", "Alice")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Alice private meeting", "host_display_name": "Alice"},
            headers=auth_headers(),
        )
        assert create_resp.status_code == 201
        alice_meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    _override_clerk_user("user_b", "Bob")
    try:
        list_resp = client.get("/api/meetings", headers=auth_headers())
        assert list_resp.status_code == 200
        meeting_ids = [item["id"] for item in list_resp.json()]
        assert alice_meeting_id not in meeting_ids
    finally:
        _clear_clerk_override()


def test_user_b_cannot_end_user_a_meeting(client):
    _override_clerk_user("user_a", "Alice")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Protected meeting", "host_display_name": "Alice"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    _override_clerk_user("user_b", "Bob")
    try:
        end_resp = client.post(f"/api/meetings/{meeting_id}/end", headers=auth_headers())
        assert end_resp.status_code == 403
    finally:
        _clear_clerk_override()


def test_user_b_cannot_send_invitations_for_user_a_meeting(client, monkeypatch):
    from src.config import settings

    monkeypatch.setattr(settings, "smtp_host", None)
    monkeypatch.setattr(settings, "smtp_user", None)
    monkeypatch.setattr(settings, "smtp_password", None)

    _override_clerk_user("user_a", "Alice")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "Invite protected", "host_display_name": "Alice"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
    finally:
        _clear_clerk_override()

    _override_clerk_user("user_b", "Bob")
    try:
        invite_resp = client.post(
            f"/api/meetings/{meeting_id}/invitations",
            json={
                "host_email": "bob@example.com",
                "host_name": "Bob",
                "repo_name": "repo",
                "recipients": [{"name": "Victim", "email": "victim@example.com"}],
            },
            headers=auth_headers(),
        )
        assert invite_resp.status_code == 403
    finally:
        _clear_clerk_override()


def test_join_livekit_response_never_includes_server_secrets(client, monkeypatch):
    class FakeTokenService:
        livekit_url = "wss://test.livekit.cloud"

        def mint_join_token(self, *, room_name, participant_id, participant_display_name):
            return f"fake-livekit-jwt:{room_name}"

    _override_clerk_user("user_a", "Alice")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={"title": "LiveKit join", "host_display_name": "Alice"},
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
        short_code = create_resp.json()["short_code"]
    finally:
        _clear_clerk_override()

    monkeypatch.setattr("src.services.meeting_service.LiveKitTokenService", lambda: FakeTokenService())

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Guest"},
    )
    assert join_resp.status_code == 200
    body = join_resp.json()
    assert body["room_name"] == short_code
    assert "livekit_api_secret" not in join_resp.text.lower()
    assert "livekit_api_key" not in join_resp.text.lower()


def test_meeting_short_code_lookup_does_not_bypass_join_passcode(client, monkeypatch):
    class FakeTokenService:
        livekit_url = "wss://test.livekit.cloud"

        def mint_join_token(self, *, room_name, participant_id, participant_display_name):
            return "fake-token"

    _override_clerk_user("user_a", "Alice")
    try:
        create_resp = client.post(
            "/api/meetings",
            json={
                "title": "Passcode protected",
                "host_display_name": "Alice",
                "passcode": "secret1234",
            },
            headers=auth_headers(),
        )
        meeting_id = create_resp.json()["id"]
        short_code = create_resp.json()["short_code"]
    finally:
        _clear_clerk_override()

    resolve_resp = client.get(f"/api/meetings/resolve/{short_code}")
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["short_code"] == short_code
    assert resolve_resp.json()["passcode_required"] is True

    monkeypatch.setattr("src.services.meeting_service.LiveKitTokenService", lambda: FakeTokenService())

    join_without_pass = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Intruder"},
    )
    assert join_without_pass.status_code == 400
    assert join_without_pass.json()["detail"] == "Invalid meeting or passcode"
