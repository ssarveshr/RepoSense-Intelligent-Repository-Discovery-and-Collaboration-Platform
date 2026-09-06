import { useEffect, useRef } from 'react';

const REACTIONS = ['❤️', '👍', '🎉', '👏', '😂', '😮', '😢', '🤔', '👎'];

export default function ReactionPicker({ open, onClose, onSelect }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    const handleClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Send a reaction"
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#171B22] border border-[#2F3640]/80 rounded-2xl shadow-2xl p-2 flex gap-1 z-50"
    >
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="menuitem"
          aria-label={`Send ${emoji} reaction`}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-10 h-10 flex items-center justify-center text-xl rounded-xl hover:bg-[#242A33] transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export { REACTIONS };
