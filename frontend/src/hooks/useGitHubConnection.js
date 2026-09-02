import { useCallback, useEffect, useState } from 'react';
import { AuthenticationRequiredError } from '../config/apiBase.js';
import {
  disconnectGitHub,
  getGitHubConnection,
  listGitHubRepositories,
  startGitHubOAuth,
} from '../services/githubApi.js';
import { useProfileAuth } from '../providers/profileAuthContext.js';

export function useGitHubConnection() {
  const { isLoaded, isSignedIn, isSessionReady } = useProfileAuth();
  const [connection, setConnection] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reposLoading, setReposLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reposError, setReposError] = useState(null);

  const loadConnection = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !isSessionReady) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getGitHubConnection();
      setConnection(data);
      return data;
    } catch (loadError) {
      if (loadError?.name === 'AuthenticationRequiredError') {
        return;
      }
      setConnection({ connected: false });
      setError(loadError.message || 'Unable to load GitHub connection.');
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSessionReady, isSignedIn]);

  const loadRepositories = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !isSessionReady) {
      setRepositories([]);
      return;
    }

    setReposLoading(true);
    setReposError(null);
    try {
      const data = await listGitHubRepositories(undefined, { page: 1, perPage: 30 });
      setRepositories(Array.isArray(data.repositories) ? data.repositories : []);
    } catch (loadError) {
      if (loadError?.name === 'AuthenticationRequiredError') {
        return;
      }
      setRepositories([]);
      setReposError(loadError.message || 'Unable to load GitHub repositories.');
    } finally {
      setReposLoading(false);
    }
  }, [isLoaded, isSessionReady, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      setLoading(true);
      return;
    }
    if (!isSignedIn) {
      setConnection({ connected: false });
      setLoading(false);
      setError(null);
      return;
    }
    if (!isSessionReady) {
      setLoading(true);
      return;
    }
    loadConnection();
  }, [isLoaded, isSignedIn, isSessionReady, loadConnection]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isSessionReady || !connection?.connected) {
      setRepositories([]);
      return;
    }
    loadRepositories();
  }, [connection?.connected, isLoaded, isSessionReady, isSignedIn, loadRepositories]);

  const connectGitHub = useCallback(async () => {
    await startGitHubOAuth();
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectGitHub();
    setConnection({ connected: false });
    setRepositories([]);
  }, []);

  return {
    connection,
    repositories,
    loading: !isLoaded || !isSessionReady || loading,
    reposLoading,
    error,
    reposError,
    connectGitHub,
    disconnect,
    reloadConnection: loadConnection,
    reloadRepositories: loadRepositories,
    githubLogin: connection?.github_user?.login || null,
    isConnected: Boolean(connection?.connected),
  };
}

export { AuthenticationRequiredError };
