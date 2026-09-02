from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import select

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config import settings
from src.main import app
from src.models.github_connection import GitHubConnection
from src.services.github_connection_service import GitHubConnectionService
from src.utils.token_crypto import decrypt_github_token, encrypt_github_token
from helpers import auth_headers


HEX_ENCRYPTION_KEY = "d27bb482a34517a36c5a1fa700556f3c18399b0cf4a22ebd7a85c5fc13aa0334"


@pytest.fixture
def github_oauth_settings(monkeypatch):
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-client-secret")
    monkeypatch.setattr(settings, "github_oauth_redirect_uri", "http://localhost:8000/api/github/oauth/callback")
    monkeypatch.setattr(settings, "github_token_encryption_key", HEX_ENCRYPTION_KEY)
    monkeypatch.setattr(settings, "github_diagnostics", True, raising=False)
    return HEX_ENCRYPTION_KEY


@pytest.fixture
def github_user_override():
    async def override_user():
        return ClerkUser(user_id="user_a", display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override_user
    yield
    app.dependency_overrides.pop(require_clerk_user, None)


def test_hex_encryption_key_roundtrip():
    encrypted = encrypt_github_token("gho_test_token_value", HEX_ENCRYPTION_KEY)
    assert encrypted != "gho_test_token_value"
    assert "gho_test_token_value" not in encrypted
    assert decrypt_github_token(encrypted, HEX_ENCRYPTION_KEY) == "gho_test_token_value"


@pytest.mark.asyncio
async def test_oauth_callback_persists_connection_with_hex_key(client, github_oauth_settings, github_user_override):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    assert authorize.status_code == 200
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {
                    "access_token": "gho_secret_plaintext",
                    "token_type": "bearer",
                    "scope": "read:user,read:org,repo",
                },
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {
                    "id": 4242,
                    "login": "suhanganesh",
                    "name": "Suhan",
                    "avatar_url": "https://avatars.example/s.png",
                },
            )
            response = client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    assert response.status_code == 302
    assert "github_oauth=success" in response.headers["location"]

    connection = client.get("/api/github/connection", headers=auth_headers())
    body = connection.json()
    assert body["connected"] is True
    assert body["github_user"]["login"] == "suhanganesh"
    assert body["github_user"]["id"] == "4242"
    assert "repo" in body["scopes"]


@pytest.mark.asyncio
async def test_save_connection_encrypts_token(async_session, github_oauth_settings):
    service = GitHubConnectionService(async_session)
    plaintext_token = "gho_secret_plaintext"
    await service.save_connection(
        clerk_user_id="user_a",
        github_user_id="1",
        github_login="alice",
        github_name="Alice",
        github_avatar_url=None,
        access_token=plaintext_token,
        token_type="bearer",
        scope="repo",
    )

    result = await async_session.execute(select(GitHubConnection))
    rows = list(result.scalars().all())
    assert len(rows) == 1
    assert rows[0].access_token_encrypted != plaintext_token
    assert plaintext_token not in rows[0].access_token_encrypted


@pytest.mark.asyncio
async def test_oauth_callback_reconnect_updates_existing_row(client, github_oauth_settings, github_user_override):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_old", "token_type": "bearer", "scope": "read:user"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 1, "login": "old-login", "name": "Old", "avatar_url": None},
            )
            client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    first = client.get("/api/github/connection", headers=auth_headers()).json()
    assert first["connected"] is True
    assert first["github_user"]["login"] == "old-login"

    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_new", "token_type": "bearer", "scope": "repo,read:user,read:org"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 2, "login": "new-login", "name": "New", "avatar_url": None},
            )
            response = client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    assert "github_oauth=success" in response.headers["location"]
    updated = client.get("/api/github/connection", headers=auth_headers()).json()
    assert updated["connected"] is True
    assert updated["github_user"]["login"] == "new-login"


@pytest.mark.asyncio
async def test_oauth_callback_invalid_state_redirects_error(client, github_oauth_settings, github_user_override):
    response = client.get("/api/github/oauth/callback?code=abc&state=invalid-state", follow_redirects=False)
    assert response.status_code == 302
    assert "github_oauth=error" in response.headers["location"]


@pytest.mark.asyncio
async def test_oauth_callback_token_exchange_failure_redirects_error(client, github_oauth_settings, github_user_override):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        mock_post.return_value = MagicMock(status_code=400, json=lambda: {"error": "bad_verification_code"})
        response = client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    assert "github_oauth=error" in response.headers["location"]
    connection = client.get("/api/github/connection", headers=auth_headers())
    assert connection.json()["connected"] is False


@pytest.mark.asyncio
async def test_oauth_callback_encryption_failure_redirects_error(client, github_oauth_settings, github_user_override):
    from src.utils.token_crypto import TokenEncryptionError

    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_secret", "token_type": "bearer", "scope": "repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {"id": 1, "login": "alice", "name": "Alice", "avatar_url": None},
            )
            with patch(
                "src.services.github_connection_service.encrypt_github_token",
                side_effect=TokenEncryptionError("encryption failed"),
            ):
                response = client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    assert "github_oauth=error" in response.headers["location"]


def test_database_url_resolves_relative_sqlite_path():
    from src.config.settings import Settings

    loaded = Settings(database_url="sqlite+aiosqlite:///./reposense.db", _env_file=None)
    assert loaded.database_url.endswith("/reposense.db")
    assert "reposense.db" in loaded.database_url
