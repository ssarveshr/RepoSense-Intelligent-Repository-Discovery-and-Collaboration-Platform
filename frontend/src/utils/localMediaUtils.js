const PERMISSION_DENIED_MSG =
  'Camera/microphone access denied — please allow access in your browser settings and reload.';
const DEVICE_NOT_FOUND_MSG =
  'No camera or microphone found — connect a device and reload the page.';

export function mapPermissionError(error) {
  if (error?.name === 'NotAllowedError') return PERMISSION_DENIED_MSG;
  if (error?.name === 'NotFoundError') return DEVICE_NOT_FOUND_MSG;
  return error?.message || 'Unable to access camera or microphone.';
}

export function buildMediaConstraints(cameraId = '', micId = '') {
  const video = cameraId
    ? { deviceId: { exact: cameraId } }
    : { facingMode: 'user' };
  const audio = micId
    ? { deviceId: { exact: micId } }
    : {
        echoCancellation: true,
        noiseSuppression: true,
      };

  return { video, audio };
}

/**
 * Request camera/mic with mobile-friendly fallbacks:
 * both → video only → audio only.
 */
export async function getUserMediaWithFallback(getUserMedia, cameraId = '', micId = '') {
  const { video, audio } = buildMediaConstraints(cameraId, micId);
  const attempts = [
    { video, audio },
    { video, audio: false },
    { video: false, audio },
  ];

  let lastError = null;
  for (const constraints of attempts) {
    try {
      const stream = await getUserMedia(constraints);
      return { stream, constraints };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error('Unable to access camera or microphone.');
}

export function streamTrackFlags(stream) {
  const videoTrack = stream?.getVideoTracks?.()[0];
  const audioTrack = stream?.getAudioTracks?.()[0];
  return {
    hasVideo: Boolean(videoTrack),
    hasAudio: Boolean(audioTrack),
  };
}

export { PERMISSION_DENIED_MSG, DEVICE_NOT_FOUND_MSG };
