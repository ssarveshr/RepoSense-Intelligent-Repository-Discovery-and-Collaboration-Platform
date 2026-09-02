import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { beaconLeaveMeeting, joinMeeting, leaveMeeting } from '../services/meetingApi';

export function useMeetingSession(meetingId) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('lobby');
  const [session, setSession] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [joining, setJoining] = useState(false);
  const [endedReason, setEndedReason] = useState(null);

  const explicitLeaveRef = useRef(false);
  const beaconSentRef = useRef(false);
  const leaveInFlightRef = useRef(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const tryBeaconLeave = useCallback(() => {
    if (explicitLeaveRef.current || beaconSentRef.current) {
      return;
    }

    const current = sessionRef.current;
    if (!meetingId || !current?.participant_id || !current?.participant_token) {
      return;
    }

    if (beaconLeaveMeeting(meetingId, current.participant_id, current.participant_token)) {
      beaconSentRef.current = true;
    }
  }, [meetingId]);

  useEffect(() => {
    if (phase !== 'stage' || !session?.participant_id || !session?.participant_token) {
      return undefined;
    }

    explicitLeaveRef.current = false;
    beaconSentRef.current = false;

    const handlePageHide = () => {
      tryBeaconLeave();
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      tryBeaconLeave();
    };
  }, [phase, session?.participant_id, session?.participant_token, tryBeaconLeave]);

  const handleJoin = useCallback(
    async ({ displayName, passcode, isAudioEnabled, isVideoEnabled }) => {
      if (!meetingId) {
        setJoinError('Missing meeting ID');
        return;
      }

      setJoining(true);
      setJoinError(null);
      setEndedReason(null);

      try {
        const joinResponse = await joinMeeting(meetingId, {
          displayName: displayName.trim() || 'Guest',
          passcode: passcode?.trim() || undefined,
        });

        setSession({
          ...joinResponse,
          displayName: displayName.trim() || 'Guest',
          isAudioEnabled,
          isVideoEnabled,
        });
        setPhase('stage');
      } catch (error) {
        const message = error.message || 'Unable to join meeting';
        if (/ended/i.test(message)) {
          setEndedReason('ended');
        }
        setJoinError(message);
      } finally {
        setJoining(false);
      }
    },
    [meetingId],
  );

  const leave = useCallback(async () => {
    const current = sessionRef.current;
    if (!meetingId || !current?.participant_id || !current?.participant_token) {
      return null;
    }

    if (explicitLeaveRef.current || leaveInFlightRef.current) {
      return null;
    }

    leaveInFlightRef.current = true;
    explicitLeaveRef.current = true;

    try {
      return await leaveMeeting(
        meetingId,
        current.participant_id,
        current.participant_token,
      );
    } catch (error) {
      console.error('Failed to record meeting leave:', error);
      throw error;
    } finally {
      leaveInFlightRef.current = false;
    }
  }, [meetingId]);

  const exitToLobby = useCallback(() => {
    explicitLeaveRef.current = true;
    setPhase('lobby');
    setSession(null);
    setJoinError(null);
    navigate('/meetings');
  }, [navigate]);

  const markMeetingEnded = useCallback(() => {
    explicitLeaveRef.current = true;
    setEndedReason('ended');
    setPhase('lobby');
    setSession(null);
    setJoinError(null);
  }, []);

  return {
    phase,
    session,
    joinError,
    joining,
    endedReason,
    handleJoin,
    leave,
    markMeetingEnded,
    exitToLobby,
  };
}
