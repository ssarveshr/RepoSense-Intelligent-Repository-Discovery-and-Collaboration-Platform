import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SearchIcon, StarIcon } from '../components/icons';
import { fetchTrending, searchRepositories } from '../services/api';
import { useProfileAuth } from '../providers/profileAuthContext.js';

const categories = ["Web Development", "Machine Learning", "IoT", "DevOps", "Blockchain", "Cybersecurity"];

const SEARCH_ERROR_MESSAGE = 'Search could not be completed. Please try again.';
const TRENDING_ERROR_MESSAGE = 'Recommended repositories could not be loaded. Please try again.';

export default function Home() {
  const { clerkEnabled, isLoaded, isSignedIn } = useProfileAuth();
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const [errorKind, setErrorKind] = useState(null);
  const searchInFlight = useRef(false);
  const requestSeq = useRef(0);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    if (searchInFlight.current) return;
    const requestId = ++requestSeq.current;
    setIsLoading(true);
    setError('');
    setErrorKind(null);
    try {
      const data = await fetchTrending();
      if (requestId !== requestSeq.current) return;
      if (data && !Array.isArray(data) && data.error) {
        setRepositories([]);
        setError(TRENDING_ERROR_MESSAGE);
        setErrorKind('trending');
        return;
      }
      setRepositories(Array.isArray(data) ? data : (data.results || []));
    } catch {
      if (requestId !== requestSeq.current) return;
      setRepositories([]);
      setError(TRENDING_ERROR_MESSAGE);
      setErrorKind('trending');
    } finally {
      if (requestId === requestSeq.current) {
        setIsLoading(false);
      }
    }
  };

  const runSearch = async (query) => {
    const nextQuery = (query || '').trim();
    if (!nextQuery || searchInFlight.current) return;

    searchInFlight.current = true;
    const requestId = ++requestSeq.current;
    setSearchQuery(nextQuery);
    setIsSearching(true);
    setIsLoading(true);
    setHasSearched(true);
    setError('');
    setErrorKind(null);

    try {
      const data = await searchRepositories(nextQuery);
      if (requestId !== requestSeq.current) return;
      if (data?.error) {
        setRepositories([]);
        setError(SEARCH_ERROR_MESSAGE);
        setErrorKind('search');
        return;
      }
      setRepositories(data.results || []);
    } catch {
      if (requestId !== requestSeq.current) return;
      setRepositories([]);
      setError(SEARCH_ERROR_MESSAGE);
      setErrorKind('search');
    } finally {
      if (requestId === requestSeq.current) {
        searchInFlight.current = false;
        setIsSearching(false);
        setIsLoading(false);
      }
    }
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    runSearch(searchQuery);
  };

  const handleCategorySearch = (category) => {
    runSearch(category);
  };

  const handleRetry = () => {
    if (errorKind === 'search') {
      runSearch(searchQuery);
      return;
    }
    loadTrending();
  };

  const showEmpty = !isLoading && !error && repositories.length === 0;

  return (
    <div className="space-y-16 animate-fade-in-up">
      <section className="text-center space-y-8 pt-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto">
            Discover Code by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Meaning</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Stop guessing keywords. Describe what you want to build, and RepoSense's AI will find the perfect open-source project for you.
          </p>
          {clerkEnabled && isLoaded && !isSignedIn && (
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                to="/sign-in"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
        
        <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-28 py-4 rounded-2xl border-0 shadow-sm text-gray-900 bg-white dark:bg-gray-800 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-shadow"
            placeholder="Try searching: 'beginner friendly react project with firebase'"
            aria-label="Search repositories"
          />
          <button 
            type="submit"
            disabled={isSearching}
            aria-busy={isSearching}
            className="absolute inset-y-2 right-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors active:scale-95 motion-reduce:active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "Searching" : "Search"}
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorySearch(cat)}
              disabled={isSearching}
              aria-label={`Search category ${cat}`}
              className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {hasSearched ? `Search Results for "${searchQuery}"` : "Recommended Repositories"}
          </h2>
          {isLoading && (
            <div className="text-blue-500 animate-pulse motion-reduce:animate-none font-medium" aria-live="polite">
              {hasSearched ? 'Searching…' : 'Loading recommended repositories…'}
            </div>
          )}
        </div>

        {error && !isLoading && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-6 py-5 text-left"
          >
            <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-3 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="space-y-4 min-h-[400px]">
          {repositories.length > 0 ? (
            repositories.map((repo) => (
              <article
                key={repo.id || repo.url || repo.name}
                className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row gap-6"
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{repo.name}</h3>
                    <div className="flex items-center space-x-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                      <StarIcon />
                      <span>{Number(repo.stars || 0).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-block px-3 py-1 text-xs font-semibold text-indigo-800 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full">
                      {repo.category}
                    </div>
                    {repo.match_score && (
                       <div className="inline-block px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                       {Math.round(repo.match_score * 100)}% Match
                     </div>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                    {repo.description}
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    {repo.url ? (
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                      >
                        View on GitHub
                      </a>
                    ) : null}
                    {isSignedIn && repo.url ? (
                      <Link
                        to="/github-summarizer"
                        state={{ githubUrl: repo.url }}
                        className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-sm"
                      >
                        Analyze with GitHub Summarizer
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          ) : showEmpty && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400">
              <p className="text-lg">No repositories found in our index.</p>
              <p className="text-sm">Try searching for something else or run the crawler to add data.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
