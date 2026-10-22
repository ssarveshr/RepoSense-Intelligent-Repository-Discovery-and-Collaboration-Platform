import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import {
  defaultAuth,
  getClerkPublishableKey,
  ProfileAuthContext,
} from './profileAuthContext.js';
import { useClerkUsernameInit } from '../hooks/useClerkUsernameInit.js';
import {
  clearClerkTokenProvider,
  getClerkTokenProvider,
  registerClerkTokenProvider,
  resolveClerkBearerToken,
  updateClerkAuthSnapshot,
} from '../config/clerkTokenProvider.js';

function ClerkAuthBridge({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { getToken } = useAuth();
  const usernameSetupState = useClerkUsernameInit();
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    updateClerkAuthSnapshot({ isLoaded, isSignedIn: Boolean(isSignedIn) });
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    registerClerkTokenProvider(async ({ skipCache } = {}) => {
      if (!isLoaded || !isSignedIn) {
        return null;
      }
      try {
        return await getToken({ skipCache: Boolean(skipCache) });
      } catch {
        return null;
      }
    });
    return () => clearClerkTokenProvider();
  }, [getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      setIsSessionReady(false);
      return undefined;
    }

    if (!isSignedIn) {
      setIsSessionReady(true);
      return undefined;
    }

    if (!getClerkTokenProvider()) {
      setIsSessionReady(false);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      const token = await resolveClerkBearerToken({ retries: 2, retryDelayMs: 50 });
      if (!cancelled) {
        setIsSessionReady(Boolean(token));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  const getAuthToken = useCallback(async () => resolveClerkBearerToken(), []);

  const value = useMemo(
    () => ({
      clerkEnabled: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      isSessionReady,
      user,
      openUserProfile,
      signOut,
      getAuthToken,
      usernameSetupState,
    }),
    [isLoaded, isSignedIn, isSessionReady, user, openUserProfile, signOut, getAuthToken, usernameSetupState],
  );

  return <ProfileAuthContext.Provider value={value}>{children}</ProfileAuthContext.Provider>;
}

function LocalAuthProvider({ children }) {
  const [localUser, setLocalUser] = useState(() => {
    try {
      const stored = localStorage.getItem('reposense_local_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const signIn = useCallback((name = 'Developer') => {
    const newUser = {
      id: 'local_dev_user',
      fullName: name,
      firstName: name,
      username: name.toLowerCase().replace(/\s+/g, '_'),
      primaryEmailAddress: { emailAddress: `${name.toLowerCase().replace(/\s+/g, '_')}@reposense.local` },
      imageUrl: '',
    };
    try {
      localStorage.setItem('reposense_local_user', JSON.stringify(newUser));
    } catch {}
    setLocalUser(newUser);
  }, []);

  const signOut = useCallback(async ({ redirectUrl } = {}) => {
    try {
      localStorage.removeItem('reposense_local_user');
    } catch {}
    setLocalUser(null);
    if (redirectUrl && typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  }, []);

  const value = useMemo(
    () => ({
      clerkEnabled: false,
      isLoaded: true,
      isSignedIn: Boolean(localUser),
      isSessionReady: true,
      user: localUser,
      openUserProfile: () => {},
      signIn,
      signOut,
      getAuthToken: async () => 'dev_mock_token',
      usernameSetupState: 'idle',
    }),
    [localUser, signIn, signOut],
  );

  return <ProfileAuthContext.Provider value={value}>{children}</ProfileAuthContext.Provider>;
}

export default function ProfileAuthProvider({ children }) {
  const clerkPublishableKey = getClerkPublishableKey();

  if (!clerkPublishableKey) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}
