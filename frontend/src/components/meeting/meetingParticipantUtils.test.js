import { describe, it, expect } from 'vitest';
import { Track } from '../../services/livekitClient';
import {
  buildRemoteParticipantTiles,
  buildPanelParticipants,
  assertParticipantCountConsistency,
  countLiveParticipants,
  getActiveParticipantCount,
  isActiveSpeaker,
  isParticipantMuted,
  listRemoteParticipants,
  normalizeActiveSpeakerIdentities as reexportedNormalize,
  participantStream,
} from './meetingParticipantUtils';

function createMockParticipant({
  identity,
  name,
  cameraTrack = null,
  screenTrack = null,
  microphoneMuted = true,
  broken = false,
} = {}) {
  const publications = new Map();
  if (cameraTrack) publications.set('camera', { source: 'camera', track: { mediaStreamTrack: cameraTrack }, isMuted: false });
  if (screenTrack) publications.set('screen', { source: 'screen_share', track: { mediaStreamTrack: screenTrack }, isMuted: false });
  publications.set('mic', {
    source: 'microphone',
    track: microphoneMuted ? null : { mediaStreamTrack: { kind: 'audio' } },
    isMuted: microphoneMuted,
  });

  return {
    identity,
    name,
    getTrackPublication(source) {
      if (broken) throw new Error('broken participant');
      if (source === Track.Source.Camera) return publications.get('camera');
      if (source === Track.Source.ScreenShare) return publications.get('screen');
      if (source === Track.Source.Microphone) return publications.get('mic');
      return undefined;
    },
  };
}

describe('meetingParticipantUtils', () => {
  it('builds tiles for remote participants with and without video', () => {
    const videoTrack = { kind: 'video', id: 'v1' };
    const room = {
      remoteParticipants: new Map([
        ['guest-a', createMockParticipant({ identity: 'guest-a', name: 'Alice', cameraTrack: videoTrack })],
        ['guest-b', createMockParticipant({ identity: 'guest-b', name: 'Bob', cameraTrack: null })],
      ]),
    };

    const tiles = buildRemoteParticipantTiles(room, ['guest-a']);

    expect(tiles).toHaveLength(2);
    expect(tiles[0]).toMatchObject({ id: 'guest-a', label: 'Alice', isActiveSpeaker: true, muted: true });
    expect(tiles[0].cameraStream).toBeTruthy();
    expect(tiles[1]).toMatchObject({ id: 'guest-b', label: 'Bob', stream: null, cameraStream: null });
  });

  it('keeps participants with failing track lookups but without streams', () => {
    const room = {
      remoteParticipants: new Map([
        ['bad', createMockParticipant({ identity: 'bad', broken: true })],
        ['good', createMockParticipant({ identity: 'good', name: 'Good' })],
      ]),
    };

    const tiles = buildRemoteParticipantTiles(room);
    expect(tiles).toHaveLength(2);
    expect(tiles.find((tile) => tile.id === 'good')).toMatchObject({ label: 'Good', stream: null });
    expect(tiles.find((tile) => tile.id === 'bad')).toMatchObject({ stream: null });
  });

  it('lists remote participants from a map safely', () => {
    const participants = listRemoteParticipants({
      remoteParticipants: new Map([['a', { identity: 'a' }], ['b', null]]),
    });
    expect(participants).toHaveLength(1);
  });

  it('participantStream returns null when publication is missing', () => {
    const participant = createMockParticipant({ identity: 'solo', cameraTrack: null });
    expect(participantStream(participant, 'camera')).toBeNull();
  });

  it('isParticipantMuted treats missing microphone publication as muted', () => {
    const participant = createMockParticipant({ identity: 'solo', microphoneMuted: true });
    expect(isParticipantMuted(participant)).toBe(true);
  });

  it('re-exports active speaker normalization', () => {
    expect(reexportedNormalize(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('isActiveSpeaker checks normalized identities', () => {
    expect(isActiveSpeaker(['host-1', 'guest-2'], 'guest-2')).toBe(true);
    expect(isActiveSpeaker({ identity: 'guest-2' }, 'guest-2')).toBe(true);
    expect(isActiveSpeaker(['host-1'], 'guest-2')).toBe(false);
  });

  it('getActiveParticipantCount uses LiveKit room presence', () => {
    expect(getActiveParticipantCount(null)).toBe(1);
    expect(getActiveParticipantCount({ localParticipant: { identity: 'host' } })).toBe(1);
    expect(
      getActiveParticipantCount({
        localParticipant: { identity: 'host' },
        remoteParticipants: new Map([
          ['a', { identity: 'a' }],
          ['b', { identity: 'b' }],
        ]),
      }),
    ).toBe(3);
  });

  it('countLiveParticipants includes the local participant', () => {
    expect(countLiveParticipants(0)).toBe(1);
    expect(countLiveParticipants(2)).toBe(3);
  });

  it('buildPanelParticipants matches live participant count', () => {
    const localTile = { id: 'host', label: 'Host', muted: false, isLocal: true };
    const remoteTiles = [
      { id: 'a', label: 'Alice', muted: true, isLocal: false },
      { id: 'b', label: 'Bob', muted: false, isLocal: false },
    ];
    const panel = buildPanelParticipants({ localTile, remoteTiles, handRaised: true, handStates: { b: { raised: true } } });
    expect(panel).toHaveLength(3);
    expect(panel[0]).toMatchObject({ id: 'host', handRaised: true });
    expect(panel[2]).toMatchObject({ id: 'b', handRaised: true });
    expect(assertParticipantCountConsistency(3, panel)).toBe(true);
    expect(assertParticipantCountConsistency(2, panel)).toBe(false);
  });

  it('getActiveParticipantCount matches panel length for six remotes', () => {
    const remotes = new Map(Array.from({ length: 6 }, (_, index) => [`guest-${index}`, { identity: `guest-${index}` }]));
    const room = { localParticipant: { identity: 'host' }, remoteParticipants: remotes };
    expect(getActiveParticipantCount(room)).toBe(7);
  });
});
