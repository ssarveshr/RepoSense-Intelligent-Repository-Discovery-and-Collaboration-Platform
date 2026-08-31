import pytest

from src.models.meeting import MeetingCreate
from src.services.livekit_token_service import room_name_from_short_code
from src.services.meeting_service import MeetingJoinError, MeetingService
from helpers import auth_headers


class FakeTokenService:
    livekit_url = "wss://test.livekit.cloud"

    def mint_join_token(self, *, room_name, participant_id, participant_display_name):
        return f"fake-token:{room_name}:{participant_id}:{participant_display_name}"



@pytest.mark.asyncio
async def test_join_meeting_valid(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(title="1:1 Call", host_display_name="Host"),
        host_display_name="Host",
    )

    response = await service.join_meeting(
        created.id,
        "Guest",
        token_service=FakeTokenService(),
    )

    assert response.token.startswith("fake-token:")
    assert response.livekit_url == "wss://test.livekit.cloud"
    assert response.room_name == created.short_code
    assert response.participant_id
    assert response.participant_token


@pytest.mark.asyncio
async def test_join_meeting_wrong_passcode(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(
            title="Secure Call",
            host_display_name="Host",
            passcode="correct-pass",
        ),
        host_display_name="Host",
    )

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(
            created.id,
            "Guest",
            passcode="wrong-pass",
            token_service=FakeTokenService(),
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.message == "Invalid meeting or passcode"


@pytest.mark.asyncio
async def test_join_meeting_not_found(async_session):
    service = MeetingService(async_session)

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(
            "00000000-0000-0000-0000-000000000000",
            "Guest",
            token_service=FakeTokenService(),
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.message == "Invalid meeting or passcode"


@pytest.mark.asyncio
async def test_join_meeting_already_ended(async_session):
    service = MeetingService(async_session)
    created = await service.create_meeting(
        MeetingCreate(title="Ended Call", host_display_name="Host"),
        host_display_name="Host",
    )
    await service.end_meeting(created.id)

    with pytest.raises(MeetingJoinError) as exc_info:
        await service.join_meeting(
            created.id,
            "Guest",
            token_service=FakeTokenService(),
        )

    assert exc_info.value.status_code == 409
    assert "ended" in exc_info.value.message.lower()


def test_join_endpoint_valid(authenticated_client, monkeypatch):
    client, _user = authenticated_client
    create_resp = client.post(
        "/api/meetings",
        json={"title": "API Join Test", "host_display_name": "Host"},
        headers=auth_headers(),
    )
    assert create_resp.status_code == 201
    meeting_id = create_resp.json()["id"]
    assert "passcode_hash" not in create_resp.text

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Alice"},
    )
    assert join_resp.status_code == 200
    body = join_resp.json()
    assert body["token"].startswith("fake-token:")
    assert body["livekit_url"] == "wss://test.livekit.cloud"
    assert body["room_name"]
    assert body["participant_id"]
    assert body["participant_token"]
    assert "passcode_hash" not in join_resp.text
    assert "leave_token_hash" not in join_resp.text


def test_join_endpoint_wrong_passcode(authenticated_client, monkeypatch):
    client, _user = authenticated_client
    create_resp = client.post(
        "/api/meetings",
        json={
            "title": "Secure",
            "host_display_name": "Host",
            "passcode": "secret1234",
        },
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Alice", "passcode": "bad"},
    )
    assert join_resp.status_code == 400
    assert join_resp.json()["detail"] == "Invalid meeting or passcode"


def test_join_endpoint_not_found(client, monkeypatch):
    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    join_resp = client.post(
        "/api/meetings/00000000-0000-0000-0000-000000000000/join",
        json={"display_name": "Alice"},
    )
    assert join_resp.status_code == 400
    assert join_resp.json()["detail"] == "Invalid meeting or passcode"


def test_join_endpoint_passcode_protected_no_passcode_supplied(authenticated_client, monkeypatch):
    client, _user = authenticated_client
    create_resp = client.post(
        "/api/meetings",
        json={
            "title": "Secure",
            "host_display_name": "Host",
            "passcode": "secret1234",
        },
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    wrong_id_resp = client.post(
        "/api/meetings/00000000-0000-0000-0000-000000000000/join",
        json={"display_name": "Alice"},
    )
    missing_pass_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Alice"},
    )

    assert wrong_id_resp.status_code == 400
    assert missing_pass_resp.status_code == 400
    assert wrong_id_resp.json()["detail"] == missing_pass_resp.json()["detail"] == "Invalid meeting or passcode"


def test_join_endpoint_passcode_protected_wrong_id_with_passcode(authenticated_client, monkeypatch):
    client, _user = authenticated_client
    create_resp = client.post(
        "/api/meetings",
        json={
            "title": "Secure",
            "host_display_name": "Host",
            "passcode": "secret1234",
        },
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    wrong_id_resp = client.post(
        "/api/meetings/00000000-0000-0000-0000-000000000000/join",
        json={"display_name": "Alice", "passcode": "probe"},
    )
    wrong_pass_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Alice", "passcode": "bad"},
    )

    assert wrong_id_resp.status_code == 400
    assert wrong_pass_resp.status_code == 400
    assert wrong_id_resp.json()["detail"] == wrong_pass_resp.json()["detail"]


def test_leave_endpoint_requires_valid_token(authenticated_client, monkeypatch):
    client, _user = authenticated_client
    create_resp = client.post(
        "/api/meetings",
        json={"title": "Leave auth", "host_display_name": "Host"},
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Alice"},
    )
    body = join_resp.json()

    bad_leave = client.post(
        f"/api/meetings/{meeting_id}/leave",
        json={
            "participant_id": body["participant_id"],
            "participant_token": "not-the-token",
        },
    )
    assert bad_leave.status_code == 403

    good_leave = client.post(
        f"/api/meetings/{meeting_id}/leave",
        json={
            "participant_id": body["participant_id"],
            "participant_token": body["participant_token"],
        },
    )
    assert good_leave.status_code == 200
    leave_body = good_leave.json()
    assert leave_body["participant"]["left_at"] is not None
    assert leave_body["meeting_status"] == "ended"
    assert leave_body["auto_ended"] is True
    assert "leave_token_hash" not in good_leave.text


def test_list_meetings_requires_auth(client):
    denied = client.get("/api/meetings")
    assert denied.status_code == 401


def test_join_endpoint_meeting_ended(authenticated_client, monkeypatch):
    client, _user = authenticated_client
    create_resp = client.post(
        "/api/meetings",
        json={"title": "Ended", "host_display_name": "Host"},
        headers=auth_headers(),
    )
    meeting_id = create_resp.json()["id"]
    client.post(f"/api/meetings/{meeting_id}/end", headers=auth_headers())

    monkeypatch.setattr(
        "src.services.meeting_service.LiveKitTokenService",
        lambda: FakeTokenService(),
    )

    join_resp = client.post(
        f"/api/meetings/{meeting_id}/join",
        json={"display_name": "Alice"},
    )
    assert join_resp.status_code == 409


def test_livekit_token_service_room_name():
    assert room_name_from_short_code("ABCD-EFGH") == "ABCD-EFGH"
