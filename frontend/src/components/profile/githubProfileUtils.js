export function getClerkGitHubLogin(user) {
  if (!user?.externalAccounts?.length) return null;

  const githubAccount = user.externalAccounts.find(
    (account) =>
      account.provider === 'github' ||
      account.provider === 'oauth_github' ||
      account.provider?.includes('github'),
  );

  if (!githubAccount) return null;
  return githubAccount.username || githubAccount.externalId || null;
}

export function formatGitHubUpdatedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
