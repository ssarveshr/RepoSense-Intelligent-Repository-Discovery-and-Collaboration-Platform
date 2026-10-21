import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  ApiConfigurationError,
  buildApiHeaders,
  fetchFromApi,
  getApiBaseUrl,
  resolveApiBaseUrl,
} from './apiBase.js';

describe('apiBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses explicit VITE_API_BASE_URL and strips trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('uses an explicit localhost API URL for local development', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8000');
    expect(getApiBaseUrl()).toBe('http://localhost:8000');
  });

  it('defaults to localhost only in development when configuration is unset', () => {
    expect(resolveApiBaseUrl({ viteUrl: '', isDev: true })).toBe('http://localhost:8000');
  });

  it('throws a configuration error in production when no API URL is set', () => {
    expect(() => resolveApiBaseUrl({ viteUrl: '', isDev: false })).toThrow(ApiConfigurationError);
    expect(() => resolveApiBaseUrl({ viteUrl: '', isDev: false })).toThrow(/VITE_API_BASE_URL/);
  });

  it('throws when VITE_API_BASE_URL is invalid instead of using a stale fallback', () => {
    expect(() => resolveApiBaseUrl({ viteUrl: 'not-a-url', isDev: true })).toThrow(
      /not a valid absolute HTTP\/HTTPS URL/,
    );
  });

  it('does not fetch runtime-config.json', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await fetchFromApi('/trending');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/trending');
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('runtime-config'))).toBe(false);
  });

  it('does not read the API URL from localStorage or sessionStorage', () => {
    const localSpy = vi.spyOn(Storage.prototype, 'getItem');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
    expect(localSpy).not.toHaveBeenCalled();
    localSpy.mockRestore();
  });

  it('buildApiHeaders adds Bearer token when provided', () => {
    const headers = buildApiHeaders('jwt-token');
    expect(headers.Authorization).toBe('Bearer jwt-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('buildApiHeaders omits Authorization when token is absent', () => {
    const headers = buildApiHeaders();
    expect(headers.Authorization).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });
});
