from unittest.mock import MagicMock, patch

import jwt
import pytest
from jwt import InvalidTokenError

from src.api.deps.clerk_auth import verify_clerk_jwt
from src.config import settings


@pytest.fixture
def clerk_jwt_settings(monkeypatch):
    monkeypatch.setattr(settings, "clerk_jwks_url", "https://test.clerk.accounts.dev/.well-known/jwks.json")
    monkeypatch.setattr(settings, "clerk_issuer", "https://test.clerk.accounts.dev")
    monkeypatch.setattr(settings, "clerk_audience", None)


def _mock_jwk_client():
    mock_client = MagicMock()
    mock_key = MagicMock()
    mock_key.key = "test-signing-key"
    mock_client.get_signing_key_from_jwt.return_value = mock_key
    return mock_client


def test_verify_clerk_jwt_valid(clerk_jwt_settings, monkeypatch):
    payload = {
        "sub": "user_123",
        "name": "Test User",
        "iss": "https://test.clerk.accounts.dev",
        "exp": 9999999999,
    }
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch("src.api.deps.clerk_auth.jwt.decode", return_value=payload):
        user = verify_clerk_jwt("valid.jwt.token")
    assert user.user_id == "user_123"
    assert user.display_name == "Test User"


def test_verify_clerk_jwt_missing_subject(clerk_jwt_settings, monkeypatch):
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch("src.api.deps.clerk_auth.jwt.decode", return_value={"iss": "https://test.clerk.accounts.dev"}):
        with pytest.raises(InvalidTokenError):
            verify_clerk_jwt("missing-sub.jwt")


def test_verify_clerk_jwt_invalid_signature(clerk_jwt_settings, monkeypatch):
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch("src.api.deps.clerk_auth.jwt.decode", side_effect=InvalidTokenError("Invalid signature")):
        with pytest.raises(InvalidTokenError):
            verify_clerk_jwt("bad.jwt")


def test_verify_clerk_jwt_expired(clerk_jwt_settings, monkeypatch):
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch("src.api.deps.clerk_auth.jwt.decode", side_effect=InvalidTokenError("Signature has expired")):
        with pytest.raises(InvalidTokenError):
            verify_clerk_jwt("expired.jwt")


def test_verify_clerk_jwt_wrong_issuer(clerk_jwt_settings, monkeypatch):
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch("src.api.deps.clerk_auth.jwt.decode", side_effect=InvalidTokenError("Invalid issuer")):
        with pytest.raises(InvalidTokenError):
            verify_clerk_jwt("wrong-issuer.jwt")


def test_verify_clerk_jwt_audience_mismatch_when_configured(clerk_jwt_settings, monkeypatch):
    monkeypatch.setattr(settings, "clerk_audience", "expected-audience")
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch("src.api.deps.clerk_auth.jwt.decode", side_effect=InvalidTokenError("Invalid audience")):
        with pytest.raises(InvalidTokenError):
            verify_clerk_jwt("wrong-aud.jwt")


def test_verify_clerk_jwt_malformed_token(clerk_jwt_settings, monkeypatch):
    monkeypatch.setattr("src.api.deps.clerk_auth._get_jwk_client", _mock_jwk_client)
    with patch(
        "src.api.deps.clerk_auth.jwt.decode",
        side_effect=jwt.DecodeError("Not enough segments"),
    ):
        with pytest.raises(jwt.DecodeError):
            verify_clerk_jwt("not-a-jwt")
