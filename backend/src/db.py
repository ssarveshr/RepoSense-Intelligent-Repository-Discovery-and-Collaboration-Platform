from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from src.config.settings import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings.database_url, echo=False)
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    # Import models so metadata is populated before create_all
    import src.models.meeting  # noqa: F401
    import src.models.user_profile  # noqa: F401
    import src.models.github_connection  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _migrate_schema(conn)


async def _migrate_schema(conn) -> None:
    """Apply additive schema changes for existing SQLite databases."""

    def _apply_migrations(sync_conn) -> None:
        from sqlalchemy import inspect, text

        inspector = inspect(sync_conn)
        if "meetings" not in inspector.get_table_names():
            return

        columns = {column["name"] for column in inspector.get_columns("meetings")}
        if "host_clerk_user_id" not in columns:
            sync_conn.execute(
                text("ALTER TABLE meetings ADD COLUMN host_clerk_user_id VARCHAR(64)")
            )
            sync_conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_meetings_host_clerk_user_id "
                    "ON meetings (host_clerk_user_id)"
                )
            )
        if "empty_since" not in columns:
            sync_conn.execute(
                text("ALTER TABLE meetings ADD COLUMN empty_since DATETIME")
            )

    await conn.run_sync(_apply_migrations)
