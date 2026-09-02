import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useLocalMedia } from '../hooks/useLocalMedia';
import { useMeetingSession } from '../hooks/useMeetingSession';
import { resolveMeeting } from '../services/collaborationApi';
import MeetingLobbyView from '../components/meeting/MeetingLobbyView';
import MeetingStage from '../components/meeting/MeetingStage';
import MeetingEndedView from '../components/meeting/MeetingEndedView';

export default function MeetingRoom() {
  const { id: meetingId } = useParams();
  const { user } = useUser();
  const media = useLocalMedia();
  const { phase, session, joinError, joining, endedReason, handleJoin, leave, exitToLobby } =
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

  const defaultName =
    user?.fullName || user?.username || user?.firstName || '';

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
      <MeetingStage
        meetingId={meetingId}
        joinData={session}
        media={media}
        meetingTitle={meetingInfo?.title}
        onLeave={leave}
        onExit={exitToLobby}
      />
    );
  }

  return (
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
  );
}
