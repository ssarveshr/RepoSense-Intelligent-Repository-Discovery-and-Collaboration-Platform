import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_DARK,
  THEME_LIGHT,
  THEME_STORAGE_KEY,
  applyDocumentTheme,
  getInitialIsDarkMode,
  readStoredTheme,
  writeStoredTheme,
} from './themePreference.js';

describe('themePreference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove('dark');
    vi.restoreAllMocks();
  });

  it('defaults to light when no preference is stored', () => {
    expect(readStoredTheme()).toBeNull();
    expect(getInitialIsDarkMode()).toBe(false);
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'blue');
    expect(readStoredTheme()).toBeNull();
    expect(getInitialIsDarkMode()).toBe(false);
  });

  it('restores a saved dark preference', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, THEME_DARK);
    expect(readStoredTheme()).toBe(THEME_DARK);
    expect(getInitialIsDarkMode()).toBe(true);
  });

  it('persists light and dark selections', () => {
    writeStoredTheme(THEME_DARK);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_DARK);
    writeStoredTheme(THEME_LIGHT);
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe(THEME_LIGHT);
  });

  it('does not write unrecognized theme values', () => {
    writeStoredTheme('system');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('applies and removes the document dark class', () => {
    applyDocumentTheme(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    applyDocumentTheme(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('treats unavailable storage as no preference', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(readStoredTheme()).toBeNull();
    expect(getInitialIsDarkMode()).toBe(false);
  });
});
