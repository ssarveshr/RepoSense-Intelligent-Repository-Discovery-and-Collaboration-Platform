"""Safe local diagnostic for GitHub collaborator 403 (never prints tokens)."""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import requests
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config.settings import settings
from src.integrations.github import GitHubAnalyzer
from src.integrations.github_errors import parse_scope_header
from src.models.github_connection import GitHubConnection
from src.utils.token_crypto import decrypt_github_token


OWNER = "suhanganesh"
REPO = "SkillFit"


def safe_github_probe(token: str, github_login: str | None, granted_scopes: list[str]) -> dict:
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Bearer {token}",
        "User-Agent": "RepoSense-Diagnostics",
    }
    user_resp = requests.get("https://api.github.com/user", headers=headers, timeout=15)
    repo_resp = requests.get(f"https://api.github.com/repos/{OWNER}/{REPO}", headers=headers, timeout=15)
    collab_resp = requests.get(
        f"https://api.github.com/repos/{OWNER}/{REPO}/collaborators",
        headers=headers,
        params={"per_page": 1},
        timeout=15,
    )

    def msg(resp):
        try:
            return resp.json().get("message")
        except Exception:
            return None

    repo_data = repo_resp.json() if repo_resp.status_code == 200 else {}
    owner = repo_data.get("owner") or {}
    permissions = repo_data.get("permissions") or {}

    return {
        "github_diagnostics_setting": settings.github_diagnostics,
        "github_user_status": user_resp.status_code,
        "github_user_id": user_resp.json().get("id") if user_resp.status_code == 200 else None,
        "github_login": user_resp.json().get("login") if user_resp.status_code == 200 else github_login,
        "stored_granted_scopes": granted_scopes,
        "header_oauth_scopes": parse_scope_header(user_resp.headers.get("X-OAuth-Scopes")),
        "repository_status": repo_resp.status_code,
        "repository_exists": repo_resp.status_code == 200,
        "owner_login": owner.get("login"),
        "owner_type": owner.get("type"),
        "visibility": "private" if repo_data.get("private") else "public",
        "permissions": permissions,
        "collaborators_status": collab_resp.status_code,
        "collaborators_message": msg(collab_resp),
        "collaborators_accepted_scopes": parse_scope_header(collab_resp.headers.get("X-Accepted-OAuth-Scopes")),
        "collaborators_oauth_scopes": parse_scope_header(collab_resp.headers.get("X-OAuth-Scopes")),
        "collaborators_accepted_permissions": parse_scope_header(
            collab_resp.headers.get("X-Accepted-GitHub-Permissions")
        ),
        "github_sso": collab_resp.headers.get("X-GitHub-SSO"),
    }


async def main() -> None:
    engine = create_async_engine(settings.database_url)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        result = await session.execute(select(GitHubConnection))
        rows = list(result.scalars().all())
        if not rows:
            print(json.dumps({"error": "no_github_connections_in_database"}, indent=2))
            return
        for row in rows:
            scopes = parse_scope_header(row.scope)
            token = decrypt_github_token(row.access_token_encrypted, settings.github_token_encryption_key)
            analyzer = GitHubAnalyzer(
                github_token=token,
                github_login=row.github_login,
                granted_scopes=scopes,
            )
            precheck = {}
            try:
                repository = analyzer.get_repository(OWNER, REPO)
                precheck["get_repository_ok"] = True
                precheck["repository_permission_level"] = repository.get("permissionLevel")
                try:
                    analyzer._ensure_can_list_collaborators(repository)
                    precheck["precheck_result"] = "PASS"
                except Exception as exc:
                    precheck["precheck_result"] = "PRECHECK DENIED"
                    precheck["precheck_code"] = getattr(exc, "code", None)
                    precheck["precheck_message"] = getattr(exc, "message", str(exc))
            except Exception as exc:
                precheck["get_repository_ok"] = False
                precheck["precheck_result"] = "PRECHECK DENIED (get_repository)"
                precheck["precheck_code"] = getattr(exc, "code", None)
                precheck["precheck_message"] = getattr(exc, "message", str(exc))

            probe = safe_github_probe(token, row.github_login, scopes)
            output = {
                "clerk_user_id": row.clerk_user_id,
                "stored_github_login": row.github_login,
                "stored_scope_string": row.scope,
                "precheck": precheck,
                "github_api_probe": probe,
            }
            print(json.dumps(output, indent=2, sort_keys=True))


if __name__ == "__main__":
    asyncio.run(main())
