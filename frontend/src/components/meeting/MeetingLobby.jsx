import { useLocalMedia } from '../../hooks/useLocalMedia';
import MeetingLobbyView from './MeetingLobbyView';

/** Phase 1 preview lobby — standalone route, no backend join. */
export default function MeetingLobby() {
  const media = useLocalMedia();
  return <MeetingLobbyView media={media} />;
}
