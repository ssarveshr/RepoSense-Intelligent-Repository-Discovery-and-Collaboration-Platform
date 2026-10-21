import { describe, it, expect } from 'vitest';
import { isMeetingsNavPath, isNavPathActive } from './navRoutes.js';

describe('navRoutes', () => {
  it('activates exact destinations without treating home as a prefix', () => {
    expect(isNavPathActive('/', '/', { end: true })).toBe(true);
    expect(isNavPathActive('/github-summarizer', '/', { end: true })).toBe(false);
    expect(isNavPathActive('/github-summarizer', '/github-summarizer')).toBe(true);
  });

  it('maps meeting subroutes to the Meetings section', () => {
    expect(isMeetingsNavPath('/meetings')).toBe(true);
    expect(isMeetingsNavPath('/collaboration')).toBe(true);
    expect(isMeetingsNavPath('/zoom-meeting/abc')).toBe(true);
    expect(isMeetingsNavPath('/meeting-lobby-preview')).toBe(true);
    expect(isMeetingsNavPath('/github-summarizer')).toBe(false);
    expect(isMeetingsNavPath('/')).toBe(false);
  });
});
