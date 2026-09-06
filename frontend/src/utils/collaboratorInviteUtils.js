export function isHostCollaborator(collaborator, hostGitHub = null) {
  if (!collaborator) return false;
  if (!hostGitHub) {
    return Boolean(collaborator.isCurrentUser);
  }
  if (
    hostGitHub.userId &&
    collaborator.githubUserId &&
    String(collaborator.githubUserId) === String(hostGitHub.userId)
  ) {
    return true;
  }
  if (
    hostGitHub.login &&
    collaborator.githubLogin &&
    collaborator.githubLogin.toLowerCase() === hostGitHub.login.toLowerCase()
  ) {
    return true;
  }
  return false;
}

export function getInviteableCollaborators(collaborators, hostGitHub = null) {
  return (collaborators || []).filter((collaborator) => !isHostCollaborator(collaborator, hostGitHub));
}

export function buildInviteRecipientList(collaborators) {
  return getInviteableCollaborators(collaborators).map((collaborator) => ({
    email: collaborator.email,
    name: collaborator.name,
    githubLogin: collaborator.githubLogin,
    githubUserId: collaborator.githubUserId,
    emailSource: collaborator.emailSource,
  }));
}

export function getHostGitHubIdentity(githubConnection) {
  if (!githubConnection?.connected || !githubConnection.github_user) {
    return null;
  }
  return {
    userId: githubConnection.github_user.id,
    login: githubConnection.github_user.login,
  };
}
