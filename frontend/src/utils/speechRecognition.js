/**
 * Browser SpeechRecognition helpers.
 * Captions use the Web Speech API locally; final lines are shared via LiveKit data messages.
 */

export function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

export function createSpeechRecognitionInstance() {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
  return recognition;
}
