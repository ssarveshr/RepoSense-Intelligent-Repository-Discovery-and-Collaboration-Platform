import base64
import os
from unittest.mock import MagicMock, patch

import pytest

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config import settings
from src.main import app
from src.services.github_connection_service import GitHubConnectionService
from helpers import auth_headers


@pytest.fixture
def encryption_key(monkeypatch):
    key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    monkeypatch.setattr(settings, "github_token_encryption_key", key)
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-client-secret")
    monkeypatch.setattr(settings, "github_oauth_redirect_uri", "http://localhost:8000/api/github/oauth/callback")
    return key


@pytest.fixture
def github_user_override():
    async def override_user():
        return ClerkUser(user_id="user_a", display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override_user
    yield
    app.dependency_overrides.pop(require_clerk_user, None)


def _mock_response(status_code: int, json_data=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data or {}
    response.headers = {}
    return response


def _connect_github_via_oauth(client):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]
    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_test_token", "token_type": "bearer", "scope": "read:user repo"},
            )
            mock_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {
                    "id": 99,
                    "login": "octocat",
                    "name": "The Octocat",
                    "avatar_url": "https://avatars.example/octocat",
                },
            )
            client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)


def test_github_user_endpoint_requires_linked_connection(client, github_user_override, encryption_key):
    response = client.get("/api/github/user", headers=auth_headers())
    assert response.status_code == 200
    assert response.json()["connected"] is False


def test_github_user_endpoint_returns_real_data(client, github_user_override, encryption_key):
    _connect_github_via_oauth(client)

    user_payload = {
        "login": "octocat",
        "name": "The Octocat",
        "avatar_url": "https://avatars.example/octocat",
        "html_url": "https://github.com/octocat",
        "bio": "GitHub mascot",
        "public_repos": 2,
    }
    repos_payload = [
        {
            "name": "Hello-World",
            "full_name": "octocat/Hello-World",
            "owner": {"login": "octocat"},
            "description": "My first repo",
            "html_url": "https://github.com/octocat/Hello-World",
            "language": "JavaScript",
            "stargazers_count": 12,
            "forks_count": 3,
            "private": False,
            "updated_at": "2026-01-01T00:00:00Z",
        }
    ]
    events_payload = [
        {
            "id": 1,
            "type": "PushEvent",
            "repo": {"name": "octocat/Hello-World"},
            "created_at": "2026-01-02T00:00:00Z",
            "payload": {"commits": [{}, {}]},
        }
    ]

    with patch("src.integrations.github.requests.get") as mock_get:
        mock_get.side_effect = [
            _mock_response(200, user_payload),
            _mock_response(200, repos_payload),
            _mock_response(200, events_payload),
        ]
        response = client.get("/api/github/user", headers=auth_headers())

    assert response.status_code == 200
    body = response.json()
    assert body["connected"] is True
    assert body["github_username"] == "octocat"
    assert body["repositories"][0]["name"] == "Hello-World"
    assert body["activity"][0]["summary"].startswith("Pushed")
    assert body["languages"][0]["name"] == "JavaScript"


@pytest.mark.asyncio
async def test_github_connection_persists_encrypted_token(async_session, encryption_key):
    service = GitHubConnectionService(async_session)
    saved = await service.save_connection(
        clerk_user_id="user_a",
        github_user_id="99",
        github_login="octocat",
        github_name="Octocat",
        github_avatar_url=None,
        access_token="gho_test_token",
        token_type="bearer",
        scope="read:user repo",
    )
    assert saved.github_user.login == "octocat"
    assert await service.get_access_token("user_a") == "gho_test_token"

    loaded = await service.get_github_login("user_a")
    assert loaded == "octocat"
