import { describe, it, expect } from 'vitest';
import { normalizeActiveSpeakerIdentities } from './livekitClient.js';

describe('livekitClient active speaker normalization', () => {
  it('returns string identities from an array of strings', () => {
    expect(normalizeActiveSpeakerIdentities(['host-1', 'guest-2'])).toEqual(['host-1', 'guest-2']);
  });

  it('extracts identity fields from participant-like objects', () => {
    expect(
      normalizeActiveSpeakerIdentities([
        { identity: 'host-1', name: 'Host' },
        { identity: 'guest-2', name: 'Guest' },
      ]),
    ).toEqual(['host-1', 'guest-2']);
  });

  it('normalizes a single participant object passed by mistake', () => {
    expect(normalizeActiveSpeakerIdentities({ identity: 'guest-phone', name: 'Phone' })).toEqual([
      'guest-phone',
    ]);
  });

  it('returns an empty array for invalid values', () => {
    expect(normalizeActiveSpeakerIdentities(null)).toEqual([]);
    expect(normalizeActiveSpeakerIdentities(undefined)).toEqual([]);
    expect(normalizeActiveSpeakerIdentities({})).toEqual([]);
  });

  it('always returns an array with includes()', () => {
    const speakers = normalizeActiveSpeakerIdentities({ identity: 'guest-phone', name: 'Phone' });
    expect(Array.isArray(speakers)).toBe(true);
    expect(speakers.includes('guest-phone')).toBe(true);
  });
});
