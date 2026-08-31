import { describe, it, expect } from 'vitest';
import { normalizeFetchError } from './apiError.js';

describe('apiError', () => {
  it('maps failed to fetch to backend guidance', () => {
    expect(normalizeFetchError(new TypeError('Failed to fetch'), 'http://localhost:8000')).toContain(
      'Unable to reach the RepoSense API',
    );
  });
});
