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
import CollaborationStudio from './pages/CollaborationStudio';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AppNav, AppMobileNav, AppUserMenu } from './components/auth/AppNav';
import StandaloneMeetLayout from './layouts/StandaloneMeetLayout.jsx';
import { MeetLayoutContext } from './layouts/meetLayoutContext.js';

import ThemeToggle from './components/ThemeToggle';
import { usePersistedTheme } from './hooks/usePersistedTheme.js';

function MainAppShell() {
  const { isDarkMode, toggleTheme } = usePersistedTheme();

  return (
    <MeetLayoutContext.Provider value={{ standalone: false }}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300 ease-in-out motion-reduce:transition-none">
        <nav className="sticky top-0 z-50 overflow-visible bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 transition-colors duration-300 motion-reduce:transition-none">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center h-[66px] md:h-[76px] gap-2 md:gap-3">
              <Link to="/" className="flex items-center gap-2 md:gap-2.5 cursor-pointer shrink-0 min-w-0">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl md:text-[1.375rem] shadow-sm shadow-blue-500/30">R</div>
                <span className="font-bold text-xl md:text-[1.4rem] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">RepoSense</span>
              </Link>

              <div className="hidden md:flex justify-center min-w-0">
                <AppNav />
              </div>

              <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
                <AppMobileNav />
                <AppUserMenu />
                <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} />
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
            <Route path="/collaboration" element={<ProtectedRoute><CollaborationStudio /></ProtectedRoute>} />
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
        <Route path="/meet/:id" element={<MeetingRoom />} />
        <Route path="/meetings/:id" element={<MeetingRoom />} />
      </Route>
      <Route path="*" element={<MainAppShell />} />
    </Routes>
  );
}
