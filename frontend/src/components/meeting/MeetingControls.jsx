import { useState, useRef, useEffect } from 'react';
import {
  CameraIcon,
  CameraOffIcon,
  ChatIcon,
  MicIcon,
  MicOffIcon,
  MoreIcon,
  ScreenShareIcon,
} from './MeetingIcons';

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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onLeave,
  leaving = false,
  compact = false,
}) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (moreRef.current && !moreRef.current.contains(event.target)) {
        setShowMore(false);
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

        <div className="relative" ref={moreRef}>
          <ControlButton
            onClick={() => setShowMore((v) => !v)}
            ariaLabel="More options"
          >
            <MoreIcon />
          </ControlButton>
          {showMore && (
            <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 text-sm">
              <p className="px-4 py-2 text-gray-400 text-xs">RepoSense Meeting</p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onLeave}
          disabled={leaving}
          aria-label="Leave meeting"
          className="ml-1 sm:ml-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-sm transition-colors disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave'}
        </button>
      </div>
    </div>
  );
}
