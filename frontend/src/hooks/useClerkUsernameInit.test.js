import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useClerkUsernameInit } from './useClerkUsernameInit';

const mockUpdate = vi.fn();
const mockReload = vi.fn();

let mockUserState = {
  id: 'user_abc',
  fullName: 'Suhan G',
  username: undefined,
  update: mockUpdate,
  reload: mockReload,
};

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: mockUserState,
  }),
}));

describe('useClerkUsernameInit', () => {
  beforeEach(() => {
    mockUpdate.mockReset();
    mockReload.mockReset();
    mockUserState = {
      id: 'user_abc',
      fullName: 'Suhan G',
      username: undefined,
      update: mockUpdate,
      reload: mockReload,
    };
    mockUpdate.mockResolvedValue({});
    mockReload.mockResolvedValue(undefined);
  });

  it('assigns a username when missing', async () => {
    const { result } = renderHook(() => useClerkUsernameInit());

    await waitFor(() => {
      expect(result.current).toBe('ready');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ username: 'suhan-g' });
    expect(mockReload).toHaveBeenCalled();
  });

  it('does not regenerate when username already exists', async () => {
    mockUserState.username = 'suhang-dev';

    const { result } = renderHook(() => useClerkUsernameInit());

    await waitFor(() => {
      expect(result.current).toBe('ready');
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
