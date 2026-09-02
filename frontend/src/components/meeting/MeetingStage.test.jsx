import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MeetingStage from './MeetingStage';
import { MeetLayoutContext } from '../../layouts/meetLayoutContext.js';

vi.mock('../../services/collaborationApi', () => ({
  resolveMeeting: vi.fn().mockResolvedValue({ status: 'active', is_joinable: true }),
}));

const { mockDisconnect, mockConnect } = vi.hoisted(() => ({
  mockDisconnect: vi.fn().mockResolvedValue(undefined),
  mockConnect: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/livekitClient', () => {
  class MockLiveKitSession {
    constructor() {
      this.room = {
        remoteParticipants: new Map([
          [
            'remote-1',
            {
              identity: 'remote-1',
              name: 'Bob',
              getTrackPublication: () => null,
            },
          ],
        ]),
        localParticipant: {
          identity: 'local',
          getTrackPublication: () => null,
        },
      };
      this.connect = mockConnect;
      this.disconnect = mockDisconnect;
      this.onStateChange = vi.fn(() => () => {});
      this.onReaction = vi.fn(() => () => {});
      this.onHandState = vi.fn(() => () => {});
      this.onCaption = vi.fn(() => () => {});
      this.sendCaption = vi.fn().mockResolvedValue(undefined);
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
    REACTION_DISPLAY_MS: 4000,
    LiveKitSession: MockLiveKitSession,
    normalizeActiveSpeakerIdentities: (speakers) => {
      if (!speakers) return [];
      if (Array.isArray(speakers)) {
        return speakers.map((item) => (typeof item === 'string' ? item : item?.identity)).filter(Boolean);
      }
      return [];
    },
  };
});

function createMockStream() {
  const track = { kind: 'video', stop: vi.fn(), enabled: true, getSettings: () => ({}) };
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
  };
}

function renderStage({
  onLeave = vi.fn().mockResolvedValue(undefined),
  onExit = vi.fn(),
  onEndMeeting = vi.fn().mockResolvedValue(undefined),
  onMeetingEnded = vi.fn(),
  stopLocalMedia = vi.fn(),
  localStream = createMockStream(),
  isHost = false,
} = {}) {
  const media = {
    localStream,
    isAudioEnabled: true,
    isVideoEnabled: true,
    toggleAudio: vi.fn(),
    toggleVideo: vi.fn(),
    stopLocalMedia,
  };

  const joinData = {
    token: 'test-token',
    livekit_url: 'wss://test.livekit.cloud',
    room_name: 'room-uuid',
    short_code: 'ABCD-EFGH',
    displayName: 'Alice',
    participant_id: 'participant-1',
    participant_token: 'leave-token',
  };

  render(
    <MeetLayoutContext.Provider value={{ standalone: true }}>
      <MeetingStage
        meetingId="meeting-1"
        joinData={joinData}
        media={media}
        meetingShortCode="ABCD-EFGH"
        isHost={isHost}
        onLeave={onLeave}
        onEndMeeting={onEndMeeting}
        onMeetingEnded={onMeetingEnded}
        onExit={onExit}
      />
    </MeetLayoutContext.Provider>,
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

  it('uses LiveKit remote participant count for header display', async () => {
    renderStage();

    await waitFor(() => {
      expect(screen.getByText('2 participants')).toBeInTheDocument();
    });
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
      expect(screen.getByRole('button', { name: 'Leave meeting' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Leave meeting' }));

    const leavingButton = await screen.findByRole('button', { name: 'Leave meeting' });
    expect(leavingButton).toBeDisabled();
    expect(leavingButton).toHaveTextContent('Leaving…');
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

    const leaveButton = await screen.findByRole('button', { name: 'Leave meeting' });
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

  it('connects even when local media stream is unavailable', async () => {
    mockConnect.mockClear();
    renderStage({ localStream: null });

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'test-token',
          localStream: null,
        }),
      );
    });
  });

  it('shows meeting short code in the header', async () => {
    renderStage();

    expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument();
  });

  it('keeps People panel count aligned with header participant count', async () => {
    renderStage();

    await waitFor(() => {
      expect(screen.getByText('2 participants')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '2 participants' }));

    expect(await screen.findByRole('dialog', { name: 'Participants' })).toBeInTheDocument();
    expect(screen.getByText('People (2)')).toBeInTheDocument();
    const panel = screen.getByRole('dialog', { name: 'Participants' });
    expect(panel).toHaveTextContent('Alice (You)');
    expect(panel).toHaveTextContent('Bob');
  });

  it('shows host End meeting control and confirms before ending', async () => {
    const onEndMeeting = vi.fn().mockResolvedValue(undefined);
    const onMeetingEnded = vi.fn();
    renderStage({ isHost: true, onEndMeeting, onMeetingEnded });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'End meeting for everyone' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'End meeting for everyone' }));
    expect(screen.getByRole('dialog', { name: /End meeting/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'End meeting' }));

    await waitFor(() => {
      expect(onEndMeeting).toHaveBeenCalledTimes(1);
      expect(onMeetingEnded).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show End meeting for non-host participants', async () => {
    renderStage({ isHost: false });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Leave meeting' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'End meeting for everyone' })).not.toBeInTheDocument();
  });

  it('runs cleanup on unmount', async () => {
    const stopLocalMedia = vi.fn();
    const { unmount } = render(
      <MeetLayoutContext.Provider value={{ standalone: true }}>
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
        />
      </MeetLayoutContext.Provider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Leave meeting' })).toBeInTheDocument();
    });

    unmount();

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
      expect(stopLocalMedia).toHaveBeenCalled();
    });
  });
});
