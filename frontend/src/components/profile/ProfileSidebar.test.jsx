import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileSidebar from './ProfileSidebar';

vi.mock('./ProfilePhotoEditor', () => ({
  default: () => <div data-testid="profile-photo-editor" />,
}));

const mockUser = {
  id: 'user_abc',
  fullName: 'Suhan G',
  username: 'suhan-g',
  imageUrl: null,
};

describe('ProfileSidebar', () => {
  it('shows Clerk name and username without email or user id', () => {
    render(
      <ProfileSidebar
        profile={{
          displayName: 'Suhan G',
          bio: 'hello',
          skills: ['python'],
        }}
        user={mockUser}
        usernameSetupState="ready"
        onEditProfile={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Suhan G' })).toBeInTheDocument();
    expect(screen.getByText('@suhan-g')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByText('python')).toBeInTheDocument();
    expect(screen.queryByText(/@gmail.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/user_/i)).not.toBeInTheDocument();
  });
});
