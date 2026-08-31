import pytest

from src.config.settings import Settings


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


def test_cors_origins_wildcard_env_still_supported(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "*")

    settings = Settings(_env_file=None)

    assert settings.cors_origins == ["*"]
