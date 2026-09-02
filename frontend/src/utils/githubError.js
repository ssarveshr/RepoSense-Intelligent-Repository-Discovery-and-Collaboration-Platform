export class GitHubRequestError extends Error {
  constructor(message, { code = null, reconnectRequired = false } = {}) {
    super(message);
    this.name = 'GitHubRequestError';
    this.code = code;
    this.reconnectRequired = reconnectRequired;
  }
}

const ERROR_MESSAGES = {
  GITHUB_NOT_CONNECTED: 'Connect your GitHub account to access repositories.',
  GITHUB_CONNECTION_EXPIRED: 'Your GitHub connection has expired. Please reconnect GitHub.',
  GITHUB_SCOPE_REQUIRED: 'GitHub is connected, but additional permissions are required.',
  INSUFFICIENT_REPOSITORY_PERMISSION:
    'Your GitHub account does not have permission to view collaborators for this repository.',
  GITHUB_ORGANIZATION_AUTH_REQUIRED:
    'Your GitHub organization requires approval for RepoSense.',
  GITHUB_SSO_REQUIRED: "Authorize RepoSense through your organization's GitHub SSO.",
  REPOSITORY_NOT_FOUND: 'Repository not found or you do not have access to it.',
  GITHUB_RATE_LIMIT: 'GitHub API rate limit reached. Please try again later.',
  GITHUB_ACCESS_DENIED: 'GitHub denied access to the repository collaborators.',
};

export function isGitHubRequestError(error) {
  return error instanceof GitHubRequestError;
}

export function isGitHubReconnectRequired(error) {
  if (!error) return false;
  if (error instanceof GitHubRequestError) {
    return Boolean(error.reconnectRequired);
  }
  const message = String(error.message || error);
  return /connect your github|reconnect github|github connection has expired|github connection required/i.test(
    message,
  );
}

export function formatGitHubCollaboratorError(error) {
  if (error instanceof GitHubRequestError) {
    return {
      code: error.code,
      message: ERROR_MESSAGES[error.code] || error.message,
      reconnectRequired: Boolean(error.reconnectRequired),
    };
  }

  const message = error?.message || 'Unable to load repository collaborators.';
  return {
    code: null,
    message,
    reconnectRequired: isGitHubReconnectRequired(error),
  };
}

export async function parseStructuredApiError(response) {
  try {
    const body = await response.json();
    const detail = body.detail;
    if (detail && typeof detail === 'object' && detail.message) {
      throw new GitHubRequestError(detail.message, {
        code: detail.code || null,
        reconnectRequired: Boolean(detail.reconnect_required),
      });
    }
    if (typeof detail === 'string') {
      throw new GitHubRequestError(detail);
    }
    throw new GitHubRequestError(body.message || `Request failed (${response.status})`);
  } catch (parseError) {
    if (parseError instanceof GitHubRequestError) {
      throw parseError;
    }
    throw new GitHubRequestError(`Request failed (${response.status})`);
  }
}
