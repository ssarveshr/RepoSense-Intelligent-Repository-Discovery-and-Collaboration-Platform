import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  clearClerkTokenProvider,
  registerClerkTokenProvider,
  updateClerkAuthSnapshot,
} from '../config/clerkTokenProvider.js';
import { getGitHubConnection, listGitHubRepositories } from './githubApi.js';

describe('githubApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ connected: true, repositories: [] }),
      }),
    );
    updateClerkAuthSnapshot({ isLoaded: true, isSignedIn: true });
  });

  afterEach(() => {
    clearClerkTokenProvider();
    updateClerkAuthSnapshot({ isLoaded: false, isSignedIn: false });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends Clerk Bearer token to /api/github/connection', async () => {
    await getGitHubConnection('clerk-jwt-token');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/github/connection');
    expect(options.headers.Authorization).toBe('Bearer clerk-jwt-token');
  });

  it('resolves Clerk Bearer token for /api/github/repositories', async () => {
    registerClerkTokenProvider(vi.fn().mockResolvedValue('provider-token'));

    await listGitHubRepositories({ page: 1, perPage: 30 });

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/github/repositories?page=1&per_page=30');
    expect(options.headers.Authorization).toBe('Bearer provider-token');
  });

  it('throws AuthenticationRequiredError when repositories request has no Clerk token', async () => {
    registerClerkTokenProvider(vi.fn().mockResolvedValue(null));

    await expect(listGitHubRepositories()).rejects.toMatchObject({
      name: 'AuthenticationRequiredError',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces structured GitHub not-connected errors from repositories endpoint', async () => {
    registerClerkTokenProvider(vi.fn().mockResolvedValue('provider-token'));
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        detail: {
          code: 'GITHUB_NOT_CONNECTED',
          message: 'Connect your GitHub account to access repositories.',
          reconnect_required: true,
        },
      }),
    });

    await expect(listGitHubRepositories()).rejects.toMatchObject({
      name: 'GitHubRequestError',
      code: 'GITHUB_NOT_CONNECTED',
      reconnectRequired: true,
    });
  });
});
