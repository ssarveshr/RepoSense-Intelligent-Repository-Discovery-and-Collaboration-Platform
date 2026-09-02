from unittest.mock import MagicMock, patch

import pytest

from src.integrations.github import GitHubAnalyzer, GitHubApiError


def _mock_response(status_code: int, json_data=None, headers=None):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data or []
    response.headers = headers or {}
    return response


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
        {
            "id": 11,
            "login": "bob",
            "avatar_url": "https://avatars.example/bob",
            "html_url": "https://github.com/bob",
            "permissions": {"admin": True},
        },
    ]

    with patch("src.integrations.github.requests.get") as mock_get:
        mock_get.side_effect = [
            _mock_response(200, repo_payload),
            _mock_response(200, collaborators_page),
        ]
        analyzer = GitHubAnalyzer(
            github_token="test-token",
            granted_scopes=["repo", "read:user", "read:org"],
        )
        with patch.object(analyzer, "_fetch_user_public_email", return_value=None):
            collaborators = analyzer.list_collaborators_for_repo("octocat", "Hello-World")

    assert len(collaborators) == 2
    assert collaborators[0]["login"] == "alice"
    assert collaborators[0]["permission"] == "Write"
    assert collaborators[1]["login"] == "bob"
    assert collaborators[1]["permission"] == "Admin"


def test_get_repository_maps_403_to_permission_error():
    with patch("src.integrations.github.requests.get") as mock_get:
        mock_get.return_value = _mock_response(403, headers={"X-RateLimit-Remaining": "10"})
        analyzer = GitHubAnalyzer(github_token="test-token")
        with pytest.raises(GitHubApiError) as exc:
            analyzer.get_repository("octocat", "private-repo")
    assert exc.value.status_code == 403
    assert exc.value.code in {"INSUFFICIENT_REPOSITORY_PERMISSION", "GITHUB_ACCESS_DENIED"}
