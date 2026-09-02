import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollaborationStudio from './CollaborationStudio';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

vi.mock('../services/meetingApi.js', () => ({
  createMeeting: vi.fn(),
  listMeetings: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/collaborationApi.js', async () => {
  const actual = await vi.importActual('../services/collaborationApi.js');
  return {
    ...actual,
    fetchRepositoryCollaborators: vi.fn().mockResolvedValue({ collaborators: [] }),
    resolveMeeting: vi.fn(),
    sendMeetingInvitations: vi.fn(),
  };
});

vi.mock('../hooks/useGitHubConnection.js', () => ({
  useGitHubConnection: () => ({
    connection: { connected: false },
    repositories: [],
    loading: false,
    reposLoading: false,
    error: null,
    reposError: null,
    connectGitHub: vi.fn(),
    disconnect: vi.fn(),
    reloadConnection: vi.fn(),
    reloadRepositories: vi.fn(),
    githubLogin: null,
    isConnected: false,
  }),
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

describe('CollaborationStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders host configuration and meeting controls', () => {
    render(
      <MemoryRouter>
        <ProfileAuthContext.Provider value={authValue}>
          <CollaborationStudio />
        </ProfileAuthContext.Provider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /Host Meeting & Broadcast Collaborator Invites/i })).toBeInTheDocument();
    expect(screen.getByText('Host Setup & Meeting Configuration')).toBeInTheDocument();
    expect(screen.getByText('GitHub connection')).toBeInTheDocument();
    expect(screen.getByText('Select a repository')).toBeInTheDocument();
    expect(screen.getByText('Your Active Meetings')).toBeInTheDocument();
    expect(screen.queryByText('Sarah Frontend')).not.toBeInTheDocument();
    expect(screen.queryByText(/Zoom Collaboration/i)).not.toBeInTheDocument();
    expect(screen.queryByText('RepoSense Collaboration Studio')).not.toBeInTheDocument();
  });

  it('loads collaborators when repository is provided via navigation state', async () => {
    const { fetchRepositoryCollaborators } = await import('../services/collaborationApi.js');

    render(
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

    expect(await screen.findByText('Repository')).toBeInTheDocument();
    expect(screen.getByText('owner/repo')).toBeInTheDocument();
    expect(fetchRepositoryCollaborators).toHaveBeenCalled();
  });
});
