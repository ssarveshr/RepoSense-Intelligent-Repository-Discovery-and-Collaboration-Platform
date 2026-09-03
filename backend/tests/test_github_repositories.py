"""Focused tests for GET /api/github/repositories authentication and GitHub connection handling."""

import base64
import os
from unittest.mock import MagicMock, patch

import pytest

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.config import settings
from src.main import app
from src.services.github_connection_service import GitHubConnectionExpiredError, GitHubConnectionService
from helpers import auth_headers


@pytest.fixture
def github_oauth_settings(monkeypatch):
    key = base64.urlsafe_b64encode(os.urandom(32)).decode("ascii")
    monkeypatch.setattr(settings, "github_client_id", "test-client-id")
    monkeypatch.setattr(settings, "github_client_secret", "test-client-secret")
    monkeypatch.setattr(settings, "github_oauth_redirect_uri", "http://localhost:8000/api/github/oauth/callback")
    monkeypatch.setattr(settings, "github_token_encryption_key", key)
    return key


def _override_clerk_user(user_id: str):
    async def override():
        return ClerkUser(user_id=user_id, display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override


def _clear_clerk_override():
    app.dependency_overrides.pop(require_clerk_user, None)


@pytest.mark.asyncio
async def test_repositories_requires_clerk_authentication(client):
    response = client.get("/api/github/repositories")
    assert response.status_code == 401
    assert response.json()["detail"] == "Authentication required"


@pytest.mark.asyncio
async def test_repositories_without_github_connection_returns_structured_403(client, github_oauth_settings):
    del github_oauth_settings
    _override_clerk_user("user_no_github")
    try:
        response = client.get("/api/github/repositories", headers=auth_headers())
        assert response.status_code == 403
        body = response.json()["detail"]
        assert body["code"] == "GITHUB_NOT_CONNECTED"
        assert body["reconnect_required"] is True
    finally:
        _clear_clerk_override()


@pytest.mark.asyncio
async def test_repositories_with_connected_github_returns_repository_list(client, github_oauth_settings):
    del github_oauth_settings

    async def fake_run_with_analyzer(self, clerk_user_id, operation):
        assert clerk_user_id == "user_with_github"
        mock_analyzer = MagicMock()
        mock_analyzer.list_authenticated_user_repositories.return_value = (
            [{"id": 1, "name": "Hello-World", "full_name": "alice/Hello-World"}],
            False,
        )
        return operation(mock_analyzer)

    _override_clerk_user("user_with_github")
    try:
        with patch.object(GitHubConnectionService, "run_with_analyzer", fake_run_with_analyzer):
            response = client.get("/api/github/repositories?page=1&per_page=30", headers=auth_headers())
        assert response.status_code == 200
        body = response.json()
        assert body["repositories"][0]["full_name"] == "alice/Hello-World"
        assert body["page"] == 1
        assert body["has_more"] is False
    finally:
        _clear_clerk_override()


@pytest.mark.asyncio
async def test_repositories_github_token_expired_returns_403_not_clerk_401(client, github_oauth_settings):
    del github_oauth_settings
    from src.services.github_connection_service import GitHubConnectionExpiredError

    async def fake_run_with_analyzer(self, clerk_user_id, operation):
        del clerk_user_id, operation
        raise GitHubConnectionExpiredError()

    _override_clerk_user("user_expired_github")
    try:
        with patch.object(GitHubConnectionService, "run_with_analyzer", fake_run_with_analyzer):
            response = client.get("/api/github/repositories", headers=auth_headers())
        assert response.status_code == 403
        body = response.json()["detail"]
        assert body["code"] == "GITHUB_CONNECTION_EXPIRED"
        assert body["reconnect_required"] is True
    finally:
        _clear_clerk_override()
