import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLocalMedia } from './useLocalMedia';

function createMockTrack(kind, deviceId, enabled = true) {
  return {
    kind,
    enabled,
    stop: vi.fn(),
    getSettings: () => ({ deviceId }),
  };
}

function createMockStream(videoTrack, audioTrack) {
  const tracks = [videoTrack, audioTrack].filter(Boolean);
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
    addTrack(track) {
      tracks.push(track);
    },
  };
}

describe('useLocalMedia', () => {
  let videoTrack;
  let audioTrack;
  let mockStream;
  let getUserMedia;
  let enumerateDevices;

  beforeEach(() => {
    videoTrack = createMockTrack('video', 'cam-1', true);
    audioTrack = createMockTrack('audio', 'mic-1', true);
    mockStream = createMockStream(videoTrack, audioTrack);

    getUserMedia = vi.fn().mockResolvedValue(mockStream);
    enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'cam-1', label: 'Webcam' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Headset Mic' },
    ]);

    vi.stubGlobal('navigator', {
      mediaDevices: { getUserMedia, enumerateDevices },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('acquires media on mount and exposes the stream', async () => {
    const { result } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.localStream).toBe(mockStream);
    });

    expect(getUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user' },
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    expect(result.current.isAudioEnabled).toBe(true);
    expect(result.current.isVideoEnabled).toBe(true);
  });

  it('toggleAudio flips audio track.enabled', async () => {
    const { result } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.localStream).toBe(mockStream);
    });

    await act(async () => {
      await result.current.toggleAudio();
    });

    expect(audioTrack.enabled).toBe(false);
    expect(result.current.isAudioEnabled).toBe(false);

    await act(async () => {
      await result.current.toggleAudio();
    });

    expect(audioTrack.enabled).toBe(true);
    expect(result.current.isAudioEnabled).toBe(true);
  });

  it('setAudioEnabled updates preference before the stream exists', async () => {
    getUserMedia.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(mockStream), 50);
        }),
    );

    const { result } = renderHook(() => useLocalMedia());

    await act(async () => {
      await result.current.setAudioEnabled(false);
    });

    expect(result.current.isAudioEnabled).toBe(false);

    await waitFor(() => {
      expect(result.current.localStream).toBe(mockStream);
    });

    expect(audioTrack.enabled).toBe(false);
  });

  it('setAudioEnabled creates an audio track when missing', async () => {
    const newAudioTrack = createMockTrack('audio', 'mic-2', true);

    getUserMedia.mockImplementation((constraints) => {
      if (constraints.video === false) {
        return Promise.resolve(createMockStream(null, newAudioTrack));
      }
      if (constraints.audio === false) {
        return Promise.resolve(createMockStream(videoTrack, null));
      }
      return Promise.resolve(createMockStream(videoTrack, null));
    });

    const { result } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.localStream?.getVideoTracks()[0]).toBe(videoTrack);
      expect(result.current.localStream?.getAudioTracks()).toHaveLength(0);
    });

    await act(async () => {
      await result.current.setAudioEnabled(true);
    });

    expect(result.current.isAudioEnabled).toBe(true);
    expect(result.current.getLocalStream()?.getAudioTracks()[0]).toBe(newAudioTrack);
  });

  it('toggleVideo flips video track.enabled', async () => {
    const { result } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.localStream).toBe(mockStream);
    });

    await act(async () => {
      await result.current.toggleVideo();
    });

    expect(videoTrack.enabled).toBe(false);
    expect(result.current.isVideoEnabled).toBe(false);
  });

  it('stopLocalMedia stops all tracks', async () => {
    const { result } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.localStream).toBe(mockStream);
    });

    act(() => {
      result.current.stopLocalMedia();
    });

    expect(videoTrack.stop).toHaveBeenCalled();
    expect(audioTrack.stop).toHaveBeenCalled();
    expect(result.current.localStream).toBeNull();
    expect(result.current.isAudioEnabled).toBe(true);
    expect(result.current.isVideoEnabled).toBe(true);
  });

  it('stopLocalMedia runs on unmount', async () => {
    const { result, unmount } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.localStream).toBe(mockStream);
    });

    unmount();

    expect(videoTrack.stop).toHaveBeenCalled();
    expect(audioTrack.stop).toHaveBeenCalled();
  });

  it('maps NotAllowedError to permissionError message', async () => {
    const deniedError = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    getUserMedia.mockRejectedValue(deniedError);

    const { result } = renderHook(() => useLocalMedia());

    await waitFor(() => {
      expect(result.current.permissionError).toMatch(/access denied/i);
    });
  });
});
