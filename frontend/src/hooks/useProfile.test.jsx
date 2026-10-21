import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';
import { getUserProfile } from '../services/meetingApi';
import { useProfile } from './useProfile';

vi.mock('../services/meetingApi', () => ({
  getUserProfile: vi.fn(),
  updateUserProfile: vi.fn(),
}));

const clerkUser = {
  fullName: 'Suhan G',
  username: 'suhan-g',
  imageUrl: null,
};

function wrapperFor(auth) {
  const value = {
    clerkEnabled: true,
    isLoaded: true,
    isSignedIn: true,
    isSessionReady: true,
    user: clerkUser,
    usernameSetupState: 'ready',
    getAuthToken: vi.fn().mockResolvedValue('clerk-jwt'),
    openUserProfile: vi.fn(),
    ...auth,
  };
  return function Wrapper({ children }) {
    return <ProfileAuthContext.Provider value={value}>{children}</ProfileAuthContext.Provider>;
  };
}

describe('useProfile', () => {
  beforeEach(() => {
    getUserProfile.mockReset();
    getUserProfile.mockResolvedValue({ bio: 'Hello', skills: ['React'] });
  });

  it('does not fetch until the Clerk session is ready', async () => {
    const { result } = renderHook(() => useProfile(), {
      wrapper: wrapperFor({ isSessionReady: false }),
    });

    expect(result.current.loading).toBe(true);
    expect(getUserProfile).not.toHaveBeenCalled();
  });

  it('loads bio and skills after the session is ready', async () => {
    const { result } = renderHook(() => useProfile(), {
      wrapper: wrapperFor({ isSessionReady: true }),
    });

    await waitFor(() => {
      expect(getUserProfile).toHaveBeenCalledWith('clerk-jwt');
    });
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.profile.bio).toBe('Hello');
    expect(result.current.profile.skills).toEqual(['React']);
    expect(result.current.error).toBeNull();
  });

  it('surfaces API connection failures without treating them as success', async () => {
    getUserProfile.mockRejectedValue(
      new Error('Unable to reach the RepoSense API at http://localhost:8000. Make sure the backend is running.'),
    );

    const { result } = renderHook(() => useProfile(), {
      wrapper: wrapperFor({ isSessionReady: true }),
    });

    await waitFor(() => {
      expect(result.current.error).toMatch(/Unable to reach the RepoSense API at http:\/\/localhost:8000/);
    });
    expect(result.current.loading).toBe(false);
  });
});
