import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useLocalMedia } from '../hooks/useLocalMedia';
import { useMeetingSession } from '../hooks/useMeetingSession';
import { useMeetDocumentTitle } from '../hooks/useMeetDocumentTitle';
import { resolveMeeting } from '../services/collaborationApi';
import { endMeeting } from '../services/meetingApi';
import MeetingLobbyView from '../components/meeting/MeetingLobbyView';
import MeetingStage from '../components/meeting/MeetingStage';
import MeetingEndedView from '../components/meeting/MeetingEndedView';

export default function MeetingRoom() {
  const { id: meetingId } = useParams();
  const { user } = useUser();
  const { getToken } = useAuth();
  const media = useLocalMedia();
  const { phase, session, joinError, joining, endedReason, handleJoin, leave, markMeetingEnded, exitToLobby } =
    useMeetingSession(meetingId);

  const [meetingInfo, setMeetingInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!meetingId) return undefined;

    let cancelled = false;

    async function loadMeeting() {
      try {
        const meeting = await resolveMeeting(meetingId);
        if (cancelled) return;
        setMeetingInfo(meeting);

        if (meeting.status === 'ended' || !meeting.is_joinable) {
          setLoadError('ended');
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || 'Unable to load meeting');
        }
      }
    }

    loadMeeting();
    return () => {
      cancelled = true;
    };
  }, [meetingId]);

  const titlePhase =
    endedReason === 'ended' || loadError === 'ended'
      ? 'ended'
      : phase === 'stage' && session
        ? 'stage'
        : 'lobby';

  useMeetDocumentTitle(meetingInfo?.title, titlePhase);

  const defaultName =
    user?.fullName || user?.username || user?.firstName || '';

  const handleEndMeeting = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      throw new Error('Sign in is required to end this meeting.');
    }
    await endMeeting(meetingId, token);
  }, [getToken, meetingId]);

  if (endedReason === 'ended' || loadError === 'ended') {
    return (
      <MeetingEndedView
        title="Meeting ended"
        message="This meeting has ended and is no longer accepting participants."
        onReturn={exitToLobby}
      />
    );
  }

  if (phase === 'stage' && session) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <MeetingStage
          meetingId={meetingId}
          joinData={session}
          media={media}
          meetingTitle={meetingInfo?.title}
          meetingShortCode={meetingInfo?.short_code}
          isHost={Boolean(session.is_host)}
          onLeave={leave}
          onEndMeeting={handleEndMeeting}
          onMeetingEnded={markMeetingEnded}
          onExit={exitToLobby}
        />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <MeetingLobbyView
      media={media}
      onJoin={handleJoin}
      joinLabel="Join meeting"
      joinError={joinError || (loadError && loadError !== 'ended' ? loadError : null)}
      joining={joining}
      showPasscode={Boolean(meetingInfo?.passcode_required)}
      meetingTitle={meetingInfo?.title}
      meetingCode={meetingInfo?.short_code}
      defaultDisplayName={defaultName}
    />
    </div>
  );
}
