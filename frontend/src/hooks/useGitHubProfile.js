import { useCallback, useEffect, useState } from 'react';
import { AuthenticationRequiredError } from '../config/apiBase.js';
import { getGitHubProfile } from '../services/profileApi.js';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export function useGitHubProfile() {
  const { isLoaded, isSignedIn, isSessionReady } = useProfileAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !isSessionReady) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const githubData = await getGitHubProfile();
      setData(githubData);
    } catch (loadError) {
      if (loadError?.name === 'AuthenticationRequiredError') {
        return;
      }
      setData({ connected: false });
      setError(loadError.message || 'Unable to load GitHub data.');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSessionReady, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }
    load();
  }, [isLoaded, isSignedIn, isSessionReady, load]);

  return {
    data,
    loading: !isLoaded || !isSessionReady || loading,
    error,
    reload: load,
  };
}
