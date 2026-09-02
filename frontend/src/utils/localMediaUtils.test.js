import { describe, it, expect, vi } from 'vitest';
import {
  buildMediaConstraints,
  getUserMediaWithFallback,
  streamTrackFlags,
} from './localMediaUtils.js';

describe('localMediaUtils', () => {
  it('builds mobile-friendly default constraints', () => {
    expect(buildMediaConstraints()).toEqual({
      video: { facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  });

  it('falls back to audio-only when video+audio fails', async () => {
    const audioStream = {
      getVideoTracks: () => [],
      getAudioTracks: () => [{ kind: 'audio' }],
    };
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('video failed'), { name: 'NotFoundError' }))
      .mockResolvedValueOnce(audioStream);

    const result = await getUserMediaWithFallback(getUserMedia);

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(result.stream).toBe(audioStream);
  });

  it('falls back to video-only when audio is denied but camera works', async () => {
    const videoStream = {
      getVideoTracks: () => [{ kind: 'video' }],
      getAudioTracks: () => [],
    };
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }))
      .mockResolvedValueOnce(videoStream);

    const result = await getUserMediaWithFallback(getUserMedia);

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(result.stream).toBe(videoStream);
  });

  it('reports stream track availability', () => {
    const stream = {
      getVideoTracks: () => [{ kind: 'video' }],
      getAudioTracks: () => [],
    };

    expect(streamTrackFlags(stream)).toEqual({ hasVideo: true, hasAudio: false });
  });
});
