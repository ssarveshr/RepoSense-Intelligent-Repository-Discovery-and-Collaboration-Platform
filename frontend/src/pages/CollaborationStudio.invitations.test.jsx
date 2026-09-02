import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollaborationStudio from './CollaborationStudio';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

vi.mock('../services/meetingApi.js', () => ({
  createMeeting: vi.fn(),
  listMeetings: vi.fn().mockResolvedValue([]),
  endMeeting: vi.fn(),
}));

vi.mock('../hooks/useGitHubConnection.js', () => ({
  useGitHubConnection: () => ({
    connection: {
      connected: true,
      github_user: { id: '183266947', login: 'suhanganesh' },
    },
    repositories: [],
    loading: false,
    reposLoading: false,
    error: null,
    reposError: null,
    connectGitHub: vi.fn(),
    disconnect: vi.fn(),
    reloadConnection: vi.fn(),
    reloadRepositories: vi.fn(),
    githubLogin: 'suhanganesh',
    isConnected: true,
  }),
}));

const mockSendMeetingInvitations = vi.fn().mockResolvedValue({
  summary: { sent: 1, skipped_host: 0 },
  recipients: [],
  smtp_enabled: false,
});

vi.mock('../services/collaborationApi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchRepositoryCollaborators: vi.fn().mockResolvedValue({
      repository: { fullName: 'suhanganesh/SkillFit' },
      collaborators: [
        {
          id: 183266947,
          login: 'suhanganesh',
          name: 'suhanganesh',
          permission: 'Admin',
          is_current_user: true,
          github_user_id: '183266947',
        },
        {
          id: 123,
          login: 'PraveenKumarM17',
          name: 'PraveenKumarM17',
          permission: 'Write',
          email: 'kanniymma@gmail.com',
          is_current_user: false,
          github_user_id: '123',
        },
      ],
      count: 2,
      inviteable_count: 1,
    }),
    sendMeetingInvitations: (...args) => mockSendMeetingInvitations(...args),
  };
});

const authValue = {
  clerkEnabled: true,
  isLoaded: true,
  isSignedIn: true,
  isSessionReady: true,
  user: {
    id: 'user_X',
    fullName: 'Suhan Ganesh',
    primaryEmailAddress: { emailAddress: 'host@example.com' },
  },
  getAuthToken: vi.fn().mockResolvedValue('token'),
  openUserProfile: vi.fn(),
};

function renderStudio() {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: '/meetings',
          state: {
            githubUrl: 'https://github.com/suhanganesh/SkillFit',
            repoName: 'SkillFit',
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

describe('CollaborationStudio host invitation exclusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows host as non-selectable without Send Mail or Auto Log', async () => {
    renderStudio();

    expect(await screen.findByText(/1 inviteable collaborator/i)).toBeInTheDocument();
    expect(screen.getByText("You're the meeting host")).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /suhanganesh is the meeting host/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Send Mail/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Auto Log/i })).toHaveLength(1);
  });

  it('select all selects only inviteable collaborators', async () => {
    renderStudio();
    await screen.findByText('PraveenKumarM17');

    fireEvent.click(screen.getByRole('button', { name: /Select all/i }));
    expect(screen.getByText(/· 1 selected/i)).toBeInTheDocument();
  });
});
