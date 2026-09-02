const DEFAULT_RETRY_DELAY_MS = 100;
const DEFAULT_MAX_RETRIES = 10;

let clerkTokenProvider = null;

const clerkAuthSnapshot = {
  isLoaded: false,
  isSignedIn: false,
};

export class AuthenticationRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationRequiredError';
  }
}

export function registerClerkTokenProvider(provider) {
  clerkTokenProvider = provider;
}

export function clearClerkTokenProvider() {
  clerkTokenProvider = null;
}

export function getClerkTokenProvider() {
  return clerkTokenProvider;
}

export function updateClerkAuthSnapshot({ isLoaded, isSignedIn }) {
  clerkAuthSnapshot.isLoaded = Boolean(isLoaded);
  clerkAuthSnapshot.isSignedIn = Boolean(isSignedIn);
}

export function getClerkAuthSnapshot() {
  return { ...clerkAuthSnapshot };
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isUsableBearerToken(token) {
  return typeof token === 'string' && token.length > 0;
}

/**
 * Resolve a Clerk session JWT for API calls.
 * Waits for Clerk load state and retries briefly while getToken() hydrates.
 */
export async function resolveClerkBearerToken({
  retries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  forceRefresh = false,
} = {}) {
  const maxAttempts = Math.max(1, retries + 1);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { isLoaded, isSignedIn } = clerkAuthSnapshot;

    if (!isLoaded) {
      if (attempt < maxAttempts - 1) {
        await sleep(retryDelayMs);
        continue;
      }
      logAuthDiagnostics('resolveToken aborted', { reason: 'clerk_not_loaded' });
      return null;
    }

    if (!isSignedIn) {
      logAuthDiagnostics('resolveToken aborted', { reason: 'signed_out' });
      return null;
    }

    if (!clerkTokenProvider) {
      if (attempt < maxAttempts - 1) {
        await sleep(retryDelayMs);
        continue;
      }
      logAuthDiagnostics('resolveToken aborted', { reason: 'provider_unregistered' });
      return null;
    }

    const token = await clerkTokenProvider({
      skipCache: forceRefresh || attempt > 0,
    });

    if (isUsableBearerToken(token)) {
      logAuthDiagnostics('resolveToken succeeded', {
        isLoaded: true,
        isSignedIn: true,
        tokenPresent: true,
        attempt: attempt + 1,
      });
      return token;
    }

    if (attempt < maxAttempts - 1) {
      await sleep(retryDelayMs);
    }
  }

  logAuthDiagnostics('resolveToken exhausted', {
    isLoaded: clerkAuthSnapshot.isLoaded,
    isSignedIn: clerkAuthSnapshot.isSignedIn,
    tokenPresent: false,
  });
  return null;
}

export function logAuthDiagnostics(label, fields) {
  if (!import.meta.env.DEV && import.meta.env.VITE_AUTH_DIAGNOSTICS !== '1') return;
  const safe = { ...fields };
  delete safe.token;
  console.info(`[RepoSense Auth] ${label}`, safe);
}

export { DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY_MS, isUsableBearerToken };
