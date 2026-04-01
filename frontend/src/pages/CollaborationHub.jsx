import { useState } from 'react';

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

const mockDiscussions = [
  { id: 1, title: "How do I securely inject Firebase API keys?", author: "alex_dev", replies: 12, time: "2 hours ago", tags: ["Security", "Setup"] },
  { id: 2, title: "Best Practices to separate task context state", author: "sarah_frontend", replies: 8, time: "5 hours ago", tags: ["State Management", "React"] },
  { id: 3, title: "Is anyone else getting alignment errors on iOS Safari?", author: "mobile_tester", replies: 24, time: "1 day ago", tags: ["Bug", "UI"] }
];

export default function CollaborationHub({ repoName }) {
  const [activeTab, setActiveTab] = useState('trending');

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-extrabold pb-2">Discussions in {repoName}</h2>
          <p className="text-gray-600 dark:text-gray-400">Ask the maintainers and community for help.</p>
        </div>
        <button className="mt-4 md:mt-0 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all hover:-translate-y-0.5 shadow-md">
          New Discussion
        </button>
      </div>

      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        {['trending', 'latest', 'my_threads'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm transition-colors rounded-t-lg
              ${activeTab === tab 
                ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'}`}
          >
            {tab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {mockDiscussions.map((disc) => (
            <div key={disc.id} className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer shadow-sm mt-2">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold hover:text-blue-600 dark:hover:text-blue-400 transition-colors">{disc.title}</h3>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className="flex items-center space-x-1 shrink-0 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-xs font-semibold">
                      <UserIcon /> <span className="ml-1">{disc.author}</span>
                    </span>
                    <span>• {disc.time}</span>
                  </div>
                  <div className="flex gap-2">
                    {disc.tags.map((tag, i) => (
                      <span key={i} className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700">
                  <ChatBubbleIcon />
                  <span className="font-semibold text-sm">{disc.replies}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl border border-indigo-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-3">Repo Stats</h3>
            <ul className="space-y-3 text-sm font-medium">
              <li className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Active Contributors</span> <span className="text-gray-900 dark:text-white font-bold">14</span>
              </li>
              <li className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Open Discussions</span> <span className="text-gray-900 dark:text-white font-bold">42</span>
              </li>
              <li className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Resolved Questions</span> <span className="text-gray-900 dark:text-white font-bold">1,024</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
