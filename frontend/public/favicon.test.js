import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));

describe('favicon', () => {
  it('uses the RepoSense R mark instead of the Vite lightning bolt', () => {
    const svg = readFileSync(resolve(here, 'favicon.svg'), 'utf8');
    expect(svg).toContain('>R</text>');
    expect(svg).not.toContain('#863bff');
    expect(svg).not.toContain('M25.946 44.938');
  });
});
