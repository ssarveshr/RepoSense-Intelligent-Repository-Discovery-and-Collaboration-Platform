import { Link } from 'react-router-dom';
import { useMeetLayout } from '../../layouts/meetLayoutContext.js';

export default function MeetingEndedView({ title, message, onReturn }) {
  const { standalone } = useMeetLayout();

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 text-center ${
        standalone ? 'min-h-full h-full bg-gray-950' : 'min-h-[calc(100vh-8rem)]'
      }`}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-10 shadow-xl">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">{title || 'Meeting ended'}</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-8 leading-relaxed">
          {message || 'This meeting is no longer active. You can return to Collaboration Studio or start a new meeting.'}
        </p>
        {onReturn ? (
          <button
            type="button"
            onClick={onReturn}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all"
          >
            Back to Collaboration Studio
          </button>
        ) : (
          <Link
            to="/meetings"
            className="inline-flex w-full py-3.5 items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all"
          >
            Back to Collaboration Studio
          </Link>
        )}
      </div>
    </div>
  );
}
