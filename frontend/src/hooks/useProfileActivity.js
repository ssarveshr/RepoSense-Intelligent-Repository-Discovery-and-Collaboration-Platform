import { useCallback, useEffect, useState } from 'react';
import { getProfileActivity } from '../services/meetingApi';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export function useProfileActivity() {
  const { isLoaded, isSignedIn, getAuthToken } = useProfileAuth();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!isSignedIn) {
      setActivity([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) {
        setActivity([]);
        return;
      }

      const activityData = await getProfileActivity(token);
      setActivity(
        (activityData.items || []).map((item) => ({
          id: item.id,
          description: item.description || item.title,
          timestamp: item.timestamp,
          kind: item.kind,
        })),
      );
    } catch (loadError) {
      setActivity([]);
      setError(loadError.message || "Couldn't load activity.");
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }
    load();
  }, [isLoaded, isSignedIn, load]);

  return { activity, loading, error, reload: load };
}
