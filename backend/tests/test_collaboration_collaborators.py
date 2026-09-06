from unittest.mock import MagicMock, patch

import pytest

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config import settings
from src.integrations.github import GitHubAnalyzer
from src.main import app
from helpers import auth_headers

REPO_URL = (
    "https://github.com/ssarveshr/"
    "RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform"
)


@pytest.fixture
def github_oauth_settings(monkeypatch):
    import base64
    import os

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


def _mock_response(status_code: int, json_data=None, headers=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data or []
    response.headers = headers or {}
    return response


def test_collaboration_collaborators_requires_github_connection(
    client,
    github_oauth_settings,
    github_user_override,
):
    response = client.get(
        f"/api/collaboration/collaborators?github_url={REPO_URL}",
        headers=auth_headers(),
    )
    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "GITHUB_NOT_CONNECTED"
    assert "Connect your GitHub account" in detail["message"]


def test_collaboration_collaborators_rejects_invalid_url(client, github_user_override):
    response = client.get(
        "/api/collaboration/collaborators?github_url=not-a-github-url",
        headers=auth_headers(),
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_collaboration_collaborators_uses_oauth_token(
    client,
    github_oauth_settings,
    github_user_override,
):
    authorize = client.get("/api/github/oauth/authorize", headers=auth_headers())
    state = authorize.json()["authorization_url"].split("state=")[1].split("&")[0]

    with patch("src.services.github_oauth_service.requests.post") as mock_post:
        with patch("src.services.github_oauth_service.requests.get") as mock_oauth_get:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=lambda: {"access_token": "gho_user_token", "token_type": "bearer", "scope": "read:user read:org repo"},
            )
            mock_oauth_get.return_value = MagicMock(
                status_code=200,
                json=lambda: {
                    "id": 12345,
                    "login": "ssarveshr",
                    "name": "Ssarveshr",
                    "avatar_url": "https://example.com/avatar.png",
                },
            )
            client.get(f"/api/github/oauth/callback?code=abc&state={state}", follow_redirects=False)

    repo_payload = {
        "owner": {"login": "ssarveshr", "type": "User"},
        "name": "RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform",
        "full_name": "ssarveshr/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform",
        "html_url": REPO_URL,
        "private": False,
        "permissions": {"admin": True, "push": True},
    }
    collaborators_page = [
        {
            "id": 99,
            "login": "alice",
            "avatar_url": "https://avatars.example/alice",
            "html_url": "https://github.com/alice",
            "permissions": {"push": True},
        },
    ]

    with patch("src.integrations.github.requests.get") as mock_get:
        with patch.object(GitHubAnalyzer, "_fetch_user_public_email", return_value=None):
            mock_get.side_effect = [
                _mock_response(200, repo_payload),
                _mock_response(200, repo_payload),
                _mock_response(200, collaborators_page),
            ]
            response = client.get(
                f"/api/collaboration/collaborators?github_url={REPO_URL}",
                headers=auth_headers(),
            )

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 1
    assert body["collaborators"][0]["login"] == "alice"
    assert body["repository"]["full_name"].startswith("ssarveshr/")

    auth_header = mock_get.call_args_list[0][1]["headers"].get("Authorization")
    assert auth_header == "Bearer gho_user_token"
