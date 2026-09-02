import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGitHubProfile } from './useGitHubProfile.js';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

vi.mock('../services/profileApi.js', () => ({
  getGitHubProfile: vi.fn(),
}));

import { getGitHubProfile } from '../services/profileApi.js';

function createWrapper(authValue) {
  return function Wrapper({ children }) {
    return (
      <ProfileAuthContext.Provider value={authValue}>{children}</ProfileAuthContext.Provider>
    );
  };
}

describe('useGitHubProfile readiness', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not call protected APIs before session is ready', async () => {
    renderHook(() => useGitHubProfile(), {
      wrapper: createWrapper({
        isLoaded: true,
        isSignedIn: true,
        isSessionReady: false,
      }),
    });

    await waitFor(() => {
      expect(getGitHubProfile).not.toHaveBeenCalled();
    });
  });

  it('loads GitHub profile after session is ready', async () => {
    getGitHubProfile.mockResolvedValue({ connected: true, github_username: 'dev' });

    const { result } = renderHook(() => useGitHubProfile(), {
      wrapper: createWrapper({
        isLoaded: true,
        isSignedIn: true,
        isSessionReady: true,
      }),
    });

    await waitFor(() => {
      expect(getGitHubProfile).toHaveBeenCalledOnce();
      expect(result.current.loading).toBe(false);
      expect(result.current.data?.connected).toBe(true);
    });
  });

  it('clears loading after API failure', async () => {
    getGitHubProfile.mockRejectedValue(new Error('GitHub unavailable'));

    const { result } = renderHook(() => useGitHubProfile(), {
      wrapper: createWrapper({
        isLoaded: true,
        isSignedIn: true,
        isSessionReady: true,
      }),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('GitHub unavailable');
    });
  });
});
