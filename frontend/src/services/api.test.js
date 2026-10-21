import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchTrending, searchRepositories, summarizeRepo } from './api.js';

describe('discovery api client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends trending and search requests to the centralized API base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchTrending();
    await searchRepositories('react charts');
    await summarizeRepo('https://github.com/example/repo');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/trending');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.example.com/search?q=react%20charts');
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.example.com/summarize-github');
  });
});
