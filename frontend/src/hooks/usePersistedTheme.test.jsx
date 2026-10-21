import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { THEME_DARK, THEME_LIGHT, THEME_STORAGE_KEY } from '../utils/themePreference.js';
import { usePersistedTheme } from './usePersistedTheme.js';

describe('usePersistedTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('starts in the default light theme when nothing is saved', () => {
    const { result } = renderHook(() => usePersistedTheme());
    expect(result.current.isDarkMode).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('restores a previously saved dark theme on startup', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, THEME_DARK);
    const { result } = renderHook(() => usePersistedTheme());
    expect(result.current.isDarkMode).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('toggles, persists, and restores the selected theme', () => {
    const { result, unmount } = renderHook(() => usePersistedTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.isDarkMode).toBe(true);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_DARK);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    unmount();
    const restored = renderHook(() => usePersistedTheme());
    expect(restored.result.current.isDarkMode).toBe(true);

    act(() => {
      restored.result.current.toggleTheme();
    });

    expect(restored.result.current.isDarkMode).toBe(false);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_LIGHT);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
