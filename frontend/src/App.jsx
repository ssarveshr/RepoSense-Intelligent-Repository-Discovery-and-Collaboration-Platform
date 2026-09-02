import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import RepositoryDetails from './pages/RepositoryDetails';
import Profile from './pages/Profile';
import GitHubSummarizer from './pages/GitHubSummarizer';
import ZoomRoom from './pages/ZoomRoom';
import MeetingLobby from './components/meeting/MeetingLobby';
import MeetingRoom from './pages/MeetingRoom';
import MeetJoinPage from './pages/MeetJoinPage';
import MeetingsHub from './pages/MeetingsHub';
import AIAgentStudio from './pages/AIAgentStudio';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AppNav, AppUserMenu } from './components/auth/AppNav';
import StandaloneMeetLayout from './layouts/StandaloneMeetLayout.jsx';
import { MeetLayoutContext } from './layouts/meetLayoutContext.js';

import { SunIcon, MoonIcon } from './components/icons';

function MainAppShell() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <MeetLayoutContext.Provider value={{ standalone: false }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-500 ease-in-out">
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 transition-colors duration-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">R</div>
                <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">RepoSense</span>
              </Link>

              <AppNav />

              <div className="flex items-center gap-3">
                <AppUserMenu />
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

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute><MeetingsHub /></ProtectedRoute>} />
            <Route path="/github-summarizer" element={<ProtectedRoute><GitHubSummarizer /></ProtectedRoute>} />
            <Route path="/ai-agent" element={<ProtectedRoute><AIAgentStudio /></ProtectedRoute>} />
            <Route path="/repo/:id" element={<ProtectedRoute><RepositoryDetails /></ProtectedRoute>} />
            <Route path="/zoom-meeting" element={<ProtectedRoute><ZoomRoom /></ProtectedRoute>} />
            <Route path="/zoom-meeting/:meetingId" element={<ProtectedRoute><ZoomRoom /></ProtectedRoute>} />
            <Route path="/meeting-lobby-preview" element={<ProtectedRoute><MeetingLobby /></ProtectedRoute>} />
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
        <Route path="/meetings/:id" element={<MeetingRoom />} />
      </Route>
      <Route path="*" element={<MainAppShell />} />
    </Routes>
  );
}
