import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { ProfileAuthContext } from '../../providers/profileAuthContext.js';

function renderProtected(auth) {
  return render(
    <MemoryRouter initialEntries={['/github-summarizer']}>
      <ProfileAuthContext.Provider value={auth}>
        <Routes>
          <Route path="/sign-in" element={<div>Sign in page</div>} />
          <Route
            path="/github-summarizer"
            element={(
              <ProtectedRoute>
                <div>Protected summarizer</div>
              </ProtectedRoute>
            )}
          />
        </Routes>
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to sign-in', () => {
    renderProtected({
      clerkEnabled: true,
      isLoaded: true,
      isSignedIn: false,
      getAuthToken: vi.fn(),
    });
    expect(screen.getByText('Sign in page')).toBeInTheDocument();
    expect(screen.queryByText('Protected summarizer')).not.toBeInTheDocument();
  });

  it('renders children for authenticated users', () => {
    renderProtected({
      clerkEnabled: true,
      isLoaded: true,
      isSignedIn: true,
      getAuthToken: vi.fn(),
    });
    expect(screen.getByText('Protected summarizer')).toBeInTheDocument();
  });
});
