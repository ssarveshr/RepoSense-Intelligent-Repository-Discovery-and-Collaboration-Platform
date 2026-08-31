from pathlib import Path
from typing import Annotated, List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_DB = _BACKEND_ROOT / "reposense.db"


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

    # SMTP (meeting invite flow — used by zoom_service today via os.environ)
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None

    # GitHub — optional token for collaborator listing (higher rate limits; no email guarantee)
    github_token: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            if value.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()
