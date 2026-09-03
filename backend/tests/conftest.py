import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from src.api.deps.clerk_auth import ClerkUser, require_clerk_user
from src.api.deps.rate_limit import limiter
from src.config import settings
from src.db import Base, get_session
import src.models.meeting  # noqa: F401
import src.models.user_profile  # noqa: F401
import src.models.github_connection  # noqa: F401
from src.main import app


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear slowapi counters between tests without disabling production limits."""
    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def zero_empty_grace(monkeypatch):
    monkeypatch.setattr(settings, "empty_meeting_grace_seconds", 0)


@pytest.fixture
def clerk_settings(monkeypatch):
    monkeypatch.setattr(settings, "clerk_jwks_url", "https://test.clerk.accounts.dev/.well-known/jwks.json")
    monkeypatch.setattr(settings, "clerk_issuer", "https://test.clerk.accounts.dev")
    return settings


@pytest.fixture
def client(clerk_settings):
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def init_db():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def override_get_session():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    asyncio.run(init_db())
    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    asyncio.run(engine.dispose())


@pytest.fixture
def authenticated_client(client):
    current_user = {"user_id": "user_test_aaa", "display_name": "Test User"}

    async def override_require_clerk_user() -> ClerkUser:
        return ClerkUser(**current_user)

    app.dependency_overrides[require_clerk_user] = override_require_clerk_user
    yield client, current_user
    app.dependency_overrides.pop(require_clerk_user, None)


@pytest.fixture
async def async_session() -> AsyncSession:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.commit()

    await engine.dispose()
