import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollaborationStudio from './CollaborationStudio';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';
import { GitHubRequestError } from '../utils/githubError.js';

const mockConnectGitHub = vi.fn();
const mockReloadGitHubConnection = vi.fn();

vi.mock('../services/meetingApi.js', () => ({
  createMeeting: vi.fn(),
  listMeetings: vi.fn().mockResolvedValue([]),
  endMeeting: vi.fn(),
}));

vi.mock('../hooks/useGitHubConnection.js', () => ({
  useGitHubConnection: () => ({
    connection: {
      connected: true,
      github_user: { login: 'owner' },
      scopes: ['read:user'],
      permissions_status: 'scope_upgrade_required',
    },
    repositories: [],
    loading: false,
    reposLoading: false,
    error: null,
    reposError: null,
    connectGitHub: mockConnectGitHub,
    disconnect: vi.fn(),
    reloadConnection: mockReloadGitHubConnection,
    reloadRepositories: vi.fn(),
    githubLogin: 'owner',
    isConnected: true,
  }),
}));

vi.mock('../services/collaborationApi.js', () => ({
  fetchRepositoryCollaborators: vi.fn(),
  resolveMeeting: vi.fn(),
  sendMeetingInvitations: vi.fn(),
  normalizeMeetingId: (value) => value,
  isValidMeetingId: () => true,
  isValidEmail: () => true,
  statusLabel: (status) => status,
  INVITATION_STATUS: {
    NOT_SENT: 'not_sent',
    SENT: 'sent',
    SENDING: 'sending',
    FAILED: 'failed',
    EMAIL_UNAVAILABLE: 'email_unavailable',
    SKIPPED_HOST: 'skipped_host',
    SKIPPED_DUPLICATE: 'skipped_duplicate',
  },
}));

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

function renderWithRepo() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/meetings',
          state: {
            githubUrl: 'https://github.com/owner/repo',
            repoName: 'repo',
          },
        },
      ]}
    >
      <ProfileAuthContext.Provider value={authValue}>
        <CollaborationStudio />
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('CollaborationStudio GitHub collaborator errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('shows scope reconnect message and keeps GitHub connected after collaborator 403', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');
    fetchRepositoryCollaborators.mockRejectedValue(
      new GitHubRequestError('scope', { code: 'GITHUB_SCOPE_REQUIRED', reconnectRequired: true }),
    );

    renderWithRepo();

    expect(await screen.findByText(/additional permissions are required/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reconnect GitHub/i })).toBeInTheDocument();
    expect(screen.queryByText(/GitHub connection failed/i)).not.toBeInTheDocument();
  });

  it('shows insufficient repository permission without reconnect button', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');
    fetchRepositoryCollaborators.mockRejectedValue(
      new GitHubRequestError('perm', { code: 'INSUFFICIENT_REPOSITORY_PERMISSION' }),
    );

    renderWithRepo();

    expect(await screen.findByText(/does not have permission to view collaborators/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Reconnect GitHub/i })).not.toBeInTheDocument();
  });

  it('loads collaborators successfully when API succeeds', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');
    fetchRepositoryCollaborators.mockResolvedValue({
      repository: { fullName: 'owner/repo' },
      collaborators: [{ id: 1, login: 'alice', permission: 'Write' }],
    });

    renderWithRepo();

    expect(await screen.findByText(/Loaded 1 collaborator from owner\/repo/i)).toBeInTheDocument();
  });

  it('starts reconnect flow when Reconnect GitHub is clicked', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');
    fetchRepositoryCollaborators.mockRejectedValue(
      new GitHubRequestError('scope', { code: 'GITHUB_SCOPE_REQUIRED', reconnectRequired: true }),
    );

    renderWithRepo();
    const reconnectButton = await screen.findByRole('button', { name: /Reconnect GitHub/i });
    fireEvent.click(reconnectButton);
    expect(mockConnectGitHub).toHaveBeenCalled();
  });
});
