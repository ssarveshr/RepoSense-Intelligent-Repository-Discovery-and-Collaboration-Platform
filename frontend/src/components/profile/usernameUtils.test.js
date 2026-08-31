import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeUsernameFromName,
  sanitizeUsernameInput,
  validateUsernameFormat,
  buildUsernameCandidates,
  getNameForUsernameGeneration,
  extractClerkErrors,
  isUsernameConflictError,
  isUsernameDisabledError,
  mapClerkUsernameError,
  assignUniqueClerkUsername,
  updateClerkUsername,
  logClerkUsernameErrorDiagnostics,
} from './usernameUtils';

describe('usernameUtils', () => {
  it('sanitizes display names into GitHub-style usernames', () => {
    expect(sanitizeUsernameFromName('Suhan G')).toBe('suhan-g');
    expect(sanitizeUsernameFromName('John Doe')).toBe('john-doe');
    expect(sanitizeUsernameFromName('Mary Jane Watson')).toBe('mary-jane-watson');
    expect(sanitizeUsernameFromName('John   Smith')).toBe('john-smith');
    expect(sanitizeUsernameFromName('  Mary Jane  ')).toBe('mary-jane');
  });

  it('does not derive username candidates from email-only identity', () => {
    expect(
      getNameForUsernameGeneration({
        primaryEmailAddress: { emailAddress: 'pushpa960659@gmail.com' },
      }),
    ).toBe('');
    expect(buildUsernameCandidates('')).toEqual([]);
  });

  it('removes unsupported characters from names', () => {
    expect(sanitizeUsernameFromName('John@Smith')).toBe('johnsmith');
  });

  it('validates username format using Clerk-aligned length rules', () => {
    expect(validateUsernameFormat('suhan-g').valid).toBe(true);
    expect(validateUsernameFormat('suhangnesh').valid).toBe(true);
    expect(validateUsernameFormat('abc').valid).toBe(false);
    expect(validateUsernameFormat('').valid).toBe(false);
    expect(validateUsernameFormat('bad username').valid).toBe(false);
  });

  it('builds suffix candidates for uniqueness', () => {
    const candidates = buildUsernameCandidates('Suhan G', 3);
    expect(candidates).toEqual(['suhan-g', 'suhan-g-2', 'suhan-g-3']);
  });

  it('uses profile name for generation, not email', () => {
    expect(
      getNameForUsernameGeneration({
        fullName: 'Suhan G',
        primaryEmailAddress: { emailAddress: 'pushpa960659@gmail.com' },
      }),
    ).toBe('Suhan G');
  });

  it('returns empty candidates when name is too short after sanitization', () => {
    expect(buildUsernameCandidates('Jo')).toEqual([]);
  });

  it('extracts structured Clerk API errors', () => {
    expect(
      extractClerkErrors({
        status: 422,
        errors: [
          {
            code: 'form_param_unknown',
            message: 'is unknown',
            longMessage: 'username is not a valid parameter for this request.',
            meta: { paramName: 'username' },
          },
        ],
      }),
    ).toEqual([
      {
        code: 'form_param_unknown',
        message: 'is unknown',
        longMessage: 'username is not a valid parameter for this request.',
        paramName: 'username',
      },
    ]);
  });

  it('detects Clerk username conflicts', () => {
    expect(
      isUsernameConflictError({
        errors: [{ code: 'form_identifier_exists', message: 'Username is taken', meta: { paramName: 'username' } }],
      }),
    ).toBe(true);
  });

  it('detects disabled username configuration', () => {
    const error = {
      errors: [
        {
          code: 'form_param_unknown',
          longMessage: 'username is not a valid parameter for this request.',
          meta: { paramName: 'username' },
        },
      ],
    };
    expect(isUsernameDisabledError(error)).toBe(true);
    expect(mapClerkUsernameError(error)).toBe(
      'Username updates are not enabled. Enable Username in your Clerk Dashboard.',
    );
  });

  it('maps Clerk conflict errors to friendly messages', () => {
    expect(
      mapClerkUsernameError({
        errors: [{ code: 'form_identifier_exists', message: 'taken', meta: { paramName: 'username' } }],
      }),
    ).toBe('That username is already taken.');
  });

  it('maps invalid username errors', () => {
    expect(
      mapClerkUsernameError({
        errors: [{ code: 'form_username_invalid_length', meta: { paramName: 'username' } }],
      }),
    ).toBe('Please choose a valid username.');
  });

  it('maps network errors', () => {
    expect(mapClerkUsernameError({ name: 'NetworkError', message: 'Failed to fetch' })).toBe(
      'Unable to reach Clerk. Please try again.',
    );
  });

  it('logs safe diagnostics in development', () => {
    const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const endSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

    vi.stubEnv('DEV', true);
    logClerkUsernameErrorDiagnostics({
      status: 422,
      clerkTraceId: 'trace_abc',
      errors: [{ code: 'form_param_unknown', longMessage: 'username is not a valid parameter for this request.' }],
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();

    vi.unstubAllEnvs();
    consoleSpy.mockRestore();
    infoSpy.mockRestore();
    endSpy.mockRestore();
  });

  it('assigns the first available Clerk username', async () => {
    const user = {
      update: vi
        .fn()
        .mockRejectedValueOnce({ errors: [{ code: 'form_identifier_exists', meta: { paramName: 'username' } }] })
        .mockResolvedValueOnce({}),
      reload: vi.fn().mockResolvedValue(undefined),
    };

    const result = await assignUniqueClerkUsername(user, ['suhan-g', 'suhan-g-2']);
    expect(result.ok).toBe(true);
    expect(result.username).toBe('suhan-g-2');
    expect(user.update).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite when username unchanged', async () => {
    const user = {
      username: 'suhan-g',
      update: vi.fn(),
      reload: vi.fn(),
    };

    const result = await updateClerkUsername(user, 'suhan-g');
    expect(result.ok).toBe(true);
    expect(user.update).not.toHaveBeenCalled();
  });

  it('updates Clerk username through the user resource', async () => {
    const user = {
      username: 'suhan-g',
      update: vi.fn().mockResolvedValue({}),
      reload: vi.fn().mockResolvedValue(undefined),
    };

    const result = await updateClerkUsername(user, 'suhang-dev');
    expect(result.ok).toBe(true);
    expect(user.update).toHaveBeenCalledWith({ username: 'suhang-dev' });
    expect(user.reload).toHaveBeenCalled();
  });

  it('returns disabled message when Clerk rejects username parameter', async () => {
    const user = {
      username: null,
      update: vi.fn().mockRejectedValue({
        status: 422,
        errors: [
          {
            code: 'form_param_unknown',
            longMessage: 'username is not a valid parameter for this request.',
            meta: { paramName: 'username' },
          },
        ],
      }),
      reload: vi.fn(),
    };

    const result = await updateClerkUsername(user, 'suhangnesh');
    expect(result.ok).toBe(false);
    expect(result.error).toBe(
      'Username updates are not enabled. Enable Username in your Clerk Dashboard.',
    );
  });
});
