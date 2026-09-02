import { describe, it, expect, vi, afterEach } from 'vitest';
import { getApiBaseUrl, buildApiHeaders } from './apiBase.js';

describe('apiBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to localhost when VITE_API_BASE_URL is unset', () => {
    vi.stubEnv('VITE_API_BASE_URL', '');
    expect(getApiBaseUrl()).toBe('http://localhost:8000');
  });

  it('uses VITE_API_BASE_URL and strips trailing slashes', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/');
    expect(getApiBaseUrl()).toBe('https://api.example.com');
  });

  it('falls back when VITE_API_BASE_URL is invalid', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'not-a-url');
    expect(getApiBaseUrl()).toBe('http://localhost:8000');
  });

  it('buildApiHeaders adds Bearer token when provided', () => {
    const headers = buildApiHeaders('jwt-token');
    expect(headers.Authorization).toBe('Bearer jwt-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('buildApiHeaders omits Authorization when token is absent', () => {
    const headers = buildApiHeaders();
    expect(headers.Authorization).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });
});
