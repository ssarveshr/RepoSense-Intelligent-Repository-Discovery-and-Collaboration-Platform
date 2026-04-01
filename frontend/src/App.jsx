import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import RepositoryDetails from './pages/RepositoryDetails';
import Profile from './pages/Profile';

// --- Icons (Inline SVGs for simplicity & performance) ---
const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

function App() {
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
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-500 ease-in-out`}>
      {/* Navigation Layer */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200 dark:border-gray-800 transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">R</div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">RepoSense</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8 text-sm font-medium">
              <Link to="/" className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors">Discover</Link>
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
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
