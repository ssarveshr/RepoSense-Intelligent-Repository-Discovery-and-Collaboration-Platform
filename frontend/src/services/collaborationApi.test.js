import { describe, expect, it } from 'vitest';
import { isValidEmail, statusLabel, INVITATION_STATUS } from '../services/collaborationApi.js';

describe('collaborationApi', () => {
  it('validates email addresses', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('bad')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });

  it('maps invitation status labels', () => {
    expect(statusLabel(INVITATION_STATUS.SENT)).toBe('Sent');
    expect(statusLabel(INVITATION_STATUS.EMAIL_UNAVAILABLE)).toBe('Email unavailable');
  });
});
