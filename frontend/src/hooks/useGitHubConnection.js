import { useCallback, useEffect, useState } from 'react';
import { AuthenticationRequiredError } from '../config/apiBase.js';
import {
  disconnectGitHub,
  getGitHubConnection,
  listGitHubRepositories,
  startGitHubOAuth,
} from '../services/githubApi.js';
import { GitHubRequestError } from '../utils/githubError.js';
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
    setLoading(true);
    setError(null);
    try {
      const data = await getGitHubConnection();
      setConnection(data);
      return data;
    } catch (loadError) {
      setConnection({ connected: false });
      setError(loadError.message || 'Unable to load GitHub connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRepositories = useCallback(async () => {
    setReposLoading(true);
    setReposError(null);
    try {
      const data = await listGitHubRepositories({ page: 1, perPage: 30 });
      setRepositories(Array.isArray(data.repositories) ? data.repositories : []);
    } catch (loadError) {
      if (loadError instanceof GitHubRequestError && loadError.code === 'GITHUB_NOT_CONNECTED') {
        setRepositories([]);
        setReposError(loadError.message);
        return;
      }
      setRepositories([]);
      setReposError(loadError.message || 'Unable to load GitHub repositories.');
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  useEffect(() => {
    if (!connection?.connected) {
      setRepositories([]);
      return;
    }
    loadRepositories();
  }, [connection?.connected, loadRepositories]);

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
