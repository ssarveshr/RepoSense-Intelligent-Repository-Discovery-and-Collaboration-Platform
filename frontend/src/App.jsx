import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import RepositoryDetails from './pages/RepositoryDetails';
import Profile from './pages/Profile';
import GitHubSummarizer from './pages/GitHubSummarizer';
import ZoomRoom from './pages/ZoomRoom';
import AIAgentStudio from './pages/AIAgentStudio';
import MeetingRoom from './pages/MeetingRoom';
import MeetJoinPage from './pages/MeetJoinPage';
import MeetingsHub from './pages/MeetingsHub';
import CollaborationStudio from './pages/CollaborationStudio';
import StandaloneMeetLayout from './layouts/StandaloneMeetLayout.jsx';
import { MeetLayoutContext } from './layouts/meetLayoutContext.js';

import { SunIcon, MoonIcon } from './components/icons';

function MainAppShell() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Toggle theme logic
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Sync theme with HTML root for Tailwind variant
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <MeetLayoutContext.Provider value={{ standalone: false }}>
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-500 ease-in-out`}>
        {/* Navigation Layer */}
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">R</div>
                <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">RepoSense</span>
              </Link>
              <div className="hidden md:flex items-center space-x-6 text-sm font-medium">
                <Link to="/" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Discover</Link>
                <Link to="/github-summarizer" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">GitHub Summarizer</Link>
                <Link to="/ai-agent" className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                  <span>⚡ AI Code Agent</span>
                </Link>
                <Link to="/meetings" className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold hover:bg-blue-500/20 transition-all">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>WebRTC Meeting</span>
                </Link>
                <Link to="/profile" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">My Profile</Link>
              </div>
              <div className="flex items-center">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-500 overflow-hidden relative"
                  aria-label="Toggle Dark Mode"
                >
                  <div className={`transform transition-transform duration-500 ${isDarkMode ? 'rotate-[360deg] scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100'}`}>
                    <SunIcon />
                  </div>
                  <div className={`transform transition-transform duration-500 ${isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-[360deg] scale-0 opacity-0 absolute'}`}>
                    <MoonIcon />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content Area Routing */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/repo/:id" element={<RepositoryDetails />} />
            <Route path="/github-summarizer" element={<GitHubSummarizer />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ai-agent" element={<AIAgentStudio />} />
            <Route path="/meetings" element={<MeetingsHub />} />
            <Route path="/collaboration" element={<CollaborationStudio />} />
            <Route path="/zoom-meeting" element={<ZoomRoom />} />
            <Route path="/zoom-meeting/:meetingId" element={<ZoomRoom />} />
          </Routes>
        </main>
      </div>
    </MeetLayoutContext.Provider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<StandaloneMeetLayout />}>
        <Route path="/meet/join/:code" element={<MeetJoinPage />} />
        <Route path="/meet/:id" element={<MeetingRoom />} />
        <Route path="/meetings/:id" element={<MeetingRoom />} />
      </Route>
      <Route path="*" element={<MainAppShell />} />
    </Routes>
  );
}
