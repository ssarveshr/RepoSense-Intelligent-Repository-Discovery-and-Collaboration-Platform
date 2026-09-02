import { describe, expect, it } from 'vitest';
import {
  formatGitHubCollaboratorError,
  GitHubRequestError,
  isGitHubReconnectRequired,
} from './githubError.js';

describe('githubError', () => {
  it('maps scope-required errors to reconnect UX', () => {
    const formatted = formatGitHubCollaboratorError(
      new GitHubRequestError('scope', { code: 'GITHUB_SCOPE_REQUIRED', reconnectRequired: true }),
    );
    expect(formatted.message).toContain('additional permissions are required');
    expect(formatted.reconnectRequired).toBe(true);
  });

  it('maps insufficient repository permission without reconnect', () => {
    const formatted = formatGitHubCollaboratorError(
      new GitHubRequestError('perm', { code: 'INSUFFICIENT_REPOSITORY_PERMISSION' }),
    );
    expect(formatted.message).toContain('does not have permission');
    expect(formatted.reconnectRequired).toBe(false);
  });

  it('detects reconnect-required connection expiry', () => {
    const error = new GitHubRequestError('expired', {
      code: 'GITHUB_CONNECTION_EXPIRED',
      reconnectRequired: true,
    });
    expect(isGitHubReconnectRequired(error)).toBe(true);
  });

  it('maps organization approval and SSO messages', () => {
    const org = formatGitHubCollaboratorError(
      new GitHubRequestError('org', { code: 'GITHUB_ORGANIZATION_AUTH_REQUIRED' }),
    );
    expect(org.message).toContain('organization requires approval');
    expect(org.reconnectRequired).toBe(false);

    const sso = formatGitHubCollaboratorError(
      new GitHubRequestError('sso', { code: 'GITHUB_SSO_REQUIRED', reconnectRequired: true }),
    );
    expect(sso.message).toContain('SSO');
    expect(sso.reconnectRequired).toBe(true);
  });

  it('maps repository not found without reconnect', () => {
    const formatted = formatGitHubCollaboratorError(
      new GitHubRequestError('missing', { code: 'REPOSITORY_NOT_FOUND' }),
    );
    expect(formatted.message).toContain('not found');
    expect(formatted.reconnectRequired).toBe(false);
  });

  it('maps generic GitHub access denial without reconnect', () => {
    const formatted = formatGitHubCollaboratorError(
      new GitHubRequestError('denied', { code: 'GITHUB_ACCESS_DENIED' }),
    );
    expect(formatted.message).toContain('GitHub denied access');
    expect(formatted.reconnectRequired).toBe(false);
  });
});
