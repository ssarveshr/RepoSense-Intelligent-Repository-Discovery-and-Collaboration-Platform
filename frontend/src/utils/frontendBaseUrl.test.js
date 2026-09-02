import { describe, it, expect, afterEach, vi } from 'vitest';
import { buildMeetJoinUrl, getPublicFrontendBaseUrl } from './frontendBaseUrl.js';

describe('frontendBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses configured VITE_FRONTEND_BASE_URL when set', () => {
    vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://example.trycloudflare.com');
    expect(getPublicFrontendBaseUrl()).toBe('https://example.trycloudflare.com');
  });

  it('strips trailing slash from configured base URL', () => {
    vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://example.trycloudflare.com/');
    expect(getPublicFrontendBaseUrl()).toBe('https://example.trycloudflare.com');
  });

  it('falls back to window.location.origin when env is unset', () => {
    vi.stubEnv('VITE_FRONTEND_BASE_URL', '');
    expect(getPublicFrontendBaseUrl()).toBe(window.location.origin);
  });

  it('builds meet join URLs from short codes', () => {
    vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://example.trycloudflare.com');
    expect(buildMeetJoinUrl('ABCD-EFGH')).toBe('https://example.trycloudflare.com/meet/join/ABCD-EFGH');
  });
});
