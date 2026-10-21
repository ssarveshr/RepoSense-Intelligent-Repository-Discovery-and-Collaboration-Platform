import { SunIcon, MoonIcon } from './icons';

export default function ThemeToggle({ isDarkMode, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isDarkMode}
      aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
      className="cursor-pointer p-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300 motion-reduce:transition-none overflow-hidden relative min-h-10 min-w-10 flex items-center justify-center"
    >
      <span
        className={`block transform transition-transform duration-300 motion-reduce:transition-none ${
          isDarkMode ? 'rotate-90 scale-0 opacity-0 absolute' : 'rotate-0 scale-100 opacity-100'
        }`}
        aria-hidden="true"
      >
        <SunIcon />
      </span>
      <span
        className={`block transform transition-transform duration-300 motion-reduce:transition-none ${
          isDarkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0 absolute'
        }`}
        aria-hidden="true"
      >
        <MoonIcon />
      </span>
    </button>
  );
}
