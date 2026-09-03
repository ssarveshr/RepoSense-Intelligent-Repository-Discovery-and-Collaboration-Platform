import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSpeechRecognitionInstance,
  isSpeechRecognitionSupported,
} from '../utils/speechRecognition.js';

const MAX_VISIBLE_LINES = 5;
const RESTART_DELAY_MS = 300;

function trimLines(lines) {
  return lines.slice(-MAX_VISIBLE_LINES);
}

/**
 * Local speech-to-text via browser SpeechRecognition.
 * Final transcript segments are returned through onFinalCaption for LiveKit broadcast.
 */
export function useLiveCaptions({ enabled, onFinalCaption }) {
  const [lines, setLines] = useState([]);
  const [interimText, setInterimText] = useState('');
  const [supported] = useState(() => isSpeechRecognitionSupported());
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  const onFinalCaptionRef = useRef(onFinalCaption);
  onFinalCaptionRef.current = onFinalCaption;
  enabledRef.current = enabled;

  const stopRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.stop();
    } catch {
      // Already stopped.
    }
    recognitionRef.current = null;
  }, []);

  const addCaptionLine = useCallback((line) => {
    if (!line?.text?.trim()) return;
    setLines((current) =>
      trimLines([
        ...current,
        {
          id: line.id || `${line.identity || 'local'}-${Date.now()}`,
          text: line.text.trim(),
          sender: line.sender || 'Speaker',
          isLocal: Boolean(line.isLocal),
        },
      ]),
    );
  }, []);

  const addRemoteCaption = useCallback(
    (caption) => {
      addCaptionLine({
        id: caption.id,
        text: caption.text,
        sender: caption.sender,
        identity: caption.identity,
        isLocal: false,
      });
    },
    [addCaptionLine],
  );

  const scheduleRestart = useCallback((recognition) => {
    window.setTimeout(() => {
      if (recognitionRef.current !== recognition || !enabledRef.current) return;
      try {
        recognition.start();
        setError(null);
      } catch {
        setError('Speech recognition paused. Toggle captions to retry.');
      }
    }, RESTART_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopRecognition();
      setInterimText('');
      setError(null);
      return undefined;
    }

    if (!supported) {
      setError(
        'Live captions are not supported in this browser. Use Chrome or Edge on desktop for speech recognition.',
      );
      return undefined;
    }

    const recognition = createSpeechRecognitionInstance();
    if (!recognition) {
      setError('Unable to start speech recognition in this browser.');
      return undefined;
    }

    recognitionRef.current = recognition;
    setError(null);

    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript?.trim();
        if (!transcript) continue;

        if (result.isFinal) {
          setInterimText('');
          addCaptionLine({ text: transcript, sender: 'You', isLocal: true });
          onFinalCaptionRef.current?.(transcript);
        } else {
          interim = transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event) => {
      if (!enabledRef.current || recognitionRef.current !== recognition) return;

      if (event.error === 'not-allowed') {
        setError('Microphone permission is required for live captions.');
        return;
      }

      if (event.error === 'aborted' || event.error === 'no-speech') {
        return;
      }

      if (event.error === 'network' || event.error === 'service-not-allowed') {
        scheduleRestart(recognition);
        return;
      }

      setError('Speech recognition paused. Toggle captions to retry.');
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition || !enabledRef.current) return;
      scheduleRestart(recognition);
    };

    try {
      recognition.start();
    } catch {
      setError('Unable to start speech recognition.');
    }

    return () => {
      stopRecognition();
    };
  }, [addCaptionLine, enabled, scheduleRestart, stopRecognition, supported]);

  useEffect(
    () => () => {
      stopRecognition();
    },
    [stopRecognition],
  );

  const clearCaptions = useCallback(() => {
    setLines([]);
    setInterimText('');
  }, []);

  return {
    lines,
    interimText,
    supported,
    error,
    enabled,
    addRemoteCaption,
    clearCaptions,
  };
}
