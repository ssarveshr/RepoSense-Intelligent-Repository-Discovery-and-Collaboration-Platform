import { useEffect, useRef, useState } from 'react';
import { CameraIcon, CameraOffIcon, MicIcon, MicOffIcon } from './MeetingIcons';
import { useMeetLayout } from '../../layouts/meetLayoutContext.js';

function avatarGradient(name) {
  const hash = (name || '?').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hues = ['from-indigo-600 to-blue-600', 'from-violet-600 to-purple-600', 'from-blue-600 to-cyan-600'];
  return hues[hash % hues.length];
}

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

  return (
    <div
      className={
        standalone
          ? 'min-h-full h-full bg-gray-950'
          : '-mx-4 sm:-mx-6 lg:-mx-8 -my-12 min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950'
      }
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          {/* Preview column */}
          <div className="space-y-5">
            <div className="relative aspect-video bg-gray-950 rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
              {permissionError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                    <CameraOffIcon className="w-8 h-8" />
                  </div>
                  <p className="text-red-400 font-semibold text-sm max-w-md">{permissionError}</p>
                </div>
              ) : !isVideoEnabled || !localStream ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-950">
                  <div
                    className={`w-28 h-28 rounded-full bg-gradient-to-br ${avatarGradient(name)} text-white font-bold text-4xl flex items-center justify-center border-4 border-white/10 shadow-2xl`}
                  >
                    {initial}
                  </div>
                  <p className="mt-4 text-gray-400 text-sm font-medium">Camera is off</p>
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
                className={`p-4 rounded-full transition-all disabled:opacity-40 ${
                  isAudioEnabled
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isAudioEnabled ? <MicIcon /> : <MicOffIcon />}
              </button>

              <button
                type="button"
                onClick={toggleVideo}
                disabled={!!permissionError}
                aria-label={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
                className={`p-4 rounded-full transition-all disabled:opacity-40 ${
                  isVideoEnabled
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {isVideoEnabled ? <CameraIcon /> : <CameraOffIcon />}
              </button>
            </div>
          </div>

          {/* Join panel */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 lg:p-8 shadow-xl space-y-5 lg:sticky lg:top-24">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Ready to join?</p>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">
                {meetingTitle || 'RepoSense Meeting'}
              </h1>
              {meetingCode && (
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{meetingCode}</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{presenceHint}</p>
            </div>

            {joinError && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-2xl text-sm font-semibold" role="alert">
                {joinError}
              </div>
            )}

            {joining && (
              <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
                <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Joining meeting…
              </div>
            )}

            <div>
              <label htmlFor="display-name" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Your name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="camera-select" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Camera
                </label>
                <select
                  id="camera-select"
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  disabled={!!permissionError || devices.cameras.length === 0}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
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
                <label htmlFor="mic-select" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Microphone
                </label>
                <select
                  id="mic-select"
                  value={selectedMicId}
                  onChange={(e) => setSelectedMicId(e.target.value)}
                  disabled={!!permissionError || devices.microphones.length === 0}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
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
                <label htmlFor="meeting-passcode" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Passcode (if required)
                </label>
                <input
                  id="meeting-passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}

            <button
              type="button"
              onClick={handleJoin}
              disabled={!!permissionError || joining}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-2xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
