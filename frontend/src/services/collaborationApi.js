import { normalizeFetchError } from '../utils/apiError.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function buildHeaders(token, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const apiKey = import.meta.env.VITE_MEETING_API_KEY;
  if (apiKey) headers['X-Meeting-Api-Key'] = apiKey;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseError(response) {
  try {
    const body = await response.json();
    return body.detail || body.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function fetchRepositoryCollaborators(githubUrl, token) {
  const params = new URLSearchParams({ github_url: githubUrl });
  try {
    const response = await fetch(`${API_BASE_URL}/api/collaboration/collaborators?${params}`, {
      headers: buildHeaders(token),
    });
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, API_BASE_URL));
  }
}

export async function resolveMeeting(identifier) {
  const encoded = encodeURIComponent(identifier.trim());
  try {
    const response = await fetch(`${API_BASE_URL}/api/meetings/resolve/${encoded}`);
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, API_BASE_URL));
  }
}

export async function sendMeetingInvitations(meetingId, payload, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/meetings/${meetingId}/invitations`, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify({
        host_email: payload.hostEmail,
        host_name: payload.hostName,
        repo_name: payload.repoName,
        custom_message: payload.customMessage || undefined,
        external_meeting_url: payload.externalMeetingUrl || undefined,
        recipients: payload.recipients.map((r) => ({
          email: r.email || undefined,
          name: r.name,
          github_login: r.githubLogin || undefined,
          email_source: r.emailSource || undefined,
        })),
      }),
    });
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, API_BASE_URL));
  }
}

export const INVITATION_STATUS = {
  NOT_SENT: 'NOT_SENT',
  SENDING: 'SENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
  EMAIL_UNAVAILABLE: 'EMAIL_UNAVAILABLE',
  SKIPPED_HOST: 'SKIPPED_HOST',
  SKIPPED_DUPLICATE: 'SKIPPED_DUPLICATE',
};

export function statusLabel(status) {
  switch (status) {
    case INVITATION_STATUS.SENT:
      return 'Sent';
    case INVITATION_STATUS.SENDING:
      return 'Sending…';
    case INVITATION_STATUS.FAILED:
      return 'Failed';
    case INVITATION_STATUS.EMAIL_UNAVAILABLE:
      return 'Email unavailable';
    case INVITATION_STATUS.SKIPPED_HOST:
      return 'Skipped (host)';
    case INVITATION_STATUS.SKIPPED_DUPLICATE:
      return 'Skipped (duplicate)';
    default:
      return 'Not sent';
  }
}

export function isValidEmail(value) {
  if (!value || !value.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
