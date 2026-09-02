from unittest.mock import MagicMock, patch

import pytest

from src.integrations.github import GitHubAnalyzer, GitHubApiError
from src.integrations.github_errors import GITHUB_OAUTH_SCOPES, classify_forbidden, evaluate_permissions_status


def _mock_response(status_code: int, json_data=None, headers=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data or []
    response.headers = headers or {}
    return response


def test_oauth_scopes_include_repo_and_read_org():
    assert GITHUB_OAUTH_SCOPES == "read:user read:org repo"


def test_evaluate_permissions_status_flags_missing_repo():
    assert evaluate_permissions_status(["read:user"]) == "scope_upgrade_required"
    assert evaluate_permissions_status(["read:user", "repo"]) == "org_scope_recommended"
    assert evaluate_permissions_status(["read:user", "read:org", "repo"]) == "ok"


def test_classify_forbidden_missing_repo_scope():
    response = _mock_response(
        403,
        {"message": "Resource not accessible by integration"},
        {"X-OAuth-Scopes": "read:user", "X-Accepted-OAuth-Scopes": "repo"},
    )
    code, _message = classify_forbidden(
        response,
        operation="collaborators",
        owner="octocat",
        repo="Hello-World",
        granted_scopes=["read:user"],
    )
    assert code == "GITHUB_SCOPE_REQUIRED"


def test_list_collaborators_surfaces_github_permission_denial():
    repo_payload = {
        "owner": {"login": "octocat", "type": "User"},
        "name": "Hello-World",
        "full_name": "octocat/Hello-World",
        "html_url": "https://github.com/octocat/Hello-World",
        "private": False,
        "permissions": {"pull": True, "push": False, "admin": False},
    }

    with patch("src.integrations.github.requests.get") as mock_get:
        mock_get.side_effect = [
            _mock_response(200, repo_payload),
            _mock_response(
                403,
                {"message": "Must have push access to repository."},
                {"X-OAuth-Scopes": "repo,read:user", "X-Accepted-OAuth-Scopes": "repo"},
            ),
        ]
        analyzer = GitHubAnalyzer(github_token="test-token", granted_scopes=["repo", "read:user"])
        with pytest.raises(GitHubApiError) as exc:
            analyzer.list_collaborators_for_repo("octocat", "Hello-World")
    assert exc.value.code in {"INSUFFICIENT_REPOSITORY_PERMISSION", "GITHUB_ACCESS_DENIED"}


def test_list_collaborators_for_repo_returns_collaborators():
    repo_payload = {
        "owner": {"login": "octocat", "type": "User"},
        "name": "Hello-World",
        "full_name": "octocat/Hello-World",
        "html_url": "https://github.com/octocat/Hello-World",
        "private": False,
        "permissions": {"admin": True, "push": True},
    }
    collaborators_page = [
        {
            "id": 10,
            "login": "alice",
            "avatar_url": "https://avatars.example/alice",
            "html_url": "https://github.com/alice",
            "permissions": {"push": True},
        },
    ]

    with patch("src.integrations.github.requests.get") as mock_get:
        mock_get.side_effect = [
            _mock_response(200, repo_payload),
            _mock_response(200, collaborators_page),
        ]
        analyzer = GitHubAnalyzer(github_token="test-token", granted_scopes=["repo", "read:user"])
        with patch.object(analyzer, "_fetch_user_public_email", return_value=None):
            collaborators = analyzer.list_collaborators_for_repo("octocat", "Hello-World")

    assert len(collaborators) == 1
    assert collaborators[0]["login"] == "alice"


def test_classify_forbidden_detects_sso_header():
    response = _mock_response(
        403,
        {"message": "Resource protected by organization SAML enforcement."},
        {
            "X-GitHub-SSO": "required; url=https://github.com/orgs/example/sso",
            "X-OAuth-Scopes": "repo,read:user",
        },
    )
    code, message = classify_forbidden(
        response,
        operation="collaborators",
        owner="example",
        repo="private-repo",
        granted_scopes=["repo", "read:user"],
    )
    assert code == "GITHUB_SSO_REQUIRED"
    assert "SSO" in message
