import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { getGitHubConnection } from './githubApi.js';

describe('githubApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ connected: true }),
      }),
    );
  });

  afterEach(() => {
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
});
