import { Link } from 'react-router-dom';
import { formatRelativeTime } from './profileUtils';

function ActivityIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" />
    </svg>
  );
}

export default function ProfileActivityFeed({ activity, loading, error, onRetry }) {
  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white">Activity</h2>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map((row) => (
              <div key={row} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-md" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            No activity yet. Activity from your RepoSense usage will appear here.
          </p>
        ) : (
          <ul className="space-y-4">
            {activity.map((item) => (
              <li key={item.id} className="flex gap-3 text-sm">
                <ActivityIcon />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 dark:text-white">
                    {item.kind === 'completed' ? 'Completed meeting' : 'Created meeting'}{' '}
                    <Link
                      to={`/meetings/${item.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {item.description}
                    </Link>
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">{formatRelativeTime(item.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
