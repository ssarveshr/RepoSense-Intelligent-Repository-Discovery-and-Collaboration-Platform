import { Link } from 'react-router-dom';

const ChatBubbleIcon = () => (
  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

export default function CollaborationHub({ repoName, githubUrl, isPersonal }) {
  const meetingLinkState = githubUrl
    ? { repoName, githubUrl }
    : undefined;

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-extrabold pb-2">Discussions in {repoName}</h2>
          <p className="text-gray-600 dark:text-gray-400">Ask the maintainers and community for help.</p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <Link
            to="/meetings"
            state={meetingLinkState}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5 shadow-md flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Start Live Meeting &amp; Invite Collaborators</span>
          </Link>
          <button
            type="button"
            disabled
            className="px-6 py-2.5 bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-semibold rounded-xl cursor-not-allowed"
            title="Discussions coming soon"
          >
            New Discussion
          </button>
        </div>
      </div>

      <div className="p-8 bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl text-center space-y-3">
        <ChatBubbleIcon />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Repository discussions</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Threaded discussions for {repoName} are not connected yet. Use RepoSense Meetings to host a live session and invite GitHub collaborators today.
        </p>
        {!githubUrl && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Add a GitHub URL to this repository to pre-load collaborators in Meetings.
          </p>
        )}
      </div>

      {!isPersonal && githubUrl && (
        <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-indigo-100 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-2">Collaboration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Open Meetings to load collaborators from <span className="font-mono">{githubUrl}</span> and send LiveKit join invitations.
          </p>
        </div>
      )}
    </div>
  );
}
