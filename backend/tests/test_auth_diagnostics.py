from src.api.deps.clerk_auth import require_clerk_user
from src.config.settings import settings
from src.main import app


def test_require_clerk_user_logs_missing_bearer_when_auth_diagnostics_enabled(client, monkeypatch, caplog):
    monkeypatch.setattr(settings, "auth_diagnostics", True)
    app.dependency_overrides.pop(require_clerk_user, None)

    with caplog.at_level("INFO"):
        response = client.get("/api/meetings")

    assert response.status_code == 401
    assert any("[RepoSense Auth]" in record.message for record in caplog.records)
    assert "missing_bearer_token" in caplog.text
