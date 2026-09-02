import { describe, expect, it } from 'vitest';
import { getClerkGitHubLogin } from './githubProfileUtils';

describe('githubProfileUtils', () => {
  it('extracts GitHub login from Clerk external accounts', () => {
    const user = {
      externalAccounts: [
        { provider: 'oauth_github', username: 'octocat' },
      ],
    };
    expect(getClerkGitHubLogin(user)).toBe('octocat');
  });

  it('returns null when GitHub is not linked', () => {
    expect(getClerkGitHubLogin({ externalAccounts: [] })).toBeNull();
    expect(getClerkGitHubLogin(null)).toBeNull();
  });
});
