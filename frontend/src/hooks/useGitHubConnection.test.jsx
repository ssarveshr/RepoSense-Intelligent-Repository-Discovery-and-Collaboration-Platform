import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGitHubConnection } from './useGitHubConnection.js';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

vi.mock('../services/githubApi.js', () => ({
  getGitHubConnection: vi.fn(),
  listGitHubRepositories: vi.fn(),
  startGitHubOAuth: vi.fn(),
  disconnectGitHub: vi.fn(),
}));

import { getGitHubConnection } from '../services/githubApi.js';

function createWrapper(authValue) {
  return function Wrapper({ children }) {
    return (
      <ProfileAuthContext.Provider value={authValue}>{children}</ProfileAuthContext.Provider>
    );
  };
}

describe('useGitHubConnection readiness', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not call protected APIs while Clerk is loading', async () => {
    const authValue = {
      isLoaded: false,
      isSignedIn: false,
      isSessionReady: false,
      getAuthToken: vi.fn(),
    };

    renderHook(() => useGitHubConnection(), { wrapper: createWrapper(authValue) });

    await waitFor(() => {
      expect(getGitHubConnection).not.toHaveBeenCalled();
    });
  });

  it('does not call protected APIs when signed out', async () => {
    const authValue = {
      isLoaded: true,
      isSignedIn: false,
      isSessionReady: false,
      getAuthToken: vi.fn(),
    };

    renderHook(() => useGitHubConnection(), { wrapper: createWrapper(authValue) });

    await waitFor(() => {
      expect(getGitHubConnection).not.toHaveBeenCalled();
    });
  });

  it('loads GitHub connection after session token is ready', async () => {
    getGitHubConnection.mockResolvedValue({ connected: true, github_user: { login: 'dev' } });

    const authValue = {
      isLoaded: true,
      isSignedIn: true,
      isSessionReady: true,
      getAuthToken: vi.fn(),
    };

    const { result } = renderHook(() => useGitHubConnection(), { wrapper: createWrapper(authValue) });

    await waitFor(() => {
      expect(getGitHubConnection).toHaveBeenCalledOnce();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });
});
