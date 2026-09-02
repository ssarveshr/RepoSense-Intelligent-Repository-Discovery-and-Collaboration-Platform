import { normalizeFetchError } from '../utils/apiError.js';
import {
  AuthenticationRequiredError,
  resolveClerkBearerToken,
} from './clerkTokenProvider.js';

export { AuthenticationRequiredError, resolveClerkBearerToken };

const DEFAULT_API_BASE_URL = 'http://localhost:8000';

function normalizeConfiguredApiBaseUrl(configured) {
  const cleaned = configured.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('invalid protocol');
    }
    return cleaned;
  } catch {
    if (import.meta.env.DEV) {
      console.warn(
        `[RepoSense] VITE_API_BASE_URL is not a valid absolute HTTP/HTTPS URL: "${configured}". ` +
          `Using ${DEFAULT_API_BASE_URL} instead.`,
      );
    }
    return DEFAULT_API_BASE_URL;
  }
}

/**
 * Public backend URL for all RepoSense API requests.
 * Set VITE_API_BASE_URL to your public backend URL during remote development.
 */
export function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return normalizeConfiguredApiBaseUrl(configured);
  }
  return DEFAULT_API_BASE_URL;
}

export function buildApiHeaders(token, extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (typeof token === 'string' && token.length > 0) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch a protected RepoSense API route with a Clerk Bearer token.
 * Pass tokenOverride only in tests; production callers rely on the centralized resolver.
 */
export async function fetchAuthenticatedApi(path, options = {}, tokenOverride) {
  const token =
    typeof tokenOverride === 'string' && tokenOverride.length > 0
      ? tokenOverride
      : await resolveClerkBearerToken();
  if (!token) {
    throw new AuthenticationRequiredError();
  }
  return fetchFromApi(path, options, token);
}

/** Centralized fetch wrapper — uses getApiBaseUrl() and buildApiHeaders(). */
export async function fetchFromApi(path, options = {}, token) {
  const apiBaseUrl = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const { headers: extraHeaders, ...rest } = options;
  try {
    return await fetch(url, {
      ...rest,
      headers: buildApiHeaders(token, extraHeaders),
    });
  } catch (error) {
    throw new Error(normalizeFetchError(error, apiBaseUrl));
  }
}

export async function parseApiError(response) {
  try {
    const body = await response.json();
    if (typeof body.detail === 'string') return body.detail;
    if (typeof body.message === 'string') return body.message;
    return `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}
