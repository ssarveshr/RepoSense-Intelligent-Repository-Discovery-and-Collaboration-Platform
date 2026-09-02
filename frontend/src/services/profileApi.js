import { fetchAuthenticatedApi, getApiBaseUrl, parseApiError } from '../config/apiBase.js';
import { normalizeFetchError } from '../utils/apiError.js';

async function parseError(response) {
  return parseApiError(response);
}

export async function getUserProfile(token) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi('/api/profile', { method: 'GET' }, token);
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function updateUserProfile(token, payload) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi(
      '/api/profile',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      token,
    );
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function syncGitHubUsername(token, githubUsername) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi(
      '/api/profile/github-sync',
      {
        method: 'POST',
        body: JSON.stringify({ github_username: githubUsername }),
      },
      token,
    );
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function getGitHubProfile(token) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi('/api/github/user', { method: 'GET' }, token);
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}
