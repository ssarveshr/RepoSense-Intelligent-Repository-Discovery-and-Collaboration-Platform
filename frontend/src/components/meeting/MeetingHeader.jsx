import { useState } from 'react';
import { ConnectionState } from '../../services/livekitClient';
import { connectionStatusLabel } from './meetingLayoutUtils';
import MeetingInfoPopover from './MeetingInfoPopover';
import { InfoIcon, PeopleIcon } from './MeetingIcons';

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

  return (
    <header className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#090909]/95 backdrop-blur-md border-b border-[#2F2F2F]">
      <div className="min-w-0 flex items-start gap-2">
        <div className="min-w-0">
          <h1 className="text-white text-sm sm:text-base font-bold truncate leading-tight">
            {meetingTitle || 'RepoSense Meeting'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {meetingCode && (
              <p className="text-[#A1A1A1] text-xs font-mono truncate">{meetingCode}</p>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                aria-label="Meeting information"
                aria-expanded={showInfo}
                className="p-1 rounded-md text-[#737373] hover:text-[#A1A1A1] hover:bg-[#222222] transition-colors"
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
              ? 'bg-[#222222] text-white'
              : 'text-[#A1A1A1] hover:text-white hover:bg-[#222222]'
          }`}
        >
          <PeopleIcon className="w-3.5 h-3.5" />
          <span className="sm:hidden">{participantCount}</span>
          <span className="hidden sm:inline">
            {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
          </span>
        </button>

        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
            isConnected
              ? 'bg-emerald-500/15 text-emerald-400'
              : isReconnecting || isConnecting
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-[#222222] text-[#737373]'
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected
                ? 'bg-emerald-400'
                : isReconnecting || isConnecting
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-[#737373]'
            }`}
          />
          {statusLabel}
        </span>
      </div>
    </header>
  );
}
