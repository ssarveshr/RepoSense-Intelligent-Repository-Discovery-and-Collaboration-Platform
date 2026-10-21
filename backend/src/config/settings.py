import os
from pathlib import Path
from typing import Annotated, List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

REQUIRED_PRODUCTION_ENV_VARS = (
    "API_BASE_URL",
    "FRONTEND_BASE_URL",
    "CORS_ORIGINS",
)


def validate_production_configuration(environ=None, environment=None):
    """Fail fast in production when public URL settings are missing."""
    env = environ if environ is not None else os.environ
    mode = (environment if environment is not None else env.get("ENVIRONMENT", "development"))
    mode = str(mode or "development").strip().lower()
    if mode != "production":
        return
    missing = [name for name in REQUIRED_PRODUCTION_ENV_VARS if not str(env.get(name, "")).strip()]
    if missing:
        raise RuntimeError(
            "Production configuration is incomplete. Set "
            + ", ".join(missing)
            + " in the environment before starting the API. "
            "Do not rely on localhost defaults or wildcard CORS in production."
        )

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_DB = _BACKEND_ROOT / "reposense.db"


def normalize_cors_origin(value: str | None) -> str:
    if not value or not isinstance(value, str):
        return ""
    return value.strip().rstrip("/")


def parse_cors_origin_values(value) -> List[str]:
    """Split comma-separated CORS origins from a string or poorly decoded list."""
    raw_items: List[str] = []
    if value is None:
        raw_items = []
    elif isinstance(value, str):
        raw_items = value.split(",")
    elif isinstance(value, (list, tuple, set)):
        for item in value:
            if isinstance(item, str) and "," in item:
                raw_items.extend(item.split(","))
            elif item is not None:
                raw_items.append(str(item))
    else:
        raw_items = [str(value)]

    origins: List[str] = []
    seen: set[str] = set()
    for item in raw_items:
        origin = normalize_cors_origin(item)
        if not origin:
            continue
        if origin == "*":
            raise ValueError(
                "CORS_ORIGINS cannot be '*'. Set an explicit comma-separated origin list."
            )
        if origin not in seen:
            seen.add(origin)
            origins.append(origin)
    return origins


class Settings(BaseSettings):
    """Central typed configuration loaded from environment and optional .env file."""

    model_config = SettingsConfigDict(
        env_file=str(_BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database (Phase 0 meetings persistence)
    database_url: str = f"sqlite+aiosqlite:///{_DEFAULT_DB.as_posix()}"

    # API / frontend (for future meeting join links; not wired in Phase 0)
    api_base_url: str = "http://localhost:8000"
    frontend_base_url: str = "http://localhost:5173"

    # CORS — local Vite dev server by default; override via CORS_ORIGINS in production
    cors_origins: Annotated[List[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )

    # LiveKit (Phase 2 — token minting; key/secret must come from env)
    livekit_api_key: str | None = None
    livekit_api_secret: str | None = None
    livekit_url: str | None = None

    # Phase 9 — optional gate for meeting creation (legacy; superseded by Clerk JWT)
    meeting_create_api_key: str | None = None

    # Clerk — required for authenticated meeting creation and profile endpoints
    clerk_jwks_url: str | None = None
    clerk_issuer: str | None = None
    clerk_audience: str | None = None

    # Auth diagnostics — off by default; never log bearer tokens or JWTs
    auth_diagnostics: bool = False

    # SMTP (meeting invitation emails — loaded from env at deployment time only)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None

    # GitHub — optional token for collaborator listing (higher rate limits; no email guarantee)
    github_token: str | None = None

    # GitHub OAuth — per-user connection (client secret stays backend-only)
    github_client_id: str | None = None
    github_client_secret: str | None = None
    github_oauth_redirect_uri: str | None = None
    github_token_encryption_key: str | None = None

    # GitHub diagnostics — off by default
    github_diagnostics: bool = False

    # Meetings — grace period before auto-ending empty meetings (seconds)
    empty_meeting_grace_seconds: int = 30

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        return parse_cors_origin_values(value)

    @field_validator(
        "api_base_url",
        "frontend_base_url",
        "livekit_url",
        "github_oauth_redirect_uri",
        "github_client_secret",
        "github_token_encryption_key",
        mode="before",
    )
    @classmethod
    def strip_whitespace(cls, value):
        if isinstance(value, str):
            return value.strip()
        return value


settings = Settings()


def get_allowed_cors_origins() -> List[str]:
    """
    Origins allowed by CORSMiddleware.

    Re-reads Settings (env vars + backend/.env) so .env edits are picked up
    without relying on the import-time settings snapshot. Also allows
    FRONTEND_BASE_URL, which is the public frontend origin.
    """
    loaded = Settings()
    origins = parse_cors_origin_values(loaded.cors_origins)
    frontend = normalize_cors_origin(loaded.frontend_base_url)
    if frontend and frontend not in origins:
        origins.append(frontend)
    return origins
