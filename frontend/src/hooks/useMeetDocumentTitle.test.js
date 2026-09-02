import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMeetDocumentTitle } from './useMeetDocumentTitle';

describe('useMeetDocumentTitle', () => {
  afterEach(() => {
    document.title = 'RepoSense';
  });

  it('sets a meeting title during the stage phase', () => {
    renderHook(() => useMeetDocumentTitle('Sprint Review', 'stage'));
    expect(document.title).toBe('Sprint Review — RepoSense Meet');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'RepoSense';
    const { unmount } = renderHook(() => useMeetDocumentTitle('Sprint Review', 'stage'));
    unmount();
    expect(document.title).toBe('RepoSense');
  });
});
