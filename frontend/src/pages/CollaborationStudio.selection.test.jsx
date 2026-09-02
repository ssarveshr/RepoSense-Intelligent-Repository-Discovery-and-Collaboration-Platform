import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollaborationStudio from './CollaborationStudio';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

const mockCreateMeeting = vi.fn().mockResolvedValue({
  id: 'meeting-1',
  title: 'Sync',
  short_code: 'ABCD-1234',
});
const mockSendMeetingInvitations = vi.fn().mockResolvedValue({
  summary: { sent: 1, skipped_host: 0 },
  recipients: [],
  smtp_enabled: false,
});

vi.mock('../services/meetingApi.js', () => ({
  createMeeting: (...args) => mockCreateMeeting(...args),
  listMeetings: vi.fn().mockResolvedValue([]),
  endMeeting: vi.fn(),
}));

vi.mock('../hooks/useGitHubConnection.js', () => ({
  useGitHubConnection: () => ({
    connection: { connected: true, github_user: { id: '1', login: 'host-user' } },
    repositories: [],
    loading: false,
    reposLoading: false,
    error: null,
    reposError: null,
    connectGitHub: vi.fn(),
    disconnect: vi.fn(),
    reloadConnection: vi.fn(),
    reloadRepositories: vi.fn(),
    githubLogin: 'host-user',
    isConnected: true,
  }),
}));

vi.mock('../services/collaborationApi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchRepositoryCollaborators: vi.fn().mockResolvedValue({
      repository: { fullName: 'owner/repo' },
      collaborators: [
        {
          id: 'host-user',
          login: 'host-user',
          name: 'Host User',
          permission: 'Admin',
          email: 'host@example.com',
          is_current_user: true,
        },
        {
          id: 'alice',
          login: 'alice',
          name: 'Alice',
          permission: 'Write',
          email: 'alice@example.com',
          is_current_user: false,
        },
        {
          id: 'bob',
          login: 'bob',
          name: 'Bob',
          permission: 'Read',
          is_current_user: false,
        },
      ],
      count: 3,
      inviteable_count: 2,
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
    fullName: 'Host User',
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

describe('CollaborationStudio collaborator selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders checkboxes for inviteable collaborators', async () => {
    renderStudio();
    await screen.findByText('Alice');

    expect(screen.getByRole('checkbox', { name: /Select Alice for invitation/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Bob cannot be invited because email is unavailable/i })).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: /Host User is the meeting host/i })).not.toBeInTheDocument();
  });

  it('selects and deselects an individual collaborator', async () => {
    renderStudio();
    await screen.findByText('Alice');

    const aliceCheckbox = screen.getByRole('checkbox', { name: /Select Alice for invitation/i });
    fireEvent.click(aliceCheckbox);
    expect(aliceCheckbox).toBeChecked();
    expect(screen.getByText(/· 1 selected/i)).toBeInTheDocument();

    fireEvent.click(aliceCheckbox);
    expect(aliceCheckbox).not.toBeChecked();
    expect(screen.queryByText(/· 1 selected/i)).not.toBeInTheDocument();
  });

  it('select all selects only inviteable collaborators with email', async () => {
    renderStudio();
    await screen.findByText('Alice');

    fireEvent.click(screen.getByRole('button', { name: /Select all/i }));
    expect(screen.getByText(/· 1 selected/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Select Alice for invitation/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Bob cannot be invited because email is unavailable/i })).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Deselect all/i })).toBeInTheDocument();
  });

  it('deselect all clears every selection', async () => {
    renderStudio();
    await screen.findByText('Alice');

    fireEvent.click(screen.getByRole('button', { name: /Select all/i }));
    fireEvent.click(screen.getByRole('button', { name: /Deselect all/i }));

    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Select Alice for invitation/i })).not.toBeChecked();
  });

  it('clear selection removes partial selections', async () => {
    renderStudio();
    await screen.findByText('Alice');

    fireEvent.click(screen.getByRole('checkbox', { name: /Select Alice for invitation/i }));
    fireEvent.click(screen.getByRole('button', { name: /Clear selection/i }));

    expect(screen.getByRole('checkbox', { name: /Select Alice for invitation/i })).not.toBeChecked();
  });

  it('does not select collaborators without email', async () => {
    renderStudio();
    await screen.findByText('Bob');

    const bobCheckbox = screen.getByRole('checkbox', { name: /Bob cannot be invited because email is unavailable/i });
    fireEvent.click(bobCheckbox);
    expect(bobCheckbox).not.toBeChecked();
    expect(screen.queryByText(/· 1 selected/i)).not.toBeInTheDocument();
  });

  it('broadcast invitations use only selected collaborators', async () => {
    renderStudio();
    await screen.findByText('Alice');

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Live Architecture Code Sync/i), {
      target: { value: 'Team sync' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Select Alice for invitation/i }));
    fireEvent.click(screen.getByRole('button', { name: /Host Meeting & Broadcast Collaborator Invites/i }));
    fireEvent.click(screen.getByRole('button', { name: /Send All Invitations/i }));

    await waitFor(() => {
      expect(mockSendMeetingInvitations).toHaveBeenCalled();
    });

    const payload = mockSendMeetingInvitations.mock.calls[0][1];
    expect(payload.recipients).toHaveLength(1);
    expect(payload.recipients[0].email).toBe('alice@example.com');
  });

  it('auto log still works for inviteable collaborators', async () => {
    renderStudio();
    await screen.findByText('Alice');

    fireEvent.click(screen.getAllByRole('button', { name: /Auto Log/i })[0]);
    expect(await screen.findByText(/Invitation logged for Alice/i)).toBeInTheDocument();
  });
});
