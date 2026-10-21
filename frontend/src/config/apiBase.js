import { normalizeFetchError } from '../utils/apiError.js';
import {
  AuthenticationRequiredError,
  resolveClerkBearerToken,
} from './clerkTokenProvider.js';

export { AuthenticationRequiredError, resolveClerkBearerToken };

const LOCAL_DEV_API_BASE_URL = 'http://localhost:8000';

export class ApiConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

export function parseAbsoluteHttpUrl(value) {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\/+$/, '');
  if (!cleaned) return null;
  try {
    const parsed = new URL(cleaned);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return cleaned;
  } catch {
    return null;
  }
}

export function resolveApiBaseUrl({ viteUrl, isDev }) {
  const viteRaw = typeof viteUrl === 'string' ? viteUrl.trim() : '';
  if (viteRaw) {
    const vite = parseAbsoluteHttpUrl(viteRaw);
    if (!vite) {
      throw new ApiConfigurationError(
        `VITE_API_BASE_URL is not a valid absolute HTTP/HTTPS URL: "${viteUrl}".`,
      );
    }
    return vite;
  }

  if (isDev) {
    return LOCAL_DEV_API_BASE_URL;
  }

  throw new ApiConfigurationError(
    'RepoSense API URL is not configured. Set VITE_API_BASE_URL to an absolute HTTP/HTTPS URL before building the app.',
  );
}

/**
 * Public backend URL for all RepoSense API requests.
 * Reads VITE_API_BASE_URL (baked in at Vite start / production build).
 */
export function getApiBaseUrl() {
  return resolveApiBaseUrl({
    viteUrl: import.meta.env.VITE_API_BASE_URL,
    isDev: Boolean(import.meta.env.DEV),
  });
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
    if (error instanceof ApiConfigurationError) throw error;
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
