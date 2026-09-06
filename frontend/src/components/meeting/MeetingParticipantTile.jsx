import { useEffect, useRef } from 'react';
import { MicOffIcon } from './MeetingIcons';
import { meetAvatarGradient } from './meetTheme.js';

export default function MeetingParticipantTile({
  label,
  stream,
  muted = false,
  mirror = false,
  isScreenShare = false,
  isActiveSpeaker = false,
  isLocal = false,
  compact = false,
  solo = false,
  handRaised = false,
}) {
  const videoRef = useRef(null);
  const initial = (label || '?').charAt(0).toUpperCase();
  const displayLabel = isLocal ? `${label} (You)` : label;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream || null;
    if (stream) {
      try {
        const playPromise = video.play();
        playPromise?.catch?.(() => {
          // Autoplay may require a user gesture in some browsers.
        });
      } catch {
        // jsdom and some environments do not implement HTMLMediaElement.play().
      }
    }
  }, [stream]);

  const tileClass = isScreenShare
    ? 'w-full h-full min-h-[160px] max-h-full aspect-video'
    : solo
      ? 'w-full h-full min-h-[200px] max-h-full aspect-video'
      : compact
        ? 'w-full aspect-video min-h-[100px] max-h-[180px]'
        : 'w-full h-full min-h-[140px] max-h-[50vh] aspect-video';

  return (
    <div
      className={`relative bg-[#101318] rounded-2xl overflow-hidden shadow-lg transition-all duration-200 min-h-0 min-w-0 ${tileClass} ${
        isActiveSpeaker ? 'ring-2 ring-[#2B3038] ring-offset-2 ring-offset-[#0B0D10]' : 'ring-1 ring-[#2B3038]'
      }`}
      data-testid="participant-tile"
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className={`w-full h-full ${isScreenShare ? 'object-contain bg-black' : 'object-cover'} ${mirror ? 'mirror' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#12161C] to-[#0F1115]">
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${meetAvatarGradient(label)} text-white font-bold text-2xl flex items-center justify-center border-2 border-white/10 shadow-xl`}
          >
            {initial}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-3 flex items-center justify-between gap-2">
        <span className="text-white text-xs font-semibold truncate">{displayLabel}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {handRaised && (
            <span
              className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/90 text-white text-xs"
              title="Hand raised"
              aria-label="Hand raised"
            >
              ✋
            </span>
          )}
          {muted && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/90 text-white" title="Muted">
              <MicOffIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
