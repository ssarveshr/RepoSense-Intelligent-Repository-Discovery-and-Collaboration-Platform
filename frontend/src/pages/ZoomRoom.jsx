import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import AICodeAgent from '../components/AICodeAgent';
import { createZoomMeeting, sendZoomInvites, configZoomSmtp } from '../services/zoomApi';

export default function ZoomRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { meetingId: urlMeetingId } = useParams();

  // Host User identity states
  const [hostName, setHostName] = useState(() => {
    const saved = localStorage.getItem('user_name');
    return (saved && saved !== "Alex Developer") ? saved : "Shashidhar";
  });
  const [hostEmail, setHostEmail] = useState(() => {
    const saved = localStorage.getItem('user_email');
    return (saved && saved !== "alex.dev@reposense.io") ? saved : "5656shashidhar@gmail.com";
  });
  const [topic, setTopic] = useState("");
  const [customZoomUrl, setCustomZoomUrl] = useState("");
  
  // Extract repoName if passed via state
  const repoName = location.state?.repoName || "RepoSense Open Source Project";

  const [inputMeetingId, setInputMeetingId] = useState("");
  const [inCall, setInCall] = useState(false);
  const [meetingData, setMeetingData] = useState(null);

  
  // Collaborator Email Management
  const [collaborators, setCollaborators] = useState([
    { id: 1, name: "Shashidhar (Host)", email: "5656shashidhar@gmail.com", role: "Host / Lead", status: "Online", avatar: "S", invited: false, inviteTime: null },
    { id: 2, name: "N S Shashidhar", email: "1rn23cs130.nsshashidhar@gmail.com", role: "Collaborator", status: "Online", avatar: "N", invited: false, inviteTime: null },
    { id: 3, name: "Sarah Frontend", email: "sarah.frontend@dev.org", role: "UI Maintainer", status: "Online", avatar: "S", invited: false, inviteTime: null },
    { id: 4, name: "Michael Cloud", email: "michael.cloud@infra.io", role: "DevOps Lead", status: "Online", avatar: "M", invited: false, inviteTime: null },
  ]);

  // New collaborator form states
  const [newCollabName, setNewCollabName] = useState("");
  const [newCollabEmail, setNewCollabEmail] = useState("");
  const [newCollabRole, setNewCollabRole] = useState("Contributor");
  const [showAddCollabModal, setShowAddCollabModal] = useState(false);

  // Email Invite modal & status states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [customInviteMsg, setCustomInviteMsg] = useState("");
  const [sendingEmails, setSendingEmails] = useState(false);
  const [inviteNotification, setInviteNotification] = useState("");
  const [dispatchedLogs, setDispatchedLogs] = useState([]);
  const [copied, setCopied] = useState(false);

  // SMTP Settings States
  const [smtpUser, setSmtpUser] = useState(hostEmail);
  const [smtpPass, setSmtpPass] = useState("");
  const [showSmtpConfig, setShowSmtpConfig] = useState(false);
  const [smtpStatusMsg, setSmtpStatusMsg] = useState("");

  // Interactive Zoom Control States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeTab, setActiveTab] = useState("split"); // "call" | "agent" | "split"
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "System", text: "Zoom Room initialized. All collaborators can join with the Meeting ID.", time: "21:20" }
  ]);
  const [newChatMessage, setNewChatMessage] = useState("");


  // Persist host user details to localStorage
  useEffect(() => {
    localStorage.setItem('user_name', hostName);
    localStorage.setItem('user_email', hostEmail);
  }, [hostName, hostEmail]);

  // Auto-join if URL param meetingId is provided
  useEffect(() => {
    if (urlMeetingId && !inCall) {
      handleHostOrJoin(urlMeetingId);
    }
  }, [urlMeetingId]);

  const handleHostOrJoin = async (idToJoin = null) => {
    const data = await createZoomMeeting({
      hostName,
      hostEmail,
      topic: topic || `Live Collaboration - ${repoName}`,
      repoName,
      collaborators,
      customZoomUrl
    });

    const baseUrl = window.location.origin || 'http://localhost:5173';

    if (idToJoin) {
      data.raw_id = idToJoin.replace(/\D/g, '');
      data.meeting_id = `${data.raw_id.slice(0, 3)} ${data.raw_id.slice(3, 6)} ${data.raw_id.slice(6, 10)}`;
      data.join_url = customZoomUrl.trim() || `${baseUrl}/zoom-meeting/${data.raw_id}`;
      data.web_client_url = `${baseUrl}/zoom-meeting/${data.raw_id}`;
      data.embed_viewport_url = `${baseUrl}/zoom-meeting/${data.raw_id}`;
    }

    setMeetingData(data);
    setInCall(true);
    navigate(`/zoom-meeting/${data.raw_id}`, { replace: true });
  };


  const handleAddCollaborator = (e) => {
    e.preventDefault();
    if (!newCollabName.trim() || !newCollabEmail.trim()) return;

    const newCollab = {
      id: Date.now(),
      name: newCollabName,
      email: newCollabEmail,
      role: newCollabRole,
      status: "Online",
      avatar: newCollabName.charAt(0).toUpperCase(),
      invited: false,
      inviteTime: null
    };

    setCollaborators(prev => [...prev, newCollab]);
    setNewCollabName("");
    setNewCollabEmail("");
    setShowAddCollabModal(false);
  };

  const handleSendEmailInvites = async () => {
    if (!meetingData) return;
    setSendingEmails(true);

    const result = await sendZoomInvites({
      meetingId: meetingData.meeting_id,
      hostEmail: hostEmail,
      hostName: hostName,
      repoName: repoName,
      collaborators: collaborators,
      customMessage: customInviteMsg
    });

    setSendingEmails(false);
    setCollaborators(prev => prev.map(c => ({
      ...c,
      invited: true,
      inviteTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })));

    setDispatchedLogs(result.recipients || []);
    setInviteNotification(`✉️ Automated email invites sent directly to all ${result.total_sent || collaborators.length} collaborator address(es)!`);

    // Save invitation to localStorage for CollaborationHub view
    try {
      const existing = JSON.parse(localStorage.getItem('zoom_invitations') || '[]');
      existing.unshift({
        id: Date.now(),
        repoName: repoName,
        meetingId: meetingData.meeting_id,
        passcode: meetingData.passcode,
        hostEmail: hostEmail,
        joinUrl: meetingData.join_url,
        webClientUrl: meetingData.web_client_url,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      localStorage.setItem('zoom_invitations', JSON.stringify(existing.slice(0, 5)));
    } catch (e) {}

    setTimeout(() => setInviteNotification(""), 6000);
  };

  const handleInviteSingleCollaborator = async (collab) => {
    let currentMeeting = meetingData;
    if (!currentMeeting) {
      currentMeeting = await createZoomMeeting({
        hostName,
        hostEmail,
        topic: topic || `Live Collaboration - ${repoName}`,
        repoName,
        collaborators
      });
      setMeetingData(currentMeeting);
    }

    setSendingEmails(true);
    const result = await sendZoomInvites({
      meetingId: currentMeeting.meeting_id,
      hostEmail: hostEmail,
      hostName: hostName,
      repoName: repoName,
      collaborators: [collab],
      customMessage: customInviteMsg || `Hi ${collab.name}, please join our live Zoom meeting for pair programming on ${repoName}.`
    });
    setSendingEmails(false);

    setCollaborators(prev => prev.map(c => c.id === collab.id ? {
      ...c,
      invited: true,
      inviteTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } : c));

    setInviteNotification(`✉️ Meeting invitation email logged for ${collab.name} (${collab.email})!`);
    setTimeout(() => setInviteNotification(""), 6000);
  };

  const handleDirectMailCompose = (collab) => {
    let currentMeeting = meetingData;
    const baseUrl = (typeof window !== 'undefined' && window.location.origin) || 'http://localhost:5173';
    const rawId = currentMeeting?.raw_id || Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const formattedId = currentMeeting?.meeting_id || `${rawId.slice(0, 3)} ${rawId.slice(3, 6)} ${rawId.slice(6, 10)}`;
    const passcode = currentMeeting?.passcode || "repo123";
    const joinUrl = currentMeeting?.join_url || `${baseUrl}/zoom-meeting/${rawId}`;

    const email = collab?.email || '1rn23cs130.nsshashidhar@gmail.com';
    const name = collab?.name || 'Collaborator';

    const subject = encodeURIComponent(`🎥 Zoom Meeting Invitation: ${repoName} Collaboration`);
    const body = encodeURIComponent(
      `Hello ${name},\n\n` +
      `${hostName} (${hostEmail}) has invited you to a live pair programming Zoom session for ${repoName}.\n\n` +
      `--------------------------------------------------\n` +
      `Repository: ${repoName}\n` +
      `Meeting ID: ${formattedId}\n` +
      `Passcode: ${passcode}\n` +
      `Host Email: ${hostEmail}\n` +
      `Direct Join Link: ${joinUrl}\n` +
      `--------------------------------------------------\n\n` +
      `Note: ${customInviteMsg || 'Please click the Direct Join Link above to join the meeting workspace.'}\n\n` +
      `Best regards,\nRepoSense Collaboration Engine`
    );

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
    
    if (collab) {
      setCollaborators(prev => prev.map(c => c.id === collab.id ? {
        ...c,
        invited: true,
        inviteTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } : c));
    }

    window.open(gmailUrl, '_blank');
    setInviteNotification(`📬 Gmail Compose opened for ${email}! Click "Send" in Gmail to send the meeting link directly to their inbox.`);
    setTimeout(() => setInviteNotification(""), 7000);
  };



  const handleSaveSmtpConfig = async (e) => {
    e.preventDefault();
    if (!smtpUser.trim() || !smtpPass.trim()) return;
    const res = await configZoomSmtp({
      smtpUser: smtpUser.trim(),
      smtpPassword: smtpPass.trim()
    });
    if (res && res.status === 'success') {
      setSmtpStatusMsg("✅ SMTP credentials updated successfully! Background email dispatches active.");
      setTimeout(() => setSmtpStatusMsg(""), 5000);
    } else {
      setSmtpStatusMsg("❌ Could not save SMTP configuration. Check backend status.");
    }
  };


  const copyInviteDetails = () => {
    if (!meetingData) return;
    const text = `🎥 Join live Zoom meeting for ${repoName}\nHosted by: ${hostName} (${hostEmail})\nMeeting ID: ${meetingData.meeting_id} | Passcode: ${meetingData.passcode}\nDirect Join Link: ${meetingData.join_url}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const generateMailtoLink = () => {
    if (!meetingData) return "#";
    const emails = collaborators.map(c => c.email).join(',');
    const subject = encodeURIComponent(`Zoom Meeting Invitation: ${repoName}`);
    const body = encodeURIComponent(`Hi Team,\n\nYou're invited to join a live Zoom meeting for ${repoName}.\n\nHost: ${hostName} (${hostEmail})\nMeeting ID: ${meetingData.meeting_id}\nPasscode: ${meetingData.passcode}\nJoin Link: ${meetingData.join_url}\n\n${customInviteMsg}`);
    return `mailto:${emails}?subject=${subject}&body=${body}`;
  };

  const generateGmailWebLink = () => {
    if (!meetingData) return "#";
    const emails = collaborators.map(c => c.email).join(',');
    const subject = encodeURIComponent(`Zoom Meeting Invitation: ${repoName}`);
    const body = encodeURIComponent(`Hi Team,\n\nYou're invited to join a live Zoom meeting for ${repoName}.\n\nHost: ${hostName} (${hostEmail})\nMeeting ID: ${meetingData.meeting_id}\nPasscode: ${meetingData.passcode}\nJoin Link: ${meetingData.join_url}\n\n${customInviteMsg}`);
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(emails)}&su=${subject}&body=${body}`;
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!newChatMessage.trim()) return;
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      sender: hostName,
      text: newChatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setNewChatMessage("");
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 animate-fade-in-up">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-md">
            <svg className="w-4 h-4 text-cyan-300 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
            </svg>
            <span>Hostable Zoom Meeting & Collaborator Dispatch Workspace</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Zoom Collaboration Studio
          </h1>
          <p className="text-blue-100 mt-2 max-w-xl text-sm md:text-base">
            Host instant Zoom meetings tied to your user email, broadcast invites to all project collaborators, and edit/run code side-by-side with the AI Code Agent.
          </p>
        </div>

        {!inCall ? (
          <button
            onClick={() => handleHostOrJoin()}
            className="px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 font-extrabold rounded-2xl shadow-xl transition-all transform hover:scale-105 flex items-center space-x-3 shrink-0"
          >
            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>Host & Launch Zoom Meeting</span>
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all transform hover:scale-105 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email Invites to Collaborators</span>
            </button>
            <button
              onClick={copyInviteDetails}
              className="px-5 py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold rounded-2xl shadow-md transition-all flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copied ? "Copied Invite!" : "Copy Meeting Details"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Notification Toast */}
      {inviteNotification && (
        <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl shadow-lg flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <span className="text-xl">📧</span>
            <p className="font-bold text-sm md:text-base">{inviteNotification}</p>
          </div>
          <span className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-full font-bold">Email Dispatch Complete</span>
        </div>
      )}

      {/* PRE-CALL / HOST CONFIGURATION STATE */}
      {!inCall ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Host Setup & Launch Card */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Host Setup & Meeting Configuration
                  </h2>
                  <p className="text-sm text-gray-500">
                    Configure your user email credentials and session topic before launching.
                  </p>
                </div>
              </div>

              {/* Host Profile & Email Configuration Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Host Name
                  </label>
                  <input
                    type="text"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Shashidhar"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Host Email Address
                  </label>
                  <input
                    type="email"
                    value={hostEmail}
                    onChange={(e) => setHostEmail(e.target.value)}
                    placeholder="e.g. 5656shashidhar@gmail.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Meeting Topic / Purpose
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={`e.g. Live Architecture Code Sync for ${repoName}`}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Custom External Meeting Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={customZoomUrl}
                    onChange={(e) => setCustomZoomUrl(e.target.value)}
                    placeholder="e.g. https://us05web.zoom.us/j/123456789 (Leave blank to use direct RepoSense Web Studio link)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    If left blank, invitations send direct 1-click RepoSense Web Studio join links (<code className="text-blue-500">http://localhost:5173/zoom-meeting/...</code>).
                  </p>
                </div>
              </div>


              {/* Join Existing Meeting ID Section */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60 mb-6 space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Or Join Existing Meeting ID
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputMeetingId}
                    onChange={(e) => setInputMeetingId(e.target.value)}
                    placeholder="e.g. 849 204 918 or 849204918"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <button
                    onClick={() => handleHostOrJoin(inputMeetingId)}
                    disabled={!inputMeetingId.trim()}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50"
                  >
                    Join Meeting
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleHostOrJoin()}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-xl transition-all transform hover:scale-[1.01] flex items-center justify-center space-x-3"
              >
                <span>Host Meeting & Broadcast Collaborator Invites</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Project Collaborators & Email Directory */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Collaborator Emails ({collaborators.length})
                </h3>
                <button
                  onClick={() => setShowAddCollabModal(true)}
                  className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 px-3 py-1.5 rounded-full font-bold transition-all"
                >
                  + Add Email
                </button>
              </div>

              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {collaborators.map(c => (
                  <div key={c.id} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {c.avatar}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{c.name}</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">{c.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {c.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/60 gap-2">
                      <span className="text-[11px] text-gray-400">
                        {c.invited ? `✓ Invited (${c.inviteTime || 'sent'})` : 'Pending'}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleDirectMailCompose(c)}
                          className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
                          title="Open Gmail Compose pre-filled for this recipient"
                        >
                          <span>📬 Send Mail</span>
                        </button>
                        <button
                          onClick={() => handleInviteSingleCollaborator(c)}
                          disabled={sendingEmails}
                          className="text-[11px] px-2.5 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all"
                          title="Log background invite"
                        >
                          <span>{c.invited ? "Log Again" : "Auto Log"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
              <p className="text-xs text-gray-500 text-center">
                All listed collaborators will receive Zoom meeting join details via backend email dispatches.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* IN-CALL / INTERACTIVE EMBEDDED ZOOM MEETING WINDOW WORKSPACE */
        <div className="space-y-6">
          {/* Top Session Status Bar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Zoom Meeting Live</span>
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold">
                  Host Email: {hostEmail}
                </span>
                <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold">
                  Meeting ID: {meetingData.meeting_id}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{meetingData.topic}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Passcode: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{meetingData.passcode}</span> | 
                Direct Link: <a href={meetingData.join_url} target="_blank" rel="noreferrer" className="text-blue-600 underline ml-1">{meetingData.join_url}</a>
              </p>
            </div>

            {/* Top Action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Send Email Invites</span>
              </button>

              <a
                href={meetingData.desktop_app_url || `zoommtg://zoom.us/join?confno=${meetingData.raw_id}`}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Launch Zoom App</span>
              </a>

              <a
                href={meetingData.web_client_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center space-x-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span>Browser Tab</span>
              </a>

              <button
                onClick={() => { setInCall(false); navigate('/zoom-meeting'); }}
                className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-xl text-sm transition-colors"
              >
                End Meeting
              </button>
            </div>
          </div>

          {/* Tab Navigation: Split View vs Full Zoom Window vs AI Agent */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab("split")}
                className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all flex items-center space-x-2 ${
                  activeTab === "split"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                <span>📐 Dual Studio (Zoom + AI Agent)</span>
              </button>

              <button
                onClick={() => setActiveTab("call")}
                className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all flex items-center space-x-2 ${
                  activeTab === "call"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                <span>🎥 Full Zoom Meeting Viewport</span>
              </button>

              <button
                onClick={() => setActiveTab("agent")}
                className={`px-5 py-2.5 font-bold text-sm rounded-xl transition-all flex items-center space-x-2 ${
                  activeTab === "agent"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                <span>⚡ AI Code Agent Workspace</span>
              </button>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 text-gray-800 dark:text-gray-200 font-bold rounded-xl text-xs flex items-center space-x-1.5"
            >
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Meeting Chat ({chatMessages.length})</span>
            </button>
          </div>

          {/* MAIN VIEWPORT DISPLAY AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left/Center Viewport */}
            <div className={`${showChat ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-300`}>
              {activeTab === "call" || activeTab === "split" ? (
                <div className={`${activeTab === "split" ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "w-full"}`}>
                  
                  {/* EMBEDDED ZOOM MEETING WINDOW CONTAINER */}
                  <div className="bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between h-[580px] relative">
                    
                    {/* Embedded Zoom Header Control Bar */}
                    <div className="bg-gray-900/90 backdrop-blur-md px-6 py-3 border-b border-gray-800 flex items-center justify-between z-10">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-white text-xs font-extrabold tracking-wider uppercase">
                          Zoom Meeting Web Viewport
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-gray-400">
                        <span className="bg-gray-800 px-2.5 py-1 rounded-lg font-mono text-gray-300">ID: {meetingData.meeting_id}</span>
                        <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded-lg">Host: {hostEmail}</span>
                      </div>
                    </div>

                    {/* Live Video Canvas Grid / Fallback Viewport */}
                    <div className="flex-1 p-6 relative overflow-hidden flex flex-col justify-center items-center bg-radial-dark">
                      
                      {isScreenSharing ? (
                        /* Simulated Screen Share Mode */
                        <div className="w-full h-full bg-slate-900 rounded-2xl border-2 border-cyan-500/50 p-4 flex flex-col justify-between relative overflow-hidden">
                          <div className="flex justify-between items-center bg-slate-800/80 px-4 py-2 rounded-xl text-xs text-cyan-300 font-mono">
                            <span>🖥️ Screen Share Active ({hostName})</span>
                            <button onClick={() => setIsScreenSharing(false)} className="text-red-400 font-bold hover:underline">Stop Sharing</button>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-6 text-center">
                            <div className="space-y-3">
                              <div className="w-16 h-16 mx-auto bg-cyan-500/20 text-cyan-400 rounded-2xl flex items-center justify-center">
                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <h4 className="text-white font-bold text-lg">Sharing Code Workspace to Zoom Participants</h4>
                              <p className="text-gray-400 text-xs max-w-sm">
                                All collaborators in meeting {meetingData.meeting_id} can see your active editor and AI suggestions.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Participant Video Tile Grid */
                        <div className="grid grid-cols-2 gap-4 w-full max-w-3xl">
                          {/* Host Video Tile */}
                          <div className="relative aspect-video bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center shadow-lg group">
                            {!isVideoOff ? (
                              <div className="w-full h-full bg-gradient-to-br from-blue-900/60 to-indigo-950/80 flex items-center justify-center relative">
                                <div className="w-20 h-20 rounded-full bg-blue-600 text-white font-black text-2xl flex items-center justify-center border-4 border-white/20 shadow-xl">
                                  {hostName.charAt(0)}
                                </div>
                                <div className="absolute top-3 right-3 flex space-x-1">
                                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-gray-500">
                                <svg className="w-10 h-10 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs">Camera Off</span>
                              </div>
                            )}
                            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-bold flex items-center space-x-1.5">
                              <span>{hostName} (Host)</span>
                              {isMuted && <span className="text-red-400">🎙️ Muted</span>}
                            </div>
                          </div>

                          {/* Collaborator Video Tiles */}
                          {collaborators.slice(1, 4).map((c, idx) => (
                            <div key={c.id} className="relative aspect-video bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden flex items-center justify-center shadow-lg">
                              <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
                                <div className="w-16 h-16 rounded-full bg-indigo-600/60 text-white font-bold text-xl flex items-center justify-center border-2 border-white/10">
                                  {c.avatar}
                                </div>
                              </div>
                              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-bold flex items-center space-x-1">
                                <span>{c.name}</span>
                                {c.invited && <span className="text-emerald-400 text-[10px]">✓ Invited</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Zoom Control Toolbar */}
                    <div className="bg-gray-900/95 backdrop-blur-md px-6 py-4 border-t border-gray-800 flex items-center justify-between z-10">
                      <div className="flex items-center space-x-3">
                        {/* Mic Control */}
                        <button
                          onClick={() => setIsMuted(!isMuted)}
                          className={`p-3 rounded-2xl transition-all ${
                            isMuted
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-gray-800 text-white hover:bg-gray-700"
                          }`}
                          title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>

                        {/* Video Control */}
                        <button
                          onClick={() => setIsVideoOff(!isVideoOff)}
                          className={`p-3 rounded-2xl transition-all ${
                            isVideoOff
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-gray-800 text-white hover:bg-gray-700"
                          }`}
                          title={isVideoOff ? "Start Video" : "Stop Video"}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Screen Share Control */}
                        <button
                          onClick={() => setIsScreenSharing(!isScreenSharing)}
                          className={`p-3 rounded-2xl transition-all ${
                            isScreenSharing
                              ? "bg-cyan-500 text-white hover:bg-cyan-600"
                              : "bg-gray-800 text-white hover:bg-gray-700"
                          }`}
                          title="Share Screen"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>

                      {/* Middle Toolbar Action: Invite Emails */}
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5"
                      >
                        <span>📧 Invite Emails</span>
                      </button>

                      {/* Leave / End Call */}
                      <button
                        onClick={() => { setInCall(false); navigate('/zoom-meeting'); }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                      >
                        End Meeting
                      </button>
                    </div>
                  </div>

                  {/* RIGHT COLUMN (IF SPLIT VIEW): LIVE AI CODE AGENT */}
                  {activeTab === "split" && (
                    <div className="h-[580px] overflow-y-auto rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl">
                      <AICodeAgent />
                    </div>
                  )}

                </div>
              ) : (
                /* FULL AI CODE AGENT WORKSPACE VIEW */
                <div className="rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-xl">
                  <AICodeAgent />
                </div>
              )}
            </div>

            {/* Right Chat Drawer Side Panel */}
            {showChat && (
              <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between h-[580px]">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white">Zoom Meeting Chat</h3>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2.5 py-1 rounded-full font-bold">
                      Live
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {chatMessages.map(msg => (
                      <div key={msg.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-blue-600 dark:text-blue-400">{msg.sender}</span>
                          <span className="text-gray-400">{msg.time}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSendChat} className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                  <input
                    type="text"
                    value={newChatMessage}
                    onChange={(e) => setNewChatMessage(e.target.value)}
                    placeholder="Type meeting message..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700">
                    Send
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EMAIL INVITE DISPATCH MODAL */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 max-w-xl w-full shadow-2xl space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Send Email Invitations</h3>
                  <p className="text-xs text-gray-500">Meeting Host: <span className="font-semibold text-blue-600">{hostEmail}</span></p>
                </div>
              </div>
              <button onClick={() => setShowInviteModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Recipients ({collaborators.length})
                </label>
                <span className="text-[11px] text-gray-400">Click Invite to send mail to specific collaborator</span>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-200 dark:border-gray-700">
                {collaborators.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">{c.name}</span>
                      <span className="font-mono text-gray-500 block text-[11px]">{c.email}</span>
                    </div>
                    <button
                      onClick={() => handleDirectMailCompose(c)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center space-x-1 ${
                        c.invited
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                      }`}
                    >
                      <span>{c.invited ? "✓ Mail Sent (Resend)" : "📬 Send Mail via Gmail"}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                Custom Invitation Note (Optional)
              </label>
              <textarea
                value={customInviteMsg}
                onChange={(e) => setCustomInviteMsg(e.target.value)}
                placeholder="e.g. Please join to review the vector database refactor for RepoSense."
                rows={2}
                className="w-full p-3 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSendEmailInvites}
                disabled={sendingEmails}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-sm transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {sendingEmails ? (
                  <span>Sending Real Emails via Backend...</span>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>🚀 Broadcast Invites to ALL Collaborators</span>
                  </>
                )}
              </button>

              <div className="flex gap-2">
                <a
                  href={generateGmailWebLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1"
                >
                  <span>✉️ Open Gmail Compose</span>
                </a>
                <a
                  href={generateMailtoLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 font-semibold rounded-lg text-xs flex items-center justify-center space-x-1"
                >
                  <span>📬 Open System Mail App</span>
                </a>
              </div>
            </div>

            {/* Optional SMTP Config Collapsible Section */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowSmtpConfig(!showSmtpConfig)}
                className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center space-x-1"
              >
                <span>⚙️ {showSmtpConfig ? "Hide" : "Configure"} Gmail App Password / Server SMTP Credentials</span>
              </button>

              {showSmtpConfig && (
                <form onSubmit={handleSaveSmtpConfig} className="mt-3 p-4 bg-blue-50/50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3">
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    To send automated emails directly from server background without opening mail apps, provide your Gmail App Password below:
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">SMTP User Email</label>
                    <input
                      type="email"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-600 dark:text-gray-400 mb-1">Gmail App Password (16 characters)</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder="e.g. abcd efgh ijkl mnop"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none font-mono"
                    />
                  </div>
                  {smtpStatusMsg && <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{smtpStatusMsg}</p>}
                  <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-sm">
                    Save Server SMTP Password
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD COLLABORATOR MODAL */}
      {showAddCollabModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddCollaborator} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Collaborator Email</h3>
              <button type="button" onClick={() => setShowAddCollabModal(false)} className="text-gray-400 text-xl font-bold">×</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Collaborator Name</label>
              <input
                type="text"
                required
                value={newCollabName}
                onChange={(e) => setNewCollabName(e.target.value)}
                placeholder="e.g. John Architect"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={newCollabEmail}
                onChange={(e) => setNewCollabEmail(e.target.value)}
                placeholder="e.g. john@company.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select
                value={newCollabRole}
                onChange={(e) => setNewCollabRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Contributor">Contributor</option>
                <option value="Maintainer">Maintainer</option>
                <option value="Reviewer">Reviewer</option>
                <option value="DevOps">DevOps</option>
              </select>
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md">
              Save Collaborator
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
