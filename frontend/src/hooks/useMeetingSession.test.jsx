import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useMeetingSession } from './useMeetingSession';

const beaconLeaveMeeting = vi.fn(() => true);
const joinMeeting = vi.fn();
const leaveMeeting = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/meetingApi', () => ({
  beaconLeaveMeeting: (...args) => beaconLeaveMeeting(...args),
  joinMeeting: (...args) => joinMeeting(...args),
  leaveMeeting: (...args) => leaveMeeting(...args),
}));

const joinPayload = {
  participant_id: 'participant-1',
  participant_token: 'leave-token',
  token: 'lk-token',
  livekit_url: 'wss://test.livekit.cloud',
  room_name: 'ABCD-EFGH',
};

describe('useMeetingSession unload leave', () => {
  beforeEach(() => {
    beaconLeaveMeeting.mockClear();
    joinMeeting.mockClear();
    leaveMeeting.mockClear();
    mockNavigate.mockClear();
    joinMeeting.mockResolvedValue(joinPayload);
    leaveMeeting.mockResolvedValue({
      participant: { left_at: new Date().toISOString() },
      meeting_status: 'ended',
      auto_ended: true,
    });
  });

  function renderSessionHook(meetingId = 'meeting-1') {
    return renderHook(() => useMeetingSession(meetingId), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });
  }

  async function joinStage(result) {
    await act(async () => {
      await result.current.handleJoin({
        displayName: 'Alice',
        passcode: '',
        isAudioEnabled: true,
        isVideoEnabled: true,
      });
    });

    await waitFor(() => {
      expect(result.current.phase).toBe('stage');
    });
  }

  it('calls beaconLeaveMeeting on pagehide with participant credentials', async () => {
    const { result } = renderSessionHook();
    await joinStage(result);

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });

    expect(beaconLeaveMeeting).toHaveBeenCalledWith(
      'meeting-1',
      'participant-1',
      'leave-token',
    );
  });

  it('does not beacon after an explicit leave flow', async () => {
    const { result } = renderSessionHook();
    await joinStage(result);

    await act(async () => {
      await result.current.leave();
      result.current.exitToLobby();
    });

    beaconLeaveMeeting.mockClear();

    act(() => {
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
    });

    expect(beaconLeaveMeeting).not.toHaveBeenCalled();
  });

  it('beacons on hook unmount when the user navigates away without leaving', async () => {
    const { result, unmount } = renderSessionHook();
    await joinStage(result);

    unmount();

    expect(beaconLeaveMeeting).toHaveBeenCalledWith(
      'meeting-1',
      'participant-1',
      'leave-token',
    );
  });

  it('navigates to /meetings when exitToLobby is called', async () => {
    const { result } = renderSessionHook();
    await joinStage(result);

    act(() => {
      result.current.exitToLobby();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/meetings');
    expect(result.current.phase).toBe('lobby');
    expect(result.current.session).toBeNull();
  });

  it('leave is idempotent and only calls API once', async () => {
    const { result } = renderSessionHook();
    await joinStage(result);

    await act(async () => {
      await Promise.all([result.current.leave(), result.current.leave()]);
    });

    expect(leaveMeeting).toHaveBeenCalledTimes(1);
  });
});
