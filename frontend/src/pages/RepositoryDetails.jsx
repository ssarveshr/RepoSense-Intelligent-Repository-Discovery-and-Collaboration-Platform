import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import CollaborationHub from './CollaborationHub';

import { ArrowLeftIcon, FolderIcon } from '../components/icons';

export default function RepositoryDetails() {
  const { id } = useParams();
  const [activeView, setActiveView] = useState('overview');
  const repositoryId = id || '';

  return (
    <div className="space-y-8 animate-fade-in-up">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <ArrowLeftIcon /> Back to discover
      </Link>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
              <FolderIcon />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{`Repository ${repositoryId || 'unknown'}`}</h1>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Details unavailable</span>
            </div>
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Clone is unavailable because this repository cannot be loaded"
            className="px-6 py-2.5 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl shadow-md cursor-not-allowed opacity-70"
          >
            Clone unavailable
          </button>
        </div>

        <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
          {['overview', 'discussions'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveView(tab)}
              aria-selected={activeView === tab}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                ${activeView === tab 
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeView === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            <div className="lg:col-span-2 space-y-8">
              <section
                role="status"
                className="space-y-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-5"
              >
                <h2 className="text-xl font-bold">Repository details cannot be loaded</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {`RepoSense does not have an API that can fetch repository #${repositoryId || 'unknown'} by this route ID. Showing unrelated sample data would be misleading, so this page stays empty until a real repository lookup exists.`}
                </p>
              </section>
            </div>

            <div className="space-y-8">
              <section className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold">Suggested issues</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Issue matching is not available for this repository.
                </p>
              </section>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <CollaborationHub repoName={`repository ${repositoryId}`} githubUrl={undefined} isPersonal={false} />
          </div>
        )}
      </div>
    </div>
  );
}
