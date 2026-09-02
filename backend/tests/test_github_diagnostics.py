import json
from unittest.mock import patch

import pytest

from src.config.settings import Settings
from src.integrations.github import GitHubAnalyzer, GitHubApiError
from src.utils import github_diagnostics


def test_settings_loads_github_diagnostics_from_env(monkeypatch):
    monkeypatch.setenv("GITHUB_DIAGNOSTICS", "1")
    loaded = Settings()
    assert loaded.github_diagnostics is True


def test_github_diagnostics_disabled_by_default(monkeypatch):
    monkeypatch.delenv("GITHUB_DIAGNOSTICS", raising=False)
    loaded = Settings(_env_file=None)
    assert loaded.github_diagnostics is False


def test_log_github_diagnostic_emits_when_enabled(monkeypatch):
    monkeypatch.setattr(github_diagnostics.settings, "github_diagnostics", True, raising=False)
    emitted = []

    def capture(payload):
        emitted.append(payload)

    monkeypatch.setattr(github_diagnostics, "_emit_diagnostic", capture)
    github_diagnostics.log_github_api_denied(
        {
            "repository": "octocat/Hello-World",
            "github_login": "alice",
            "github_api_status": 403,
            "oauth_scopes": ["repo"],
            "github_api_message": "Must have push access to repository.",
        }
    )
    assert len(emitted) == 1
    assert emitted[0]["denial_source"] == "GITHUB API DENIED"
    assert "token" not in json.dumps(emitted[0]).lower()


def test_log_github_diagnostic_skipped_when_disabled(monkeypatch):
    monkeypatch.setattr(github_diagnostics.settings, "github_diagnostics", False, raising=False)
    emitted = []
    monkeypatch.setattr(github_diagnostics, "_emit_diagnostic", lambda payload: emitted.append(payload))
    github_diagnostics.log_github_precheck_denied(
        repository="octocat/Hello-World",
        denial_code="GITHUB_SCOPE_REQUIRED",
        denial_message="Missing repo scope",
        oauth_scopes=["read:user"],
    )
    assert emitted == []


def test_precheck_scope_denial_is_logged(monkeypatch):
    monkeypatch.setattr(github_diagnostics.settings, "github_diagnostics", True, raising=False)
    emitted = []
    monkeypatch.setattr(github_diagnostics, "_emit_diagnostic", lambda payload: emitted.append(payload))

    analyzer = GitHubAnalyzer(github_token="test-token", granted_scopes=["read:user"])
    repository = {
        "ownerType": "User",
        "visibility": "public",
        "permissionLevel": "read",
    }
    with pytest.raises(GitHubApiError) as exc:
        analyzer._ensure_can_list_collaborators(repository, owner="octocat", repo="Hello-World")
    assert exc.value.code == "GITHUB_SCOPE_REQUIRED"
    assert emitted[0]["denial_source"] == "PRECHECK DENIED"
    assert "access_token" not in json.dumps(emitted[0]).lower()
    assert "Authorization" not in json.dumps(emitted[0])


def test_emit_diagnostic_uses_logger_only(monkeypatch):
    monkeypatch.setattr(github_diagnostics.settings, "github_diagnostics", True, raising=False)
    log_lines = []
    monkeypatch.setattr(
        github_diagnostics.logger,
        "warning",
        lambda message, payload: log_lines.append((message, payload)),
    )
    printed = []
    monkeypatch.setattr("builtins.print", lambda *args, **kwargs: printed.append((args, kwargs)))

    github_diagnostics._emit_diagnostic({"oauth_stage": "callback_started"})

    assert len(log_lines) == 1
    assert log_lines[0][0] == "[GitHub Diagnostics] %s"
    assert '"oauth_stage": "callback_started"' in log_lines[0][1]
    assert printed == []
