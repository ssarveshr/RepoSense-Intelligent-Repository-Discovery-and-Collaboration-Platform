import { fetchAuthenticatedApi, getApiBaseUrl, parseApiError } from '../config/apiBase.js';
import { normalizeFetchError } from '../utils/apiError.js';
import { GitHubRequestError, parseStructuredApiError } from '../utils/githubError.js';

async function parseError(response) {
  return parseApiError(response);
}

export async function getGitHubConnection(token) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi('/api/github/connection', { method: 'GET' }, token);
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    if (error?.name === 'AuthenticationRequiredError') {
      throw error;
    }
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function startGitHubOAuth(token) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi(
      '/api/github/oauth/authorize',
      { method: 'GET' },
      token,
    );
    if (!response.ok) throw new Error(await parseError(response));
    const body = await response.json();
    if (!body.authorization_url) {
      throw new Error('GitHub authorization could not be started.');
    }
    window.location.assign(body.authorization_url);
  } catch (error) {
    if (error?.name === 'AuthenticationRequiredError') {
      throw error;
    }
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function disconnectGitHub(token) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetchAuthenticatedApi(
      '/api/github/connection',
      { method: 'DELETE' },
      token,
    );
    if (!response.ok) throw new Error(await parseError(response));
    return response.json();
  } catch (error) {
    if (error?.name === 'AuthenticationRequiredError') {
      throw error;
    }
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function listGitHubRepositories({ page = 1, perPage = 30 } = {}, tokenOverride) {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    const response = await fetchAuthenticatedApi(
      `/api/github/repositories?${params}`,
      { method: 'GET' },
      tokenOverride,
    );
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
  } catch (error) {
    if (error?.name === 'AuthenticationRequiredError' || error instanceof GitHubRequestError) {
      throw error;
    }
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export function isGitHubReconnectError(message) {
  if (!message) return false;
  return /connect your github|reconnect github|github connection has expired|github connection required/i.test(
    message,
  );
}
