import pytest

from src.config.settings import Settings, validate_production_configuration


def test_cors_origins_default_without_env(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["http://localhost:5173"]
    assert "*" not in settings.cors_origins


def test_cors_origins_env_override(monkeypatch):
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "https://app.example.com,https://staging.example.com",
    )

    settings = Settings(_env_file=None)

    assert settings.cors_origins == [
        "https://app.example.com",
        "https://staging.example.com",
    ]


def test_cors_origins_trims_trailing_slashes(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com/")

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["https://app.example.com"]


def test_cors_origins_rejects_wildcard(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")

    with pytest.raises(Exception, match="CORS_ORIGINS cannot be"):
        Settings(_env_file=None)


def test_oauth_and_frontend_urls_come_from_environment(monkeypatch):
    monkeypatch.setenv("API_BASE_URL", "https://api.example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://app.example.com")
    monkeypatch.setenv(
        "GITHUB_OAUTH_REDIRECT_URI",
        "https://api.example.com/api/github/oauth/callback",
    )

    settings = Settings(_env_file=None)

    assert settings.api_base_url == "https://api.example.com"
    assert settings.frontend_base_url == "https://app.example.com"
    assert settings.github_oauth_redirect_uri == "https://api.example.com/api/github/oauth/callback"


def test_production_configuration_requires_public_urls():
    with pytest.raises(RuntimeError, match="Production configuration is incomplete"):
        validate_production_configuration(
            environ={"ENVIRONMENT": "production"},
            environment="production",
        )


def test_production_configuration_accepts_explicit_urls():
    validate_production_configuration(
        environ={
            "ENVIRONMENT": "production",
            "API_BASE_URL": "https://api.example.com",
            "FRONTEND_BASE_URL": "https://app.example.com",
            "CORS_ORIGINS": "https://app.example.com",
        },
        environment="production",
    )
