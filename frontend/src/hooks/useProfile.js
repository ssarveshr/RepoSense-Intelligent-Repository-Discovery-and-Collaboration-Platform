import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserProfile, updateUserProfile } from '../services/meetingApi';
import {
  getClerkDisplayName,
  getClerkUsernameHandle,
  getInitialsFromUser,
} from '../components/profile/profileUtils';
import { sanitizeUsernameInput, updateClerkUsername } from '../components/profile/usernameUtils.js';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export function useProfile() {
  const { isLoaded, isSignedIn, user, getAuthToken } = useProfileAuth();
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProfile = useCallback(async () => {
    if (!isSignedIn) {
      setBio('');
      setSkills([]);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        throw new Error("Couldn't load profile.");
      }
      const data = await getUserProfile(token);
      setBio(data.bio || '');
      setSkills(Array.isArray(data.skills) ? data.skills : []);
    } catch (loadError) {
      setError(loadError.message || "Couldn't load profile.");
    } finally {
      setProfileLoading(false);
    }
  }, [getAuthToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;
    loadProfile();
  }, [isLoaded, isSignedIn, loadProfile]);

  const profile = useMemo(() => {
    const displayName = getClerkDisplayName(user);
    const usernameHandle = getClerkUsernameHandle(user) || '';

    return {
      displayName,
      usernameHandle,
      clerkUsername: user?.username || '',
      bio,
      skills,
      imageUrl: user?.imageUrl || null,
      initials: getInitialsFromUser(user),
      clerkSignedIn: Boolean(isSignedIn),
    };
  }, [user, bio, skills, isSignedIn]);

  const saveProfile = useCallback(
    async ({ username, bio: nextBio, skills: nextSkills }) => {
      if (!user) {
        return { ok: false, error: "Couldn't save profile changes." };
      }

      const currentUsername = user.username || '';
      const nextUsername = sanitizeUsernameInput(username);
      let usernameChanged = false;

      if (nextUsername && nextUsername !== currentUsername) {
        const usernameResult = await updateClerkUsername(user, nextUsername);
        if (!usernameResult.ok) {
          return { ok: false, error: usernameResult.error };
        }
        usernameChanged = true;
      }

      try {
        const token = await getAuthToken();
        if (!token) {
          return { ok: false, error: "Couldn't save profile changes." };
        }
        const data = await updateUserProfile(token, {
          bio: nextBio ?? '',
          skills: nextSkills ?? [],
        });
        setBio(data.bio || '');
        setSkills(Array.isArray(data.skills) ? data.skills : []);
        setError(null);

        let message = 'Profile updated successfully.';
        if (usernameChanged) {
          message = 'Username updated successfully.';
        }

        return { ok: true, message };
      } catch (saveError) {
        if (usernameChanged) {
          return {
            ok: false,
            error:
              saveError.message ||
              'Username updated successfully, but bio and skills could not be saved. Please try again.',
          };
        }
        return {
          ok: false,
          error: saveError.message || "Couldn't save profile changes.",
        };
      }
    },
    [getAuthToken, user],
  );

  return {
    profile,
    loading: !isLoaded || profileLoading,
    error,
    saveProfile,
    reloadProfile: loadProfile,
  };
}
