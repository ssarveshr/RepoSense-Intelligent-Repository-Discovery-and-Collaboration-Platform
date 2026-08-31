import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditProfileDialog from './EditProfileDialog';

describe('EditProfileDialog', () => {
  const profile = {
    clerkUsername: 'suhan-g',
    bio: 'hello',
    skills: ['python'],
  };

  it('updates username through save handler', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: true, message: 'Username updated successfully.' });
    const onClose = vi.fn();

    render(
      <EditProfileDialog open profile={profile} onClose={onClose} onSave={onSave} />,
    );

    fireEvent.change(screen.getByPlaceholderText('your-username'), {
      target: { value: 'suhang-dev' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        username: 'suhang-dev',
        bio: 'hello',
        skills: ['python'],
      });
    });
  });

  it('shows friendly error for invalid username', async () => {
    const onSave = vi.fn().mockResolvedValue({ ok: false, error: 'That username is already taken.' });

    render(
      <EditProfileDialog open profile={profile} onClose={vi.fn()} onSave={onSave} />,
    );

    fireEvent.change(screen.getByPlaceholderText('your-username'), {
      target: { value: 'suhang-dev' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That username is already taken.');
  });
});
