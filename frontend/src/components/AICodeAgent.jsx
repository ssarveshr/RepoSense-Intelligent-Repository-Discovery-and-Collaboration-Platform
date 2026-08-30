import React, { useState } from 'react';

const defaultPythonCode = `def process_user_data(users):\n    # Calculate summary statistics\n    total_age = 0\n    results = []\n    for u in users:\n        total_age += u['age']\n        results.append(f"User: {u['name']}, Age: {u['age']}")\n    \n    avg_age = total_age / len(users)\n    print(f"Processed {len(users)} users. Average age: {avg_age:.1f}")\n    return results\n\nsample_data = [\n    {"name": "Alice", "age": 28},\n    {"name": "Bob", "age": 34},\n    {"name": "Charlie", "age": 22}\n]\n\noutput = process_user_data(sample_data)\nprint("Results:", output)`;

const defaultJSCode = `function calculateMetrics(items) {\n  let total = 0;\n  const processed = [];\n  \n  items.forEach(item => {\n    total += item.price * item.quantity;\n    processed.push({\n      id: item.id,\n      subtotal: item.price * item.quantity\n    });\n  });\n  \n  console.log("Total Order Value: $" + total.toFixed(2));\n  return { total, processed };\n}\n\nconst inventory = [\n  { id: "A1", price: 19.99, quantity: 3 },\n  { id: "B2", price: 49.50, quantity: 1 }\n];\n\nconst summary = calculateMetrics(inventory);\nconsole.log("Summary:", JSON.stringify(summary, null, 2));`;

export default function AICodeAgent({ initialCode, initialLanguage = "python", initialRepoUrl = "" }) {
  // Main view mode: "sandbox" | "repo_audit"
  const [viewMode, setViewMode] = useState(initialRepoUrl ? "repo_audit" : "sandbox");

  // Code Sandbox State
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialCode || (initialLanguage === "javascript" ? defaultJSCode : defaultPythonCode));
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [activeTab, setActiveTab] = useState("console"); // "console" | "diff" | "explanation"

  // Repository Bug Auditor State
  const [repoUrl, setRepoUrl] = useState(initialRepoUrl || "https://github.com/ssarveshr/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform");
  const [isScanningRepo, setIsScanningRepo] = useState(false);
  const [repoBugsResult, setRepoBugsResult] = useState(null);
  const [bugFilter, setBugFilter] = useState("ALL"); // "ALL" | "HIGH" | "MEDIUM" | "Security Vulnerability"
  const [expandedBugId, setExpandedBugId] = useState(null);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    if (!initialCode) {
      setCode(newLang === "javascript" ? defaultJSCode : defaultPythonCode);
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setRunResult(null);
    try {
      const response = await fetch("http://localhost:8000/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });
      const data = await response.json();
      setRunResult(data);
      setActiveTab("console");
    } catch (err) {
      setRunResult({
        status: "error",
        stdout: "",
        stderr: `Failed to connect to AI Agent backend: ${err.message}. Ensure backend is running on port 8000.`,
        duration_ms: 0,
        exit_code: -1
      });
      setActiveTab("console");
    } finally {
      setIsRunning(false);
    }
  };

  const handleAIAction = async (actionType, customPrompt = "") => {
    setIsModifying(true);
    setAiResult(null);
    try {
      const response = await fetch("http://localhost:8000/api/agent/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          prompt: customPrompt || prompt,
          action: actionType,
          language
        })
      });
      const data = await response.json();
      setAiResult(data);
      setActiveTab("diff");
    } catch (err) {
      setAiResult({
        status: "error",
        explanation: `Failed to trigger AI modification: ${err.message}`,
        suggestions: []
      });
    } finally {
      setIsModifying(false);
    }
  };

  const explainCode = async () => {
    setIsModifying(true);
    try {
      const response = await fetch("http://localhost:8000/api/agent/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language })
      });
      const data = await response.json();
      setAiResult({
        status: "success",
        modified_code: code,
        explanation: data.overview || data.summary,
        complexity: data.complexity,
        logic_steps: data.logic_steps || [],
        suggestions: data.recommendations || []
      });
      setActiveTab("explanation");
    } catch (err) {
      setAiResult({ status: "error", explanation: err.message, suggestions: [] });
    } finally {
      setIsModifying(false);
    }
  };

  const applyChanges = () => {
    if (aiResult && aiResult.modified_code) {
      setCode(aiResult.modified_code);
      setAiResult(null);
      setActiveTab("console");
    }
  };

  // Repo Bug Scanner Handler
  const scanRepoBugs = async (targetUrl = repoUrl) => {
    if (!targetUrl.trim()) return;
    setIsScanningRepo(true);
    setRepoBugsResult(null);
    try {
      const response = await fetch("http://localhost:8000/api/agent/scan-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ github_url: targetUrl })
      });
      const data = await response.json();
      setRepoBugsResult(data);
      if (data.bugs && data.bugs.length > 0) {
        setExpandedBugId(data.bugs[0].id);
      }
    } catch (err) {
      setRepoBugsResult({
        status: "error",
        message: `Failed to audit repository: ${err.message}`
      });
    } finally {
      setIsScanningRepo(false);
    }
  };

  // 1-Click Apply Suggested Bug Fix to Code Sandbox
  const applyBugFixToSandbox = (bug) => {
    setCode(bug.suggested_fix);
    setLanguage(bug.language || "python");
    setViewMode("sandbox");
    setActiveTab("console");
  };

  // 1-Click Run & Verify Bug Fix in Runner
  const runAndVerifyBugFix = async (bug) => {
    setCode(bug.suggested_fix);
    setLanguage(bug.language || "python");
    setViewMode("sandbox");
    setIsRunning(true);
    setRunResult(null);
    setActiveTab("console");

    try {
      const response = await fetch("http://localhost:8000/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: bug.suggested_fix, language: bug.language || "python" })
      });
      const data = await response.json();
      setRunResult(data);
    } catch (err) {
      setRunResult({
        status: "error",
        stdout: "",
        stderr: err.message,
        duration_ms: 0,
        exit_code: -1
      });
    } finally {
      setIsRunning(false);
    }
  };

  const filteredBugs = repoBugsResult?.bugs
    ? repoBugsResult.bugs.filter((b) => {
        if (bugFilter === "ALL") return true;
        if (bugFilter === "HIGH") return b.severity === "HIGH";
        if (bugFilter === "MEDIUM") return b.severity === "MEDIUM";
        if (bugFilter === "Security Vulnerability") return b.category === "Security Vulnerability";
        return true;
      })
    : [];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Top Header Bar & Mode Toggle */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/30">
            ⚡
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-gray-900 dark:text-white flex items-center gap-2">
              RepoSense AI Code Agent
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-bold">
                Repo Bug Scanner & Runner
              </span>
            </h3>
            <p className="text-xs text-gray-500">Find bugs in chosen repositories, suggest fixes, run code live, & patch diffs</p>
          </div>
        </div>

        {/* Mode Switcher Pills */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700/60">
          <button
            onClick={() => setViewMode("sandbox")}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all ${
              viewMode === "sandbox"
                ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-md"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            ⚡ Live Code Sandbox & Runner
          </button>
          <button
            onClick={() => {
              setViewMode("repo_audit");
              if (!repoBugsResult && !isScanningRepo) scanRepoBugs();
            }}
            className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 ${
              viewMode === "repo_audit"
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-md"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <span>🔍 Audit Chosen Repo Bugs</span>
            {repoBugsResult?.total_bugs > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px]">
                {repoBugsResult.total_bugs}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MODE 1: REPOSITORY BUG AUDITOR */}
      {viewMode === "repo_audit" ? (
        <div className="space-y-6 animate-fade-in-up">
          {/* Repo Input Bar & Quick Presets */}
          <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span>Select Repository to Audit for Bugs & Fixes</span>
              </label>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-gray-400 font-bold self-center">Presets:</span>
                {[
                  { name: "Current RepoSense", url: "https://github.com/ssarveshr/RepoSense-Intelligent-Repository-Discovery-and-Collaboration-Platform" },
                  { name: "facebook/react", url: "https://github.com/facebook/react" },
                  { name: "fastapi/fastapi", url: "https://github.com/fastapi/fastapi" }
                ].map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setRepoUrl(p.url); scanRepoBugs(p.url); }}
                    className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-blue-500 hover:text-white transition-all"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && scanRepoBugs()}
                placeholder="Enter GitHub Repository URL (e.g. https://github.com/owner/repo)..."
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => scanRepoBugs()}
                disabled={isScanningRepo || !repoUrl.trim()}
                className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl shadow-lg transition-all flex items-center space-x-2 shrink-0 disabled:opacity-50"
              >
                {isScanningRepo ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Auditing Repo...</span>
                  </>
                ) : (
                  <>
                    <span>🔍 Audit Repo Bugs</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audit Results Dashboard */}
          {repoBugsResult && (
            <div className="space-y-6">
              {repoBugsResult.status === "error" ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl">
                  {repoBugsResult.message}
                </div>
              ) : (
                <>
                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 rounded-2xl">
                      <p className="text-xs font-bold text-gray-500 uppercase">Target Repository</p>
                      <p className="text-lg font-black text-gray-900 dark:text-white truncate mt-1">{repoBugsResult.repo_name}</p>
                    </div>

                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                      <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">High Severity Bugs</p>
                      <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{repoBugsResult.high_count}</p>
                    </div>

                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Medium Severity</p>
                      <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{repoBugsResult.medium_count}</p>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Total Detected Bugs</p>
                      <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{repoBugsResult.total_bugs}</p>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
                    {[
                      { id: "ALL", label: `All Bugs (${repoBugsResult.bugs.length})` },
                      { id: "HIGH", label: `🔴 High Severity (${repoBugsResult.high_count})` },
                      { id: "MEDIUM", label: `🟡 Medium Severity (${repoBugsResult.medium_count})` },
                      { id: "Security Vulnerability", label: `🛡️ Security Flaws` }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setBugFilter(f.id)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          bugFilter === f.id
                            ? "bg-blue-600 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Bug List */}
                  <div className="space-y-4">
                    {filteredBugs.map((bug) => (
                      <div
                        key={bug.id}
                        className={`bg-white dark:bg-gray-900 border rounded-2xl p-6 shadow-md transition-all ${
                          bug.severity === 'HIGH'
                            ? 'border-red-500/40 hover:border-red-500'
                            : bug.severity === 'MEDIUM'
                            ? 'border-amber-500/40 hover:border-amber-500'
                            : 'border-blue-500/40 hover:border-blue-500'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                          <div>
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                bug.severity === 'HIGH' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                                bug.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                              }`}>
                                {bug.severity}
                              </span>
                              <span className="px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold">
                                {bug.category}
                              </span>
                              <span className="text-xs font-mono text-gray-500">
                                📁 {bug.file} (Line {bug.line_number})
                              </span>
                            </div>

                            <h4 className="font-extrabold text-lg text-gray-900 dark:text-white">
                              {bug.title}
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2 shrink-0">
                            <button
                              onClick={() => applyBugFixToSandbox(bug)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-1"
                            >
                              <span>⚡ Load Fix to Sandbox</span>
                            </button>

                            <button
                              onClick={() => runAndVerifyBugFix(bug)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center space-x-1"
                            >
                              <span>▶️ Run & Verify Fix</span>
                            </button>
                          </div>
                        </div>

                        {/* Description & Explanation */}
                        <div className="py-4 space-y-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            <span className="font-bold text-gray-900 dark:text-white">Risk Analysis: </span>
                            {bug.description}
                          </p>

                          <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-xl text-xs text-emerald-300">
                            <span className="font-bold text-emerald-400">AI Suggested Resolution: </span>
                            {bug.explanation}
                          </div>

                          {/* Buggy Code vs Fixed Code Side-by-Side */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono text-xs pt-2">
                            <div className="bg-gray-950 rounded-xl p-3 border border-red-900/50">
                              <div className="text-red-400 font-bold mb-2 pb-1 border-b border-red-900/50">❌ Buggy Code ({bug.file})</div>
                              <pre className="text-red-300 whitespace-pre-wrap">{bug.buggy_code}</pre>
                            </div>

                            <div className="bg-gray-950 rounded-xl p-3 border border-emerald-900/50">
                              <div className="text-emerald-400 font-bold mb-2 pb-1 border-b border-emerald-900/50">✅ AI Proposed Fix</div>
                              <pre className="text-emerald-300 whitespace-pre-wrap">{bug.suggested_fix}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        /* MODE 2: CODE SANDBOX & RUNNER */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Code Editor & AI Actions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>Source Code ({language})</span>
              <div className="flex items-center gap-3">
                <select
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-900 dark:text-white outline-none"
                >
                  <option value="python">Python 3.x</option>
                  <option value="javascript">JavaScript (Node)</option>
                </select>
                <span className="text-gray-400">{code.split('\n').length} lines</span>
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-950 font-mono text-sm shadow-inner">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={16}
                spellCheck="false"
                className="w-full p-4 bg-transparent text-emerald-400 focus:outline-none resize-none leading-relaxed tracking-wide selection:bg-blue-500 selection:text-white"
                placeholder="Type or paste your code here..."
              />
            </div>

            {/* Run Button & Toolbar */}
            <div className="flex justify-between items-center pt-1">
              <button
                onClick={runCode}
                disabled={isRunning}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-xl shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Run Code Snippet</span>
                  </>
                )}
              </button>

              <button
                onClick={() => { setViewMode("repo_audit"); scanRepoBugs(); }}
                className="px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl border border-blue-500/30 transition-all"
              >
                🔍 Audit Repo for Bugs
              </button>
            </div>

            {/* AI Quick Actions Toolbar */}
            <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Code Actions</div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => handleAIAction("fix", "Fix runtime errors and add exception safety")}
                  disabled={isModifying}
                  className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>⚡ Fix Bugs</span>
                </button>

                <button
                  onClick={() => handleAIAction("refactor", "Clean code structure and add comments")}
                  disabled={isModifying}
                  className="p-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>🎨 Refactor</span>
                </button>

                <button
                  onClick={() => handleAIAction("optimize", "Optimize performance and O(1) memory")}
                  disabled={isModifying}
                  className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>🚀 Optimize</span>
                </button>

                <button
                  onClick={explainCode}
                  disabled={isModifying}
                  className="p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5"
                >
                  <span>📝 Explain</span>
                </button>
              </div>

              {/* Custom AI Prompt Request Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAIAction("custom", prompt)}
                  placeholder="Ask AI Agent to make custom code changes (e.g. 'Add async handling')..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => handleAIAction("custom", prompt)}
                  disabled={isModifying || !prompt.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  {isModifying ? "AI Processing..." : "Modify"}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Terminal Console, AI Diff & Explanation */}
          <div className="flex flex-col h-full space-y-4">
            {/* Navigation Tabs */}
            <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 pb-1">
              <button
                onClick={() => setActiveTab("console")}
                className={`px-4 py-2 font-bold text-xs rounded-t-lg transition-colors flex items-center space-x-1.5 ${
                  activeTab === "console"
                    ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <span>💻 Terminal Output</span>
                {runResult && (
                  <span className={`w-2 h-2 rounded-full ${runResult.status === "success" ? "bg-emerald-500" : "bg-red-500"}`}></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("diff")}
                className={`px-4 py-2 font-bold text-xs rounded-t-lg transition-colors flex items-center space-x-1.5 ${
                  activeTab === "diff"
                    ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <span>✨ AI Code Changes & Diff</span>
                {aiResult?.diff && <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full font-extrabold">NEW</span>}
              </button>

              <button
                onClick={() => setActiveTab("explanation")}
                className={`px-4 py-2 font-bold text-xs rounded-t-lg transition-colors ${
                  activeTab === "explanation"
                    ? "border-b-2 border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <span>🔍 AI Analysis</span>
              </button>
            </div>

            {/* Tab 1: Terminal Execution Console */}
            {activeTab === "console" && (
              <div className="flex-1 flex flex-col bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden font-mono text-xs">
                <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800 text-gray-400">
                  <span className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="ml-2 text-gray-300 font-semibold">Console Output</span>
                  </span>

                  {runResult && (
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-gray-400">Time: {runResult.duration_ms}ms</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${runResult.exit_code === 0 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-red-900/60 text-red-300'}`}>
                        Exit Code: {runResult.exit_code}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px]">
                  {!runResult ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 py-12">
                      <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-gray-500">Click "Run Code Snippet" above to execute this code live.</p>
                    </div>
                  ) : (
                    <>
                      {runResult.stdout && (
                        <div>
                          <div className="text-emerald-400 font-bold mb-1">[STDOUT]</div>
                          <pre className="text-gray-200 whitespace-pre-wrap leading-relaxed">{runResult.stdout}</pre>
                        </div>
                      )}

                      {runResult.stderr && (
                        <div>
                          <div className="text-red-400 font-bold mb-1">[STDERR]</div>
                          <pre className="text-red-300 whitespace-pre-wrap leading-relaxed bg-red-950/40 p-2.5 rounded-lg border border-red-900/40">{runResult.stderr}</pre>
                        </div>
                      )}

                      {!runResult.stdout && !runResult.stderr && (
                        <p className="text-gray-500 italic">Program executed cleanly with no standard output.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: AI Code Changes & Line Diff */}
            {activeTab === "diff" && (
              <div className="flex-1 flex flex-col bg-gray-950 rounded-2xl border border-gray-800 overflow-hidden font-mono text-xs">
                <div className="bg-gray-900 px-4 py-2 flex items-center justify-between border-b border-gray-800">
                  <span className="font-bold text-gray-300">Proposed Code Diff</span>
                  {aiResult?.modified_code && (
                    <button
                      onClick={applyChanges}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-all shadow-md flex items-center space-x-1"
                    >
                      <span>Apply Changes to Code</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-y-auto min-h-[300px] space-y-4">
                  {!aiResult ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 py-12">
                      <p className="text-gray-500">Click any AI action button (⚡ Fix, 🎨 Refactor, 🚀 Optimize) to generate code modifications.</p>
                    </div>
                  ) : (
                    <>
                      {aiResult.explanation && (
                        <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl text-blue-200">
                          <span className="font-bold text-blue-400">AI Change Notes: </span>
                          <span>{aiResult.explanation}</span>
                        </div>
                      )}

                      {aiResult.diff ? (
                        <pre className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {aiResult.diff.split('\n').map((line, idx) => {
                            let style = "text-gray-400";
                            if (line.startsWith('+')) style = "text-emerald-400 bg-emerald-950/50 px-1 rounded";
                            if (line.startsWith('-')) style = "text-red-400 bg-red-950/50 px-1 rounded";
                            if (line.startsWith('@@')) style = "text-cyan-400 font-bold";
                            return <div key={idx} className={style}>{line}</div>;
                          })}
                        </pre>
                      ) : (
                        <div className="p-4 text-gray-400">No structural diff detected.</div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: AI Code Analysis */}
            {activeTab === "explanation" && (
              <div className="flex-1 p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-y-auto space-y-4 text-sm">
                <h4 className="font-bold text-gray-900 dark:text-white text-base flex items-center justify-between">
                  <span>AI Code Architecture & Logic Analysis</span>
                  {aiResult?.complexity && (
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-mono font-bold border border-purple-300 dark:border-purple-800/50">
                      {aiResult.complexity}
                    </span>
                  )}
                </h4>
                {aiResult?.explanation ? (
                  <div className="space-y-4">
                    {/* Code Functionality Overview */}
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      <h5 className="font-bold text-gray-900 dark:text-white mb-1.5 text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Code Functionality Overview
                      </h5>
                      <p className="leading-relaxed text-sm font-normal">{aiResult.explanation}</p>
                    </div>

                    {/* Step-by-Step Logic Walkthrough */}
                    {aiResult.logic_steps && aiResult.logic_steps.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h5 className="font-bold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Step-by-Step Logic Walkthrough
                        </h5>
                        <ul className="space-y-2">
                          {aiResult.logic_steps.map((step, idx) => (
                            <li key={idx} className="flex items-start space-x-2 text-xs text-gray-700 dark:text-gray-300">
                              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Enhancements */}
                    {aiResult.suggestions && aiResult.suggestions.length > 0 && (
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                        <h5 className="font-bold text-gray-900 dark:text-white mb-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Recommended Enhancements & Optimizations
                        </h5>
                        <ul className="space-y-2">
                          {aiResult.suggestions.map((sug, i) => (
                            <li key={i} className="flex items-start space-x-2 text-xs text-gray-700 dark:text-gray-300">
                              <span className="text-emerald-500 font-bold text-sm">✓</span>
                              <span className="leading-relaxed">{sug}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs">Click "📝 Explain" to get detailed AI feedback on code logic, complexity analysis, and optimization recommendations.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
