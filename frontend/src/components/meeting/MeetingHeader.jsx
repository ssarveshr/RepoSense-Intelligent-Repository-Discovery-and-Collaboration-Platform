import { useState } from 'react';
import { ConnectionState } from '../../services/livekitClient';
import { connectionStatusLabel } from './meetingLayoutUtils';
import MeetingInfoPopover from './MeetingInfoPopover';
import { InfoIcon, PeopleIcon } from './MeetingIcons';
import { meetTheme } from './meetTheme.js';

export default function MeetingHeader({
  meetingTitle,
  meetingCode,
  participantCount,
  connectionState,
  onToggleParticipants,
  showParticipants,
}) {
  const [showInfo, setShowInfo] = useState(false);

  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;
  const isConnecting = connectionState === ConnectionState.Connecting;
  const statusLabel = connectionStatusLabel(connectionState, ConnectionState);

  let statusClass = 'bg-[#161A20] text-[#9CA3AF] border border-[#2B3038]';
  let dotClass = 'bg-[#6B7280]';
  if (isConnected) {
    statusClass = meetTheme.statusConnected;
    dotClass = meetTheme.statusDotConnected;
  } else if (isReconnecting || isConnecting) {
    statusClass = meetTheme.statusReconnecting;
    dotClass = `${meetTheme.statusDotReconnecting} animate-pulse`;
  }

  return (
    <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#111419]/95 backdrop-blur-md border-b border-[#2B3038]">
      <div className="min-w-0 flex items-start gap-2">
        <div className="min-w-0">
          <h1 className="text-[#F3F4F6] text-sm sm:text-base font-bold truncate leading-tight">
            {meetingTitle || 'RepoSense Meeting'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {meetingCode && (
              <p className="text-[#9CA3AF] text-xs font-mono truncate">{meetingCode}</p>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                aria-label="Meeting information"
                aria-expanded={showInfo}
                className="p-1 rounded-md text-[#6B7280] hover:text-[#9CA3AF] hover:bg-[#252B33] transition-colors focus:outline-none focus:ring-2 focus:ring-white/15"
              >
                <InfoIcon className="w-3.5 h-3.5" />
              </button>
              {showInfo && (
                <MeetingInfoPopover
                  meetingTitle={meetingTitle}
                  meetingCode={meetingCode}
                  participantCount={participantCount}
                  connectionLabel={statusLabel}
                  onClose={() => setShowInfo(false)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleParticipants}
          aria-label={`${participantCount} participants`}
          aria-pressed={showParticipants}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-colors ${
            showParticipants
              ? 'bg-[#252B33] text-[#F3F4F6]'
              : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#252B33]'
          }`}
        >
          <PeopleIcon className="w-3.5 h-3.5" />
          <span className="sm:hidden">{participantCount}</span>
          <span className="hidden sm:inline">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
        </button>

        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusClass}`}
          role="status"
          aria-live="polite"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
          {statusLabel}
        </span>
      </div>
    </header>
  );
}
