import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSpeechRecognitionInstance,
  getSpeechRecognitionConstructor,
  isSpeechRecognitionSupported,
} from './speechRecognition.js';

describe('speechRecognition utils', () => {
  beforeEach(() => {
    class MockSpeechRecognition {
      start = vi.fn();

      stop = vi.fn();
    }
    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });

  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  it('detects supported browsers', () => {
    expect(isSpeechRecognitionSupported()).toBe(true);
    expect(getSpeechRecognitionConstructor()).toBe(window.SpeechRecognition);
  });

  it('creates configured recognition instances', () => {
    const recognition = createSpeechRecognitionInstance();
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
  });
});
