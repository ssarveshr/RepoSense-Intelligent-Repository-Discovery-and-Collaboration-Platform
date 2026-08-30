import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { summarizeRepo } from '../services/api';

const GitHubSummarizer = () => {
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [fileFilter, setFileFilter] = useState('');
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
    setFileFilter('');

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

  const filteredFiles = summary?.project_file_analysis?.filter(item => {
    if (!fileFilter.trim()) return true;
    const q = fileFilter.toLowerCase();
    return item.file.toLowerCase().includes(q) || item.role.toLowerCase().includes(q) || (item.insights && item.insights.toLowerCase().includes(q));
  }) || [];

  return (
    <div className="py-4 px-4 bg-transparent">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate('/')}
            className="mb-6 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Home
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            GitHub Repository Summarizer
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Deep architectural & multi-file codebase analysis of any GitHub repository
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 mb-8 border border-gray-100 dark:border-gray-800">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            GitHub Repository URL
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="https://github.com/owner/repository"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
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
                  className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400 transition"
                >
                  {example.split('/').slice(-2).join('/')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-lg mb-8">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-12 text-center border border-gray-100 dark:border-gray-800">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">Performing deep file-by-file codebase analysis...</p>
            <p className="text-sm text-gray-500 mt-2">
              Iterating through repository files, inspecting source code, and extracting API endpoints
            </p>
          </div>
        )}

        {/* Summary Results */}
        {summary && !loading && (
          <div className="space-y-6">
            {/* Repository Overview */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <span className="w-2.5 h-2.5 bg-blue-600 rounded-full mr-3"></span>
                  Repository Overview
                </h2>
                {summary.stars !== undefined && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{summary.stars.toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{summary.name}</h3>
                  {summary.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{summary.description}</p>
                  )}
                  {summary.language && (
                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {summary.language}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate('/ai-agent', { state: { repoUrl: githubUrl } })}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center space-x-2 shrink-0"
                >
                  <span>⚡ Audit Repo Bugs with AI Agent</span>
                </button>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Purpose & Objective</h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-normal">{summary.purpose}</p>
                </div>
                {summary.best_for && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Target Audience</h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{summary.best_for}</p>
                  </div>
                )}
                {summary.difficulty && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Contribution Difficulty</h4>
                    <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider">
                      {summary.difficulty}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Complete Project Files Analysis */}
            {summary.project_file_analysis && summary.project_file_analysis.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                      <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full mr-3"></span>
                      Project Files Walkthrough
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Comprehensive breakdown of all inspected files, modules, and configurations across the repository.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800/50 shrink-0">
                    {filteredFiles.length} of {summary.project_file_analysis.length} Files Analyzed
                  </span>
                </div>

                {/* Filter Input */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={fileFilter}
                    onChange={(e) => setFileFilter(e.target.value)}
                    placeholder="Search files by path, role, or exported symbols..."
                    className="w-full px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  />
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200/80 dark:border-gray-700/60 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/50">
                            {item.file}
                          </code>
                          {item.lines && (
                            <span className="text-xs text-gray-400 font-mono">
                              ({item.lines} lines)
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {item.role}
                        </p>
                      </div>
                      {item.insights && (
                        <div className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 shrink-0 md:max-w-xs font-mono">
                          {item.insights}
                        </div>
                      )}
                    </div>
                  ))}
                  {filteredFiles.length === 0 && (
                    <p className="text-center py-6 text-sm text-gray-500">No files matched your filter query.</p>
                  )}
                </div>
              </div>
            )}

            {/* Detected API Endpoints & Routes */}
            {summary.api_endpoints && summary.api_endpoints.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-3"></span>
                  Detected API Endpoints & Routes ({summary.api_endpoints.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                  {summary.api_endpoints.map((ep, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                          ep.method === 'GET' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                          ep.method === 'POST' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {ep.method}
                        </span>
                        <code className="text-sm font-mono text-gray-800 dark:text-gray-200">
                          {ep.path}
                        </code>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        {ep.source_file}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Environment Variables */}
            {summary.env_vars && summary.env_vars.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-3"></span>
                  Required Environment Variables
                </h2>
                <div className="flex flex-wrap gap-2">
                  {summary.env_vars.map((v, idx) => (
                    <code
                      key={idx}
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs font-mono font-semibold"
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* Tech Stack */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-2.5 h-2.5 bg-green-600 rounded-full mr-3"></span>
                Tech Stack
              </h2>
              <div className="flex flex-wrap gap-2">
                {summary.tech_stack && summary.tech_stack.length > 0 ? (
                  summary.tech_stack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-100 dark:from-emerald-950/40 dark:to-green-900/40 text-green-700 dark:text-emerald-300 rounded-full text-sm font-semibold border border-green-200 dark:border-emerald-800/50"
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-2.5 h-2.5 bg-purple-600 rounded-full mr-3"></span>
                Architecture Overview
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {summary.architecture}
              </p>
            </div>

            {/* How to Run */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-2.5 h-2.5 bg-orange-600 rounded-full mr-3"></span>
                How to Run
              </h2>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-mono text-sm">
                  {summary.how_to_run}
                </p>
              </div>
            </div>

            {/* Contributing Guide */}
            {summary.contributing_guide && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-2.5 h-2.5 bg-pink-600 rounded-full mr-3"></span>
                  Contributing Guide
                </h2>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {summary.contributing_guide}
                  </p>
                </div>
              </div>
            )}

            {/* Key Components */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full mr-3"></span>
                Key Component Folders
              </h2>
              <ul className="space-y-3">
                {summary.key_components && summary.key_components.length > 0 ? (
                  summary.key_components.map((component, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                    >
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                      <span className="text-gray-700 dark:text-gray-300 font-mono text-sm">{component}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-500">No key components identified</p>
                )}
              </ul>
            </div>

            {/* Dependencies */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-2.5 h-2.5 bg-teal-600 rounded-full mr-3"></span>
                Dependencies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.dependencies && summary.dependencies.length > 0 ? (
                  summary.dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-mono"
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
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <span className="w-2.5 h-2.5 bg-yellow-600 rounded-full mr-3"></span>
                License
              </h2>
              <p className="text-gray-700 dark:text-gray-300 font-medium">{summary.license}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubSummarizer;
