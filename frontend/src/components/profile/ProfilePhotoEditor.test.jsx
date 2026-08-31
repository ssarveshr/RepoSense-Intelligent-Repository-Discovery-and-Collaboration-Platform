import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfilePhotoEditor from './ProfilePhotoEditor';

const mockSetProfileImage = vi.fn();
const mockReload = vi.fn();

const mockUser = {
  id: 'user_test',
  fullName: 'Suhan G',
  imageUrl: null,
  setProfileImage: mockSetProfileImage,
  reload: mockReload,
};

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: mockUser }),
}));

describe('ProfilePhotoEditor', () => {
  beforeEach(() => {
    mockSetProfileImage.mockReset();
    mockReload.mockReset();
    mockSetProfileImage.mockResolvedValue({});
    mockReload.mockResolvedValue(undefined);
    mockUser.imageUrl = null;
    global.URL.createObjectURL = vi.fn(() => 'blob:preview-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders change photo control for authenticated user', () => {
    render(<ProfilePhotoEditor user={mockUser} />);
    expect(screen.getAllByRole('button', { name: 'Change profile picture' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Change photo' })).toBeInTheDocument();
  });

  it('renders initials fallback when no Clerk image', () => {
    render(<ProfilePhotoEditor user={mockUser} />);
    expect(screen.getByText('SG')).toBeInTheDocument();
  });

  it('rejects invalid file types', async () => {
    render(<ProfilePhotoEditor user={mockUser} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('Please choose a supported image file.')).toBeInTheDocument();
    expect(mockSetProfileImage).not.toHaveBeenCalled();
  });

  it('uploads supported image through Clerk', async () => {
    render(<ProfilePhotoEditor user={mockUser} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));

    await waitFor(() => {
      expect(mockSetProfileImage).toHaveBeenCalledWith({ file });
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it('removes photo through Clerk when image exists', async () => {
    mockUser.imageUrl = 'https://img.clerk.com/avatar.png';
    render(<ProfilePhotoEditor user={mockUser} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Remove photo' }));

    await waitFor(() => {
      expect(mockSetProfileImage).toHaveBeenCalledWith({ file: null });
      expect(mockReload).toHaveBeenCalled();
    });
  });
});
