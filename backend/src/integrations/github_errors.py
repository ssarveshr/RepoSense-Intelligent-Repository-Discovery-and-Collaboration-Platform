"""Structured GitHub API error classification (no secrets in messages/logs)."""

from __future__ import annotations

import json
from typing import Any

# Scopes RepoSense requests during OAuth authorization.
GITHUB_OAUTH_SCOPES = "read:user read:org repo"

# Minimum scopes for repository/collaborator operations.
REQUIRED_REPO_SCOPES = frozenset({"repo"})
RECOMMENDED_ORG_SCOPES = frozenset({"read:org"})


def parse_scope_header(scope_value: str | None) -> list[str]:
    if not scope_value:
        return []
    normalized = scope_value.replace(",", " ")
    return sorted({part.strip() for part in normalized.split() if part.strip()})


def scopes_include_repo(scopes: list[str]) -> bool:
    return "repo" in scopes


def scopes_include_read_org(scopes: list[str]) -> bool:
    return "read:org" in scopes


def evaluate_permissions_status(granted_scopes: list[str]) -> str:
    if not scopes_include_repo(granted_scopes):
        return "scope_upgrade_required"
    if not scopes_include_read_org(granted_scopes):
        return "org_scope_recommended"
    return "ok"


def _safe_github_message(response) -> str | None:
    try:
        payload = response.json()
    except (ValueError, json.JSONDecodeError):
        return None
    if isinstance(payload, dict):
        message = payload.get("message")
        if isinstance(message, str) and message.strip():
            return message.strip()
    return None


def _header_list(response, name: str) -> list[str]:
    value = response.headers.get(name)
    if not value:
        return []
    return parse_scope_header(value.replace(",", " "))


def classify_forbidden(
    response,
    *,
    operation: str,
    owner: str,
    repo: str,
    granted_scopes: list[str] | None = None,
    repository_owner_type: str | None = None,
    repository_permissions: dict[str, bool] | None = None,
) -> tuple[str, str]:
    """Return (error_code, user_message) for a GitHub 403 response."""
    oauth_scopes = _header_list(response, "X-OAuth-Scopes")
    accepted_scopes = _header_list(response, "X-Accepted-OAuth-Scopes")
    github_sso = response.headers.get("X-GitHub-SSO")
    api_message = _safe_github_message(response) or ""

    effective_scopes = granted_scopes or oauth_scopes
    if operation == "collaborators" and not scopes_include_repo(effective_scopes):
        return (
            "GITHUB_SCOPE_REQUIRED",
            "Additional GitHub permissions are required. Please reconnect GitHub.",
        )

    if repository_owner_type == "Organization" and not scopes_include_read_org(effective_scopes):
        return (
            "GITHUB_SCOPE_REQUIRED",
            "Additional GitHub permissions are required. Please reconnect GitHub.",
        )

    if github_sso:
        return (
            "GITHUB_SSO_REQUIRED",
            "Authorize RepoSense through your organization's GitHub SSO.",
        )

    lower_msg = api_message.lower()
    if "organization" in lower_msg and any(
        token in lower_msg for token in ("oauth", "access", "approval", "third-party", "restrict")
    ):
        return (
            "GITHUB_ORGANIZATION_AUTH_REQUIRED",
            "Your GitHub organization requires approval for RepoSense to access this repository.",
        )

    if repository_permissions is not None:
        if not any(
            repository_permissions.get(flag)
            for flag in ("admin", "maintain", "push")
        ):
            return (
                "INSUFFICIENT_REPOSITORY_PERMISSION",
                "Your GitHub account does not have sufficient permission to view collaborators for this repository.",
            )

    if accepted_scopes and not scopes_include_repo(accepted_scopes):
        return (
            "GITHUB_SCOPE_REQUIRED",
            "Additional GitHub permissions are required. Please reconnect GitHub.",
        )

    if "rate limit" in lower_msg:
        return (
            "GITHUB_RATE_LIMIT",
            "GitHub API rate limit reached. Please try again later.",
        )

    return (
        "GITHUB_ACCESS_DENIED",
        "GitHub denied access to the repository collaborators.",
    )


def build_diagnostic_payload(
    *,
    operation: str,
    repository: str,
    github_login: str | None,
    response,
    granted_scopes: list[str] | None = None,
    repository_owner_type: str | None = None,
    repository_visibility: str | None = None,
    repository_permission: str | None = None,
) -> dict[str, Any]:
    return {
        "operation": operation,
        "repository": repository,
        "github_user": github_login,
        "status": response.status_code,
        "oauth_scopes": granted_scopes or _header_list(response, "X-OAuth-Scopes"),
        "accepted_scopes": _header_list(response, "X-Accepted-OAuth-Scopes"),
        "accepted_permissions": _header_list(response, "X-Accepted-GitHub-Permissions"),
        "github_sso": response.headers.get("X-GitHub-SSO"),
        "repository_owner_type": repository_owner_type,
        "repository_visibility": repository_visibility,
        "repository_permission": repository_permission,
        "github_message": _safe_github_message(response),
    }
