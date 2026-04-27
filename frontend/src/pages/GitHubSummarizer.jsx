import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { summarizeRepo } from '../services/api';

const GitHubSummarizer = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateGitHubUrl = (url) => {
    const pattern = /^https?:\/\/github\.com\/[^/]+\/[^/]+/;
    return pattern.test(url);
  };

  const handleSummarize = async () => {
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    if (!validateGitHubUrl(githubUrl)) {
      setError('Invalid GitHub URL. Please use format: https://github.com/owner/repo');
      return;
    }

    setLoading(true);
    setError('');
    setSummary(null);

    try {
      const data = await summarizeRepo(githubUrl);

      if (data.status === 'error') {
        setError(data.message || 'Failed to analyze repository');
      } else {
        setSummary(data.summary);
      }
    } catch (err) {
      setError('Failed to connect to backend. Make sure the server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSummarize();
    }
  };

  const examples = [
    'https://github.com/facebook/react',
    'https://github.com/microsoft/vscode',
    'https://github.com/tensorflow/tensorflow'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="mb-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            GitHub Repository Summarizer
          </h1>
          <p className="text-lg text-gray-600">
            Analyze any GitHub repository instantly without cloning
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            GitHub Repository URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://github.com/owner/repository"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <button
              onClick={handleSummarize}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Analyzing...' : 'Summarize'}
            </button>
          </div>
          
          {/* Example URLs */}
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-2">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => setGithubUrl(example)}
                  className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"
                >
                  {example.split('/').slice(-2).join('/')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg mb-8">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Fetching repository data from GitHub...</p>
            <p className="text-sm text-gray-500 mt-2">
              This may take a moment while we analyze the codebase
            </p>
          </div>
        )}

        {/* Summary Results */}
        {summary && !loading && (
          <div className="space-y-6">
            {/* Repository Overview */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                  Repository Overview
                </h2>
                {summary.stars && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-gray-700">{summary.stars.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{summary.name}</h3>
                {summary.description && (
                  <p className="text-gray-600 mb-3">{summary.description}</p>
                )}
                {summary.language && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {summary.language}
                  </span>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Purpose</h4>
                <p className="text-gray-700 leading-relaxed">{summary.purpose}</p>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-3"></span>
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {summary.tech_stack && summary.tech_stack.length > 0 ? (
                  summary.tech_stack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200"
                    >
                      {tech}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-500">No tech stack detected</p>
                )}
              </div>
            </div>

            {/* Architecture */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-purple-600 rounded-full mr-3"></span>
                Architecture Overview
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {summary.architecture}
              </p>
            </div>

            {/* How to Run */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-orange-600 rounded-full mr-3"></span>
                How to Run
              </h2>
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {summary.how_to_run}
                </p>
              </div>
            </div>

            {/* Key Components */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-3"></span>
                Key Components
              </h2>
              <ul className="space-y-3">
                {summary.key_components && summary.key_components.length > 0 ? (
                  summary.key_components.map((component, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700">{component}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No key components identified</p>
                )}
              </ul>
            </div>

            {/* Dependencies */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-teal-600 rounded-full mr-3"></span>
                Dependencies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.dependencies && summary.dependencies.length > 0 ? (
                  summary.dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-gray-50 rounded-lg text-sm text-gray-700 border border-gray-200"
                    >
                      {dep}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 col-span-2">No dependencies detected</p>
                )}
              </div>
            </div>

            {/* License */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-yellow-600 rounded-full mr-3"></span>
                License
              </h2>
              <p className="text-gray-700 font-medium">{summary.license}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubSummarizer;
