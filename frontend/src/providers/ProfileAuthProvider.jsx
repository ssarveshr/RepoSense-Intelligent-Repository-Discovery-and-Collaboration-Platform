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
  const { openUserProfile } = useClerk();
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
      getAuthToken,
      usernameSetupState,
    }),
    [isLoaded, isSignedIn, isSessionReady, user, openUserProfile, getAuthToken, usernameSetupState],
  );

  return <ProfileAuthContext.Provider value={value}>{children}</ProfileAuthContext.Provider>;
}

export default function ProfileAuthProvider({ children }) {
  const clerkPublishableKey = getClerkPublishableKey();

  if (!clerkPublishableKey) {
    return (
      <ProfileAuthContext.Provider value={defaultAuth}>{children}</ProfileAuthContext.Provider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}
