import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppNav, AppMobileNav } from './AppNav';
import { ProfileAuthContext } from '../../providers/profileAuthContext.js';

let mockSignedIn = true;

vi.mock('@clerk/clerk-react', () => ({
  SignedIn: ({ children }) => (mockSignedIn ? children : null),
  SignedOut: ({ children }) => (mockSignedIn ? null : children),
  useUser: () => ({ user: { fullName: 'Suhan G', username: 'suhan-g' } }),
  useClerk: () => ({ signOut: vi.fn() }),
}));

const authValue = {
  clerkEnabled: true,
  isLoaded: true,
  isSignedIn: true,
  user: { fullName: 'Suhan G' },
  usernameSetupState: 'ready',
  getAuthToken: vi.fn(),
  openUserProfile: vi.fn(),
};

function renderNav(overrides = {}, initialEntries = ['/']) {
  const value = { ...authValue, ...overrides };
  mockSignedIn = Boolean(value.isSignedIn);
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ProfileAuthContext.Provider value={value}>
        <AppNav />
        <AppMobileNav />
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('AppNav', () => {
  beforeEach(() => {
    mockSignedIn = true;
  });

  it('exposes a mobile menu control while keeping desktop destinations', () => {
    renderNav();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Discover' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'GitHub Summarizer' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Code Agent' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Meetings' })).toBeInTheDocument();
  });

  it('uses plain-text destinations without bolt or video icons', () => {
    renderNav();
    const primary = screen.getByRole('navigation', { name: 'Primary' });
    expect(primary.querySelectorAll('svg')).toHaveLength(0);
    expect(within(primary).getByRole('link', { name: 'AI Code Agent' })).toHaveTextContent('AI Code Agent');
    expect(within(primary).getByRole('link', { name: 'Meetings' })).toHaveTextContent('Meetings');
  });

  it('opens and closes the mobile navigation menu', () => {
    renderNav();
    const toggle = screen.getByRole('button', { name: 'Open navigation menu' });
    fireEvent.click(toggle);

    expect(screen.getByRole('button', { name: 'Close navigation menu' })).toHaveAttribute('aria-expanded', 'true');
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    expect(within(mobileNav).getByRole('link', { name: 'Discover' })).toHaveAttribute('href', '/');
    expect(within(mobileNav).getByRole('link', { name: 'GitHub Summarizer' })).toHaveAttribute('href', '/github-summarizer');
    expect(within(mobileNav).getByRole('link', { name: 'AI Code Agent' })).toHaveAttribute('href', '/ai-agent');
    expect(within(mobileNav).getByRole('link', { name: 'Meetings' })).toHaveAttribute('href', '/meetings');
    expect(mobileNav.querySelectorAll('svg')).toHaveLength(0);
    expect(within(mobileNav).getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');

    fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile primary' })).not.toBeInTheDocument();
  });

  it('closes the mobile menu after navigating', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    fireEvent.click(within(mobileNav).getByRole('link', { name: 'Discover' }));
    expect(screen.queryByRole('navigation', { name: 'Mobile primary' })).not.toBeInTheDocument();
  });

  it('shows public destinations when signed out', () => {
    renderNav({ isSignedIn: false });
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    expect(within(mobileNav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(mobileNav).getByRole('link', { name: 'Sign In' })).toHaveAttribute('href', '/sign-in');
    expect(within(mobileNav).getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/sign-up');
    expect(within(mobileNav).queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument();
  });

  it('closes the mobile menu on Escape', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('navigation', { name: 'Mobile primary' })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'Mobile primary' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open navigation menu' })).toHaveFocus();
  });

  it('moves keyboard focus into the mobile menu when it opens', () => {
    renderNav();
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    expect(within(mobileNav).getByRole('link', { name: 'Discover' })).toHaveFocus();
  });

  it('marks Discover as the active route on the home page', () => {
    renderNav({}, ['/']);
    expect(screen.getByRole('link', { name: 'Discover' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'GitHub Summarizer' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'Meetings' })).not.toHaveAttribute('aria-current');
  });

  it('marks GitHub Summarizer as active without highlighting Discover', () => {
    renderNav({}, ['/github-summarizer']);
    expect(screen.getByRole('link', { name: 'GitHub Summarizer' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
  });

  it('treats meeting subroutes as the Meetings section', () => {
    renderNav({}, ['/collaboration']);
    expect(screen.getByRole('link', { name: 'Meetings' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: 'AI Code Agent' })).not.toHaveAttribute('aria-current');
  });

  it('marks Profile as active in the mobile menu', () => {
    renderNav({}, ['/profile']);
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    const mobileNav = screen.getByRole('navigation', { name: 'Mobile primary' });
    expect(within(mobileNav).getByRole('link', { name: 'Profile' })).toHaveAttribute('aria-current', 'page');
    expect(within(mobileNav).getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
  });
});
