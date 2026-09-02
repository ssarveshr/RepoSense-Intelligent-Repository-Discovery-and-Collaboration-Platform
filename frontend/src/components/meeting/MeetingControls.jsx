import { useState, useRef, useEffect } from 'react';
import {
  CameraIcon,
  CameraOffIcon,
  CaptionsIcon,
  CaptionsOffIcon,
  ChatIcon,
  HandIcon,
  MicIcon,
  MicOffIcon,
  MoreIcon,
  PeopleIcon,
  ReactionIcon,
  ScreenShareIcon,
} from './MeetingIcons';
import ReactionPicker from './ReactionPicker';

function ControlButton({ active, danger, onClick, disabled, ariaLabel, children, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`p-3.5 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? 'bg-red-500 text-white hover:bg-red-600'
          : active
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-800 text-white hover:bg-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export default function MeetingControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isChatOpen,
  handRaised = false,
  showParticipants = false,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onToggleHand,
  onSendReaction,
  captionsEnabled = false,
  onToggleCaptions,
  isHost = false,
  onRequestEndMeeting,
  onLeave,
  leaving = false,
  ending = false,
  compact = false,
}) {
  const [showMore, setShowMore] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const moreRef = useRef(null);
  const reactionRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setShowMore(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target)) {
        setShowReactions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="absolute bottom-0 inset-x-0 z-30 flex justify-center pb-4 sm:pb-6 px-4 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-gray-900/95 backdrop-blur-xl border border-gray-700/80 rounded-full px-3 sm:px-5 py-2.5 shadow-2xl">
        <ControlButton
          onClick={onToggleAudio}
          danger={!isAudioEnabled}
          ariaLabel={isAudioEnabled ? 'Turn microphone off' : 'Turn microphone on'}
        >
          {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
        </ControlButton>

        <ControlButton
          onClick={onToggleVideo}
          danger={!isVideoEnabled}
          ariaLabel={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
        >
          {isVideoEnabled ? <CameraIcon /> : <CameraOffIcon />}
        </ControlButton>

        {!compact && (
          <ControlButton
            onClick={onToggleScreenShare}
            active={isScreenSharing}
            ariaLabel={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
          >
            <ScreenShareIcon />
          </ControlButton>
        )}

        <ControlButton
          onClick={onToggleChat}
          active={isChatOpen}
          ariaLabel={isChatOpen ? 'Close messages' : 'Open messages'}
        >
          <ChatIcon />
        </ControlButton>

        {compact && (
          <ControlButton
            onClick={onToggleParticipants}
            active={showParticipants}
            ariaLabel={showParticipants ? 'Close people panel' : 'Open people panel'}
          >
            <PeopleIcon />
          </ControlButton>
        )}

        <div className="relative" ref={reactionRef}>
          <ControlButton
            onClick={() => setShowReactions((value) => !value)}
            active={showReactions}
            ariaLabel="Send a reaction"
          >
            <ReactionIcon />
          </ControlButton>
          <ReactionPicker
            open={showReactions}
            onClose={() => setShowReactions(false)}
            onSelect={(emoji) => {
              onSendReaction?.(emoji);
              setShowReactions(false);
            }}
          />
        </div>

        <ControlButton
          onClick={onToggleHand}
          active={handRaised}
          ariaLabel={handRaised ? 'Lower hand' : 'Raise hand'}
        >
          <HandIcon />
        </ControlButton>

        <ControlButton
          onClick={onToggleCaptions}
          active={captionsEnabled}
          ariaLabel={captionsEnabled ? 'Turn captions off' : 'Turn captions on'}
          aria-pressed={captionsEnabled}
        >
          {captionsEnabled ? <CaptionsIcon /> : <CaptionsOffIcon />}
        </ControlButton>

        <div className="relative" ref={moreRef}>
          <ControlButton
            onClick={() => setShowMore((v) => !v)}
            ariaLabel="More options"
          >
            <MoreIcon />
          </ControlButton>
          {showMore && (
            <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 text-sm">
              {compact && (
                <button
                  type="button"
                  onClick={() => {
                    onToggleScreenShare?.();
                    setShowMore(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-white hover:bg-gray-700 flex items-center gap-2"
                >
                  <ScreenShareIcon className="w-4 h-4" />
                  {isScreenSharing ? 'Stop sharing' : 'Share screen'}
                </button>
              )}
              {isHost && (
                <button
                  type="button"
                  onClick={() => {
                    onRequestEndMeeting?.();
                    setShowMore(false);
                  }}
                  disabled={ending}
                  className="w-full px-4 py-2.5 text-left text-red-300 hover:bg-gray-700 disabled:opacity-50"
                >
                  End meeting for everyone
                </button>
              )}
              <p className="px-4 py-2 text-gray-400 text-xs">RepoSense Meeting</p>
            </div>
          )}
        </div>

        {isHost && !compact && (
          <button
            type="button"
            onClick={onRequestEndMeeting}
            disabled={ending || leaving}
            aria-label="End meeting for everyone"
            className="px-4 py-3 bg-red-900/80 hover:bg-red-800 text-red-100 font-bold rounded-full text-sm border border-red-700/80 transition-colors disabled:opacity-50"
          >
            {ending ? 'Ending…' : 'End meeting'}
          </button>
        )}

        <button
          type="button"
          onClick={onLeave}
          disabled={leaving || ending}
          aria-label="Leave meeting"
          className="ml-1 sm:ml-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-sm transition-colors disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave'}
        </button>
      </div>
    </div>
  );
}
