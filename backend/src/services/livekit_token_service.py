from datetime import timedelta

from livekit.api import AccessToken, VideoGrants

from src.config.settings import settings

TOKEN_TTL = timedelta(minutes=10)


def room_name_from_short_code(short_code: str) -> str:
    """LiveKit room name derived from the meeting short code (not internal UUID)."""
    return short_code


class LiveKitConfigurationError(Exception):
    """Raised when LiveKit credentials are missing or invalid."""


class LiveKitTokenService:
    """Mints short-lived LiveKit JWT access tokens for room join."""

    def __init__(self) -> None:
        if not settings.livekit_api_key or not settings.livekit_api_secret or not settings.livekit_url:
            raise LiveKitConfigurationError(
                "LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL."
            )

    @staticmethod
    def room_name_from_short_code(short_code: str) -> str:
        return room_name_from_short_code(short_code)

    def mint_join_token(
        self,
        *,
        room_name: str,
        participant_id: str,
        participant_display_name: str,
    ) -> str:
        token = (
            AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
            .with_ttl(TOKEN_TTL)
            .with_identity(participant_id)
            .with_name(participant_display_name)
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=True,
                    can_subscribe=True,
                )
            )
        )
        return token.to_jwt()

    @property
    def livekit_url(self) -> str:
        return settings.livekit_url  # type: ignore[return-value]
