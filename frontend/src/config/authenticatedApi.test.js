import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  clearClerkTokenProvider,
  registerClerkTokenProvider,
  resolveClerkBearerToken,
  updateClerkAuthSnapshot,
} from './clerkTokenProvider.js';
import { fetchAuthenticatedApi, buildApiHeaders } from './apiBase.js';

describe('clerkTokenProvider readiness', () => {
  afterEach(() => {
    clearClerkTokenProvider();
    updateClerkAuthSnapshot({ isLoaded: false, isSignedIn: false });
  });

  it('does not call the provider while Clerk is still loading', async () => {
    const provider = vi.fn().mockResolvedValue('token');
    registerClerkTokenProvider(provider);
    updateClerkAuthSnapshot({ isLoaded: false, isSignedIn: false });

    const token = await resolveClerkBearerToken({ retries: 1, retryDelayMs: 1 });

    expect(token).toBeNull();
    expect(provider).not.toHaveBeenCalled();
  });

  it('does not retry when the user is signed out', async () => {
    const provider = vi.fn().mockResolvedValue('token');
    registerClerkTokenProvider(provider);
    updateClerkAuthSnapshot({ isLoaded: true, isSignedIn: false });

    const token = await resolveClerkBearerToken({ retries: 3, retryDelayMs: 1 });

    expect(token).toBeNull();
    expect(provider).not.toHaveBeenCalled();
  });

  it('retries until a token is available after Clerk is ready', async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('retry-token');
    registerClerkTokenProvider(provider);
    updateClerkAuthSnapshot({ isLoaded: true, isSignedIn: true });

    const token = await resolveClerkBearerToken({ retries: 2, retryDelayMs: 1 });

    expect(token).toBe('retry-token');
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it('uses skipCache on retry attempts for token refresh', async () => {
    const provider = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('fresh-token');
    registerClerkTokenProvider(provider);
    updateClerkAuthSnapshot({ isLoaded: true, isSignedIn: true });

    await resolveClerkBearerToken({ retries: 2, retryDelayMs: 1 });

    expect(provider.mock.calls[0][0]).toEqual({ skipCache: false });
    expect(provider.mock.calls[1][0]).toEqual({ skipCache: true });
  });
});

describe('fetchAuthenticatedApi', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    );
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    updateClerkAuthSnapshot({ isLoaded: true, isSignedIn: true });
  });

  afterEach(() => {
    clearClerkTokenProvider();
    updateClerkAuthSnapshot({ isLoaded: false, isSignedIn: false });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('includes Authorization Bearer when token override is provided', async () => {
    await fetchAuthenticatedApi('/api/meetings', { method: 'GET' }, 'clerk-jwt-token');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/meetings');
    expect(options.headers.Authorization).toBe('Bearer clerk-jwt-token');
  });

  it('resolves Clerk token from the registered provider', async () => {
    registerClerkTokenProvider(vi.fn().mockResolvedValue('provider-token'));

    await fetchAuthenticatedApi('/api/github/connection', { method: 'GET' });

    expect(fetch).toHaveBeenCalledOnce();
    const [, options] = fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer provider-token');
  });

  it('does not send a network request when no Clerk token is available', async () => {
    registerClerkTokenProvider(vi.fn().mockResolvedValue(null));

    await expect(fetchAuthenticatedApi('/api/meetings')).rejects.toMatchObject({
      name: 'AuthenticationRequiredError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not treat undefined token override as an authenticated request', async () => {
    registerClerkTokenProvider(vi.fn().mockResolvedValue(null));

    await expect(fetchAuthenticatedApi('/api/meetings', {}, undefined)).rejects.toMatchObject({
      name: 'AuthenticationRequiredError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('buildApiHeaders', () => {
  it('omits Authorization for empty token strings', () => {
    const headers = buildApiHeaders('');
    expect(headers.Authorization).toBeUndefined();
  });
});
