import { useState } from 'react';

const CheckCircleIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const user = {
  name: "Alex Developer",
  handle: "@alex_dev",
  bio: "Full-stack engineer passionate about open source and community building. Focusing on React, Node.js, and Vector Databases.",
  skills: ["React", "JavaScript", "Node.js", "Express", "Tailwind CSS"],
  stats: { repos: 14, prs: 56, issues: 112 },
  activity: [
    { type: "Merged PR", repo: "frontend-dashboard", time: "2 days ago", link: "#" },
    { type: "Opened Issue", repo: "express-api", time: "1 week ago", link: "#" },
    { type: "Commented", repo: "ai-search-engine", time: "2 weeks ago", link: "#" }
  ]
};

export default function Profile() {
  return (
    <div className="space-y-12 animate-fade-in-up max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm relative overflow-hidden">
        {/* Background Decorative Blob */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-indigo-500/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-lighten pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-gray-800 border-4 border-white dark:border-gray-900 shadow-xl flex items-center justify-center overflow-hidden">
            <UserIcon className="w-16 h-16" />
          </div>
          <div className="flex-1 text-center md:text-left space-y-4 pt-2">
            <div>
              <h1 className="text-3xl font-extrabold">{user.name}</h1>
              <p className="text-gray-500 font-medium">{user.handle}</p>
            </div>
            <p className="text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed">{user.bio}</p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
              {user.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-full border border-blue-200 dark:border-blue-800/50">
                  {skill}
                </span>
              ))}
            </div>
          </div>
          <button className="px-5 py-2 border-2 border-gray-200 dark:border-gray-700 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-indigo-500 pl-3">Stats Hub</h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Repositories</span>
              <span className="text-2xl font-bold">{user.stats.repos}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Pull Requests</span>
              <span className="text-2xl font-bold">{user.stats.prs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Issues Solved</span>
              <span className="text-2xl font-bold">{user.stats.issues}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-blue-500 pl-3">Recent Activity</h2>
          <div className="space-y-4">
            {user.activity.map((act, i) => (
              <div key={i} className="flex items-start space-x-4 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <div className="mt-1">
                  <CheckCircleIcon />
                </div>
                <div>
                  <h4 className="font-semibold">{act.type} <span className="text-gray-400 font-normal ml-1">in</span> <a href={act.link} className="text-blue-600 dark:text-blue-400 hover:underline">{act.repo}</a></h4>
                  <p className="text-sm text-gray-500 mt-1">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
