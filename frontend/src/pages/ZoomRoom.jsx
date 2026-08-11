import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ZoomRoom() {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract repoName if passed via state
  const repoName = location.state?.repoName || "RepoSense Open Source Project";

  const [inCall, setInCall] = useState(false);
  const [meetingData, setMeetingData] = useState(null);
  const [invitedStatus, setInvitedStatus] = useState(false);
  const [inviteNotification, setInviteNotification] = useState("");
  const [copied, setCopied] = useState(false);

  // Collaborators mock list
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: "Alex Developer", role: "Maintainer", status: "Online", avatar: "A", invited: false },
    { id: 2, name: "Sarah Frontend", role: "Contributor", status: "Online", avatar: "S", invited: false },
    { id: 3, name: "Michael Cloud", role: "DevOps Lead", status: "Online", avatar: "M", invited: false },
    { id: 4, name: "Emily AI", role: "Contributor", status: "Away", avatar: "E", invited: false },
  ]);

  // Generate random Meeting ID and Passcode
  const generateMeeting = () => {
    const randomId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const formattedId = `${randomId.slice(0, 3)} ${randomId.slice(3, 6)} ${randomId.slice(6)}`;
    const passcode = "repo" + Math.floor(100 + Math.random() * 900);
    const joinUrl = `https://zoom.us/j/${randomId}?pwd=${passcode}`;
    const webClientUrl = `https://zoom.us/wc/${randomId}/join`;

    const data = {
      meetingId: formattedId,
      rawId: randomId,
      passcode: passcode,
      joinUrl: joinUrl,
      webClientUrl: webClientUrl,
      topic: `Live Collaboration - ${repoName}`,
      host: "Alex Developer"
    };

    setMeetingData(data);
    setInCall(true);
  };

  const inviteAllCollaborators = () => {
    if (!meetingData) return;

    // Update collaborator list statuses
    setCollaborators(prev =>
      prev.map(c => ({ ...c, invited: true }))
    );

    setInvitedStatus(true);
    setInviteNotification(`🚀 Instant Zoom invitation sent to all ${collaborators.length} active collaborators!`);

    // Save invitation to localStorage so CollaborationHub can display it
    try {
      const existing = JSON.parse(localStorage.getItem('zoom_invitations') || '[]');
      existing.unshift({
        id: Date.now(),
        repoName: repoName,
        meetingId: meetingData.meetingId,
        passcode: meetingData.passcode,
        joinUrl: meetingData.joinUrl,
        webClientUrl: meetingData.webClientUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      localStorage.setItem('zoom_invitations', JSON.stringify(existing.slice(0, 5)));
    } catch (e) {}

    setTimeout(() => {
      setInviteNotification("");
    }, 5000);
  };

  const copyInvite = () => {
    if (!meetingData) return;
    const text = `🎥 Join live Zoom meeting for ${repoName}\nMeeting Link: ${meetingData.joinUrl}\nMeeting ID: ${meetingData.meetingId} | Passcode: ${meetingData.passcode}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md">
            <svg className="w-4 h-4 text-cyan-300 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            <span>Zoom Video Collaboration Platform</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Instant Zoom Collaboration Hub
          </h1>
          <p className="text-blue-100 mt-2 max-w-xl text-sm md:text-base">
            Start a live video meeting in 1 click and instantly broadcast the meeting invite link to all active collaborators on <span className="font-semibold text-white">{repoName}</span>.
          </p>
        </div>

        {!inCall ? (
          <button
            onClick={generateMeeting}
            className="px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 font-extrabold rounded-2xl shadow-xl transition-all transform hover:scale-105 flex items-center space-x-3 shrink-0"
          >
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Start Instant Zoom Meeting</span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={inviteAllCollaborators}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{invitedStatus ? "Re-invite Collaborators" : "Invite All Collaborators"}</span>
            </button>
            <button
              onClick={copyInvite}
              className="px-5 py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold rounded-2xl shadow-md transition-all flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copied ? "Copied Link!" : "Copy Invite"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {inviteNotification && (
        <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <span className="text-xl">✨</span>
            <p className="font-bold text-sm md:text-base">{inviteNotification}</p>
          </div>
          <span className="text-xs bg-emerald-500 text-white px-2.5 py-1 rounded-full font-bold">Broadcast Sent</span>
        </div>
      )}

      {/* Main View */}
      {!inCall ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Quick Launch Card */}
          <div className="md:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                1-Click Meeting & Instant Invitation
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                Launching a Zoom meeting will instantly generate a verified room session and notify all collaborators working on <span className="font-semibold text-gray-900 dark:text-white">{repoName}</span>.
              </p>
              <div className="space-y-3 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 mb-6">
                <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>Direct browser & Zoom app integration</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Auto-posts invitation to Collaboration Hub discussions</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>Shareable Meeting ID & Passcode link</span>
                </div>
              </div>
            </div>

            <button
              onClick={generateMeeting}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] flex items-center justify-center space-x-3"
            >
              <span>Launch Instant Zoom & Broadcast Invite</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {/* Active Collaborators Panel */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
              <span>Project Collaborators</span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full font-bold">
                {collaborators.length} Active
              </span>
            </h3>
            <div className="space-y-4">
              {collaborators.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center">
                      {c.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</h4>
                      <p className="text-xs text-gray-500">{c.role}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c.status === 'Online' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Zoom Session Room Interface */
        <div className="space-y-8">
          {/* Active Session Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-gray-200 dark:border-gray-800">
              <div>
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Zoom Meeting Active</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{meetingData.topic}</h2>
                <p className="text-sm text-gray-500 mt-1">Hosted by <span className="font-semibold text-gray-700 dark:text-gray-300">{meetingData.host}</span></p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={meetingData.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Open in Zoom App</span>
                </a>

                <a
                  href={meetingData.webClientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Join via Browser</span>
                </a>

                <button
                  onClick={() => setInCall(false)}
                  className="px-5 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-2xl transition-colors"
                >
                  End Meeting
                </button>
              </div>
            </div>

            {/* Meeting Credentials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60">
                <p className="text-xs font-semibold text-gray-500 uppercase">Meeting ID</p>
                <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tracking-wider mt-1">{meetingData.meetingId}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60">
                <p className="text-xs font-semibold text-gray-500 uppercase">Passcode</p>
                <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 tracking-wider mt-1">{meetingData.passcode}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Collaborator Invites</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                    {invitedStatus ? "Sent to 4 Collaborators" : "Ready to Broadcast"}
                  </p>
                </div>
                <button
                  onClick={inviteAllCollaborators}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {invitedStatus ? "Resend" : "Send Now"}
                </button>
              </div>
            </div>
          </div>

          {/* Invited Collaborators Status Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Invited Collaborators Status</h3>
              <button
                onClick={inviteAllCollaborators}
                className="text-sm text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
              >
                <span>+ Invite More</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {collaborators.map(c => (
                <div key={c.id} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center">
                      {c.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</h4>
                      <p className="text-xs text-gray-500">{c.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700/50">
                    <span className="text-xs text-gray-500">Invite Status:</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${c.invited ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                      {c.invited ? "Invited ✓" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
