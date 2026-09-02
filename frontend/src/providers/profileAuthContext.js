import { createContext, useContext } from 'react';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export const defaultAuth = {
  clerkEnabled: false,
  isLoaded: true,
  isSignedIn: false,
  isSessionReady: true,
  user: null,
  openUserProfile: null,
  getAuthToken: async () => null,
  usernameSetupState: 'idle',
};

export const ProfileAuthContext = createContext(defaultAuth);

export function useProfileAuth() {
  return useContext(ProfileAuthContext);
}

export function isClerkConfigured() {
  return Boolean(clerkPublishableKey);
}

export function getClerkPublishableKey() {
  return clerkPublishableKey;
}
