import { fetchAuthenticatedApi, getApiBaseUrl, parseApiError } from '../config/apiBase.js';
import { normalizeFetchError } from '../utils/apiError.js';
import { GitHubRequestError, parseStructuredApiError } from '../utils/githubError.js';
async function parseError(response) {
  try {
    const body = await response.json();
    return body.detail || body.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) {
    try {
      await parseStructuredApiError(response);
    } catch (error) {
      if (error instanceof GitHubRequestError) {
        throw error;
      }
      throw new Error(await parseError(response));
    }
  }
  return response.json();
}

export async function fetchRepositoryCollaborators(githubUrl, token) {
  const params = new URLSearchParams({ github_url: githubUrl });
  try {
    const response = await fetchAuthenticatedApi(
      `/api/collaboration/collaborators?${params}`,
      { method: 'GET' },
      token,
    );
    return parseJsonResponse(response);
  } catch (error) {
    if (error?.name === 'AuthenticationRequiredError' || error instanceof GitHubRequestError) {
      throw error;
    }
    throw new Error(normalizeFetchError(error, getApiBaseUrl()));
  }
}

export async function resolveMeeting(identifier) {
  const encoded = encodeURIComponent(identifier.trim());
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}/api/meetings/resolve/${encoded}`);
    return parseJsonResponse(response);
  } catch (error) {
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function sendMeetingInvitations(meetingId, payload, token) {
  try {
    const response = await fetchAuthenticatedApi(
      `/api/meetings/${meetingId}/invitations`,
      {
        method: 'POST',
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
      },
      token,
    );
    return parseJsonResponse(response);
  } catch (error) {
    throw new Error(normalizeFetchError(error, getApiBaseUrl()));
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
