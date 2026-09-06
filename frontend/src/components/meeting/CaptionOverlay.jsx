export default function CaptionOverlay({ lines, interimText, error, visible }) {
  if (!visible) return null;

  const hasContent = Boolean(error) || lines.length > 0 || Boolean(interimText);
  if (!hasContent) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-28 sm:bottom-32 z-20 flex justify-center px-3 sm:px-6"
      aria-live="polite"
      aria-atomic="false"
      data-testid="caption-overlay"
    >
      <div className="w-full max-w-3xl space-y-1.5">
        {error && (
          <p
            className="rounded-xl bg-amber-950/90 border border-amber-700/50 px-3 py-2 text-amber-200 text-xs sm:text-sm text-center"
            role="alert"
          >
            {error}
          </p>
        )}

        {lines.map((line) => (
          <div
            key={line.id}
            className="rounded-xl bg-black/75 backdrop-blur-sm border border-white/10 px-3 py-2 text-white text-sm sm:text-base leading-snug break-words"
          >
            <span className="font-semibold text-[#9AA3AF] mr-2">{line.sender}:</span>
            <span>{line.text}</span>
          </div>
        ))}

        {interimText && (
          <div className="rounded-xl bg-black/60 backdrop-blur-sm border border-white/5 px-3 py-2 text-gray-300 text-sm italic break-words">
            <span className="font-semibold text-[#9AA3AF] mr-2">You:</span>
            <span>{interimText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
