import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollaborationStudio from './CollaborationStudio';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

const mockConnectGitHub = vi.fn();
const mockDisconnectGitHub = vi.fn();
const mockReloadGitHubConnection = vi.fn();
const mockReloadRepositories = vi.fn();
const mockUseGitHubConnection = vi.fn();

vi.mock('../services/meetingApi.js', () => ({
  createMeeting: vi.fn(),
  listMeetings: vi.fn().mockResolvedValue([]),
  endMeeting: vi.fn(),
}));

vi.mock('../hooks/useGitHubConnection.js', () => ({
  useGitHubConnection: () => mockUseGitHubConnection(),
}));

vi.mock('../services/collaborationApi.js', async () => {
  const actual = await vi.importActual('../services/collaborationApi.js');
  return {
    ...actual,
    fetchRepositoryCollaborators: vi.fn(),
    resolveMeeting: vi.fn(),
    sendMeetingInvitations: vi.fn(),
  };
});

const authValue = {
  clerkEnabled: true,
  isLoaded: true,
  isSignedIn: true,
  isSessionReady: true,
  user: {
    fullName: 'Test Host',
    primaryEmailAddress: { emailAddress: 'host@example.com' },
  },
  getAuthToken: vi.fn().mockResolvedValue('token'),
  openUserProfile: vi.fn(),
};

function renderStudio(initialEntries = [{ pathname: '/meetings' }]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProfileAuthContext.Provider value={authValue}>
        <CollaborationStudio />
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

function disconnectedGitHubState(overrides = {}) {
  return {
    connection: { connected: false },
    repositories: [],
    loading: false,
    reposLoading: false,
    error: null,
    reposError: null,
    connectGitHub: mockConnectGitHub,
    disconnect: mockDisconnectGitHub,
    reloadConnection: mockReloadGitHubConnection,
    reloadRepositories: mockReloadRepositories,
    githubLogin: null,
    isConnected: false,
    ...overrides,
  };
}

function connectedGitHubState(overrides = {}) {
  return {
    connection: {
      connected: true,
      github_user: {
        login: 'octocat',
        avatar_url: 'https://github.com/octocat.png',
      },
    },
    repositories: [
      {
        full_name: 'octocat/Hello-World',
        url: 'https://github.com/octocat/Hello-World',
        private: false,
      },
      {
        full_name: 'octocat/private-repo',
        url: 'https://github.com/octocat/private-repo',
        private: true,
      },
    ],
    loading: false,
    reposLoading: false,
    error: null,
    reposError: null,
    connectGitHub: mockConnectGitHub,
    disconnect: mockDisconnectGitHub,
    reloadConnection: mockReloadGitHubConnection,
    reloadRepositories: mockReloadRepositories,
    githubLogin: 'octocat',
    isConnected: true,
    ...overrides,
  };
}

describe('CollaborationStudio GitHub integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseGitHubConnection.mockReturnValue(disconnectedGitHubState());
  });

  it('shows Connect GitHub when GitHub is disconnected', () => {
    renderStudio();

    expect(screen.getByText('GitHub connection')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Connect GitHub/i })).toBeInTheDocument();
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('starts OAuth when Connect GitHub is clicked', () => {
    renderStudio();
    fireEvent.click(screen.getByRole('button', { name: /Connect GitHub/i }));
    expect(mockConnectGitHub).toHaveBeenCalled();
  });

  it('shows connected GitHub account details when connected', () => {
    mockUseGitHubConnection.mockReturnValue(connectedGitHubState());
    renderStudio();

    expect(screen.getByText('@octocat')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disconnect/i })).toBeInTheDocument();
  });

  it('shows repository dropdown when GitHub is connected', () => {
    mockUseGitHubConnection.mockReturnValue(connectedGitHubState());
    renderStudio();

    expect(screen.getByLabelText(/Your GitHub repositories/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /octocat\/Hello-World/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /octocat\/private-repo \(private\)/i })).toBeInTheDocument();
  });

  it('loads collaborators when a repository is selected from the dropdown', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');
    fetchRepositoryCollaborators.mockResolvedValue({
      repository: { fullName: 'octocat/Hello-World' },
      collaborators: [
        {
          id: 1,
          github_login: 'alice',
          name: 'Alice',
          permission: 'Write',
          avatar_url: 'https://github.com/alice.png',
        },
      ],
    });

    mockUseGitHubConnection.mockReturnValue(connectedGitHubState());
    renderStudio();

    fireEvent.change(screen.getByLabelText(/Your GitHub repositories/i), {
      target: { value: 'octocat/Hello-World' },
    });

    await waitFor(() => {
      expect(fetchRepositoryCollaborators).toHaveBeenCalledWith(
        'https://github.com/octocat/Hello-World',
        'token',
      );
    });

    expect(await screen.findByText(/Loaded 1 collaborator from octocat\/Hello-World/i)).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
  });

  it('supports manual repository URL fallback when connected', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');
    fetchRepositoryCollaborators.mockResolvedValue({
      repository: { fullName: 'other/manual-repo' },
      collaborators: [{ id: 2, github_login: 'bob', permission: 'Read' }],
    });

    mockUseGitHubConnection.mockReturnValue(connectedGitHubState());
    renderStudio();

    expect(screen.getByText('Or enter a repository manually')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/github\.com\/owner\/repository or owner\/repository/i), {
      target: { value: 'other/manual-repo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Load repository/i }));

    await waitFor(() => {
      expect(fetchRepositoryCollaborators).toHaveBeenCalledWith(
        'https://github.com/other/manual-repo',
        'token',
      );
    });
  });

  it('shows repository load error with retry when GitHub repo fetch fails', () => {
    mockUseGitHubConnection.mockReturnValue(
      connectedGitHubState({
        repositories: [],
        reposError: 'Unable to load GitHub repositories.',
      }),
    );

    renderStudio();

    expect(screen.getByText('Unable to load GitHub repositories.')).toBeInTheDocument();
    const retryButtons = screen.getAllByRole('button', { name: /Retry/i });
    fireEvent.click(retryButtons[0]);
    expect(mockReloadRepositories).toHaveBeenCalled();
  });

  it('shows OAuth success notice after redirect', async () => {
    mockUseGitHubConnection.mockReturnValue(connectedGitHubState());
    renderStudio([{ pathname: '/meetings', search: '?github_oauth=success' }]);

    expect(await screen.findByText(/GitHub connected successfully/i)).toBeInTheDocument();
    expect(mockReloadGitHubConnection).toHaveBeenCalled();
    expect(mockReloadRepositories).toHaveBeenCalled();
  });
});
