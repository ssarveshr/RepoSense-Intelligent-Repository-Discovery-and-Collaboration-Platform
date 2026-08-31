import pytest
from jwt import InvalidTokenError

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.main import app
from helpers import auth_headers


@pytest.fixture
def verify_token(monkeypatch):
    def _set(user: ClerkUser | None, *, error: Exception | None = None):
        if error:

            def _raise(_token: str) -> ClerkUser:
                raise error

            monkeypatch.setattr("src.api.deps.clerk_auth.verify_clerk_jwt", _raise)
        elif user is None:

            def _none(_token: str) -> ClerkUser:
                raise InvalidTokenError("bad token")

            monkeypatch.setattr("src.api.deps.clerk_auth.verify_clerk_jwt", _none)
        else:
            monkeypatch.setattr("src.api.deps.clerk_auth.verify_clerk_jwt", lambda _token: user)

    return _set


def test_create_meeting_without_token_returns_401(client):
    response = client.post(
        "/api/meetings",
        json={"title": "Unauthorized", "host_display_name": "Host"},
    )
    assert response.status_code == 401


def test_create_meeting_with_malformed_auth_header_returns_401(client):
    response = client.post(
        "/api/meetings",
        json={"title": "Unauthorized", "host_display_name": "Host"},
        headers={"Authorization": "NotBearer token"},
    )
    assert response.status_code == 401


def test_create_meeting_with_invalid_token_returns_401(client, verify_token):
    verify_token(None)
    response = client.post(
        "/api/meetings",
        json={"title": "Unauthorized", "host_display_name": "Host"},
        headers=auth_headers("invalid-token"),
    )
    assert response.status_code == 401


def test_create_meeting_stores_clerk_user_id(authenticated_client, verify_token):
    client, user = authenticated_client
    verify_token(ClerkUser(user_id=user["user_id"], display_name=user["display_name"]))

    response = client.post(
        "/api/meetings",
        json={"title": "Owned Meeting", "host_display_name": "Alice"},
        headers=auth_headers(),
    )
    assert response.status_code == 201

    activity = client.get("/api/profile/activity", headers=auth_headers())
    assert activity.status_code == 200
    assert len(activity.json()["items"]) == 1


def test_create_meeting_rejects_trusted_host_id_in_body(authenticated_client, verify_token):
    client, user = authenticated_client
    verify_token(ClerkUser(user_id=user["user_id"], display_name=user["display_name"]))

    response = client.post(
        "/api/meetings",
        json={
            "title": "Spoof attempt",
            "host_display_name": "Alice",
            "host_clerk_user_id": "user_attacker",
        },
        headers=auth_headers(),
    )
    assert response.status_code == 422


def test_user_cannot_end_another_users_meeting(client, verify_token):
    verify_token(ClerkUser(user_id="user_a", display_name="Alice"))

    async def override_user_a():
        return ClerkUser(user_id="user_a", display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override_user_a
    create_resp = client.post(
        "/api/meetings",
        json={"title": "User A meeting", "host_display_name": "Alice"},
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]

    async def override_user_b():
        return ClerkUser(user_id="user_b", display_name="Bob")

    app.dependency_overrides[require_clerk_user] = override_user_b
    end_resp = client.post(f"/api/meetings/{meeting_id}/end", headers=auth_headers())
    assert end_resp.status_code == 403

    app.dependency_overrides.pop(require_clerk_user, None)


def test_profile_activity_is_scoped_to_authenticated_user(client, verify_token):
    verify_token(ClerkUser(user_id="user_a", display_name="Alice"))

    async def override_user_a():
        return ClerkUser(user_id="user_a", display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override_user_a
    client.post(
        "/api/meetings",
        json={"title": "Alice meeting", "host_display_name": "Alice"},
        headers=auth_headers(),
    )

    activity_a = client.get("/api/profile/activity", headers=auth_headers())
    assert activity_a.status_code == 200
    assert len(activity_a.json()["items"]) == 1

    async def override_user_b():
        return ClerkUser(user_id="user_b", display_name="Alice")

    app.dependency_overrides[require_clerk_user] = override_user_b
    activity_b = client.get("/api/profile/activity", headers=auth_headers())
    assert activity_b.status_code == 200
    assert len(activity_b.json()["items"]) == 0

    app.dependency_overrides.pop(require_clerk_user, None)


def test_same_display_name_does_not_merge_meetings(client, verify_token):
    verify_token(ClerkUser(user_id="user_a", display_name="Shared Name"))

    async def override_user_a():
        return ClerkUser(user_id="user_a", display_name="Shared Name")

    app.dependency_overrides[require_clerk_user] = override_user_a
    client.post(
        "/api/meetings",
        json={"title": "A meeting", "host_display_name": "Shared Name"},
        headers=auth_headers(),
    )

    async def override_user_b():
        return ClerkUser(user_id="user_b", display_name="Shared Name")

    app.dependency_overrides[require_clerk_user] = override_user_b
    client.post(
        "/api/meetings",
        json={"title": "B meeting", "host_display_name": "Shared Name"},
        headers=auth_headers(),
    )

    activity_b = client.get("/api/profile/activity", headers=auth_headers())

    assert len(activity_b.json()["items"]) == 1
    assert activity_b.json()["items"][0]["title"] == "B meeting"

    app.dependency_overrides.pop(require_clerk_user, None)


def test_profile_bio_and_skills_persist_for_authenticated_user(authenticated_client, verify_token):
    client, user = authenticated_client
    verify_token(ClerkUser(user_id=user["user_id"], display_name=user["display_name"]))

    empty = client.get("/api/profile", headers=auth_headers())
    assert empty.status_code == 200
    assert empty.json()["bio"] is None
    assert empty.json()["skills"] == []

    updated = client.patch(
        "/api/profile",
        json={"bio": "Building RepoSense", "skills": ["FastAPI", "React"]},
        headers=auth_headers(),
    )
    assert updated.status_code == 200
    assert updated.json()["bio"] == "Building RepoSense"
    assert updated.json()["skills"] == ["FastAPI", "React"]

    loaded = client.get("/api/profile", headers=auth_headers())
    assert loaded.json()["bio"] == "Building RepoSense"
    assert loaded.json()["skills"] == ["FastAPI", "React"]


def test_guest_can_join_without_clerk_token(authenticated_client, verify_token, monkeypatch):
    client, _user = authenticated_client
    verify_token(ClerkUser(user_id=_user["user_id"], display_name=_user["display_name"]))

    create_resp = client.post(
        "/api/meetings",
        json={"title": "Guest join test", "host_display_name": "Host"},
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]

    class FakeTokenService:
        livekit_url = "wss://test.livekit.cloud"

        def mint_join_token(self, *, room_name, participant_id, participant_display_name):
            return f"fake-token:{room_name}:{participant_id}:{participant_display_name}"

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Guest"},
    )
    assert join_resp.status_code == 200
