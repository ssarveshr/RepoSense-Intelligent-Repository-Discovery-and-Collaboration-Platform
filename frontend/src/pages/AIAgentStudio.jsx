import React from 'react';
import { useLocation } from 'react-router-dom';
import AICodeAgent from '../components/AICodeAgent';

export default function AIAgentStudio() {
  const location = useLocation();
  const repoUrl = location.state?.repoUrl || "";

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-fade-in-up space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Intelligent Repository Code Agent</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            AI Repo Bug Auditor & Code Execution Agent
          </h1>
          <p className="text-blue-100 mt-2 max-w-2xl text-sm md:text-base">
            Audit any chosen repository to find bugs, security vulnerabilities, and exception errors. RepoSense AI Agent generates visual fix diffs with 1-click sandbox loading & live execution verification.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center">
            <div className="text-2xl font-black text-white">5s</div>
            <div className="text-[10px] text-blue-200 uppercase font-bold">Timeout Limit</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center">
            <div className="text-2xl font-black text-cyan-300">O(1)</div>
            <div className="text-[10px] text-blue-200 uppercase font-bold">Smart Optimization</div>
          </div>
        </div>
      </div>

      {/* Embedded Agent */}
      <AICodeAgent initialRepoUrl={repoUrl} />
    </div>
  );
}
