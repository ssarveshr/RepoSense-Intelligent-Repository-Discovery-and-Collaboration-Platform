import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import CollaborationHub from './CollaborationHub'; // imported the child component

const ArrowLeftIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

export default function RepositoryDetails() {
  const { id } = useParams();
  const [activeView, setActiveView] = useState('overview');

  // Mock fetching repository details based on `id`
  const repo = {
    name: "React Task Manager",
    category: "Web Development",
    stars: 124,
    tech: ["React", "Firebase", "Tailwind CSS"],
    aiSummary: "This project is a React-based task manager application that uses Firebase for backend services. It supports authentication, task management, and real-time updates. The codebase is well-structured, making it easy for beginners to understand state management and cloud integrations.",
    setup: "1. Clone the repository.\n2. Run `npm install`.\n3. Add your Firebase config to `.env`.\n4. Run `npm start`.",
    issues: [
      { title: "Fix alignment on login button", diff: "Easy", match: "95%" },
      { title: "Implement dark mode toggle", diff: "Medium", match: "88%" },
    ]
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <ArrowLeftIcon /> Back to discover
      </Link>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm">
        
        {/* Repo Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
              <FolderIcon />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold">{repo.name}</h1>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{repo.category}</span>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-semibold rounded-xl hover:scale-105 transition-transform shadow-md">
            Clone Repository
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-800 mb-8 overflow-x-auto">
          {['overview', 'discussions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors whitespace-nowrap
                ${activeView === tab 
                  ? 'border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400' 
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic View Rendering */}
        {activeView === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
            <div className="lg:col-span-2 space-y-8">
              <section className="space-y-4">
                <h2 className="text-xl font-bold border-l-4 border-blue-500 pl-3">AI-Generated Summary</h2>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed bg-blue-50/50 dark:bg-gray-800/50 p-5 rounded-2xl border border-blue-100 dark:border-gray-700">
                  {repo.aiSummary}
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-bold border-l-4 border-indigo-500 pl-3">Setup Instructions</h2>
                <div className="bg-gray-900 text-gray-100 p-5 rounded-2xl overflow-x-auto font-mono text-sm leading-relaxed shadow-inner border border-gray-800">
                  <pre>{repo.setup}</pre>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {repo.tech.map((t, i) => (
                    <span key={i} className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                      {t}
                    </span>
                  ))}
                </div>
              </section>

              <section className="space-y-4 border-t border-gray-200 dark:border-gray-800 pt-6">
                <div className="flex justify-between items-center">
                   <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Suitable For You</h3>
                </div>
                <div className="space-y-3">
                  {repo.issues.map((issue, i) => (
                    <div key={i} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-400 cursor-pointer transition-colors shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-sm">{issue.title}</h4>
                        <span className="text-xs font-bold text-green-700 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">{issue.match} Match</span>
                      </div>
                      <span className="text-xs text-gray-500">{issue.diff} Difficulty</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {/* Render the local Collaboration Hub */}
            <CollaborationHub repoName={repo.name} />
          </div>
        )}

      </div>
    </div>
  );
}
