import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MeetingStage from './MeetingStage';

const { mockDisconnect } = vi.hoisted(() => ({
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/livekitClient', () => {
  class MockLiveKitSession {
    constructor() {
      this.room = null;
      this.connect = vi.fn().mockResolvedValue(undefined);
      this.disconnect = mockDisconnect;
      this.onStateChange = vi.fn(() => () => {});
    }
  }

  return {
    ConnectionState: {
      Connecting: 'connecting',
      Connected: 'connected',
      Disconnected: 'disconnected',
      Reconnecting: 'reconnecting',
    },
    Track: {
      Source: {
        Camera: 'camera',
        ScreenShare: 'screen_share',
      },
    },
    LiveKitSession: MockLiveKitSession,
  };
});

vi.mock('../../services/meetingApi', () => ({
  getMeetingParticipants: vi.fn().mockResolvedValue([]),
}));

function createMockStream() {
  const track = { kind: 'video', stop: vi.fn(), enabled: true, getSettings: () => ({}) };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
  };
}

function renderStage({ onLeave = vi.fn().mockResolvedValue(undefined), onExit = vi.fn(), stopLocalMedia = vi.fn() } = {}) {
  const media = {
    localStream: createMockStream(),
    isAudioEnabled: true,
    isVideoEnabled: true,
    toggleAudio: vi.fn(),
    toggleVideo: vi.fn(),
    stopLocalMedia,
  };

  const joinData = {
    token: 'test-token',
    livekit_url: 'wss://test.livekit.cloud',
    room_name: 'ABCD-EFGH',
    displayName: 'Alice',
    participant_id: 'participant-1',
    participant_token: 'leave-token',
  };

  render(
    <MeetingStage
      meetingId="meeting-1"
      joinData={joinData}
      media={media}
      onLeave={onLeave}
      onExit={onExit}
    />,
  );

  return { onLeave, onExit, stopLocalMedia };
}

describe('MeetingStage leave flow', () => {
  beforeEach(() => {
    mockDisconnect.mockClear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a pending leave state while cleanup and onLeave are in flight', async () => {
    let resolveLeave;
    const onLeave = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveLeave = resolve;
        }),
    );
    const { onExit } = renderStage({ onLeave });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Leave' }));

    const leavingButton = await screen.findByRole('button', { name: 'Leaving…' });
    expect(leavingButton).toBeDisabled();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();

    resolveLeave();
    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  it('still cleans up media and exits when onLeave rejects', async () => {
    const onLeave = vi.fn().mockRejectedValue(new Error('network failure'));
    const stopLocalMedia = vi.fn();
    const onExit = vi.fn();

    renderStage({ onLeave, stopLocalMedia, onExit });

    const leaveButton = await screen.findByRole('button', { name: 'Leave' });
    fireEvent.click(leaveButton);

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(stopLocalMedia).toHaveBeenCalledTimes(1);
      expect(onLeave).toHaveBeenCalledTimes(1);
      expect(onExit).toHaveBeenCalledTimes(1);
    });

    expect(console.error).toHaveBeenCalledWith(
      'Failed to record meeting leave:',
      expect.any(Error),
    );
  });

  it('runs cleanup on unmount', async () => {
    const stopLocalMedia = vi.fn();
    const { unmount } = render(
      <MeetingStage
        meetingId="meeting-1"
        joinData={{
          token: 'test-token',
          livekit_url: 'wss://test.livekit.cloud',
          room_name: 'ABCD-EFGH',
          displayName: 'Alice',
        }}
        media={{
          localStream: createMockStream(),
          isAudioEnabled: true,
          isVideoEnabled: true,
          toggleAudio: vi.fn(),
          toggleVideo: vi.fn(),
          stopLocalMedia,
        }}
        onLeave={vi.fn()}
        onExit={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Leave' })).toBeInTheDocument();
    });

    unmount();

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
      expect(stopLocalMedia).toHaveBeenCalled();
    });
  });
});
