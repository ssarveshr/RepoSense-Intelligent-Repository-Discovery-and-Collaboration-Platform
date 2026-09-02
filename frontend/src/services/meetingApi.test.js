import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createMeeting, listMeetings } from './meetingApi.js';

describe('meetingApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'meet-1', host_clerk_user_id: 'user_test' }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('sends Clerk Bearer token without X-Meeting-Api-Key', async () => {
    await createMeeting({ title: 'Test Meeting', hostDisplayName: 'Host' }, 'clerk-jwt-token');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/meetings');
    expect(options.headers.Authorization).toBe('Bearer clerk-jwt-token');
    expect(options.headers['X-Meeting-Api-Key']).toBeUndefined();
  });

  it('listMeetings uses authenticated fetch wrapper', async () => {
    await listMeetings('clerk-jwt-token');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/api/meetings');
    expect(options.method ?? 'GET').toBe('GET');
    expect(options.headers.Authorization).toBe('Bearer clerk-jwt-token');
  });
});
