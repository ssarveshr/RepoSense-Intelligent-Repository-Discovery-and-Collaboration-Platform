export default function EndMeetingDialog({ open, onCancel, onConfirm, ending = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Cancel end meeting"
        onClick={onCancel}
        disabled={ending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="end-meeting-title"
        className="relative w-full max-w-md rounded-2xl bg-[#171B22] border border-[#2F3640]/80 shadow-2xl p-6"
      >
        <h2 id="end-meeting-title" className="text-[#F5F7FA] text-lg font-bold mb-2">
          End meeting?
        </h2>
        <p className="text-[#9AA3AF] text-sm leading-relaxed mb-6">
          This will end the meeting for everyone and prevent new participants from joining.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={ending}
            className="flex-1 py-2.5 rounded-xl bg-[#242A33] hover:bg-[#2B313B] text-white font-semibold text-sm disabled:opacity-50 border border-[#2F3640]/80 focus:outline-none focus:ring-2 focus:ring-white/20"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={ending}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {ending ? 'Ending…' : 'End meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}
