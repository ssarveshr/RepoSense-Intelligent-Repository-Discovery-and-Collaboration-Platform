from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.testclient import TestClient

from src.config.settings import parse_cors_origin_values


def _app_with_origins(origins):
    isolated = FastAPI()
    isolated.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @isolated.get("/")
    def root():
        return {"ok": True}

    return TestClient(isolated)


def test_cors_allows_configured_origin():
    client = _app_with_origins(["https://app.example.com"])
    response = client.get("/", headers={"Origin": "https://app.example.com"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://app.example.com"


def test_cors_rejects_unapproved_origin():
    client = _app_with_origins(["https://app.example.com"])
    response = client.get("/", headers={"Origin": "https://evil.example.com"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") != "https://evil.example.com"


def test_cors_origins_split_trim_and_strip_trailing_slash():
    assert parse_cors_origin_values(
        " http://localhost:5173 , https://app.example.com/ "
    ) == ["http://localhost:5173", "https://app.example.com"]


def test_cors_origins_flattens_single_comma_separated_list_item():
    assert parse_cors_origin_values(
        ["http://localhost:5173,https://app.example.com/"]
    ) == ["http://localhost:5173", "https://app.example.com"]


def test_real_app_preflight_allows_configured_frontend_origin(client, monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://app.example.com")

    response = client.options(
        "/",
        headers={
            "Origin": "https://app.example.com",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://app.example.com"
    allowed_headers = response.headers.get("access-control-allow-headers", "").lower()
    assert "authorization" in allowed_headers
    assert "content-type" in allowed_headers


def test_real_app_preflight_allows_frontend_base_url_when_missing_from_cors_list(client, monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://localhost:5173")
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://app.example.com/")

    response = client.options(
        "/api/meetings",
        headers={
            "Origin": "https://app.example.com",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://app.example.com"


def test_real_app_preflight_rejects_unapproved_origin(client, monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com")
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://app.example.com")

    response = client.options(
        "/",
        headers={
            "Origin": "https://evil.example.com",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 400
    assert response.text == "Disallowed CORS origin"
    assert response.headers.get("access-control-allow-origin") != "https://evil.example.com"
