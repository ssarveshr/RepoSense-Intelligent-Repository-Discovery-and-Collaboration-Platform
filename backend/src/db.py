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
        _migrate_github_oauth_states(sync_conn)

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


def _migrate_github_oauth_states(sync_conn) -> None:
    """Align github_oauth_states with the UUID string primary key used by the model.

    Existing local databases were created with ``id VARCHAR(64) PRIMARY KEY``.
    A later model used ``state`` as the only primary key, so inserts omitted ``id``
    and SQLite raised NOT NULL on github_oauth_states.id.
    """
    import uuid

    from sqlalchemy import inspect, text

    inspector = inspect(sync_conn)
    if "github_oauth_states" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("github_oauth_states")}
    pk_cols = (inspector.get_pk_constraint("github_oauth_states") or {}).get("constrained_columns") or []
    index_names = {index["name"] for index in inspector.get_indexes("github_oauth_states")}

    if "id" in columns and pk_cols == ["id"]:
        if "ix_github_oauth_states_state" not in index_names:
            sync_conn.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_github_oauth_states_state "
                    "ON github_oauth_states (state)"
                )
            )
        if "ix_github_oauth_states_clerk_user_id" not in index_names:
            sync_conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_github_oauth_states_clerk_user_id "
                    "ON github_oauth_states (clerk_user_id)"
                )
            )
        return

    sync_conn.execute(text("ALTER TABLE github_oauth_states RENAME TO github_oauth_states_legacy"))
    sync_conn.execute(
        text(
            """
            CREATE TABLE github_oauth_states (
                id VARCHAR(64) NOT NULL,
                state VARCHAR(128) NOT NULL,
                clerk_user_id VARCHAR(64) NOT NULL,
                expires_at DATETIME NOT NULL,
                used_at DATETIME,
                created_at DATETIME,
                PRIMARY KEY (id)
            )
            """
        )
    )
    sync_conn.execute(
        text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_github_oauth_states_state "
            "ON github_oauth_states (state)"
        )
    )
    sync_conn.execute(
        text(
            "CREATE INDEX IF NOT EXISTS ix_github_oauth_states_clerk_user_id "
            "ON github_oauth_states (clerk_user_id)"
        )
    )
    rows = sync_conn.execute(
        text(
            "SELECT state, clerk_user_id, expires_at, used_at, created_at "
            "FROM github_oauth_states_legacy"
        )
    ).fetchall()
    for row in rows:
        sync_conn.execute(
            text(
                """
                INSERT INTO github_oauth_states
                    (id, state, clerk_user_id, expires_at, used_at, created_at)
                VALUES
                    (:id, :state, :clerk_user_id, :expires_at, :used_at, :created_at)
                """
            ),
            {
                "id": str(uuid.uuid4()),
                "state": row[0],
                "clerk_user_id": row[1],
                "expires_at": row[2],
                "used_at": row[3],
                "created_at": row[4],
            },
        )
    sync_conn.execute(text("DROP TABLE github_oauth_states_legacy"))
