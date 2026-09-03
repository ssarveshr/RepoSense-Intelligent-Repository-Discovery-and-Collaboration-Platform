import { useEffect, useRef, useState } from 'react';
import { CameraIcon, CameraOffIcon, MicIcon, MicOffIcon } from './MeetingIcons';
import { useMeetLayout } from '../../layouts/meetLayoutContext.js';
import { meetAvatarGradient, meetTheme } from './meetTheme.js';

export default function MeetingLobbyView({
  media,
  onJoin,
  joinLabel = 'Join meeting',
  joinError = null,
  joining = false,
  showPasscode = false,
  meetingTitle = null,
  meetingCode = null,
  activeParticipantCount = null,
  defaultDisplayName = '',
}) {
  const { standalone } = useMeetLayout();
  const videoRef = useRef(null);
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [passcode, setPasscode] = useState('');

  const {
    localStream,
    devices,
    selectedCameraId,
    selectedMicId,
    setSelectedCameraId,
    setSelectedMicId,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio,
    toggleVideo,
    permissionError,
  } = media;

  useEffect(() => {
    setDisplayName(defaultDisplayName);
  }, [defaultDisplayName]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = localStream && isVideoEnabled ? localStream : null;
  }, [localStream, isVideoEnabled]);

  const handleJoin = () => {
    onJoin?.({
      displayName: displayName.trim() || 'Guest',
      isAudioEnabled,
      isVideoEnabled,
      selectedCameraId,
      selectedMicId,
      passcode: passcode.trim() || undefined,
    });
  };

  const name = displayName.trim() || 'You';
  const initial = name.charAt(0).toUpperCase();
  const presenceHint =
    activeParticipantCount === null
      ? 'Getting ready…'
      : activeParticipantCount === 0
        ? 'No one else is here yet'
        : activeParticipantCount === 1
          ? '1 person in the meeting'
          : `${activeParticipantCount} people in the meeting`;

  const labelClass = standalone
    ? `block text-xs font-bold uppercase tracking-wider ${meetTheme.textSecondary} mb-2`
    : 'block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2';
  const fieldClass = standalone
    ? `w-full px-4 py-3 rounded-xl text-sm font-medium ${meetTheme.input}`
    : 'w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none';
  const selectClass = standalone
    ? `w-full px-3 py-2.5 rounded-xl text-sm disabled:opacity-50 ${meetTheme.input}`
    : 'w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50';

  return (
    <div
      className={
        standalone
          ? 'min-h-full h-full bg-[#0B0D10]'
          : '-mx-4 sm:-mx-6 lg:-mx-8 -my-12 min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950'
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Preview column */}
          <div className="space-y-5">
            <div className="relative aspect-video bg-[#101318] rounded-3xl border border-[#2B3038] overflow-hidden shadow-lg">
              {permissionError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                    <CameraOffIcon className="w-8 h-8" />
                  </div>
                  <p className="text-red-400 font-semibold text-sm max-w-md">{permissionError}</p>
                </div>
              ) : !isVideoEnabled || !localStream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#101318] to-[#0B0D10]">
                  <div
                    className={`w-28 h-28 rounded-full bg-gradient-to-br ${meetAvatarGradient(name)} text-white font-bold text-4xl flex items-center justify-center border-4 border-white/10 shadow-2xl`}
                  >
                    {initial}
                  </div>
                  <p className="mt-4 text-[#9CA3AF] text-sm font-medium">Camera is off</p>
                </div>
              ) : null}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover mirror ${!localStream || !isVideoEnabled || permissionError ? 'invisible' : ''}`}
              />

              <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2">
                <span>{name}</span>
                {!isAudioEnabled && (
                  <span className="inline-flex items-center gap-1 text-red-300 text-xs">
                    <MicOffIcon className="w-3.5 h-3.5" /> Muted
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleAudio}
                disabled={!!permissionError}
                aria-label={isAudioEnabled ? 'Turn microphone off' : 'Turn microphone on'}
                className={`p-4 rounded-full transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                  isAudioEnabled
                    ? meetTheme.btnNeutral
                    : meetTheme.btnMuted
                }`}
              >
                {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                disabled={!!permissionError}
                aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
                className={`p-4 rounded-full transition-all disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                  isVideoEnabled
                    ? meetTheme.btnNeutral
                    : meetTheme.btnMuted
                }`}
              >
                {isVideoEnabled ? <CameraIcon /> : <CameraOffIcon />}
              </button>
            </div>
          </div>

          {/* Join panel */}
          <div
            className={`rounded-3xl p-6 lg:p-8 shadow-xl space-y-5 lg:sticky lg:top-24 ${
              standalone
                ? `${meetTheme.card}`
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <div>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  standalone ? meetTheme.textSecondary : 'text-indigo-500'
                }`}
              >
                Ready to join?
              </p>
              <h1
                className={`text-2xl font-extrabold ${
                  standalone ? meetTheme.textPrimary : 'text-gray-900 dark:text-white'
                }`}
              >
                {meetingTitle || 'RepoSense Meeting'}
              </h1>
              {meetingCode && (
                <p
                  className={`text-sm font-mono mt-1 ${
                    standalone ? meetTheme.textSecondary : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {meetingCode}
                </p>
              )}
              <p
                className={`text-sm mt-2 ${
                  standalone ? meetTheme.textSecondary : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {presenceHint}
              </p>
            </div>

            {joinError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold" role="alert">
                {joinError}
              </div>
            )}

            {joining && (
              <div className="flex items-center gap-3 p-4 bg-[#1C2128]/60 border border-[#2B3038] rounded-2xl text-[#9CA3AF] text-sm font-semibold">
                <span className="w-5 h-5 border-2 border-[#9CA3AF] border-t-transparent rounded-full animate-spin" />
                Joining meeting…
              </div>
            )}

            <div>
              <label htmlFor="display-name" className={labelClass}>
                Your name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="camera-select" className={labelClass}>
                  Camera
                </label>
                <select
                  id="camera-select"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  disabled={!!permissionError || devices.cameras.length === 0}
                  className={selectClass}
                >
                  {devices.cameras.length === 0 ? (
                    <option value="">No cameras</option>
                  ) : (
                    devices.cameras.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label htmlFor="mic-select" className={labelClass}>
                  Microphone
                </label>
                <select
                  id="mic-select"
                  value={selectedMicId}
                  onChange={(e) => setSelectedMicId(e.target.value)}
                  disabled={!!permissionError || devices.microphones.length === 0}
                  className={selectClass}
                >
                  {devices.microphones.length === 0 ? (
                    <option value="">No microphones</option>
                  ) : (
                    devices.microphones.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Mic ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {showPasscode && (
              <div>
                <label htmlFor="meeting-passcode" className={labelClass}>
                  Passcode (if required)
                </label>
                <input
                  id="meeting-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className={fieldClass}
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={!!permissionError || joining}
              className={`w-full py-4 font-extrabold rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-white/20 ${
                standalone
                  ? meetTheme.primaryAction
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
              }`}
            >
              {joining ? (
                <>
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Joining…
                </>
              ) : (
                joinLabel
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`.mirror { transform: scaleX(-1); }`}</style>
    </div>
  );
}
