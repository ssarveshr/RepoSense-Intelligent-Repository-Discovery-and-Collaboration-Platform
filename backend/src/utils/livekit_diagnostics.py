"""Safe LiveKit credential and token diagnostics — never logs secrets or full JWTs."""

from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse


@dataclass(frozen=True)
class LiveKitTokenClaimsSummary:
    issuer_prefix: str
    identity: str
    room: str | None
    room_join: bool
    can_publish: bool
    can_subscribe: bool
    expires_at: int
    expired: bool
    issuer_matches_api_key: bool


@dataclass(frozen=True)
class LiveKitCredentialProbeResult:
    configured: bool
    host: str | None
    api_key_prefix: str | None
    api_secret_length: int | None
    cloud_api_reachable: bool
    credentials_accepted: bool
    error: str | None = None


def livekit_http_base_url(livekit_url: str | None) -> str | None:
    if not livekit_url:
        return None
    cleaned = livekit_url.strip()
    if cleaned.startswith("wss://"):
        return "https://" + cleaned[len("wss://") :].rstrip("/")
    if cleaned.startswith("ws://"):
        return "http://" + cleaned[len("ws://") :].rstrip("/")
    if cleaned.startswith("https://") or cleaned.startswith("http://"):
        return cleaned.rstrip("/")
    return None


def livekit_project_host(livekit_url: str | None) -> str | None:
    if not livekit_url:
        return None
    try:
        parsed = urlparse(livekit_url.strip())
        return parsed.hostname
    except Exception:
        return None


def decode_token_claims_summary(token: str, *, expected_api_key: str | None = None) -> LiveKitTokenClaimsSummary:
    """Decode JWT payload only — never verify signature here."""
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("Token is not a JWT")

    payload_raw = parts[1]
    padding = "=" * (-len(payload_raw) % 4)
    payload: dict[str, Any] = json.loads(base64.urlsafe_b64decode(payload_raw + padding))

    video = payload.get("video") or {}
    exp = int(payload.get("exp") or 0)
    iss = str(payload.get("iss") or "")

    return LiveKitTokenClaimsSummary(
        issuer_prefix=iss[:6] if iss else "",
        identity=str(payload.get("sub") or ""),
        room=video.get("room"),
        room_join=bool(video.get("roomJoin")),
        can_publish=bool(video.get("canPublish")),
        can_subscribe=bool(video.get("canSubscribe")),
        expires_at=exp,
        expired=exp <= int(time.time()),
        issuer_matches_api_key=bool(expected_api_key and iss == expected_api_key),
    )


async def probe_livekit_cloud_credentials(
    *,
    livekit_url: str | None,
    api_key: str | None,
    api_secret: str | None,
) -> LiveKitCredentialProbeResult:
    host = livekit_project_host(livekit_url)
    key = (api_key or "").strip()
    secret = (api_secret or "").strip()

    if not host or not key or not secret:
        return LiveKitCredentialProbeResult(
            configured=False,
            host=host,
            api_key_prefix=key[:6] if key else None,
            api_secret_length=len(secret) if secret else None,
            cloud_api_reachable=False,
            credentials_accepted=False,
            error="LiveKit is not fully configured.",
        )

    http_base = livekit_http_base_url(livekit_url)
    if not http_base:
        return LiveKitCredentialProbeResult(
            configured=True,
            host=host,
            api_key_prefix=key[:6],
            api_secret_length=len(secret),
            cloud_api_reachable=False,
            credentials_accepted=False,
            error="LIVEKIT_URL is not a valid WebSocket URL.",
        )

    try:
        from livekit import api

        lk = api.LiveKitAPI(http_base, api_key=key, api_secret=secret)
        try:
            await lk.room.list_rooms(api.ListRoomsRequest())
            return LiveKitCredentialProbeResult(
                configured=True,
                host=host,
                api_key_prefix=key[:6],
                api_secret_length=len(secret),
                cloud_api_reachable=True,
                credentials_accepted=True,
            )
        except Exception as exc:
            message = str(exc) or exc.__class__.__name__
            accepted = "401" not in message and "invalid" not in message.lower()
            return LiveKitCredentialProbeResult(
                configured=True,
                host=host,
                api_key_prefix=key[:6],
                api_secret_length=len(secret),
                cloud_api_reachable=True,
                credentials_accepted=accepted,
                error=message[:200],
            )
        finally:
            await lk.aclose()
    except Exception as exc:
        return LiveKitCredentialProbeResult(
            configured=True,
            host=host,
            api_key_prefix=key[:6],
            api_secret_length=len(secret),
            cloud_api_reachable=False,
            credentials_accepted=False,
            error=str(exc)[:200],
        )


def format_credential_probe_warning(result: LiveKitCredentialProbeResult) -> str | None:
    if not result.configured:
        return "LiveKit is not configured (LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL)."
    if result.credentials_accepted:
        return None
    return (
        f"LiveKit credentials were rejected by {result.host or 'LiveKit Cloud'}. "
        "Ensure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are copied from the SAME project "
        "as LIVEKIT_URL in the LiveKit Cloud dashboard, then restart the backend."
    )
