from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.github_connection import GitHubConnection, GitHubOAuthState


class GitHubConnectionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_clerk_user_id(self, clerk_user_id: str) -> GitHubConnection | None:
        stmt = select(GitHubConnection).where(GitHubConnection.clerk_user_id == clerk_user_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_connection(
        self,
        *,
        clerk_user_id: str,
        github_user_id: str,
        github_login: str,
        github_name: str | None,
        github_avatar_url: str | None,
        access_token_encrypted: str,
        token_type: str,
        scope: str | None,
    ) -> GitHubConnection:
        existing = await self.get_by_clerk_user_id(clerk_user_id)
        if existing is None:
            connection = GitHubConnection(
                clerk_user_id=clerk_user_id,
                github_user_id=github_user_id,
                github_login=github_login,
                github_name=github_name,
                github_avatar_url=github_avatar_url,
                access_token_encrypted=access_token_encrypted,
                token_type=token_type,
                scope=scope,
            )
            self.session.add(connection)
        else:
            existing.github_user_id = github_user_id
            existing.github_login = github_login
            existing.github_name = github_name
            existing.github_avatar_url = github_avatar_url
            existing.access_token_encrypted = access_token_encrypted
            existing.token_type = token_type
            existing.scope = scope
            connection = existing

        await self.session.flush()
        return connection

    async def delete_by_clerk_user_id(self, clerk_user_id: str) -> None:
        await self.session.execute(
            delete(GitHubConnection).where(GitHubConnection.clerk_user_id == clerk_user_id)
        )

    async def touch_last_used(self, clerk_user_id: str) -> None:
        connection = await self.get_by_clerk_user_id(clerk_user_id)
        if connection is None:
            return
        connection.last_used_at = datetime.now(timezone.utc)
        await self.session.flush()

    async def create_oauth_state(self, *, state: str, clerk_user_id: str, expires_at: datetime) -> GitHubOAuthState:
        oauth_state = GitHubOAuthState(state=state, clerk_user_id=clerk_user_id, expires_at=expires_at)
        self.session.add(oauth_state)
        await self.session.flush()
        return oauth_state

    async def consume_oauth_state(self, state: str) -> GitHubOAuthState | None:
        stmt = select(GitHubOAuthState).where(GitHubOAuthState.state == state)
        result = await self.session.execute(stmt)
        oauth_state = result.scalar_one_or_none()
        if oauth_state is None:
            return None

        now = datetime.now(timezone.utc)
        expires_at = oauth_state.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if oauth_state.used_at is not None or expires_at <= now:
            return None

        oauth_state.used_at = now
        await self.session.flush()
        return oauth_state
