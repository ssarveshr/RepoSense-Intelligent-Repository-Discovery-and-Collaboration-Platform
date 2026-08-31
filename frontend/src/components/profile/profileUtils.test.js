import { describe, it, expect } from 'vitest';
import {
  formatRelativeTime,
  getInitials,
  getInitialsFromUser,
  getClerkDisplayName,
  getClerkUsernameHandle,
  truncateMiddle,
  validateProfileImageFile,
  PROFILE_IMAGE_MAX_BYTES,
} from './profileUtils';

describe('profileUtils', () => {
  it('formats relative time', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(recent)).toMatch(/minute/);
  });

  it('derives initials from display name', () => {
    expect(getInitials('Suhan G')).toBe('SG');
  });

  it('derives initials from Clerk user object', () => {
    expect(
      getInitialsFromUser({
        fullName: 'Suhan G',
        primaryEmailAddress: { emailAddress: 'pushpa960659@gmail.com' },
      }),
    ).toBe('SG');
  });

  it('uses username when name is unavailable', () => {
    expect(
      getInitialsFromUser({
        username: 'suhan-dev',
        primaryEmailAddress: { emailAddress: 'user@example.com' },
      }),
    ).toBe('SU');
  });

  it('returns Clerk display name without fabrication', () => {
    expect(
      getClerkDisplayName({
        fullName: 'Suhan G',
        username: 'suhan',
      }),
    ).toBe('Suhan G');
  });

  it('returns Clerk username handle only when set', () => {
    expect(getClerkUsernameHandle({ username: 'suhan' })).toBe('@suhan');
    expect(getClerkUsernameHandle({ fullName: 'Suhan G' })).toBeNull();
  });

  it('truncates long user IDs for display', () => {
    const id = 'user_2abcdefghijklmnopqrstuvwxyz';
    expect(truncateMiddle(id)).toBe('user_2abcdef…wxyz');
  });

  it('accepts supported profile image types', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    expect(validateProfileImageFile(file).valid).toBe(true);
  });

  it('rejects unsupported profile image types', () => {
    const file = new File(['x'], 'doc.pdf', { type: 'application/pdf' });
    expect(validateProfileImageFile(file).valid).toBe(false);
  });

  it('rejects oversized profile images', () => {
    const file = new File([new Uint8Array(PROFILE_IMAGE_MAX_BYTES + 1)], 'big.png', {
      type: 'image/png',
    });
    expect(validateProfileImageFile(file).valid).toBe(false);
  });
});
