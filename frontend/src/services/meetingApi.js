import { normalizeFetchError } from '../utils/apiError.js';

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
}

function buildHeaders(token, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
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

async function request(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Request failed')) {
      throw error;
    }
    throw new Error(normalizeFetchError(error, getApiBaseUrl()));
  }
}

export async function createMeeting(payload, token) {
  return request(`${getApiBaseUrl()}/api/meetings`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function listMeetings(token) {
  return request(`${getApiBaseUrl()}/api/meetings`, {
    headers: buildHeaders(token),
  });
}

export async function getUserProfile(token) {
  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function updateUserProfile(token, payload) {
  const response = await fetch(`${getApiBaseUrl()}/api/profile`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getProfileActivity(token) {
  const response = await fetch(`${getApiBaseUrl()}/api/profile/activity`, {
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function resolveMeeting(identifier) {
  const encoded = encodeURIComponent(identifier.trim());
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/resolve/${encoded}`);
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getMeeting(meetingId, token) {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${meetingId}`, {
    headers: buildHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function getMeetingParticipants(meetingId, { token, participantId, participantToken } = {}) {
  const headers = buildHeaders(token);
  if (participantId) headers['X-Participant-Id'] = participantId;
  if (participantToken) headers['X-Participant-Token'] = participantToken;
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${meetingId}/participants`, { headers });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function joinMeeting(meetingId, { displayName, passcode }) {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${meetingId}/join`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      display_name: displayName,
      passcode: passcode || undefined,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function leaveMeeting(meetingId, participantId, participantToken) {
  const response = await fetch(`${getApiBaseUrl()}/api/meetings/${meetingId}/leave`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      participant_id: participantId,
      participant_token: participantToken,
    }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
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
  return request(`${getApiBaseUrl()}/api/meetings/${meetingId}/end`, {
    method: 'POST',
    headers: buildHeaders(token),
  });
}
