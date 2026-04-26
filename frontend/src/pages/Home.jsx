import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SearchIcon = () => (
  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const categories = ["Web Development", "Machine Learning", "IoT", "DevOps", "Blockchain", "Cybersecurity"];

export default function Home() {
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load trending repos on initial mount
  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/trending');
      const data = await response.json();
      setRepositories(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error("Failed to fetch trending:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setRepositories(data.results || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setSearchQuery(cat);
    // Use the functional form to ensure we have the right query or just call search
    setTimeout(() => handleSearch(), 10);
  };

  return (
    <div className="space-y-16 animate-fade-in-up">
      {/* Semantic Search Hero */}
      <section className="text-center space-y-8 pt-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Discover Code by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">Meaning</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Stop guessing keywords. Describe what you want to build, and RepoSense's AI will find the perfect open-source project for you.
          </p>
        </div>
        
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-transform group-hover:scale-110">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-4 rounded-2xl border-0 shadow-lg text-gray-900 bg-white dark:bg-gray-800 dark:text-white ring-1 ring-inset ring-gray-200 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-300 transform group-hover:-translate-y-1"
            placeholder="Try searching: 'beginner friendly react project with firebase'"
          />
          <button 
            type="submit"
            disabled={isLoading}
            className="absolute inset-y-2 right-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-md transition-colors active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "..." : "Search"}
          </button>
        </form>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 pt-4">
          {categories.map((cat, idx) => (
            <span 
              key={idx} 
              onClick={() => handleCategoryClick(cat)}
              className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              {cat}
            </span>
          ))}
        </div>
      </section>

      {/* Repository Feed */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {hasSearched ? `Search Results for "${searchQuery}"` : "Recommended Repositories"}
          </h2>
          {isLoading && <div className="text-blue-500 animate-pulse font-medium">AI is thinking...</div>}
        </div>
        
        <div className="space-y-4 min-h-[400px]">
          {repositories.length > 0 ? (
            repositories.map((repo) => (
              <a href={repo.url} target="_blank" rel="noopener noreferrer" key={repo.id} className="block group">
                <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 group-hover:shadow-lg transition-all duration-300 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{repo.name}</h3>
                      <div className="flex items-center space-x-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                        <StarIcon />
                        <span>{repo.stars.toLocaleString()}</span>
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
                  </div>
                </div>
              </a>
            ))
          ) : !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <p className="text-lg">No repositories found in our index.</p>
              <p className="text-sm">Try searching for something else or run the crawler to add data.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
