import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ConnectionState, LiveKitSession, Track, REACTION_DISPLAY_MS } from '../../services/livekitClient';
import { resolveMeeting } from '../../services/collaborationApi';
import MeetingChat from './MeetingChat';
import MeetingControls from './MeetingControls';
import MeetingHeader from './MeetingHeader';
import ParticipantGrid, { FloatingReactions } from './ParticipantGrid';
import ParticipantPanel from './ParticipantPanel';
import CaptionOverlay from './CaptionOverlay';
import EndMeetingDialog from './EndMeetingDialog';
import { useMeetLayout } from '../../layouts/meetLayoutContext.js';
import { useLiveCaptions } from '../../hooks/useLiveCaptions';
import {
  buildRemoteParticipantTiles,
  buildPanelParticipants,
  getActiveParticipantCount,
  isActiveSpeaker,
  normalizeActiveSpeakerIdentities,
} from './meetingParticipantUtils';

const CONNECT_TIMEOUT_MS = 30_000;
const MEETING_STATUS_POLL_MS = 5_000;

export default function MeetingStage({
  meetingId,
  joinData,
  media,
  meetingTitle,
  meetingShortCode,
  isHost = false,
  onLeave,
  onEndMeeting,
  onMeetingEnded,
  onExit,
}) {
  const { standalone } = useMeetLayout();
  const sessionRef = useRef(null);
  const [connectionState, setConnectionState] = useState(ConnectionState.Disconnected);
  const [remoteTiles, setRemoteTiles] = useState([]);
  const [activeSpeakers, setActiveSpeakers] = useState([]);
  const [participantCount, setParticipantCount] = useState(1);
  const [error, setError] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [handStates, setHandStates] = useState({});
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [handRaised, setHandRaised] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [ending, setEnding] = useState(false);
  const localIdentityRef = useRef(null);
  const lobbyMediaPrefsAppliedRef = useRef(false);

  const handleFinalCaption = useCallback(
    (text) => {
      sessionRef.current?.sendCaption(text, joinData.displayName, { final: true });
    },
    [joinData.displayName],
  );

  const captions = useLiveCaptions({
    enabled: captionsEnabled,
    onFinalCaption: handleFinalCaption,
  });
  const addRemoteCaptionRef = useRef(captions.addRemoteCaption);
  addRemoteCaptionRef.current = captions.addRemoteCaption;

  const {
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    setAudioEnabled,
    setVideoEnabled,
    getLocalStream,
    stopLocalMedia,
  } = media;

  useEffect(() => {
    if (lobbyMediaPrefsAppliedRef.current) return;
    lobbyMediaPrefsAppliedRef.current = true;

    if (joinData.isAudioEnabled === false) {
      setAudioEnabled(false);
    }
    if (joinData.isVideoEnabled === false) {
      setVideoEnabled(false);
    }
  }, [joinData.isAudioEnabled, joinData.isVideoEnabled, setAudioEnabled, setVideoEnabled]);

  const livekitUrl = joinData.livekit_url || import.meta.env.VITE_LIVEKIT_URL;
  const displayMeetingCode = meetingShortCode || joinData.short_code || joinData.room_name;

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

    const normalizedSpeakers = normalizeActiveSpeakerIdentities(speakers);
    setRemoteTiles(buildRemoteParticipantTiles(room, normalizedSpeakers));
    setParticipantCount(getActiveParticipantCount(room));
  }, []);

  const disconnectLiveKit = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    try {
      await session.disconnect();
    } catch (disconnectError) {
      console.error('Failed to disconnect LiveKit session:', disconnectError);
    }
  }, []);

  const teardownMeeting = useCallback(async () => {
    await disconnectLiveKit();
    stopLocalMedia();
  }, [disconnectLiveKit, stopLocalMedia]);

  useEffect(() => {
    if (!joinData?.token || !livekitUrl) return undefined;

    let cancelled = false;
    let connectTimeoutId = null;
    const session = new LiveKitSession();
    sessionRef.current = session;

    const unsubscribe = session.onStateChange(
      ({ connectionState: state, isScreenSharing: sharing, activeSpeakerIdentities }) => {
        if (cancelled) return;
        setConnectionState(state);
        if (typeof sharing === 'boolean') setIsScreenSharing(sharing);
        const speakers = normalizeActiveSpeakerIdentities(activeSpeakerIdentities);
        setActiveSpeakers(speakers);
        refreshTiles(session.room, speakers);

        if (state === ConnectionState.Connected && connectTimeoutId) {
          window.clearTimeout(connectTimeoutId);
          connectTimeoutId = null;
        }
      },
    );

    const unsubscribeReaction = session.onReaction((reaction) => {
      if (cancelled || !reaction?.id) return;
      setFloatingReactions((current) => [...current, reaction]);
      window.setTimeout(() => {
        setFloatingReactions((current) => current.filter((item) => item.id !== reaction.id));
      }, REACTION_DISPLAY_MS);
    });

    const unsubscribeHand = session.onHandState(({ identity, raised }) => {
      if (cancelled || !identity) return;
      setHandStates((current) => {
        const next = { ...current };
        if (raised) {
          next[identity] = { raised: true };
        } else {
          delete next[identity];
        }
        return next;
      });
    });

    const unsubscribeCaption = session.onCaption((caption) => {
      if (cancelled || !caption?.text) return;
      const localIdentity = session.room?.localParticipant?.identity;
      if (caption.identity && caption.identity === localIdentity) return;
      addRemoteCaptionRef.current(caption);
    });

    setConnectionState(ConnectionState.Connecting);
    setError(null);

    connectTimeoutId = window.setTimeout(() => {
      if (cancelled) return;
      if (session.getConnectionState() !== ConnectionState.Connected) {
        setError('Connection timed out. Check your network and LiveKit configuration, then try rejoining.');
        setConnectionState(ConnectionState.Disconnected);
        session.disconnect().catch(() => {});
      }
    }, CONNECT_TIMEOUT_MS);

    session
      .connect({ livekitUrl, token: joinData.token, localStream: localStream ?? null })
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
      if (connectTimeoutId) window.clearTimeout(connectTimeoutId);
      unsubscribe();
      unsubscribeReaction();
      unsubscribeHand();
      unsubscribeCaption();
      disconnectLiveKit();
    };
  }, [joinData?.token, livekitUrl, refreshTiles, disconnectLiveKit]);

  useEffect(() => {
    if (connectionState !== ConnectionState.Connected || !localStream) return undefined;

    let cancelled = false;
    sessionRef.current
      ?.publishLocalStream(localStream)
      .catch((publishError) => {
        if (!cancelled) {
          console.error('Failed to publish local media tracks:', publishError);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connectionState, localStream]);

  const handleToggleAudio = async () => {
    const nextEnabled = !isAudioEnabled;
    await setAudioEnabled(nextEnabled);
    await sessionRef.current?.setMicrophoneEnabled(nextEnabled, getLocalStream());
  };

  const handleToggleVideo = async () => {
    const nextEnabled = !isVideoEnabled;
    await setVideoEnabled(nextEnabled);
    await sessionRef.current?.setCameraEnabled(nextEnabled, getLocalStream());
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
    if (leaving || ending) return;
    setLeaving(true);
    setCaptionsEnabled(false);
    try {
      await teardownMeeting();
      await onLeave();
    } catch (leaveError) {
      console.error('Failed to record meeting leave:', leaveError);
    } finally {
      onExit?.();
    }
  };

  const handleConfirmEndMeeting = async () => {
    if (ending || leaving || !onEndMeeting) return;
    setEnding(true);
    setCaptionsEnabled(false);
    try {
      await onEndMeeting();
      await teardownMeeting();
      onMeetingEnded?.();
    } catch (endError) {
      console.error('Failed to end meeting:', endError);
      setError(endError.message || 'Unable to end the meeting');
      setShowEndDialog(false);
    } finally {
      setEnding(false);
    }
  };

  useEffect(() => {
    if (!meetingId || !onMeetingEnded) return undefined;

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const meeting = await resolveMeeting(meetingId);
        if (!cancelled && (meeting.status === 'ended' || !meeting.is_joinable)) {
          setCaptionsEnabled(false);
          await teardownMeeting();
          onMeetingEnded();
        }
      } catch {
        // Ignore transient resolve errors while polling.
      }
    };

    const intervalId = window.setInterval(pollStatus, MEETING_STATUS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [meetingId, onMeetingEnded, teardownMeeting]);

  const localScreenPub = sessionRef.current?.room?.localParticipant?.getTrackPublication(
    Track.Source.ScreenShare,
  );
  const localScreenStream = localScreenPub?.track?.mediaStreamTrack
    ? new MediaStream([localScreenPub.track.mediaStreamTrack])
    : null;

  const localIdentity = sessionRef.current?.room?.localParticipant?.identity;
  localIdentityRef.current = localIdentity;
  const localTile = useMemo(
    () => ({
      id: localIdentity || 'local',
      label: joinData.displayName,
      stream: localScreenStream || (isVideoEnabled ? localStream : null),
      cameraStream: isVideoEnabled ? localStream : null,
      screenStream: localScreenStream,
      isScreenShare: Boolean(localScreenStream),
      muted: !isAudioEnabled,
      isActiveSpeaker: isActiveSpeaker(activeSpeakers, localIdentity),
      isLocal: true,
    }),
    [
      activeSpeakers,
      isAudioEnabled,
      isVideoEnabled,
      joinData.displayName,
      localIdentity,
      localScreenStream,
      localStream,
    ],
  );

  const panelParticipants = useMemo(
    () =>
      buildPanelParticipants({
        localTile,
        remoteTiles,
        handRaised,
        handStates,
      }),
    [handRaised, handStates, localTile, remoteTiles],
  );

  const isConnecting = connectionState === ConnectionState.Connecting;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;

  const handleToggleHand = async () => {
    const next = !handRaised;
    setHandRaised(next);
    await sessionRef.current?.sendRaiseHand(next);
  };

  const handleSendReaction = async (emoji) => {
    await sessionRef.current?.sendReaction(emoji, joinData.displayName);
  };

  const rootClassName = standalone
    ? 'h-full w-full flex flex-col overflow-hidden bg-[#0B0D10]'
    : 'fixed inset-0 top-16 z-40 bg-[#0B0D10] flex flex-col overflow-hidden';

  return (
    <div className={rootClassName}>
      <MeetingHeader
        meetingTitle={meetingTitle}
        meetingCode={displayMeetingCode}
        participantCount={participantCount}
        connectionState={connectionState}
        onToggleParticipants={() => setShowParticipants((value) => !value)}
        showParticipants={showParticipants}
      />

      {(isConnecting || isReconnecting || error) && (
        <div className="shrink-0 px-4 py-2 bg-[#161A20]/90 border-b border-[#2B3038] text-sm">
          {isConnecting && !error && (
            <p className="text-[#9CA3AF] flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-[#6B7280] border-t-transparent rounded-full animate-spin" />
              Connecting to the meeting room…
            </p>
          )}
          {isReconnecting && !error && (
            <p className="text-[#9CA3AF]">Reconnecting… Your call will resume shortly.</p>
          )}
          {error && (
            <p className="text-red-400/90 font-semibold" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        <FloatingReactions reactions={floatingReactions} />
        <CaptionOverlay
          visible={captionsEnabled}
          lines={captions.lines}
          interimText={captions.interimText}
          error={captions.error}
        />
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden ${showChat && !isMobile ? 'pr-0' : ''}`}>
          <div className="flex-1 min-h-0 overflow-hidden p-3 sm:p-4 lg:p-6 pb-28">
            <ParticipantGrid
              localTile={localTile}
              remoteTiles={remoteTiles}
              chatOpen={showChat}
              isMobile={isMobile}
              handStates={handStates}
            />

            {remoteTiles.length === 0 && isConnected && (
              <p className="text-center text-[#737373] text-sm mt-6">Waiting for others to join…</p>
            )}
          </div>
        </div>

        {showParticipants && (
          <ParticipantPanel
            open={showParticipants}
            onClose={() => setShowParticipants(false)}
            participants={panelParticipants}
            participantCount={participantCount}
            isMobile={isMobile}
          />
        )}

        <MeetingChat
          sessionRef={sessionRef}
          displayName={joinData.displayName}
          open={showChat}
          onClose={() => setShowChat(false)}
          isMobile={isMobile}
          connected={isConnected}
        />
      </div>

      <MeetingControls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isScreenSharing={isScreenSharing}
        isChatOpen={showChat}
        handRaised={handRaised}
        showParticipants={showParticipants}
        captionsEnabled={captionsEnabled}
        onToggleCaptions={() => setCaptionsEnabled((value) => !value)}
        isHost={isHost}
        onRequestEndMeeting={() => setShowEndDialog(true)}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={() => setShowChat((value) => !value)}
        onToggleParticipants={() => setShowParticipants((value) => !value)}
        onToggleHand={handleToggleHand}
        onSendReaction={handleSendReaction}
        onLeave={handleLeave}
        leaving={leaving}
        ending={ending}
        compact={isMobile}
      />

      <EndMeetingDialog
        open={showEndDialog}
        onCancel={() => setShowEndDialog(false)}
        onConfirm={handleConfirmEndMeeting}
        ending={ending}
      />

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
}
