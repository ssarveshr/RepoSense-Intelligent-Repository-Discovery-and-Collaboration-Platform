import { useEffect, useRef, useState } from 'react';
import { CloseIcon, CopyIcon, InfoIcon } from './MeetingIcons';
import { buildMeetJoinUrl } from '../../utils/frontendBaseUrl.js';

export default function MeetingInfoPopover({
  meetingTitle,
  meetingCode,
  participantCount,
  connectionLabel,
  onClose,
}) {
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const handleClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const meetingLink = meetingCode ? buildMeetJoinUrl(meetingCode) : window.location.href;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Meeting information"
      className="absolute top-full left-0 mt-2 w-80 bg-[#111111] border border-[#2F2F2F] rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2F2F2F]">
        <div className="flex items-center gap-2 text-white text-sm font-bold">
          <InfoIcon className="w-4 h-4 text-[#A1A1A1]" />
          Meeting info
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close meeting information"
          className="p-1.5 rounded-lg text-[#A1A1A1] hover:text-white hover:bg-[#222222] transition-colors"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 text-sm">
        <div>
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-1">Name</p>
          <p className="text-white font-medium">{meetingTitle || 'RepoSense Meeting'}</p>
        </div>

        {meetingCode && (
          <div>
            <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-1">Meeting ID</p>
            <p className="text-[#A1A1A1] font-mono font-semibold">{meetingCode}</p>
          </div>
        )}

        <div>
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-1">Status</p>
          <p className="text-gray-200">{connectionLabel}</p>
        </div>

        <div>
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-1">Participants</p>
          <p className="text-gray-200">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </p>
        </div>

        <div>
          <p className="text-[#737373] text-xs font-semibold uppercase tracking-wider mb-2">Join link</p>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={meetingLink}
              aria-label="Meeting join link"
              className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#161616] border border-[#2F2F2F] text-[#A1A1A1] text-xs font-mono truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy meeting link"
              className="shrink-0 p-2 rounded-lg bg-[#242424] hover:bg-[#303030] text-white transition-colors border border-[#2F2F2F]"
            >
              <CopyIcon className="w-4 h-4" />
            </button>
          </div>
          {copied && <p className="text-emerald-400 text-xs mt-1">Link copied</p>}
        </div>
      </div>
    </div>
  );
}
