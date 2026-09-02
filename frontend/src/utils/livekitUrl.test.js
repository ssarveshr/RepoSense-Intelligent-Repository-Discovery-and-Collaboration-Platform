import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatLiveKitConnectError, normalizeLiveKitUrl, resolveLiveKitUrl } from './livekitUrl.js';

describe('livekitUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizes wss URLs and strips trailing slash', () => {
    expect(normalizeLiveKitUrl('wss://reposense-meetings-18f7x8bu.livekit.cloud/')).toBe(
      'wss://reposense-meetings-18f7x8bu.livekit.cloud',
    );
  });

  it('converts https to wss', () => {
    expect(normalizeLiveKitUrl('https://reposense-meetings-18f7x8bu.livekit.cloud')).toBe(
      'wss://reposense-meetings-18f7x8bu.livekit.cloud',
    );
  });

  it('rejects invalid values', () => {
    expect(normalizeLiveKitUrl('')).toBeNull();
    expect(normalizeLiveKitUrl('not-a-url')).toBeNull();
  });

  it('prefers join response URL over env fallback', () => {
    vi.stubEnv('VITE_LIVEKIT_URL', 'wss://fallback.livekit.cloud');
    expect(
      resolveLiveKitUrl({ livekit_url: 'wss://reposense-meetings-18f7x8bu.livekit.cloud' }),
    ).toBe('wss://reposense-meetings-18f7x8bu.livekit.cloud');
  });

  it('maps invalid token errors to a safe user message', () => {
    expect(formatLiveKitConnectError(new Error('could not establish signal connection: invalid token'))).toMatch(
      /invalid access token/i,
    );
  });
});
