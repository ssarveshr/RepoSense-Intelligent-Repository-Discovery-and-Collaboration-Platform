from unittest.mock import MagicMock, patch

import pytest

from src.services.meeting_invitation_service import MeetingInvitationService
from src.utils.github_collaborator_utils import annotate_collaborators_with_host, recipient_matches_host_github_identity


def test_recipient_matches_host_by_github_user_id():
    recipient = {"github_user_id": "183266947", "github_login": "suhanganesh"}
    assert recipient_matches_host_github_identity(
        recipient,
        host_github_user_id="183266947",
        host_github_login="suhanganesh",
    )


def test_recipient_does_not_match_host_when_only_repo_owner_differs():
    recipient = {"github_user_id": "999", "github_login": "suhanganesh"}
    assert not recipient_matches_host_github_identity(
        recipient,
        host_github_user_id="123",
        host_github_login="alice-github",
    )


def test_annotate_collaborators_marks_current_user():
    collaborators = [
        {"id": 183266947, "login": "suhanganesh", "permission": "Admin"},
        {"id": 123, "login": "PraveenKumarM17", "permission": "Write"},
    ]
    annotated = annotate_collaborators_with_host(
        collaborators,
        host_github_user_id="183266947",
        host_github_login="suhanganesh",
    )
    assert annotated[0]["is_current_user"] is True
    assert annotated[0]["github_user_id"] == "183266947"
    assert annotated[1]["is_current_user"] is False


def test_send_invitations_excludes_host_github_identity(monkeypatch):
    from src.config import settings

    monkeypatch.setattr(settings, "smtp_host", None)
    monkeypatch.setattr(settings, "smtp_user", None)
    monkeypatch.setattr(settings, "smtp_password", None)
    monkeypatch.setattr(settings, "frontend_base_url", "https://app.example.com")

    service = MeetingInvitationService()
    result = service.send_invitations(
        meeting_id="meet-1",
        short_code="RS-7K4P92",
        meeting_title="SkillFit Sync",
        host_name="Suhan",
        host_email="host@example.com",
        repo_name="suhanganesh/SkillFit",
        host_github_user_id="183266947",
        host_github_login="suhanganesh",
        recipients=[
            {
                "name": "Suhan",
                "email": "host@example.com",
                "github_login": "suhanganesh",
                "github_user_id": "183266947",
            },
            {
                "name": "Praveen",
                "email": "kanniymma@gmail.com",
                "github_login": "PraveenKumarM17",
                "github_user_id": "123",
            },
        ],
    )
    assert result["summary"]["skipped_host"] == 1
    assert result["summary"]["total"] == 2
    assert len(result["recipients"]) == 1
    assert result["recipients"][0]["github_login"] == "PraveenKumarM17"


@pytest.mark.asyncio
async def test_invitations_api_excludes_host_github_identity(authenticated_client, monkeypatch):
    from unittest.mock import AsyncMock

    from src.config import settings
    from src.models.github_connection import GitHubConnectionResponse, GitHubUserPublic

    client, user = authenticated_client
    monkeypatch.setattr(settings, "smtp_host", None)
    monkeypatch.setattr(settings, "smtp_user", None)
    monkeypatch.setattr(settings, "smtp_password", None)
    monkeypatch.setattr(settings, "frontend_base_url", "https://app.example.com")

    create_resp = client.post(
        "/api/meetings",
        json={"title": "SkillFit Sync", "host_display_name": "Suhan"},
        headers={"Authorization": "Bearer test-token"},
    )
    meeting_id = create_resp.json()["id"]

    connection_response = GitHubConnectionResponse(
        connected=True,
        github_user=GitHubUserPublic(id="183266947", login="suhanganesh"),
    )

    with patch(
        "src.api.routes.meetings.GitHubConnectionService.get_connection_response",
        new=AsyncMock(return_value=connection_response),
    ):
        invite_resp = client.post(
            f"/api/meetings/{meeting_id}/invitations",
            json={
                "host_email": "host@example.com",
                "host_name": "Suhan",
                "repo_name": "suhanganesh/SkillFit",
                "recipients": [
                    {
                        "name": "Suhan",
                        "email": "host@example.com",
                        "github_login": "suhanganesh",
                        "github_user_id": "183266947",
                    },
                    {
                        "name": "Praveen",
                        "email": "kanniymma@gmail.com",
                        "github_login": "PraveenKumarM17",
                        "github_user_id": "123",
                    },
                ],
            },
            headers={"Authorization": "Bearer test-token"},
        )

    assert invite_resp.status_code == 200
    body = invite_resp.json()
    assert body["summary"]["skipped_host"] == 1
    assert all(r.get("github_login") != "suhanganesh" for r in body["recipients"])
