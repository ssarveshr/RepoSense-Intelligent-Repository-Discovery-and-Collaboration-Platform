import { describe, it, expect } from 'vitest';
import {
  normalizeActiveSpeakerIdentities,
  parseCaptionMessage,
  parseChatMessage,
  parseLiveKitDataPayload,
  parseRaiseHandMessage,
  parseReactionMessage,
} from './livekitClient.js';

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

describe('livekitClient data messages', () => {
  it('parses reaction payloads safely', () => {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'reaction', emoji: '👍', sender: 'Alice', identity: 'alice-1' }),
    );
    const parsed = parseLiveKitDataPayload(payload);
    expect(parseReactionMessage(parsed, null)).toEqual({
      identity: 'alice-1',
      emoji: '👍',
      sender: 'Alice',
    });
  });

  it('parses raise-hand payloads safely', () => {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'raise-hand', raised: true, identity: 'guest-2' }),
    );
    const parsed = parseLiveKitDataPayload(payload);
    expect(parseRaiseHandMessage(parsed, null)).toEqual({
      identity: 'guest-2',
      raised: true,
    });
  });

  it('ignores malformed payloads', () => {
    expect(parseLiveKitDataPayload(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(parseReactionMessage({ type: 'reaction' }, null)).toBeNull();
    expect(parseRaiseHandMessage({ type: 'raise-hand' }, null)).toBeNull();
    expect(parseChatMessage({ type: 'chat' }, null)).toBeNull();
    expect(parseChatMessage({ type: 'chat', text: '   ' }, null)).toBeNull();
  });

  it('parses chat payloads safely', () => {
    const payload = new TextEncoder().encode(
      JSON.stringify({ type: 'chat', text: 'hello', sender: 'Alice' }),
    );
    const parsed = parseLiveKitDataPayload(payload);
    expect(parseChatMessage(parsed, null)).toEqual({ sender: 'Alice', text: 'hello' });
  });

  it('parses caption payloads safely and ignores malformed caption data', () => {
    expect(parseCaptionMessage({ type: 'caption', text: 'Hello there', identity: 'guest-1', sender: 'Alice' }, null)).toEqual({
      identity: 'guest-1',
      sender: 'Alice',
      text: 'Hello there',
      final: true,
    });
    expect(parseCaptionMessage({ type: 'caption' }, null)).toBeNull();
    expect(parseCaptionMessage({ type: 'caption', text: '   ', identity: 'guest-1' }, null)).toBeNull();
  });

  it('participant connect events cannot corrupt activeSpeakers storage contract', () => {
    const fakeParticipantEvent = { identity: 'guest-phone', name: 'Phone', sid: 'PA_123' };
    const speakers = normalizeActiveSpeakerIdentities(fakeParticipantEvent);
    expect(Array.isArray(speakers)).toBe(true);
    expect(speakers.includes('guest-phone')).toBe(true);
    expect(speakers.includes(fakeParticipantEvent)).toBe(false);
  });
});
