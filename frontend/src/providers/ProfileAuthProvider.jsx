import { useCallback, useMemo } from 'react';
import { ClerkProvider, useAuth, useClerk, useUser } from '@clerk/clerk-react';
import {
  defaultAuth,
  getClerkPublishableKey,
  ProfileAuthContext,
} from './profileAuthContext.js';
import { useClerkUsernameInit } from '../hooks/useClerkUsernameInit.js';

function ClerkAuthBridge({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openUserProfile } = useClerk();
  const { getToken } = useAuth();
  const usernameSetupState = useClerkUsernameInit();

  const getAuthToken = useCallback(async () => {
    if (!isSignedIn) return null;
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken, isSignedIn]);

  const value = useMemo(
    () => ({
      clerkEnabled: true,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      user,
      openUserProfile,
      getAuthToken,
      usernameSetupState,
    }),
    [isLoaded, isSignedIn, user, openUserProfile, getAuthToken, usernameSetupState],
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
