import time

import pytest

from src.services.livekit_token_service import LiveKitTokenService, room_name_from_short_code
from src.utils.livekit_diagnostics import (
    LiveKitCredentialProbeResult,
    decode_token_claims_summary,
    format_credential_probe_warning,
    livekit_http_base_url,
    livekit_project_host,
    probe_livekit_cloud_credentials,
)


def test_livekit_http_base_url_from_wss():
    assert (
        livekit_http_base_url("wss://reposense-meetings-18f7x8bu.livekit.cloud")
        == "https://reposense-meetings-18f7x8bu.livekit.cloud"
    )


def test_livekit_project_host():
    assert livekit_project_host("wss://reposense-meetings-18f7x8bu.livekit.cloud") == (
        "reposense-meetings-18f7x8bu.livekit.cloud"
    )


def test_minted_token_claims_match_room_and_identity(monkeypatch):
    monkeypatch.setattr(
        "src.services.livekit_token_service.settings.livekit_api_key",
        "API_TEST_KEY",
    )
    monkeypatch.setattr(
        "src.services.livekit_token_service.settings.livekit_api_secret",
        "secret-for-tests-only",
    )
    monkeypatch.setattr(
        "src.services.livekit_token_service.settings.livekit_url",
        "wss://reposense-meetings-18f7x8bu.livekit.cloud",
    )

    service = LiveKitTokenService()
    room = room_name_from_short_code("RS-DG7L6E")
    participant_id = "11111111-2222-3333-4444-555555555555"
    token = service.mint_join_token(
        room_name=room,
        participant_id=participant_id,
        participant_display_name="Alice",
    )

    summary = decode_token_claims_summary(token, expected_api_key="API_TEST_KEY")

    assert summary.issuer_matches_api_key is True
    assert summary.identity == participant_id
    assert summary.room == "RS-DG7L6E"
    assert summary.room_join is True
    assert summary.can_publish is True
    assert summary.can_subscribe is True
    assert summary.expired is False
    assert summary.expires_at > time.time()


def test_format_credential_probe_warning_for_rejected_credentials():
    warning = format_credential_probe_warning(
        LiveKitCredentialProbeResult(
            configured=True,
            host="reposense-meetings-18f7x8bu.livekit.cloud",
            api_key_prefix="APInBW",
            api_secret_length=42,
            cloud_api_reachable=True,
            credentials_accepted=False,
            error="401",
        )
    )
    assert warning is not None
    assert "rejected" in warning.lower()
    assert "LIVEKIT_URL" in warning


@pytest.mark.asyncio
async def test_probe_livekit_cloud_credentials_missing_config():
    result = await probe_livekit_cloud_credentials(
        livekit_url=None,
        api_key=None,
        api_secret=None,
    )
    assert result.configured is False
    assert result.credentials_accepted is False
