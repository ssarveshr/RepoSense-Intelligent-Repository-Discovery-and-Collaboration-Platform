import logging
from dataclasses import dataclass

import jwt
from fastapi import Header, HTTPException
from jwt import InvalidTokenError, PyJWKClient

from src.config.settings import settings

logger = logging.getLogger("reposense.auth")

_jwk_client: PyJWKClient | None = None


@dataclass(frozen=True)
class ClerkUser:
    user_id: str
    display_name: str | None = None


def _log_auth_diagnostic(event: str, **payload) -> None:
    if not settings.auth_diagnostics:
        return
    safe_payload = {key: value for key, value in payload.items() if value is not None}
    logger.info("[RepoSense Auth] %s %s", event, safe_payload)


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if not settings.clerk_jwks_url:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    if _jwk_client is None:
        _jwk_client = PyJWKClient(settings.clerk_jwks_url)
    return _jwk_client


def verify_clerk_jwt(token: str) -> ClerkUser:
    """Verify a Clerk session JWT and return the authenticated user."""
    signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
    verify_audience = bool(settings.clerk_audience)
    decode_options = {
        "verify_aud": verify_audience,
        "verify_exp": True,
        "verify_nbf": True,
    }
    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "options": decode_options,
    }
    if settings.clerk_issuer:
        decode_kwargs["issuer"] = settings.clerk_issuer
    if verify_audience:
        decode_kwargs["audience"] = settings.clerk_audience

    payload = jwt.decode(
        token,
        signing_key.key,
        **decode_kwargs,
    )
    user_id = payload.get("sub")
    if not user_id:
        raise InvalidTokenError("Missing subject claim")

    display_name = payload.get("name") or payload.get("full_name")
    if not display_name:
        given = payload.get("given_name") or ""
        family = payload.get("family_name") or ""
        combined = f"{given} {family}".strip()
        display_name = combined or None

    return ClerkUser(user_id=user_id, display_name=display_name)


def _extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    return token or None


async def require_clerk_user(
    authorization: str | None = Header(default=None),
) -> ClerkUser:
    if not settings.clerk_jwks_url:
        token = _extract_bearer_token(authorization)
        if token:
            try:
                unverified = jwt.decode(token, options={"verify_signature": False})
                user_id = unverified.get("sub", "dev_user")
                display_name = unverified.get("name") or unverified.get("full_name") or "Local Developer"
                return ClerkUser(user_id=user_id, display_name=display_name)
            except Exception:
                pass
        return ClerkUser(user_id="dev_user", display_name="Local Developer")

    token = _extract_bearer_token(authorization)
    if not token:
        _log_auth_diagnostic("missing_bearer_token")
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        return verify_clerk_jwt(token)
    except InvalidTokenError as exc:
        _log_auth_diagnostic("invalid_token", reason=type(exc).__name__)
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc
    except HTTPException:
        raise
    except Exception as exc:
        _log_auth_diagnostic("invalid_token", reason=type(exc).__name__)
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc


async def get_optional_clerk_user(
    authorization: str | None = Header(default=None),
) -> ClerkUser | None:
    if not settings.clerk_jwks_url:
        return None

    token = _extract_bearer_token(authorization)
    if not token:
        return None

    try:
        return verify_clerk_jwt(token)
    except (InvalidTokenError, HTTPException, Exception):
        return None
