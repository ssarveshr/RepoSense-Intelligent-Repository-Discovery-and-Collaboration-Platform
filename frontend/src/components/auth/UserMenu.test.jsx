import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserMenu from './UserMenu';
import { ProfileAuthContext } from '../../providers/profileAuthContext.js';

const mockSignOut = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = {
  id: 'user_2abc123xyz',
  fullName: 'Suhan G',
  username: 'suhan-g',
  imageUrl: null,
};

vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }) => children,
  useUser: () => ({ user: mockUser }),
  useClerk: () => ({ signOut: mockSignOut }),
}));

const authValue = {
  clerkEnabled: true,
  isLoaded: true,
  isSignedIn: true,
  user: mockUser,
  usernameSetupState: 'ready',
  getAuthToken: vi.fn(),
  openUserProfile: vi.fn(),
};

function renderMenu(overrides = {}) {
  return render(
    <MemoryRouter>
      <ProfileAuthContext.Provider value={{ ...authValue, ...overrides }}>
        <UserMenu />
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('UserMenu', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockNavigate.mockReset();
    mockUser.username = 'suhan-g';
  });

  it('renders Clerk name and username only', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }));

    expect(await screen.findByText('Suhan G')).toBeInTheDocument();
    expect(screen.getByText('@suhan-g')).toBeInTheDocument();
    expect(screen.queryByText(/@gmail.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/user_/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /copy user id/i })).not.toBeInTheDocument();
  });

  it('navigates to profile', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Your profile' }));
    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('signs out', async () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign out' }));
    expect(mockSignOut).toHaveBeenCalledWith({ redirectUrl: '/' });
  });

  it('shows setting up state when username is being generated', async () => {
    mockUser.username = undefined;
    renderMenu({ usernameSetupState: 'setting_up' });
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }));
    expect(await screen.findByText('Setting up username…')).toBeInTheDocument();
    mockUser.username = 'suhan-g';
  });

  it('shows username not set when missing and not setting up', async () => {
    mockUser.username = undefined;
    renderMenu({ usernameSetupState: 'missing' });
    fireEvent.click(screen.getByRole('button', { name: 'Open user menu' }));
    expect(await screen.findByText('Username not set')).toBeInTheDocument();
    mockUser.username = 'suhan-g';
  });
});
