import { useEffect, useState } from 'react';
import {
  THEME_DARK,
  THEME_LIGHT,
  applyDocumentTheme,
  getInitialIsDarkMode,
  writeStoredTheme,
} from '../utils/themePreference.js';

export function usePersistedTheme() {
  const [isDarkMode, setIsDarkMode] = useState(getInitialIsDarkMode);

  useEffect(() => {
    applyDocumentTheme(isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode((previous) => {
      const next = !previous;
      writeStoredTheme(next ? THEME_DARK : THEME_LIGHT);
      return next;
    });
  };

  return { isDarkMode, toggleTheme };
}
