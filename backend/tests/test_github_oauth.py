import base64
import os
from unittest.mock import MagicMock, patch

import pytest

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config import settings
from src.main import app
from src.services.github_connection_service import GitHubConnectionService
from src.services.github_oauth_service import GitHubOAuthError, GitHubOAuthService
from src.utils.token_crypto import decrypt_github_token, encrypt_github_token
from helpers import auth_headers


@pytest.fixture
def github_oauth_settings(monkeypatch):
    key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-client-secret")
    monkeypatch.setattr(settings, "github_oauth_redirect_uri", "http://localhost:8000/api/github/oauth/callback")
    monkeypatch.setattr(settings, "github_token_encryption_key", key)
    return key


@pytest.fixture
def github_user_override():
    async def override_user():
        return ClerkUser(user_id="user_a", display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override_user
    yield
    app.dependency_overrides.pop(require_clerk_user, None)


def test_encrypt_decrypt_github_token_roundtrip(github_oauth_settings):
    encrypted = encrypt_github_token("gho_test_token_value", github_oauth_settings)
    assert encrypted != "gho_test_token_value"
    assert decrypt_github_token(encrypted, github_oauth_settings) == "gho_test_token_value"


@pytest.mark.asyncio
async def test_oauth_authorize_returns_url(async_session, github_oauth_settings, github_user_override, client):
    response = client.get("/api/github/oauth/authorize", headers=auth_headers())
    assert response.status_code == 200
    body = response.json()
    assert "authorization_url" in body
    assert "client_id=test-client-id" in body["authorization_url"]
    assert "state=" in body["authorization_url"]
    assert body["scope"] == "read:user read:org repo"


@pytest.mark.asyncio
async def test_oauth_state_is_single_use(async_session, github_oauth_settings):
    connection_service = GitHubConnectionService(async_session)
    oauth_service = GitHubOAuthService(connection_service)

    url = await oauth_service.create_authorization_url("user_a")
    state = url.split("state=")[1].split("&")[0]

    with patch.object(oauth_service, "_exchange_code_for_token", return_value={"access_token": "gho_abc"}):
        with patch.object(
            oauth_service,
            "_fetch_github_user",
            return_value={"id": 1, "login": "alice", "name": "Alice", "avatar_url": "https://example/a.png"},
        ):
            await oauth_service.handle_callback(code="code-1", state=state, error=None)

    with pytest.raises(GitHubOAuthError):
        await oauth_service.handle_callback(code="code-2", state=state, error=None)


@pytest.mark.asyncio
async def test_oauth_callback_redirects_on_success(client, github_oauth_settings, github_user_override):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_secret", "token_type": "bearer", "scope": "read:user repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 99, "login": "alice", "name": "Alice", "avatar_url": "https://example/a.png"},
            )
            response = client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    assert response.status_code == 302
    assert "github_oauth=success" in response.headers["location"]

    connection = client.get("/api/github/connection", headers=auth_headers())
    assert connection.json()["connected"] is True
    assert connection.json()["github_user"]["login"] == "alice"


@pytest.mark.asyncio
async def test_connection_response_never_includes_token(client, github_oauth_settings, github_user_override):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_secret_value", "token_type": "bearer", "scope": "read:user repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 99, "login": "alice", "name": "Alice", "avatar_url": "https://example/a.png"},
            )
            client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    response = client.get("/api/github/connection", headers=auth_headers())
    assert response.status_code == 200
    body = response.json()
    assert body["connected"] is True
    assert "access_token" not in body
    assert "token" not in body


@pytest.mark.asyncio
async def test_disconnect_github_connection(client, github_oauth_settings, github_user_override):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_secret_value", "token_type": "bearer", "scope": "read:user repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 99, "login": "alice", "name": "Alice", "avatar_url": "https://example/a.png"},
            )
            client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    delete_resp = client.delete("/api/github/connection", headers=auth_headers())
    assert delete_resp.status_code == 200
    connection_resp = client.get("/api/github/connection", headers=auth_headers())
    assert connection_resp.json()["connected"] is False


@pytest.mark.asyncio
async def test_user_a_token_isolated_from_user_b(async_session, github_oauth_settings):
    service_a = GitHubConnectionService(async_session)
    service_b = GitHubConnectionService(async_session)
    await service_a.save_connection(
        clerk_user_id="user_a",
        github_user_id="1",
        github_login="alice",
        github_name="Alice",
        github_avatar_url=None,
        access_token="gho_alice",
        token_type="bearer",
        scope="read:user repo",
    )
    await service_b.save_connection(
        clerk_user_id="user_b",
        github_user_id="2",
        github_login="bob",
        github_name="Bob",
        github_avatar_url=None,
        access_token="gho_bob",
        token_type="bearer",
        scope="read:user repo",
    )

    token_a = await service_a.get_access_token("user_a")
    token_b = await service_b.get_access_token("user_b")
    assert token_a == "gho_alice"
    assert token_b == "gho_bob"
    assert token_a != token_b


def test_collaborators_requires_github_connection(client, github_user_override):
    response = client.get(
        "/api/github/repositories/octocat/Hello-World/collaborators",
        headers=auth_headers(),
    )
    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "GITHUB_NOT_CONNECTED"
    assert "Connect your GitHub account" in detail["message"]
