import { describe, expect, it } from 'vitest';
import {
  buildInviteRecipientList,
  getHostGitHubIdentity,
  getInviteableCollaborators,
  isHostCollaborator,
} from './collaboratorInviteUtils.js';

describe('collaboratorInviteUtils', () => {
  const hostGitHub = { userId: '183266947', login: 'suhanganesh' };
  const collaborators = [
    {
      id: '183266947',
      name: 'suhanganesh',
      githubLogin: 'suhanganesh',
      githubUserId: '183266947',
      isCurrentUser: true,
      email: null,
    },
    {
      id: '123',
      name: 'PraveenKumarM17',
      githubLogin: 'PraveenKumarM17',
      githubUserId: '123',
      isCurrentUser: false,
      email: 'kanniymma@gmail.com',
    },
  ];

  it('identifies host collaborator by GitHub user id', () => {
    expect(isHostCollaborator(collaborators[0], hostGitHub)).toBe(true);
    expect(isHostCollaborator(collaborators[1], hostGitHub)).toBe(false);
  });

  it('returns only inviteable collaborators', () => {
    expect(getInviteableCollaborators(collaborators, hostGitHub)).toHaveLength(1);
    expect(getInviteableCollaborators(collaborators, hostGitHub)[0].githubLogin).toBe('PraveenKumarM17');
  });

  it('builds recipient payload without host', () => {
    const recipients = buildInviteRecipientList(collaborators);
    expect(recipients).toHaveLength(1);
    expect(recipients[0].githubLogin).toBe('PraveenKumarM17');
    expect(recipients[0].githubUserId).toBe('123');
  });

  it('does not exclude repo owner when they are not the connected host', () => {
    const otherHost = { userId: '999', login: 'alice-github' };
    expect(isHostCollaborator(collaborators[0], otherHost)).toBe(false);
    expect(getInviteableCollaborators(collaborators, otherHost)).toHaveLength(2);
  });

  it('reads host identity from GitHub connection response', () => {
    const identity = getHostGitHubIdentity({
      connected: true,
      github_user: { id: '183266947', login: 'suhanganesh' },
    });
    expect(identity).toEqual({ userId: '183266947', login: 'suhanganesh' });
  });
});
