import { useState, useEffect, useCallback, useRef } from 'react';
import {
  buildMediaConstraints,
  getUserMediaWithFallback,
  streamTrackFlags,
} from '../utils/localMediaUtils';

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

  const getLocalStream = useCallback(() => localStreamRef.current, []);

  const acquireStream = useCallback(
    async (cameraId, micId) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionError('Media devices are not supported in this browser.');
        return;
      }

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
        localStreamRef.current = null;
      }
      setLocalStream(null);

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
        const desiredVideo = isVideoEnabledRef.current;
        const desiredAudio = isAudioEnabledRef.current;
        if (videoTrack) videoTrack.enabled = desiredVideo;
        if (audioTrack) audioTrack.enabled = desiredAudio;

        localStreamRef.current = stream;
        setLocalStream(stream);
        setPermissionError(null);

        const { hasVideo, hasAudio } = streamTrackFlags(stream);
        const videoDeviceId = videoTrack?.getSettings?.().deviceId ?? cameraId;
        const audioDeviceId = audioTrack?.getSettings?.().deviceId ?? micId;
        selectedCameraIdRef.current = hasVideo ? videoDeviceId : '';
        selectedMicIdRef.current = hasAudio ? audioDeviceId : '';
        setSelectedCameraIdState(hasVideo ? videoDeviceId : '');
        setSelectedMicIdState(hasAudio ? audioDeviceId : '');
        setIsVideoEnabled(hasVideo ? desiredVideo : false);
        setIsAudioEnabled(hasAudio ? desiredAudio : false);
        isVideoEnabledRef.current = hasVideo ? desiredVideo : false;
        isAudioEnabledRef.current = hasAudio ? desiredAudio : false;

        await enumerateDevices();
      } catch (error) {
        if (!mountedRef.current) return;
        setPermissionError(mapPermissionError(error));
      }
    },
    [enumerateDevices],
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

  const setAudioEnabled = useCallback(
    async (enabled) => {
      isAudioEnabledRef.current = enabled;
      setIsAudioEnabled(enabled);

      let stream = localStreamRef.current;
      let audioTrack = stream?.getAudioTracks()[0];

      if (enabled) {
        if (!audioTrack) {
          if (!navigator.mediaDevices?.getUserMedia) return;

          try {
            const { audio } = buildMediaConstraints('', selectedMicIdRef.current);
            const audioStream = await navigator.mediaDevices.getUserMedia({
              audio,
              video: false,
            });
            audioTrack = audioStream.getAudioTracks()[0];
            if (!audioTrack) return;

            if (stream) {
              stream.addTrack(audioTrack);
            } else {
              stream = new MediaStream([audioTrack]);
              localStreamRef.current = stream;
              setLocalStream(stream);
            }

            const deviceId = audioTrack.getSettings?.().deviceId ?? selectedMicIdRef.current;
            if (deviceId) {
              selectedMicIdRef.current = deviceId;
              setSelectedMicIdState(deviceId);
            }

            await enumerateDevices();
            setPermissionError(null);
          } catch (error) {
            if (!mountedRef.current) return;
            isAudioEnabledRef.current = false;
            setIsAudioEnabled(false);
            setPermissionError(mapPermissionError(error));
            return;
          }
        }

        audioTrack.enabled = true;
      } else if (audioTrack) {
        audioTrack.enabled = false;
      }
    },
    [enumerateDevices],
  );

  const setVideoEnabled = useCallback(
    async (enabled) => {
      isVideoEnabledRef.current = enabled;
      setIsVideoEnabled(enabled);

      let stream = localStreamRef.current;
      let videoTrack = stream?.getVideoTracks()[0];

      if (enabled) {
        if (!videoTrack) {
          if (!navigator.mediaDevices?.getUserMedia) return;

          try {
            const { video } = buildMediaConstraints(selectedCameraIdRef.current, '');
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video,
              audio: false,
            });
            videoTrack = videoStream.getVideoTracks()[0];
            if (!videoTrack) return;

            if (stream) {
              stream.addTrack(videoTrack);
            } else {
              stream = new MediaStream([videoTrack]);
              localStreamRef.current = stream;
              setLocalStream(stream);
            }

            const deviceId = videoTrack.getSettings?.().deviceId ?? selectedCameraIdRef.current;
            if (deviceId) {
              selectedCameraIdRef.current = deviceId;
              setSelectedCameraIdState(deviceId);
            }

            await enumerateDevices();
            setPermissionError(null);
          } catch (error) {
            if (!mountedRef.current) return;
            isVideoEnabledRef.current = false;
            setIsVideoEnabled(false);
            setPermissionError(mapPermissionError(error));
            return;
          }
        }

        videoTrack.enabled = true;
      } else if (videoTrack) {
        videoTrack.enabled = false;
      }
    },
    [enumerateDevices],
  );

  const toggleAudio = useCallback(async () => {
    await setAudioEnabled(!isAudioEnabledRef.current);
  }, [setAudioEnabled]);

  const toggleVideo = useCallback(async () => {
    await setVideoEnabled(!isVideoEnabledRef.current);
  }, [setVideoEnabled]);

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
    setAudioEnabled,
    setVideoEnabled,
    getLocalStream,
    permissionError,
    stopLocalMedia,
  };
}
