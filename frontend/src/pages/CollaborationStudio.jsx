import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';
import { createMeeting, endMeeting, listMeetings } from '../services/meetingApi.js';
import {
  fetchRepositoryCollaborators,
  INVITATION_STATUS,
  isValidEmail,
  resolveMeeting,
  sendMeetingInvitations,
  statusLabel,
} from '../services/collaborationApi.js';
import { useGitHubConnection } from '../hooks/useGitHubConnection.js';
import { formatGitHubCollaboratorError } from '../utils/githubError.js';
import {
  parseGithubRepoInput,
  parseGithubRepoUrl,
  useMeetingRepositoryContext,
} from '../hooks/useMeetingRepositoryContext.js';
import { openMeetingTabPlaceholder, navigateMeetingTab } from '../utils/openMeetingTab.js';

const VideoCameraIcon = ({ className = 'w-6 h-6' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ArrowRightIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

function mapCollaborator(item, index) {
  const email = item.email || null;
  const githubLogin = item.github_login || item.login || null;
  return {
    id: githubLogin || item.id || `github-${index}`,
    name: item.name || githubLogin,
    githubLogin,
    email,
    emailSource: item.email_source || (email ? 'github' : null),
    role: item.role || item.permission || 'Collaborator',
    avatarUrl: item.avatar_url || null,
    avatar: (item.name || githubLogin || '?').charAt(0).toUpperCase(),
    invitationStatus: email ? INVITATION_STATUS.NOT_SENT : INVITATION_STATUS.EMAIL_UNAVAILABLE,
    inviteTime: null,
    isManual: false,
    isCurrentUser: Boolean(item.is_current_user),
  };
}

function buildRecipientList(collaborators) {
  return collaborators.map((c) => ({
    email: c.email,
    name: c.name,
    githubLogin: c.githubLogin,
    emailSource: c.emailSource,
  }));
}

function invitationStatusDisplay(status, inviteTime) {
  switch (status) {
    case INVITATION_STATUS.SENT:
      return inviteTime ? `✓ Invited (${inviteTime})` : '✓ Sent';
    case INVITATION_STATUS.SENDING:
      return 'Sending…';
    case INVITATION_STATUS.FAILED:
      return '✕ Failed';
    case INVITATION_STATUS.EMAIL_UNAVAILABLE:
      return 'Email unavailable';
    case INVITATION_STATUS.SKIPPED_HOST:
      return 'Skipped (host)';
    case INVITATION_STATUS.SKIPPED_DUPLICATE:
      return 'Skipped (duplicate)';
    case INVITATION_STATUS.NOT_SENT:
    default:
      return statusLabel(status);
  }
}

function invitationStatusClass(status) {
  switch (status) {
    case INVITATION_STATUS.SENT:
      return 'text-emerald-600 dark:text-emerald-400';
    case INVITATION_STATUS.SENDING:
      return 'text-blue-600 dark:text-blue-400';
    case INVITATION_STATUS.FAILED:
      return 'text-red-600 dark:text-red-400';
    case INVITATION_STATUS.EMAIL_UNAVAILABLE:
      return 'text-amber-600 dark:text-amber-400';
    case INVITATION_STATUS.SKIPPED_HOST:
    case INVITATION_STATUS.SKIPPED_DUPLICATE:
      return 'text-gray-500 dark:text-gray-400';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
}

function normalizeErrorMessage(message) {
  if (!message) return 'Something went wrong. Please try again.';
  const lower = message.toLowerCase();
  if (lower.includes('not found')) return 'Meeting not found.';
  if (lower.includes('smtp') || lower.includes('not configured')) {
    return 'Email invitations are not configured. Contact your administrator or configure SMTP on the server.';
  }
  if (lower.includes('collaborator') || lower.includes('github')) {
    return 'Unable to load repository collaborators.';
  }
  if (lower.includes('create') || lower.includes('meeting')) {
    return 'Unable to create the meeting. Please try again.';
  }
  return message;
}

export default function CollaborationStudio() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAuthToken, isSignedIn, isLoaded, user } = useContext(ProfileAuthContext);
  const {
    connection: githubConnection,
    repositories,
    loading: githubConnectionLoading,
    reposLoading,
    error: githubConnectionError,
    reposError,
    connectGitHub,
    disconnect: disconnectGitHub,
    reloadConnection: reloadGitHubConnection,
    reloadRepositories,
    githubLogin,
    isConnected: isGitHubConnected,
  } = useGitHubConnection();
  const {
    githubUrl: contextGithubUrl,
    repoName: contextRepoName,
    repoSlug: contextRepoSlug,
    setRepository,
    clearRepository,
  } = useMeetingRepositoryContext();

  const [selectedGithubUrl, setSelectedGithubUrl] = useState(contextGithubUrl);
  const [repoInput, setRepoInput] = useState(contextGithubUrl);
  const [repoInputError, setRepoInputError] = useState('');
  const [activeRepository, setActiveRepository] = useState(() =>
    contextGithubUrl ? parseGithubRepoInput(contextGithubUrl) : null,
  );

  const githubUrl = activeRepository?.githubUrl || selectedGithubUrl;
  const repoSlug = activeRepository?.slug || contextRepoSlug || '';
  const repoName = activeRepository?.repoName || contextRepoName || parseGithubRepoUrl(githubUrl)?.repoName || '';

  const [hostName, setHostName] = useState('');
  const [hostEmail, setHostEmail] = useState('');
  const [topic, setTopic] = useState('');
  const [externalMeetingUrl, setExternalMeetingUrl] = useState('');
  const [inputMeetingId, setInputMeetingId] = useState('');

  const [collaborators, setCollaborators] = useState([]);
  const [collaboratorsLoading, setCollaboratorsLoading] = useState(true);
  const [collaboratorsError, setCollaboratorsError] = useState('');
  const [collaboratorsReconnectRequired, setCollaboratorsReconnectRequired] = useState(false);
  const [collaboratorsLoadedMessage, setCollaboratorsLoadedMessage] = useState('');
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] = useState([]);

  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [joiningMeeting, setJoiningMeeting] = useState(false);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sendingSingleId, setSendingSingleId] = useState(null);

  const [createdMeeting, setCreatedMeeting] = useState(null);
  const [inviteSummary, setInviteSummary] = useState(null);
  const [smtpEnabled, setSmtpEnabled] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteNotification, setInviteNotification] = useState('');

  const [showAddCollabModal, setShowAddCollabModal] = useState(false);
  const [newCollabName, setNewCollabName] = useState('');
  const [newCollabEmail, setNewCollabEmail] = useState('');
  const [newCollabRole, setNewCollabRole] = useState('Contributor');
  const [addEmailError, setAddEmailError] = useState('');

  const [autoLogEntries, setAutoLogEntries] = useState([]);

  const [activeMeetings, setActiveMeetings] = useState([]);
  const [activeMeetingsLoading, setActiveMeetingsLoading] = useState(false);
  const [activeMeetingsError, setActiveMeetingsError] = useState('');

  const [showInviteSummaryModal, setShowInviteSummaryModal] = useState(false);

  const [endTargetMeeting, setEndTargetMeeting] = useState(null);
  const [endingMeetingId, setEndingMeetingId] = useState(null);
  const [endMeetingError, setEndMeetingError] = useState('');
  const [endMeetingSuccess, setEndMeetingSuccess] = useState('');
  const [selectedRepoFullName, setSelectedRepoFullName] = useState('');
  const [githubOAuthNotice, setGithubOAuthNotice] = useState('');

  const githubOAuthResult = new URLSearchParams(location.search).get('github_oauth');

  useEffect(() => {
    if (!githubOAuthResult) return undefined;

    if (githubOAuthResult === 'success') {
      setGithubOAuthNotice('GitHub connected successfully.');
      reloadGitHubConnection();
      reloadRepositories();
    } else {
      setGithubOAuthNotice('GitHub connection failed. Please try again.');
    }

    const nextParams = new URLSearchParams(location.search);
    nextParams.delete('github_oauth');
    const nextSearch = nextParams.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true },
    );
    return undefined;
  }, [githubOAuthResult, location.pathname, location.search, navigate, reloadGitHubConnection, reloadRepositories]);

  useEffect(() => {
    if (contextGithubUrl) {
      const parsed = parseGithubRepoInput(contextGithubUrl);
      setSelectedGithubUrl(contextGithubUrl);
      setRepoInput(contextGithubUrl);
      if (parsed) {
        setActiveRepository(parsed);
        setSelectedRepoFullName(parsed.slug);
      }
    }
  }, [contextGithubUrl]);

  useEffect(() => {
    if (!githubUrl || selectedRepoFullName) return;
    const parsed = parseGithubRepoInput(githubUrl);
    if (parsed?.slug) {
      setSelectedRepoFullName(parsed.slug);
    }
  }, [githubUrl, selectedRepoFullName]);

  const loadCollaboratorsForUrl = useCallback(
    async (url) => {
      if (!url) {
        setCollaborators([]);
        setCollaboratorsLoading(false);
        setCollaboratorsError('Select a repository to load collaborators.');
        return;
      }

      setCollaboratorsLoading(true);
      setCollaboratorsError('');
      setCollaboratorsReconnectRequired(false);
      setCollaboratorsLoadedMessage('');
      try {
        const token = await getAuthToken();
        if (!token) {
          setCollaboratorsError('Sign in to load repository collaborators.');
          setCollaborators([]);
          return;
        }
        const data = await fetchRepositoryCollaborators(url, token);
        const mapped = (data.collaborators || []).map(mapCollaborator);
        setCollaborators(mapped);
        setSelectedCollaboratorIds([]);
        const repoLabel =
          data.repository?.fullName ||
          data.repository?.full_name ||
          parseGithubRepoUrl(url)?.fullName ||
          'repository';
        setCollaboratorsLoadedMessage(
          `Loaded ${mapped.length} collaborator${mapped.length === 1 ? '' : 's'} from ${repoLabel}`,
        );
      } catch (err) {
        const formatted = formatGitHubCollaboratorError(err);
        setCollaboratorsError(formatted.message);
        setCollaboratorsReconnectRequired(Boolean(formatted.reconnectRequired));
        setCollaborators([]);
      } finally {
        setCollaboratorsLoading(false);
      }
    },
    [getAuthToken],
  );

  const loadCollaborators = useCallback(async () => {
    await loadCollaboratorsForUrl(githubUrl);
  }, [githubUrl, loadCollaboratorsForUrl]);

  const loadActiveMeetings = useCallback(async () => {
    if (!isSignedIn) {
      setActiveMeetings([]);
      return;
    }
    setActiveMeetingsLoading(true);
    setActiveMeetingsError('');
    try {
      const token = await getAuthToken();
      if (!token) return;
      const data = await listMeetings(token);
      setActiveMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      setActiveMeetingsError(err.message || 'Unable to load active meetings.');
      setActiveMeetings([]);
    } finally {
      setActiveMeetingsLoading(false);
    }
  }, [getAuthToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    const name =
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
      user?.username ||
      '';
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      '';
    if (name) setHostName(name);
    if (email) setHostEmail(email);
  }, [isLoaded, user]);

  const handleApplyRepository = async (event) => {
    event?.preventDefault();
    setRepoInputError('');

    const parsed = parseGithubRepoInput(repoInput);
    if (!parsed) {
      setRepoInputError(
        'Enter a valid GitHub repository URL (https://github.com/owner/repo) or owner/repo.',
      );
      return;
    }

    setRepository(parsed.githubUrl);
    setActiveRepository(parsed);
    setSelectedGithubUrl(parsed.githubUrl);
    setRepoInput(parsed.githubUrl);
    setSelectedRepoFullName(parsed.slug);
    await loadCollaboratorsForUrl(parsed.githubUrl);
  };

  const handleRepositorySelect = async (event) => {
    const fullName = event.target.value;
    setSelectedRepoFullName(fullName);
    setRepoInputError('');

    if (!fullName) {
      clearRepository();
      setActiveRepository(null);
      setSelectedGithubUrl('');
      setRepoInput('');
      setCollaborators([]);
      setCollaboratorsError('Select a repository to load collaborators.');
      return;
    }

    const repository = repositories.find(
      (item) => (item.full_name || item.fullName) === fullName,
    );
    const githubRepoUrl =
      repository?.url || repository?.htmlUrl || `https://github.com/${fullName}`;
    const parsed = parseGithubRepoInput(githubRepoUrl);
    if (!parsed) {
      setRepoInputError('Unable to use the selected repository.');
      return;
    }

    setRepository(parsed.githubUrl);
    setActiveRepository(parsed);
    setSelectedGithubUrl(parsed.githubUrl);
    setRepoInput(parsed.githubUrl);
    await loadCollaboratorsForUrl(parsed.githubUrl);
  };

  const handleEndMeeting = async () => {
    if (!endTargetMeeting) return;
    setEndMeetingError('');
    setEndingMeetingId(endTargetMeeting.id);
    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error('Sign in to end this meeting.');
      }
      await endMeeting(endTargetMeeting.id, token);
      setEndMeetingSuccess(`Meeting "${endTargetMeeting.title}" ended.`);
      setEndTargetMeeting(null);
      await loadActiveMeetings();
      setTimeout(() => setEndMeetingSuccess(''), 5000);
    } catch (err) {
      setEndMeetingError(err.message || 'Unable to end meeting.');
    } finally {
      setEndingMeetingId(null);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && githubUrl) {
      loadCollaborators();
    } else if (isLoaded && isSignedIn && !githubUrl) {
      setCollaboratorsLoading(false);
      setCollaboratorsError('Select a repository to load collaborators.');
      setCollaborators([]);
    } else if (isLoaded && !isSignedIn) {
      setCollaboratorsLoading(false);
      setCollaboratorsError('Sign in to load repository collaborators.');
    }
  }, [isLoaded, isSignedIn, githubUrl, loadCollaborators]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadActiveMeetings();
    }
  }, [isLoaded, isSignedIn, loadActiveMeetings]);

  const emailStats = useMemo(() => {
    const withEmail = collaborators.filter((c) => isValidEmail(c.email)).length;
    return {
      total: collaborators.length,
      withEmail,
      missing: collaborators.length - withEmail,
    };
  }, [collaborators]);

  const inviteableCollaborators = useMemo(
    () => collaborators.filter((collaborator) => !collaborator.isCurrentUser),
    [collaborators],
  );

  const selectableCollaborators = useMemo(
    () => inviteableCollaborators.filter((collaborator) => isValidEmail(collaborator.email)),
    [inviteableCollaborators],
  );

  const selectedInviteableCount = useMemo(
    () =>
      selectedCollaboratorIds.filter((id) =>
        selectableCollaborators.some((collaborator) => collaborator.id === id),
      ).length,
    [selectedCollaboratorIds, selectableCollaborators],
  );

  const allSelectableSelected =
    selectableCollaborators.length > 0 &&
    selectableCollaborators.every((collaborator) => selectedCollaboratorIds.includes(collaborator.id));

  const handleToggleCollaboratorSelection = (collaborator) => {
    if (collaborator.isCurrentUser || !isValidEmail(collaborator.email)) return;

    setSelectedCollaboratorIds((previous) =>
      previous.includes(collaborator.id)
        ? previous.filter((id) => id !== collaborator.id)
        : [...previous, collaborator.id],
    );
  };

  const handleToggleSelectAllInviteable = () => {
    if (allSelectableSelected) {
      setSelectedCollaboratorIds([]);
      return;
    }
    setSelectedCollaboratorIds(selectableCollaborators.map((collaborator) => collaborator.id));
  };

  const handleClearSelection = () => {
    setSelectedCollaboratorIds([]);
  };

  const selectedCollaboratorsForInvite = useMemo(
    () => {
      const selectedIds = new Set(selectedCollaboratorIds);
      return collaborators.filter(
        (collaborator) =>
          selectedIds.has(collaborator.id) &&
          !collaborator.isCurrentUser &&
          isValidEmail(collaborator.email),
      );
    },
    [collaborators, selectedCollaboratorIds],
  );

  const invitePreview = useMemo(() => {
    const hostEmailNorm = hostEmail.trim().toLowerCase();
    const seen = new Set();
    let validEmail = 0;
    let emailUnavailable = 0;
    let skippedHost = 0;
    let skippedDuplicate = 0;

    selectedCollaboratorsForInvite.forEach((collab) => {
      const email = collab.email?.trim().toLowerCase();
      if (!isValidEmail(email)) {
        emailUnavailable += 1;
        return;
      }
      if (email === hostEmailNorm) {
        skippedHost += 1;
        return;
      }
      if (seen.has(email)) {
        skippedDuplicate += 1;
        return;
      }
      seen.add(email);
      validEmail += 1;
    });

    return {
      total: selectedCollaboratorsForInvite.length,
      validEmail,
      emailUnavailable,
      skippedHost,
      skippedDuplicate,
      willSend: validEmail,
    };
  }, [selectedCollaboratorsForInvite, hostEmail]);

  const applyInviteResults = (results) => {
    if (!results?.length) return;
    setCollaborators((prev) =>
      prev.map((collab) => {
        const match = results.find(
          (r) =>
            (collab.email && r.recipient_email === collab.email) ||
            (collab.githubLogin && r.github_login === collab.githubLogin),
        );
        if (!match) return collab;
        return {
          ...collab,
          invitationStatus: match.status,
          inviteTime: match.timestamp
            ? new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : collab.inviteTime,
        };
      }),
    );
  };

  const validateHostForm = () => {
    if (!isGitHubConnected) return 'Connect your GitHub account to access repositories.';
    if (!hostName.trim()) return 'Host name is required.';
    if (!isValidEmail(hostEmail)) return 'A valid host email address is required.';
    if (!topic.trim()) return 'Meeting topic is required.';
    if (externalMeetingUrl.trim() && !/^https:\/\/.+/i.test(externalMeetingUrl.trim())) {
      return 'External meeting link must be a valid HTTPS URL.';
    }
    return null;
  };

  const handleHostAndBroadcast = async () => {
    setErrorMessage('');
    const validationError = validateHostForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (!isSignedIn) {
      setErrorMessage('Sign in to host a RepoSense meeting.');
      return;
    }
    if (selectedCollaboratorsForInvite.length === 0) {
      setErrorMessage('Select at least one collaborator with a valid email address.');
      return;
    }

    setCreatingMeeting(true);
    try {
      const token = await getAuthToken();
      const meeting = await createMeeting(
        {
          title: topic.trim(),
          host_display_name: hostName.trim(),
        },
        token,
      );
      setCreatedMeeting(meeting);
      await loadActiveMeetings();

      setSendingInvites(true);
      const inviteResult = await sendMeetingInvitations(
        meeting.id,
        {
          hostEmail: hostEmail.trim(),
          hostName: hostName.trim(),
          repoName: repoSlug || repoName,
          externalMeetingUrl: externalMeetingUrl.trim() || undefined,
          recipients: buildRecipientList(selectedCollaboratorsForInvite),
        },
        token,
      );
      setInviteSummary(inviteResult.summary);
      setSmtpEnabled(inviteResult.smtp_enabled ?? null);
      applyInviteResults(inviteResult.recipients);

      const sent = inviteResult.summary?.sent ?? 0;
      setInviteNotification(
        `Meeting created. ${sent} invitation${sent === 1 ? '' : 's'} dispatched to collaborators.`,
      );
      setTimeout(() => setInviteNotification(''), 6000);
    } catch (err) {
      setErrorMessage(normalizeErrorMessage(err.message));
    } finally {
      setCreatingMeeting(false);
      setSendingInvites(false);
      setShowInviteSummaryModal(false);
    }
  };

  const handleRequestBroadcast = () => {
    setErrorMessage('');
    const validationError = validateHostForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    if (!isSignedIn) {
      setErrorMessage('Sign in to host a RepoSense meeting.');
      return;
    }
    if (selectedCollaboratorsForInvite.length === 0) {
      setErrorMessage('Select at least one collaborator with a valid email address.');
      return;
    }
    setShowInviteSummaryModal(true);
  };

  const handleJoinExisting = async () => {
    setErrorMessage('');
    const id = inputMeetingId.trim();
    if (!id) {
      setErrorMessage('Enter a meeting ID or short code.');
      return;
    }
    setJoiningMeeting(true);
    try {
      const meeting = await resolveMeeting(id);
      openMeetingInNewTab(meeting.id);
    } catch (err) {
      setErrorMessage(normalizeErrorMessage(err.message || 'Meeting not found.'));
    } finally {
      setJoiningMeeting(false);
    }
  };

  const handleSendSingleInvite = async (collab) => {
    if (!isValidEmail(collab.email)) {
      setErrorMessage(`No valid email for ${collab.name}. Add an email first.`);
      return;
    }
    if (!createdMeeting) {
      setErrorMessage('Create a meeting before sending invitations.');
      return;
    }

    setSendingSingleId(collab.id);
    setCollaborators((prev) =>
      prev.map((c) =>
        c.id === collab.id ? { ...c, invitationStatus: INVITATION_STATUS.SENDING } : c,
      ),
    );

    try {
      const token = await getAuthToken();
      const result = await sendMeetingInvitations(
        createdMeeting.id,
        {
          hostEmail: hostEmail.trim(),
          hostName: hostName.trim(),
          repoName,
          externalMeetingUrl: externalMeetingUrl.trim() || undefined,
          recipients: [
            {
              email: collab.email,
              name: collab.name,
              githubLogin: collab.githubLogin,
              emailSource: collab.emailSource,
            },
          ],
        },
        token,
      );
      applyInviteResults(result.recipients);
      setInviteNotification(`Invitation sent to ${collab.name} (${collab.email}).`);
      setTimeout(() => setInviteNotification(''), 6000);
    } catch (err) {
      setCollaborators((prev) =>
        prev.map((c) =>
          c.id === collab.id ? { ...c, invitationStatus: INVITATION_STATUS.FAILED } : c,
        ),
      );
      setErrorMessage(normalizeErrorMessage(err.message));
    } finally {
      setSendingSingleId(null);
    }
  };

  const handleAutoLog = (collab) => {
    const meetingId = createdMeeting?.id || 'pending';
    const shortCode = createdMeeting?.short_code || '—';
    const entry = {
      id: Date.now(),
      recipient: collab.email || collab.name,
      meetingId,
      shortCode,
      status: collab.invitationStatus,
      timestamp: new Date().toISOString(),
      sender: hostEmail,
      error: collab.invitationStatus === INVITATION_STATUS.FAILED ? 'Delivery failed' : null,
    };
    setAutoLogEntries((prev) => [entry, ...prev].slice(0, 20));
    setInviteNotification(`Invitation logged for ${collab.name}${collab.email ? ` (${collab.email})` : ''}.`);
    setTimeout(() => setInviteNotification(''), 5000);
  };

  const handleAddCollaborator = (e) => {
    e.preventDefault();
    setAddEmailError('');
    if (!newCollabName.trim()) {
      setAddEmailError('Name is required.');
      return;
    }
    if (!isValidEmail(newCollabEmail)) {
      setAddEmailError('Enter a valid email address.');
      return;
    }
    const normalized = newCollabEmail.trim().toLowerCase();
    if (collaborators.some((c) => c.email?.toLowerCase() === normalized)) {
      setAddEmailError('This email is already in the list.');
      return;
    }

    setCollaborators((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        name: newCollabName.trim(),
        githubLogin: null,
        email: newCollabEmail.trim(),
        emailSource: 'manual',
        role: newCollabRole,
        avatarUrl: null,
        avatar: newCollabName.trim().charAt(0).toUpperCase(),
        invitationStatus: INVITATION_STATUS.NOT_SENT,
        inviteTime: null,
        isManual: true,
        isCurrentUser: false,
      },
    ]);
    setNewCollabName('');
    setNewCollabEmail('');
    setShowAddCollabModal(false);
  };

  const openMeetingInNewTab = (meetingId) => {
    if (!meetingId) return;
    const tab = openMeetingTabPlaceholder();
    navigateMeetingTab(tab, meetingId);
  };

  const enterMeeting = () => {
    if (createdMeeting?.id) {
      openMeetingInNewTab(createdMeeting.id);
    }
  };

  const busy = creatingMeeting || sendingInvites || joiningMeeting;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 animate-fade-in-up">
      {/* Toast notification */}
      {inviteNotification && (
        <div className="mb-6 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl shadow-lg flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="text-xl shrink-0" aria-hidden="true">📧</span>
            <p className="font-bold text-sm md:text-base truncate">{inviteNotification}</p>
          </div>
          <span className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-full font-bold shrink-0">
            Email Dispatch
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-2xl text-sm font-medium">
          {errorMessage}
        </div>
      )}

      {githubOAuthNotice && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-medium">
          {githubOAuthNotice}
        </div>
      )}

      <section className="mb-6 p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">GitHub connection</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Connect GitHub to load your repositories and collaborators automatically.
            </p>
          </div>
          {githubConnectionLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Checking GitHub connection…</p>
          ) : isGitHubConnected ? (
            <div className="flex items-center gap-3">
              {githubConnection?.github_user?.avatar_url && (
                <img
                  src={githubConnection.github_user.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700"
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  @{githubLogin || githubConnection?.github_user?.login}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Connected</p>
              </div>
              <button
                type="button"
                onClick={() => disconnectGitHub()}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:hover:text-red-400"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => connectGitHub()}
              className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              Connect GitHub
            </button>
          )}
        </div>

        {githubConnectionError && !isGitHubConnected && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{githubConnectionError}</p>
        )}

        {isGitHubConnected && (
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
            <label
              htmlFor="github-repo-select"
              className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
            >
              Your GitHub repositories
            </label>
            {reposLoading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading repositories…</p>
            ) : (
              <select
                id="github-repo-select"
                value={selectedRepoFullName}
                onChange={handleRepositorySelect}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Select a repository…</option>
                {repositories.map((repository) => {
                  const fullName = repository.full_name || repository.fullName;
                  return (
                    <option key={fullName} value={fullName}>
                      {fullName}
                      {repository.private ? ' (private)' : ''}
                    </option>
                  );
                })}
              </select>
            )}
            {reposError && (
              <div className="flex items-center gap-3 text-sm text-amber-700 dark:text-amber-300">
                <span>{reposError}</span>
                <button
                  type="button"
                  onClick={() => reloadRepositories()}
                  className="font-semibold text-blue-600 dark:text-blue-400 underline"
                >
                  Retry
                </button>
              </div>
            )}
            {!reposLoading && repositories.length === 0 && !reposError && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No repositories found for your GitHub account.
              </p>
            )}
          </div>
        )}
      </section>

      {!githubUrl && (
        <form
          onSubmit={handleApplyRepository}
          className="mb-6 p-6 bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/40 rounded-3xl shadow-lg space-y-3"
        >
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isGitHubConnected ? 'Or enter a repository manually' : 'Select a repository'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isGitHubConnected
              ? 'Use the dropdown above when possible. Manual entry remains available for repositories not listed.'
              : 'Connect GitHub above for the repository dropdown, or enter a repository URL manually.'}
          </p>
          {repoInputError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {repoInputError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repository or owner/repository"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button
              type="submit"
              disabled={collaboratorsLoading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shrink-0 disabled:opacity-50"
            >
              {collaboratorsLoading ? 'Loading…' : 'Load repository'}
            </button>
          </div>
        </form>
      )}

      {githubUrl && (
        <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
              Repository
            </p>
            <p className="font-semibold text-gray-900 dark:text-white">{repoSlug || repoName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{githubUrl}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearRepository();
              setActiveRepository(null);
              setSelectedGithubUrl('');
              setRepoInput('');
              setSelectedRepoFullName('');
              setCollaborators([]);
              setCollaboratorsError('Select a repository to load collaborators.');
            }}
            className="text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:underline shrink-0 self-start sm:self-center"
          >
            Change repository
          </button>
        </div>
      )}

      {inviteSummary && createdMeeting && (
        <div
          className="mb-6 p-6 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/50 rounded-3xl shadow-xl"
          role="status"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-2xl" aria-hidden="true">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg text-gray-900 dark:text-white">Meeting created successfully</p>
              <p className="text-base font-semibold text-gray-700 dark:text-gray-200 mt-1 truncate">
                {createdMeeting.title}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Meeting code:{' '}
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {createdMeeting.short_code}
                </span>
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 px-4 py-3">
                  <p className="text-emerald-700 dark:text-emerald-300 font-bold">✓ {inviteSummary.sent} sent</p>
                </div>
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-4 py-3">
                  <p className="text-amber-700 dark:text-amber-300 font-bold">
                    ⚠ {inviteSummary.email_unavailable} unavailable
                  </p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 px-4 py-3">
                  <p className="text-red-700 dark:text-red-300 font-bold">✕ {inviteSummary.failed} failed</p>
                </div>
              </div>

              {smtpEnabled === false && (
                <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
                  Email invitations are not configured on the server. Configure SMTP to deliver invitation emails.
                </p>
              )}

              <button
                type="button"
                onClick={enterMeeting}
                className="mt-5 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg transition-all"
              >
                Enter Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Host setup card */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                <VideoCameraIcon className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Host Setup &amp; Meeting Configuration
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure your user email credentials and session topic before launching.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Host Name
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Your display name"
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
                  placeholder="you@example.com"
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
                  value={externalMeetingUrl}
                  onChange={(e) => setExternalMeetingUrl(e.target.value)}
                  placeholder="https://… (Leave blank to use RepoSense LiveKit meeting link)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  If left blank, invitations send direct RepoSense meeting join links powered by LiveKit.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/60 mb-6 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Or Join Existing Meeting ID
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={inputMeetingId}
                  onChange={(e) => setInputMeetingId(e.target.value)}
                  placeholder="e.g. ABCD-EFGH or meeting UUID"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleJoinExisting}
                  disabled={!inputMeetingId.trim() || busy}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all disabled:opacity-50 shrink-0"
                >
                  {joiningMeeting ? 'Joining…' : 'Join Meeting'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequestBroadcast}
              disabled={busy}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-xl transition-all transform hover:scale-[1.01] flex items-center justify-center space-x-3 disabled:opacity-60 disabled:hover:scale-100"
            >
              <span>
                {creatingMeeting
                  ? 'Creating meeting…'
                  : sendingInvites
                    ? 'Sending invitations…'
                    : 'Host Meeting & Broadcast Collaborator Invites'}
              </span>
              <ArrowRightIcon />
            </button>
          </div>

          {autoLogEntries.length > 0 && (
            <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                Invitation Auto Log
              </h3>
              <ul className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-400 max-h-32 overflow-y-auto">
                {autoLogEntries.map((entry) => (
                  <li key={entry.id}>
                    [{entry.timestamp}] {entry.recipient} · {entry.shortCode} · {entry.status}
                    {entry.error ? ` · ${entry.error}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Collaborator panel */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-h-[520px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Repository Collaborators ({collaborators.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCollabModal(true)}
                className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-full font-bold transition-all"
              >
                + Add Email
              </button>
            </div>

            {collaboratorsLoading && (
              <p className="text-sm text-gray-500 py-8 text-center">Loading collaborators from GitHub…</p>
            )}

            {!collaboratorsLoading && collaboratorsError && (
              <div className="text-sm text-amber-700 dark:text-amber-300 py-4 space-y-2">
                <p>{collaboratorsError}</p>
                {collaboratorsReconnectRequired && (
                  <button
                    type="button"
                    onClick={() => connectGitHub()}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 underline"
                  >
                    Reconnect GitHub
                  </button>
                )}
                {isSignedIn && !collaboratorsReconnectRequired && (
                  <button type="button" onClick={loadCollaborators} className="text-blue-600 underline text-xs">
                    Retry
                  </button>
                )}
              </div>
            )}

            {!collaboratorsLoading && !collaboratorsError && collaboratorsLoadedMessage && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-3">{collaboratorsLoadedMessage}</p>
            )}

            {!collaboratorsLoading && !collaboratorsError && inviteableCollaborators.length > 0 && (
              <div className="flex items-center justify-between mb-3 gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {inviteableCollaborators.length} inviteable collaborator
                  {inviteableCollaborators.length === 1 ? '' : 's'}
                  {selectedInviteableCount > 0 && (
                    <span className="text-gray-700 dark:text-gray-200 font-semibold">
                      {' '}
                      · {selectedInviteableCount} selected
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  {selectableCollaborators.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectAllInviteable}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 underline"
                    >
                      {allSelectableSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                  {selectedInviteableCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-xs font-semibold text-gray-500 dark:text-gray-400 underline"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>
            )}

            {!collaboratorsLoading && !collaboratorsError && emailStats.total > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                {emailStats.withEmail} of {emailStats.total} collaborators have email addresses available.
              </p>
            )}

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {!collaboratorsLoading &&
                !collaboratorsError &&
                collaborators.map((c) => {
                  const isSelectable = !c.isCurrentUser && isValidEmail(c.email);
                  const isSelected = selectedCollaboratorIds.includes(c.id);
                  const selectionLabel = c.isCurrentUser
                    ? `${c.name} is the meeting host and cannot be invited`
                    : isValidEmail(c.email)
                      ? `Select ${c.name} for invitation`
                      : `${c.name} cannot be invited because email is unavailable`;

                  const checkboxId = `collaborator-select-${c.id}`;

                  return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border space-y-2.5 transition-colors ${
                      isSelected
                        ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {isSelectable ? (
                        <label
                          htmlFor={checkboxId}
                          className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCollaboratorSelection(c)}
                            aria-label={selectionLabel}
                            className="w-5 h-5 shrink-0 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          {c.avatarUrl ? (
                            <img
                              src={c.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {c.avatar}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {c.name}
                            </h4>
                            {c.githubLogin && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">@{c.githubLogin}</p>
                            )}
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                              {c.email}
                            </p>
                            {c.isManual && (
                              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                Manual email
                              </span>
                            )}
                          </div>
                        </label>
                      ) : (
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {!c.isCurrentUser && (
                            <input
                              type="checkbox"
                              checked={false}
                              disabled
                              aria-label={selectionLabel}
                              className="w-5 h-5 shrink-0 rounded border-gray-300 dark:border-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          )}
                          {c.avatarUrl ? (
                            <img
                              src={c.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full shrink-0 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {c.avatar}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {c.name}
                            </h4>
                            {c.githubLogin && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">@{c.githubLogin}</p>
                            )}
                            <p className={`text-xs font-mono truncate ${isValidEmail(c.email) ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {c.email || 'Email unavailable'}
                            </p>
                            {c.isManual && (
                              <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                Manual email
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 shrink-0">
                        {c.role}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/60 gap-2">
                      <span
                        className={`text-[11px] font-medium ${invitationStatusClass(c.invitationStatus)}`}
                      >
                        {invitationStatusDisplay(c.invitationStatus, c.inviteTime)}
                      </span>
                      {c.isCurrentUser ? (
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 shrink-0">
                          You&apos;re the meeting host
                        </span>
                      ) : (
                        <div
                          className="flex items-center space-x-1.5 shrink-0"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSendSingleInvite(c)}
                            disabled={
                              !isValidEmail(c.email) ||
                              sendingSingleId === c.id ||
                              !createdMeeting
                            }
                            title="Send invitation email via backend SMTP"
                            className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-40"
                          >
                            {sendingSingleId === c.id ? 'Sending…' : '📬 Send Mail'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAutoLog(c)}
                            className="text-[11px] px-2.5 py-1.5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all"
                            title="Log invitation status"
                          >
                            Auto Log
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}

              {!collaboratorsLoading && !collaboratorsError && collaborators.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No collaborators found for this repository.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
              All listed collaborators will receive meeting join details via backend email dispatches.
            </p>
          </div>
        </div>
      </div>

      <section className="mt-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Active Meetings</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">LiveKit rooms you have hosted in RepoSense.</p>
          </div>
          <button
            type="button"
            onClick={loadActiveMeetings}
            disabled={activeMeetingsLoading}
            className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            {activeMeetingsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {activeMeetingsError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{activeMeetingsError}</p>
        )}

        {endMeetingSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3" role="status">
            {endMeetingSuccess}
          </p>
        )}
        {endMeetingError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
            {endMeetingError}
          </p>
        )}

        {!activeMeetingsLoading && activeMeetings.length === 0 && !activeMeetingsError && (
          <p className="text-sm text-gray-500">No active meetings yet. Host a meeting above to get started.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMeetings.map((meeting) => {
            const participantCount = meeting.participants?.filter((p) => !p.left_at).length ?? 0;
            const isHost = user?.id && meeting.host_clerk_user_id === user.id;
            return (
              <div
                key={meeting.id}
                className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 dark:text-white truncate">{meeting.title}</p>
                  <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-1">{meeting.short_code}</p>
                  <p className="text-xs text-gray-500 mt-1">{participantCount} participant{participantCount === 1 ? '' : 's'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/meetings/${meeting.id}`}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl"
                  >
                    Join
                  </Link>
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => {
                        setEndMeetingError('');
                        setEndTargetMeeting(meeting);
                      }}
                      disabled={endingMeetingId === meeting.id}
                      className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-bold rounded-xl disabled:opacity-50"
                    >
                      {endingMeetingId === meeting.id ? 'Ending…' : 'End Meeting'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {endTargetMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">End meeting?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              End <span className="font-semibold">{endTargetMeeting.title}</span> ({endTargetMeeting.short_code}) for everyone? New joins will be rejected.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEndTargetMeeting(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndMeeting}
                disabled={Boolean(endingMeetingId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-50"
              >
                {endingMeetingId ? 'Ending…' : 'End Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Invitation Summary</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Review who will receive RepoSense meeting invitations before sending.
            </p>
            <ul className="space-y-2 text-sm mb-6">
              <li className="flex justify-between"><span>Collaborators</span><span className="font-bold">{invitePreview.total}</span></li>
              <li className="flex justify-between"><span>Valid email addresses</span><span className="font-bold text-emerald-600">{invitePreview.validEmail}</span></li>
              <li className="flex justify-between"><span>Email unavailable</span><span className="font-bold text-amber-600">{invitePreview.emailUnavailable}</span></li>
              <li className="flex justify-between"><span>Host skipped</span><span className="font-bold">{invitePreview.skippedHost}</span></li>
              <li className="flex justify-between"><span>Duplicates skipped</span><span className="font-bold">{invitePreview.skippedDuplicate}</span></li>
              <li className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2"><span>Will send</span><span className="font-bold text-blue-600">{invitePreview.willSend}</span></li>
            </ul>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowInviteSummaryModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleHostAndBroadcast}
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-50"
              >
                {busy ? 'Working…' : 'Send All Invitations'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add email modal */}
      {showAddCollabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleAddCollaborator}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-800"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add collaborator email</h3>
            {addEmailError && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">
                {addEmailError}
              </p>
            )}
            <div className="space-y-3">
              <input
                type="text"
                value={newCollabName}
                onChange={(e) => setNewCollabName(e.target.value)}
                placeholder="Name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="email"
                value={newCollabEmail}
                onChange={(e) => setNewCollabEmail(e.target.value)}
                placeholder="Email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <input
                type="text"
                value={newCollabRole}
                onChange={(e) => setNewCollabRole(e.target.value)}
                placeholder="Role"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowAddCollabModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 font-semibold text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
              >
                Add
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
