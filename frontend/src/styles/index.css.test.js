import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY } from '../utils/themePreference.js';

const here = dirname(fileURLToPath(import.meta.url));

describe('reduced-motion and theme bootstrap', () => {
  it('defines fade-in-up and respects prefers-reduced-motion', () => {
    const css = readFileSync(resolve(here, 'index.css'), 'utf8');
    expect(css).toMatch(/@keyframes fade-in-up/);
    expect(css).toMatch(/\.animate-fade-in-up/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it('applies the stored dark theme before React loads', () => {
    const html = readFileSync(resolve(here, '../../index.html'), 'utf8');
    expect(html).toContain(`localStorage.getItem('${THEME_STORAGE_KEY}')`);
    expect(html).toContain("document.documentElement.classList.add('dark')");
    expect(html).toContain('<title>RepoSense</title>');
    expect(html).toContain('href="/favicon.svg"');
  });

  it('gives enabled links and buttons a pointer cursor outside Meet', () => {
    const css = readFileSync(resolve(here, 'index.css'), 'utf8');
    expect(css).toMatch(/html:not\(\.meet-standalone\).*cursor:\s*pointer/s);
    expect(css).toMatch(/button:disabled[\s\S]*cursor:\s*not-allowed/);
  });
});

