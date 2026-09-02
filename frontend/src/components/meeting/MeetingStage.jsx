import { useEffect, useRef, useState, useCallback } from 'react';
import { ConnectionState, LiveKitSession, Track } from '../../services/livekitClient';
import MeetingChat from './MeetingChat';
import MeetingControls from './MeetingControls';
import MeetingParticipantTile from './MeetingParticipantTile';

function participantStream(participant, source) {
  if (!participant) return null;
  const publication = participant.getTrackPublication(source);
  if (!publication?.track?.mediaStreamTrack) return null;
  return new MediaStream([publication.track.mediaStreamTrack]);
}

function isParticipantMuted(participant) {
  const publication = participant?.getTrackPublication(Track.Source.Microphone);
  if (!publication) return true;
  return publication.isMuted;
}

function gridClass(count) {
  if (count <= 1) return 'grid-cols-1 max-w-3xl mx-auto';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

export default function MeetingStage({ meetingId, joinData, media, meetingTitle, onLeave, onExit }) {
  const sessionRef = useRef(null);
  const cleanupDoneRef = useRef(false);
  const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected);
  const [remoteTiles, setRemoteTiles] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const [participantCount, setParticipantCount] = useState(1);
  const [error, setError] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    stopLocalMedia,
  } = media;

  const livekitUrl = joinData.livekit_url || import.meta.env.VITE_LIVEKIT_URL;

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const refreshTiles = useCallback((room, speakers = []) => {
    if (!room) {
      setRemoteTiles([]);
      setParticipantCount(1);
      return;
    }

    const tiles = [];
    room.remoteParticipants.forEach((participant) => {
      const screenStream = participantStream(participant, Track.Source.ScreenShare);
      const cameraStream = participantStream(participant, Track.Source.Camera);
      tiles.push({
        id: participant.identity,
        label: participant.name || participant.identity,
        stream: screenStream || cameraStream,
        isScreenShare: Boolean(screenStream),
        muted: isParticipantMuted(participant),
        isActiveSpeaker: speakers.includes(participant.identity),
      });
    });
    setRemoteTiles(tiles);
    setParticipantCount(1 + tiles.length);
  }, []);

  const cleanupSession = useCallback(async () => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;

    try {
      await sessionRef.current?.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect LiveKit session:', disconnectError);
    } finally {
      sessionRef.current = null;
    }

    stopLocalMedia();
  }, [stopLocalMedia]);

  useEffect(() => {
    if (!joinData?.token || !livekitUrl || !localStream) return undefined;

    let cancelled = false;
    const session = new LiveKitSession();
    sessionRef.current = session;

    const unsubscribe = session.onStateChange(({ connectionState: state, isScreenSharing: sharing, activeSpeakerIdentities }) => {
      if (cancelled) return;
      setConnectionState(state);
      if (typeof sharing === 'boolean') setIsScreenSharing(sharing);
      const speakers = activeSpeakerIdentities || [];
      setActiveSpeakers(speakers);
      refreshTiles(session.room, speakers);
    });

    setConnectionState(ConnectionState.Connecting);
    setError(null);

    session
      .connect({ livekitUrl, token: joinData.token, localStream })
      .then(() => {
        if (cancelled) return;
        refreshTiles(session.room, []);
      })
      .catch((connectError) => {
        if (cancelled) return;
        setError(connectError.message || 'Unable to connect to the meeting room');
        setConnectionState(ConnectionState.Disconnected);
      });

    return () => {
      cancelled = true;
      unsubscribe();
      cleanupSession();
    };
  }, [joinData?.token, livekitUrl, localStream, refreshTiles, cleanupSession]);

  const handleToggleAudio = async () => {
    toggleAudio();
    await sessionRef.current?.setMicrophoneEnabled(!isAudioEnabled);
  };

  const handleToggleVideo = async () => {
    toggleVideo();
    await sessionRef.current?.setCameraEnabled(!isVideoEnabled);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      await sessionRef.current?.stopScreenShare();
      setIsScreenSharing(false);
      return;
    }
    try {
      const started = await sessionRef.current?.startScreenShare();
      setIsScreenSharing(Boolean(started));
    } catch (shareError) {
      setError(shareError.message || 'Screen share failed');
    }
  };

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await cleanupSession();
      await onLeave();
    } catch (leaveError) {
      console.error('Failed to record meeting leave:', leaveError);
    } finally {
      onExit?.();
    }
  };

  const localScreenPub = sessionRef.current?.room?.localParticipant?.getTrackPublication(
    Track.Source.ScreenShare,
  );
  const localScreenStream = localScreenPub?.track?.mediaStreamTrack
    ? new MediaStream([localScreenPub.track.mediaStreamTrack])
    : null;

  const localIdentity = sessionRef.current?.room?.localParticipant?.identity;
  const isLocalActiveSpeaker = activeSpeakers.includes(localIdentity);
  const totalTiles = 1 + remoteTiles.length;
  const isConnecting = connectionState === ConnectionState.Connecting;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;

  return (
    <div className="fixed inset-0 top-16 z-40 bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="min-w-0">
          <h1 className="text-white text-sm sm:text-base font-bold truncate">
            {meetingTitle || 'RepoSense Meeting'}
          </h1>
          <p className="text-gray-400 text-xs font-mono truncate">{joinData.room_name}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs text-gray-400 font-semibold">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400'
                : isReconnecting
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-gray-700/50 text-gray-400'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            {isConnecting && 'Connecting…'}
            {isReconnecting && 'Reconnecting…'}
            {isConnected && 'Connected'}
            {!isConnecting && !isReconnecting && !isConnected && 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Status banners */}
      {(isConnecting || isReconnecting || error) && (
        <div className="shrink-0 px-4 py-2 bg-gray-900/90 border-b border-gray-800 text-sm">
          {isConnecting && !error && (
            <p className="text-amber-300 flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              Connecting to the meeting room…
            </p>
          )}
          {isReconnecting && !error && (
            <p className="text-amber-300">Reconnecting… Your call will resume shortly.</p>
          )}
          {error && (
            <p className="text-red-400 font-semibold" role="alert">{error}</p>
          )}
        </div>
      )}

      {/* Main workspace */}
      <div className="flex-1 flex min-h-0 relative">
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 ${showChat && !isMobile ? 'pr-0' : ''}`}>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 pb-28">
            <div className={`grid gap-3 sm:gap-4 ${gridClass(totalTiles)}`}>
              <MeetingParticipantTile
                label={joinData.displayName}
                stream={localScreenStream || (isVideoEnabled ? localStream : null)}
                muted={!isAudioEnabled}
                mirror={!localScreenStream}
                isScreenShare={Boolean(localScreenStream)}
                isActiveSpeaker={isLocalActiveSpeaker}
                isLocal
              />
              {remoteTiles.map((tile) => (
                <MeetingParticipantTile
                  key={tile.id}
                  label={tile.label}
                  stream={tile.stream}
                  muted={tile.muted}
                  isScreenShare={tile.isScreenShare}
                  isActiveSpeaker={tile.isActiveSpeaker}
                />
              ))}
            </div>

            {remoteTiles.length === 0 && isConnected && (
              <p className="text-center text-gray-500 text-sm mt-6">Waiting for others to join…</p>
            )}
          </div>
        </div>

        <MeetingChat
          sessionRef={sessionRef}
          displayName={joinData.displayName}
          open={showChat}
          onClose={() => setShowChat(false)}
          isMobile={isMobile}
        />
      </div>

      <MeetingControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={showChat}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => setShowChat((v) => !v)}
        onLeave={handleLeave}
        leaving={leaving}
        compact={isMobile}
      />

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
}
