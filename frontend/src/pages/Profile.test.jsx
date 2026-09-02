import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Profile from './Profile';

vi.mock('../hooks/useProfile', () => ({
  useProfile: vi.fn(),
}));

vi.mock('../hooks/useGitHubProfile', () => ({
  useGitHubProfile: vi.fn(),
}));

vi.mock('../hooks/useGitHubConnection', () => ({
  useGitHubConnection: vi.fn(),
}));

vi.mock('../providers/profileAuthContext.js', () => ({
  useProfileAuth: vi.fn(),
}));

vi.mock('../components/profile/ProfileSidebar', () => ({
  default: () => <div data-testid="profile-sidebar">Profile sidebar</div>,
}));

vi.mock('../components/profile/ProfileGitHubSection', () => ({
  default: ({ loading, isOAuthConnected }) => (
    <div data-testid="profile-github">
      {loading ? 'github-loading' : isOAuthConnected ? 'github-connected' : 'github-disconnected'}
    </div>
  ),
}));

vi.mock('../components/profile/EditProfileDialog', () => ({
  default: () => null,
}));

import { useProfile } from '../hooks/useProfile';
import { useGitHubProfile } from '../hooks/useGitHubProfile';
import { useGitHubConnection } from '../hooks/useGitHubConnection';
import { useProfileAuth } from '../providers/profileAuthContext.js';

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileAuth.mockReturnValue({
      user: { fullName: 'Suhan G', username: 'suhan-g' },
      usernameSetupState: 'ready',
      isLoaded: true,
      isSessionReady: true,
    });
    useProfile.mockReturnValue({
      profile: { displayName: 'Suhan G', bio: 'hello', skills: ['python'] },
      loading: false,
      error: null,
      saveProfile: vi.fn(),
      reloadProfile: vi.fn(),
    });
    useGitHubProfile.mockReturnValue({
      data: { connected: false },
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    useGitHubConnection.mockReturnValue({
      connection: { connected: false },
      connectGitHub: vi.fn(),
      disconnect: vi.fn(),
      isConnected: false,
      loading: false,
      error: null,
      reloadConnection: vi.fn(),
    });
  });

  it('renders profile identity and GitHub section without meeting activity', () => {
    render(<Profile />);

    expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('profile-github')).toBeInTheDocument();
    expect(screen.getByText('github-disconnected')).toBeInTheDocument();
    expect(screen.queryByText(/Completed meeting/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Created meeting/i)).not.toBeInTheDocument();
  });

  it('does not keep the page skeleton after profile data is ready', () => {
    render(<Profile />);

    expect(screen.queryByTestId('profile-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('profile-sidebar')).toBeInTheDocument();
  });

  it('shows connected GitHub section when OAuth is connected', () => {
    useGitHubConnection.mockReturnValue({
      connection: { connected: true, github_user: { login: 'dev' } },
      connectGitHub: vi.fn(),
      disconnect: vi.fn(),
      isConnected: true,
      loading: false,
      error: null,
      reloadConnection: vi.fn(),
    });

    render(<Profile />);

    expect(screen.getByText('github-connected')).toBeInTheDocument();
  });

  it('does not skeleton the GitHub section when only the secondary profile request is still loading', () => {
    useGitHubConnection.mockReturnValue({
      connection: { connected: true, github_user: { login: 'dev' } },
      connectGitHub: vi.fn(),
      disconnect: vi.fn(),
      isConnected: true,
      loading: false,
      error: null,
      reloadConnection: vi.fn(),
    });
    useGitHubProfile.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      reload: vi.fn(),
    });

    render(<Profile />);

    expect(screen.getByText('github-connected')).toBeInTheDocument();
  });

  it('does not fetch meeting activity endpoints', () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<Profile />);

    const activityCalls = fetchSpy.mock.calls.filter(([url]) =>
      String(url).includes('/api/profile/activity'),
    );
    expect(activityCalls).toHaveLength(0);
    fetchSpy.mockRestore();
  });
});
