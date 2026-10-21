export const THEME_STORAGE_KEY = 'reposense-theme';
export const THEME_DARK = 'dark';
export const THEME_LIGHT = 'light';

export function readStoredTheme() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === THEME_DARK || value === THEME_LIGHT) return value;
  } catch {
    // Storage can be unavailable or blocked.
  }
  return null;
}

export function writeStoredTheme(theme) {
  if (theme !== THEME_DARK && theme !== THEME_LIGHT) return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

export function applyDocumentTheme(isDark) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function getInitialIsDarkMode() {
  return readStoredTheme() === THEME_DARK;
}
