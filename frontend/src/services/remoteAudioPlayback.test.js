import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Track } from 'livekit-client';
import { RemoteAudioPlayback } from './remoteAudioPlayback.js';

function createMockAudioTrack(sid = 'audio-track-1') {
  const elements = [];
  return {
    kind: Track.Kind.Audio,
    sid,
    mediaStreamTrack: { id: sid },
    attach: vi.fn(() => {
      const element = document.createElement('audio');
      elements.push(element);
      return [element];
    }),
    detach: vi.fn(() => {
      const detached = [...elements];
      elements.length = 0;
      return detached;
    }),
  };
}

describe('RemoteAudioPlayback', () => {
  let playback;

  beforeEach(() => {
    playback = new RemoteAudioPlayback();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    playback.cleanup();
  });

  it('attaches remote audio tracks to hidden audio elements', () => {
    const track = createMockAudioTrack();

    playback.attachTrack(track);

    expect(track.attach).toHaveBeenCalledTimes(1);
    const element = document.querySelector('[data-livekit-remote-audio="true"]');
    expect(element).toBeTruthy();
    expect(element.style.display).toBe('none');
  });

  it('ignores non-audio tracks', () => {
    const track = { kind: Track.Kind.Video, attach: vi.fn() };

    playback.attachTrack(track);

    expect(track.attach).not.toHaveBeenCalled();
  });

  it('does not double-attach the same track', () => {
    const track = createMockAudioTrack('same-track');

    playback.attachTrack(track);
    playback.attachTrack(track);

    expect(track.attach).toHaveBeenCalledTimes(1);
  });

  it('detaches and removes audio elements', () => {
    const track = createMockAudioTrack();

    playback.attachTrack(track);
    expect(document.querySelectorAll('[data-livekit-remote-audio="true"]').length).toBe(1);

    playback.detachTrack(track);

    expect(track.detach).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-livekit-remote-audio="true"]').length).toBe(0);
  });

  it('cleans up all attached audio elements', () => {
    playback.attachTrack(createMockAudioTrack('a'));
    playback.attachTrack(createMockAudioTrack('b'));

    expect(document.querySelectorAll('[data-livekit-remote-audio="true"]').length).toBe(2);

    playback.cleanup();

    expect(document.querySelectorAll('[data-livekit-remote-audio="true"]').length).toBe(0);
  });
});
