import { fetchAuthenticatedApi, getApiBaseUrl, parseApiError } from '../config/apiBase.js';
import { normalizeFetchError } from '../utils/apiError.js';

function buildHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', ...extra };
}

async function parseError(response) {
  try {
    const body = await response.json();
    return body.detail || body.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

async function parseJsonResponse(response) {
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function createMeeting(payload, token) {
  const response = await fetchAuthenticatedApi(
    '/api/meetings',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    token,
  );
  return parseJsonResponse(response);
}

export async function listMeetings(token) {
  const response = await fetchAuthenticatedApi('/api/meetings', { method: 'GET' }, token);
  return parseJsonResponse(response);
}

export async function getUserProfile(token) {
  const response = await fetchAuthenticatedApi('/api/profile', { method: 'GET' }, token);
  return parseJsonResponse(response);
}

export async function updateUserProfile(token, payload) {
  const response = await fetchAuthenticatedApi(
    '/api/profile',
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  );
  return parseJsonResponse(response);
}

export async function getProfileActivity(token) {
  const response = await fetchAuthenticatedApi('/api/profile/activity', { method: 'GET' }, token);
  return parseJsonResponse(response);
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

export async function getMeeting(meetingId, token) {
  const response = await fetchAuthenticatedApi(`/api/meetings/${meetingId}`, { method: 'GET' }, token);
  return parseJsonResponse(response);
}

export async function getMeetingParticipants(meetingId, { token, participantId, participantToken } = {}) {
  const extraHeaders = {};
  if (participantId) extraHeaders['X-Participant-Id'] = participantId;
  if (participantToken) extraHeaders['X-Participant-Token'] = participantToken;
  const response = await fetchAuthenticatedApi(
    `/api/meetings/${meetingId}/participants`,
    {
      method: 'GET',
      headers: extraHeaders,
    },
    token,
  );
  return parseJsonResponse(response);
}

export async function joinMeeting(meetingId, { displayName, passcode }) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}/api/meetings/${meetingId}/join`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        display_name: displayName,
        passcode: passcode || undefined,
      }),
    });
    return parseJsonResponse(response);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Request failed')) {
      throw error;
    }
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function leaveMeeting(meetingId, participantId, participantToken) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}/api/meetings/${meetingId}/leave`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        participant_id: participantId,
        participant_token: participantToken,
      }),
    });
    return parseJsonResponse(response);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Request failed')) {
      throw error;
    }
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

/**
 * Best-effort leave during tab close / navigation unload.
 * sendBeacon accepts a JSON Blob POST body; no custom headers (API key not included).
 */
export function beaconLeaveMeeting(meetingId, participantId, participantToken) {
  const url = `${getApiBaseUrl()}/api/meetings/${meetingId}/leave`;
  const payload = JSON.stringify({
    participant_id: participantId,
    participant_token: participantToken,
  });

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    return navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
  }

  if (typeof fetch !== 'undefined') {
    fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: payload,
      keepalive: true,
    }).catch(() => {});
    return true;
  }

  return false;
}

export async function endMeeting(meetingId, token) {
  const response = await fetchAuthenticatedApi(
    `/api/meetings/${meetingId}/end`,
    { method: 'POST' },
    token,
  );
  return parseJsonResponse(response);
}
