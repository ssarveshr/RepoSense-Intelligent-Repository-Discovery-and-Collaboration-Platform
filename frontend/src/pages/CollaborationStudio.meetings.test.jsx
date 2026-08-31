import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CollaborationStudio from './CollaborationStudio';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';

const mockEndMeeting = vi.fn();
const mockListMeetings = vi.fn();
const mockFetchCollaborators = vi.fn();

vi.mock('../services/meetingApi.js', () => ({
  createMeeting: vi.fn(),
  endMeeting: (...args) => mockEndMeeting(...args),
  listMeetings: (...args) => mockListMeetings(...args),
}));

vi.mock('../services/collaborationApi.js', async () => {
  const actual = await vi.importActual('../services/collaborationApi.js');
  return {
    ...actual,
    fetchRepositoryCollaborators: (...args) => mockFetchCollaborators(...args),
    resolveMeeting: vi.fn(),
    sendMeetingInvitations: vi.fn(),
  };
});

const authValue = {
  clerkEnabled: true,
  isLoaded: true,
  isSignedIn: true,
  user: {
    id: 'user_host_1',
    fullName: 'Test Host',
    primaryEmailAddress: { emailAddress: 'host@example.com' },
  },
  getAuthToken: vi.fn().mockResolvedValue('token'),
  openUserProfile: vi.fn(),
};

describe('CollaborationStudio meeting controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListMeetings.mockResolvedValue([
      {
        id: 'meeting-1',
        title: 'hello',
        short_code: '3C4-SMS6',
        host_clerk_user_id: 'user_host_1',
        participants: [{ id: 'p1' }, { id: 'p2' }],
      },
    ]);
    mockFetchCollaborators.mockResolvedValue({ collaborators: [] });
    mockEndMeeting.mockResolvedValue({ id: 'meeting-1', status: 'ended' });
  });

  it('loads repository from owner/repo shorthand', async () => {
    mockFetchCollaborators.mockResolvedValue({
      collaborators: [{ github_login: 'octocat', name: 'Octocat', role: 'Admin' }],
    });

    render(
      <MemoryRouter>
        <ProfileAuthContext.Provider value={authValue}>
          <CollaborationStudio />
        </ProfileAuthContext.Provider>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/owner\/repository/i), {
      target: { value: 'facebook/react' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load repository' }));

    await waitFor(() => {
      expect(mockFetchCollaborators).toHaveBeenCalledWith(
        'https://github.com/facebook/react',
        'token',
      );
    });

    expect(await screen.findByText('Octocat')).toBeInTheDocument();
    expect(screen.getByText('facebook/react')).toBeInTheDocument();
  });

  it('shows End Meeting for host and removes meeting after confirmation', async () => {
    render(
      <MemoryRouter>
        <ProfileAuthContext.Provider value={authValue}>
          <CollaborationStudio />
        </ProfileAuthContext.Provider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('hello')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'End Meeting' }));
    expect(screen.getByText(/End meeting\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'End Meeting' })[1]);

    await waitFor(() => {
      expect(mockEndMeeting).toHaveBeenCalledWith('meeting-1', 'token');
    });
  });
});
