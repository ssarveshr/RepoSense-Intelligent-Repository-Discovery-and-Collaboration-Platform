import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  assignUniqueClerkUsername,
  buildUsernameCandidates,
  getNameForUsernameGeneration,
  logClerkUsernameErrorDiagnostics,
  registerClerkUsernameDebug,
} from '../components/profile/usernameUtils.js';

/**
 * Automatically assigns a Clerk username on first login when missing.
 * Runs once per signed-in user per app session; never overwrites an existing username.
 */
export function useClerkUsernameInit() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [setupState, setSetupState] = useState('idle');
  const attemptedForUserRef = useRef(null);

  useEffect(() => {
    if (!isLoaded) {
      setSetupState('idle');
      return;
    }

    if (!isSignedIn || !user) {
      setSetupState('idle');
      attemptedForUserRef.current = null;
      return;
    }

    if (user.username) {
      setSetupState('ready');
      attemptedForUserRef.current = user.id;
      return;
    }

    if (attemptedForUserRef.current === user.id) {
      return;
    }

    attemptedForUserRef.current = user.id;
    let cancelled = false;

    (async () => {
      setSetupState('setting_up');

      const displayName = getNameForUsernameGeneration(user);
      const candidates = buildUsernameCandidates(displayName);

      if (!candidates.length) {
        if (!cancelled) setSetupState('missing');
        return;
      }

      const result = await assignUniqueClerkUsername(user, candidates);

      if (cancelled) return;

      if (result.ok) {
        setSetupState('ready');
      } else {
        setSetupState('missing');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id, user?.username]);

  useEffect(() => {
    return registerClerkUsernameDebug(user);
  }, [user]);

  return setupState;
}
