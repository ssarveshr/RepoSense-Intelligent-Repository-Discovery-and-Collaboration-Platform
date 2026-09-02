import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserMediaWithFallback, streamTrackFlags } from '../utils/localMediaUtils';

const PERMISSION_DENIED_MSG =
  'Camera/microphone access denied — please allow access in your browser settings and reload.';
const DEVICE_NOT_FOUND_MSG =
  'No camera or microphone found — connect a device and reload the page.';

function mapPermissionError(error) {
  if (error?.name === 'NotAllowedError') return PERMISSION_DENIED_MSG;
  if (error?.name === 'NotFoundError') return DEVICE_NOT_FOUND_MSG;
  return error?.message || 'Unable to access camera or microphone.';
}

/**
 * Manages local camera/microphone preview via getUserMedia.
 * Stops all tracks on unmount.
 */
export function useLocalMedia() {
  const [localStream, setLocalStream] = useState(null);
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [selectedCameraId, setSelectedCameraIdState] = useState('');
  const [selectedMicId, setSelectedMicIdState] = useState('');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState(null);

  const localStreamRef = useRef(null);
  const isAudioEnabledRef = useRef(true);
  const isVideoEnabledRef = useRef(true);
  const mountedRef = useRef(true);
  const selectedCameraIdRef = useRef('');
  const selectedMicIdRef = useRef('');

  const enumerateDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices({
      cameras: all.filter((d) => d.kind === 'videoinput'),
      microphones: all.filter((d) => d.kind === 'audioinput'),
    });
  }, []);

  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
    isAudioEnabledRef.current = true;
    isVideoEnabledRef.current = true;
  }, []);

  const syncEnabledFromStream = useCallback((stream) => {
    const videoTrack = stream.getVideoTracks()[0];
    const audioTrack = stream.getAudioTracks()[0];
    setIsVideoEnabled(videoTrack?.enabled ?? false);
    setIsAudioEnabled(audioTrack?.enabled ?? false);
    isVideoEnabledRef.current = videoTrack?.enabled ?? false;
    isAudioEnabledRef.current = audioTrack?.enabled ?? false;
  }, []);

  const acquireStream = useCallback(
    async (cameraId, micId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionError('Media devices are not supported in this browser.');
        return;
      }

      stopLocalMedia();

      try {
        const { stream } = await getUserMediaWithFallback(
          navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices),
          cameraId,
          micId,
        );
        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        if (videoTrack) videoTrack.enabled = isVideoEnabledRef.current;
        if (audioTrack) audioTrack.enabled = isAudioEnabledRef.current;

        localStreamRef.current = stream;
        setLocalStream(stream);
        setPermissionError(null);
        syncEnabledFromStream(stream);

        const { hasVideo, hasAudio } = streamTrackFlags(stream);
        const videoDeviceId = videoTrack?.getSettings?.().deviceId ?? cameraId;
        const audioDeviceId = audioTrack?.getSettings?.().deviceId ?? micId;
        selectedCameraIdRef.current = hasVideo ? videoDeviceId : '';
        selectedMicIdRef.current = hasAudio ? audioDeviceId : '';
        setSelectedCameraIdState(hasVideo ? videoDeviceId : '');
        setSelectedMicIdState(hasAudio ? audioDeviceId : '');
        setIsVideoEnabled(hasVideo ? isVideoEnabledRef.current : false);
        setIsAudioEnabled(hasAudio ? isAudioEnabledRef.current : false);

        await enumerateDevices();
      } catch (error) {
        if (!mountedRef.current) return;
        setPermissionError(mapPermissionError(error));
      }
    },
    [stopLocalMedia, syncEnabledFromStream, enumerateDevices],
  );

  useEffect(() => {
    mountedRef.current = true;
    acquireStream('', '');

    return () => {
      mountedRef.current = false;
      stopLocalMedia();
    };
  }, [acquireStream, stopLocalMedia]);

  const setSelectedCameraId = useCallback(
    (deviceId) => {
      selectedCameraIdRef.current = deviceId;
      setSelectedCameraIdState(deviceId);
      acquireStream(deviceId, selectedMicIdRef.current);
    },
    [acquireStream],
  );

  const setSelectedMicId = useCallback(
    (deviceId) => {
      selectedMicIdRef.current = deviceId;
      setSelectedMicIdState(deviceId);
      acquireStream(selectedCameraIdRef.current, deviceId);
    },
    [acquireStream],
  );

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsAudioEnabled(track.enabled);
    isAudioEnabledRef.current = track.enabled;
  }, []);

  const toggleVideo = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsVideoEnabled(track.enabled);
    isVideoEnabledRef.current = track.enabled;
  }, []);

  return {
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
    stopLocalMedia,
  };
}
