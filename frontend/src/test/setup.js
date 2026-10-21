import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Element.prototype.scrollIntoView = vi.fn();

if (typeof window !== 'undefined') {
  window.matchMedia = window.matchMedia || function (query) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    };
  };
}

if (typeof globalThis.MediaStream === 'undefined') {
  class MockMediaStream {
    constructor(tracks = []) {
      this._tracks = tracks;
    }
    getTracks() {
      return this._tracks;
    }
    getVideoTracks() {
      return this._tracks.filter((t) => t.kind === 'video');
    }
    getAudioTracks() {
      return this._tracks.filter((t) => t.kind === 'audio');
    }
  }

  globalThis.MediaStream = MockMediaStream;
  if (typeof window !== 'undefined') {
    window.MediaStream = MockMediaStream;
  }
}
