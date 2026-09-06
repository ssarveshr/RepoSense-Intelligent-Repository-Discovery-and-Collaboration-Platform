import { useCallback, useMemo, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';

const STORAGE_KEY = 'reposense:meeting-repo';

const OWNER_REPO_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\/[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/;

export function parseGithubRepoUrl(rawUrl) {
  if (!rawUrl?.trim()) return null;

  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  const match = trimmed.match(/github\.com\/([^/]+)\/([^/?#]+)/i);
  if (!match) return null;

  const owner = match[1].trim();
  const repo = match[2].replace(/\.git$/i, '').trim();
  if (!owner || !repo || owner === 'github.com') return null;

  return {
    owner,
    repo,
    slug: `${owner}/${repo}`,
    githubUrl: `https://github.com/${owner}/${repo}`,
    repoName: repo,
  };
}

/** Accept full GitHub URLs or shorthand owner/repo. */
export function parseGithubRepoInput(rawInput) {
  if (!rawInput?.trim()) return null;

  const trimmed = rawInput.trim().replace(/\/+$/, '');
  const fromUrl = parseGithubRepoUrl(trimmed);
  if (fromUrl) return fromUrl;

  if (OWNER_REPO_PATTERN.test(trimmed)) {
    const [owner, repo] = trimmed.split('/');
    return {
      owner,
      repo,
      slug: `${owner}/${repo}`,
      githubUrl: `https://github.com/${owner}/${repo}`,
      repoName: repo,
    };
  }

  return null;
}

function readStoredRepo() {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.githubUrl) return null;
    return parseGithubRepoUrl(parsed.githubUrl) || parseGithubRepoInput(parsed.githubUrl);
  } catch {
    return null;
  }
}

function writeStoredRepo(githubUrl) {
  if (typeof sessionStorage === 'undefined') return;
  const parsed = parseGithubRepoUrl(githubUrl) || parseGithubRepoInput(githubUrl);
  if (!parsed) {
    sessionStorage.removeItem(STORAGE_KEY);
    return;
  }
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      githubUrl: parsed.githubUrl,
      repoName: parsed.repoName,
      slug: parsed.slug,
    }),
  );
}

export function useMeetingRepositoryContext() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [storedRevision, setStoredRevision] = useState(0);

  const fromNavigation = useMemo(() => {
    const stateUrl = location.state?.githubUrl;
    const queryUrl = searchParams.get('github_url') || searchParams.get('repo');
    const queryParsed = queryUrl
      ? parseGithubRepoInput(queryUrl.startsWith('http') ? queryUrl : queryUrl)
      : null;
    const stateParsed = stateUrl ? parseGithubRepoInput(stateUrl) : null;

    if (stateParsed) {
      return {
        ...stateParsed,
        repoName: location.state?.repoName || stateParsed.repoName,
      };
    }
    if (queryParsed) return queryParsed;
    return readStoredRepo();
    // storedRevision forces re-read after setRepository writes sessionStorage
  }, [location.state, searchParams, storedRevision]);

  const setRepository = useCallback((rawInput) => {
    const parsed = parseGithubRepoInput(rawInput);
    if (parsed) {
      writeStoredRepo(parsed.githubUrl);
      setStoredRevision((value) => value + 1);
    }
    return parsed;
  }, []);

  const clearRepository = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setStoredRevision((value) => value + 1);
  }, []);

  return {
    githubUrl: fromNavigation?.githubUrl || '',
    repoName: fromNavigation?.repoName || '',
    repoSlug: fromNavigation?.slug || '',
    hasRepository: Boolean(fromNavigation?.githubUrl),
    setRepository,
    clearRepository,
  };
}
