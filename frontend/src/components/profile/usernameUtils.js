import { isClerkAPIResponseError } from '@clerk/clerk-react/errors';
import { isNetworkError } from '@clerk/shared/error';

/** Clerk username constraints — see Clerk Dashboard User & authentication → Username. */
export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 64;

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const USERNAME_CONFLICT_CODES = new Set(['form_identifier_exists']);

const USERNAME_DISABLED_CODES = new Set(['form_param_unknown']);

const USERNAME_INVALID_CODES = new Set([
  'form_username_invalid_character',
  'form_username_invalid_length',
  'form_username_needs_non_number_char',
  'form_username_cannot_be_phone_number',
  'form_param_format_invalid',
]);

export function sanitizeUsernameFromName(name) {
  if (!name?.trim()) return '';

  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sanitizeUsernameInput(value) {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/^@+/, '');
}

export function validateUsernameFormat(username) {
  if (!username) {
    return { valid: false, error: 'Please enter a username.' };
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return { valid: false, error: `Username must be at least ${USERNAME_MIN_LENGTH} characters.` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { valid: false, error: `Username must be at most ${USERNAME_MAX_LENGTH} characters.` };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain lowercase letters, numbers, and hyphens.',
    };
  }
  return { valid: true, error: null };
}

export function getNameForUsernameGeneration(user) {
  if (!user) return '';

  const fullName = user.fullName?.trim();
  if (fullName) return fullName;

  const composed = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (composed) return composed;

  return '';
}

export function buildUsernameCandidates(name, maxCandidates = 25) {
  const base = sanitizeUsernameFromName(name);
  if (!base) return [];

  const baseValidation = validateUsernameFormat(base);
  if (!baseValidation.valid) {
    return [];
  }

  const candidates = [base];

  for (let i = 2; i <= maxCandidates + 1 && candidates.length < maxCandidates; i += 1) {
    const candidate = `${base}-${i}`;
    if (validateUsernameFormat(candidate).valid) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function readErrorField(error, field) {
  if (!error) return '';
  return error[field] || error[field.replace(/([A-Z])/g, '_$1').toLowerCase()] || '';
}

function readParamName(error) {
  return (
    error?.meta?.paramName ||
    error?.meta?.param_name ||
    error?.meta?.name ||
    ''
  );
}

/** Normalize Clerk API errors into a consistent shape for mapping and dev logs. */
export function extractClerkErrors(error) {
  if (!error) return [];

  const rawErrors = Array.isArray(error.errors) ? error.errors : [];

  if (rawErrors.length > 0) {
    return rawErrors.map((entry) => ({
      code: readErrorField(entry, 'code'),
      message: readErrorField(entry, 'message'),
      longMessage: readErrorField(entry, 'longMessage') || readErrorField(entry, 'long_message'),
      paramName: readParamName(entry),
    }));
  }

  if (error.code) {
    return [
      {
        code: error.code,
        message: error.message || '',
        longMessage: error.longMessage || error.long_message || '',
        paramName: readParamName(error),
      },
    ];
  }

  return [];
}

function isUsernameRelatedError(entry) {
  const param = (entry.paramName || '').toLowerCase();
  if (!param) return true;
  return param === 'username' || param.includes('username');
}

function combinedErrorText(entries) {
  return entries
    .map((entry) => `${entry.longMessage} ${entry.message} ${entry.code} ${entry.paramName}`)
    .join(' ')
    .toLowerCase();
}

/** Dev-only safe diagnostic logging — never logs tokens or secrets. */
export function logClerkUsernameErrorDiagnostics(error, context = 'username update') {
  if (!import.meta.env.DEV) return;

  const entries = extractClerkErrors(error);
  console.group(`[RepoSense] Clerk ${context} failed`);

  if (error?.status) {
    console.info('status:', error.status);
  }
  if (error?.clerkTraceId) {
    console.info('clerkTraceId:', error.clerkTraceId);
  }
  if (isClerkAPIResponseError(error)) {
    console.info('type: ClerkAPIResponseError');
  }

  if (entries.length === 0) {
    if (error?.message) {
      console.info('message:', error.message);
    }
  } else {
    entries.forEach((entry, index) => {
      console.info(`error[${index}]:`, {
        code: entry.code,
        message: entry.message,
        longMessage: entry.longMessage,
        paramName: entry.paramName,
      });
    });
  }

  console.groupEnd();
}

export function isUsernameConflictError(error) {
  const entries = extractClerkErrors(error);
  if (entries.some((entry) => USERNAME_CONFLICT_CODES.has(entry.code) && isUsernameRelatedError(entry))) {
    return true;
  }

  const text = combinedErrorText(entries);
  return (
    text.includes('already taken') ||
    text.includes('is taken') ||
    text.includes('already exists') ||
    text.includes('must be unique')
  );
}

export function isUsernameDisabledError(error) {
  const entries = extractClerkErrors(error).filter(isUsernameRelatedError);
  if (entries.some((entry) => USERNAME_DISABLED_CODES.has(entry.code))) {
    return true;
  }

  const text = combinedErrorText(entries);
  return (
    (text.includes('username') && text.includes('not a valid parameter')) ||
    (text.includes('username') && text.includes('disabled')) ||
    (text.includes('username') && text.includes('not enabled'))
  );
}

export function mapClerkUsernameError(error) {
  if (isNetworkError(error)) {
    return 'Unable to reach Clerk. Please try again.';
  }

  const entries = extractClerkErrors(error);
  const usernameEntries = entries.filter(isUsernameRelatedError);
  const relevant = usernameEntries.length > 0 ? usernameEntries : entries;

  for (const entry of relevant) {
    if (USERNAME_CONFLICT_CODES.has(entry.code)) {
      return 'That username is already taken.';
    }

    if (USERNAME_DISABLED_CODES.has(entry.code)) {
      return 'Username updates are not enabled. Enable Username in your Clerk Dashboard.';
    }

    if (USERNAME_INVALID_CODES.has(entry.code)) {
      return 'Please choose a valid username.';
    }
  }

  const text = combinedErrorText(relevant);

  if (isUsernameConflictError(error)) {
    return 'That username is already taken.';
  }

  if (isUsernameDisabledError(error)) {
    return 'Username updates are not enabled. Enable Username in your Clerk Dashboard.';
  }

  if (text.includes('invalid') || text.includes('format')) {
    return 'Please choose a valid username.';
  }

  return 'Could not update username. Please try again.';
}

export async function assignUniqueClerkUsername(user, candidates) {
  if (!user?.update) {
    return { ok: false, error: 'Username management requires Clerk authentication.' };
  }

  for (const candidate of candidates) {
    const validation = validateUsernameFormat(candidate);
    if (!validation.valid) continue;

    try {
      await user.update({ username: candidate });
      if (typeof user.reload === 'function') {
        await user.reload();
      }
      return { ok: true, username: candidate };
    } catch (error) {
      logClerkUsernameErrorDiagnostics(error, 'first-login username assignment');

      if (!isUsernameConflictError(error)) {
        return { ok: false, error: mapClerkUsernameError(error) };
      }
    }
  }

  return { ok: false, error: 'Could not find an available username automatically.' };
}

export async function updateClerkUsername(user, rawUsername) {
  if (!user?.update) {
    return { ok: false, error: 'Username management requires Clerk authentication.' };
  }

  const username = sanitizeUsernameInput(rawUsername);
  const validation = validateUsernameFormat(username);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  if (user.username === username) {
    return { ok: true, username };
  }

  try {
    await user.update({ username });
    if (typeof user.reload === 'function') {
      await user.reload();
    }
    return { ok: true, username };
  } catch (error) {
    logClerkUsernameErrorDiagnostics(error, 'username update');
    return { ok: false, error: mapClerkUsernameError(error) };
  }
}

/** Dev-only: call from browser console as `await __reposenseDebugUsername('candidate')`. */
export function registerClerkUsernameDebug(user) {
  if (!import.meta.env.DEV || typeof window === 'undefined' || !user) {
    return () => {};
  }

  window.__reposenseDebugUsername = async (candidate) => {
    const result = await updateClerkUsername(user, candidate);
    console.info('[RepoSense] debug username result:', result);
    console.info('[RepoSense] user.username after attempt:', user.username ?? null);
    return result;
  };

  window.__reposenseInspectClerkUser = () => ({
    id: user.id ?? null,
    username: user.username ?? null,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    fullName: user.fullName ?? null,
    primaryEmailAddress: user.primaryEmailAddress?.emailAddress ?? null,
    hasUpdate: typeof user.update === 'function',
  });

  return () => {
    delete window.__reposenseDebugUsername;
    delete window.__reposenseInspectClerkUser;
  };
}
