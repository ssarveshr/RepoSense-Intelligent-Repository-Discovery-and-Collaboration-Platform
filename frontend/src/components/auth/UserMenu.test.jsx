import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UserMenu from './UserMenu';
import { ProfileAuthContext } from '../../providers/profileAuthContext.js';

const mockSignOut = vi.fn();

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

function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <ProfileAuthContext.Provider value={authValue}>
        <Routes>
          <Route path="/profile" element={<div>Profile page</div>} />
          <Route
            path="*"
            element={(
              <>
                <UserMenu />
                <div>Other page content</div>
              </>
            )}
          />
        </Routes>
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('UserMenu', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockUser.username = 'suhan-g';
  });

  it('navigates directly to profile when the avatar is clicked', () => {
    renderMenu();
    const trigger = screen.getByRole('link', { name: 'Open profile' });

    expect(trigger).toHaveAttribute('href', '/profile');
    expect(trigger).not.toHaveAttribute('aria-haspopup');
    expect(trigger).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByText('Your profile')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Sign out' })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByText('Profile page')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does not render a dropdown or popover around the avatar', () => {
    renderMenu();

    expect(screen.getByRole('link', { name: 'Open profile' })).toBeInTheDocument();
    expect(screen.queryByRole('menu', { name: 'Profile menu' })).not.toBeInTheDocument();
    expect(screen.queryByText('Your profile')).not.toBeInTheDocument();
    expect(document.querySelector('[data-reposense-profile-menu]')).not.toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
