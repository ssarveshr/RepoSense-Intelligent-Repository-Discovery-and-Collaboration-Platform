import { useEffect, useRef } from 'react';
import { CloseIcon, MicOffIcon, PeopleIcon } from './MeetingIcons';

export default function ParticipantPanel({
  open,
  onClose,
  participants,
  participantCount,
  isMobile,
}) {
  const panelRef = useRef(null);
  const count = participantCount ?? participants.length;

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Participants"
      className={`flex flex-col bg-[#171B22] border-[#2F3640]/80 overflow-hidden ${
        isMobile
          ? 'fixed inset-0 z-50'
          : 'w-72 shrink-0 border-l h-full'
      }`}
    >
      <div className="px-4 py-3 border-b border-[#2F3640]/80 flex items-center justify-between bg-[#12161C]/95 backdrop-blur-md">
        <h2 className="text-white text-sm font-bold flex items-center gap-2">
          <PeopleIcon className="w-4 h-4" />
          People ({count})
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close participants panel"
          className="p-2 rounded-lg text-[#9AA3AF] hover:text-white hover:bg-[#242A33] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto p-3 space-y-1 min-h-0">
        {participants.map((participant) => (
          <li
            key={participant.id}
            className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl hover:bg-[#242A33] transition-colors"
          >
            <div className="min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {participant.label}
                {participant.isLocal && (
                  <span className="text-[#737373] font-normal"> (You)</span>
                )}
              </p>
              {participant.handRaised && (
                <p className="text-amber-400 text-xs mt-0.5">✋ Hand raised</p>
              )}
            </div>
            {participant.muted && (
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/20 text-red-400 shrink-0"
                title="Microphone off"
                aria-label="Microphone off"
              >
                <MicOffIcon className="w-3.5 h-3.5" />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 bg-black/50 z-40"
          aria-label="Close participants overlay"
          onClick={onClose}
        />
        {panel}
      </>
    );
  }

  return panel;
}
