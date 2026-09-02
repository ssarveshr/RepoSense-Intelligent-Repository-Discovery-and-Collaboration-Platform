import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Element.prototype.scrollIntoView = vi.fn();

if (typeof globalThis.MediaStream === 'undefined') {
  globalThis.MediaStream = class MediaStream {
    constructor(tracks = []) {
      this._tracks = tracks;
    }
    getTracks() {
      return this._tracks;
    }
  };
}
