import { useEffect, useRef } from 'react';
import { MicOffIcon } from './MeetingIcons';

function avatarGradient(name) {
  const hash = (name || '?').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hues = ['from-indigo-600 to-blue-600', 'from-violet-600 to-purple-600', 'from-blue-600 to-cyan-600', 'from-indigo-500 to-violet-600'];
  return hues[hash % hues.length];
}

export default function MeetingParticipantTile({
  label,
  stream,
  muted = false,
  mirror = false,
  isScreenShare = false,
  isActiveSpeaker = false,
  isLocal = false,
  compact = false,
}) {
  const videoRef = useRef(null);
  const initial = (label || '?').charAt(0).toUpperCase();
  const displayLabel = isLocal ? `${label} (You)` : label;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
  }, [stream]);

  const tileClass = isScreenShare
    ? 'col-span-full aspect-video min-h-[200px]'
    : compact
      ? 'aspect-video min-h-[140px]'
      : 'aspect-video min-h-[180px]';

  return (
    <div
      className={`relative bg-gray-900 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 ${tileClass} ${
        isActiveSpeaker ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-950' : 'ring-1 ring-gray-800'
      }`}
    >
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted || isLocal}
          className={`w-full h-full object-cover ${mirror ? 'mirror' : ''}`}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient(label)} text-white font-bold text-2xl flex items-center justify-center border-2 border-white/10 shadow-xl`}
          >
            {initial}
          </div>
        </div>
      )}

      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 py-3 flex items-center justify-between gap-2">
        <span className="text-white text-xs font-semibold truncate">{displayLabel}</span>
        <div className="flex items-center gap-1.5 shrink-0">
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
