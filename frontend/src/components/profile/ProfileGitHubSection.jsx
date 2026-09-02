import { formatRelativeTime } from './profileUtils';
import { formatGitHubUpdatedDate } from './githubProfileUtils';

function GitHubSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-24 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((row) => (
          <div key={row} className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
        ))}
      </div>
    </div>
  );
}

function RepoCard({ repository }) {
  return (
    <a
      href={repository.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
          {repository.name}
        </h3>
        {repository.private && (
          <span className="text-[10px] uppercase tracking-wide font-semibold text-gray-500 border border-gray-300 dark:border-gray-600 rounded-full px-2 py-0.5 shrink-0">
            Private
          </span>
        )}
      </div>
      {repository.description && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{repository.description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        {repository.language && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" aria-hidden="true" />
            {repository.language}
          </span>
        )}
        <span>★ {repository.stars ?? 0}</span>
        <span>◇ {repository.forks ?? 0}</span>
        {formatGitHubUpdatedDate(repository.updatedAt) && (
          <span>Updated {formatGitHubUpdatedDate(repository.updatedAt)}</span>
        )}
      </div>
    </a>
  );
}

export default function ProfileGitHubSection({
  data,
  loading,
  error,
  onRetry,
  onConnectGitHub,
  onDisconnectGitHub,
  isOAuthConnected = false,
  githubLogin = null,
}) {
  if (loading) {
    return (
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <GitHubSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">GitHub</h2>
        <div className="text-center py-8">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Unable to load GitHub data.</p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!data?.connected) {
    return (
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">GitHub</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Connect GitHub to display your repositories and activity.
        </p>
        {onConnectGitHub && (
          <button
            type="button"
            onClick={onConnectGitHub}
            className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Connect GitHub
          </button>
        )}
      </section>
    );
  }

  const { profile, repositories = [], activity = [], languages = [], github_username: githubUsername } = data;

  return (
    <div className="space-y-6 min-w-0">
      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">GitHub</h2>
        <div className="flex items-center gap-3">
          {profile?.avatarUrl && (
            <img
              src={profile.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700"
            />
          )}
          <div className="min-w-0 flex-1">
            {profile?.name && profile.name !== profile.login && (
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{profile.name}</p>
            )}
            <a
              href={profile?.htmlUrl || `https://github.com/${githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              @{githubUsername}
            </a>
          </div>
          {onDisconnectGitHub && isOAuthConnected && (
            <button
              type="button"
              onClick={onDisconnectGitHub}
              className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:hover:text-red-400"
            >
              Disconnect
            </button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Repositories</h2>
        {repositories.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No repositories found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repositories.map((repository) => (
              <RepoCard key={repository.fullName || repository.name} repository={repository} />
            ))}
          </div>
        )}
      </section>

      {languages.length > 0 && (
        <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Languages</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {languages.map((language) => language.name).join(' · ')}
          </p>
        </section>
      )}

      <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 sm:p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Activity</h2>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No GitHub activity yet.</p>
        ) : (
          <ul className="space-y-4">
            {activity.map((item) => (
              <li key={item.id} className="text-sm border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                <p className="text-gray-900 dark:text-white">{item.summary}</p>
                <p className="text-gray-500 dark:text-gray-400 mt-0.5">{formatRelativeTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
