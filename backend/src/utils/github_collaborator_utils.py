"""Utilities for marking repository collaborators relative to the connected GitHub user."""


def recipient_matches_host_github_identity(
    recipient: dict,
    *,
    host_github_user_id: str | None,
    host_github_login: str | None,
) -> bool:
    if host_github_user_id:
        recipient_id = recipient.get("github_user_id") or recipient.get("githubUserId")
        if recipient_id and str(recipient_id) == str(host_github_user_id):
            return True
    if host_github_login:
        login = recipient.get("github_login") or recipient.get("githubLogin")
        if login and login.lower() == host_github_login.lower():
            return True
    return False


def annotate_collaborators_with_host(
    collaborators: list[dict],
    *,
    host_github_user_id: str | None,
    host_github_login: str | None,
) -> list[dict]:
    annotated: list[dict] = []
    for item in collaborators:
        github_user_id = item.get("id") or item.get("github_user_id")
        github_user_id_str = str(github_user_id) if github_user_id is not None else None
        login = item.get("login") or item.get("github_login")
        is_current_user = recipient_matches_host_github_identity(
            {"github_user_id": github_user_id_str, "github_login": login},
            host_github_user_id=host_github_user_id,
            host_github_login=host_github_login,
        )
        annotated.append(
            {
                **item,
                "github_user_id": github_user_id_str,
                "is_current_user": is_current_user,
            }
        )
    return annotated
