import React from 'react';
import '@testing-library/jest-dom';

globalThis.React = React;
if (typeof window !== 'undefined') {
  window.React = React;
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
      this.tracks = tracks;
    }
    getTracks() {
      return this.tracks;
    }
    getVideoTracks() {
      return this.tracks.filter((t) => t.kind === 'video');
    }
    getAudioTracks() {
      return this.tracks.filter((t) => t.kind === 'audio');
    }
  }

  globalThis.MediaStream = MockMediaStream;
  if (typeof window !== 'undefined') {
    window.MediaStream = MockMediaStream;
  }
}
