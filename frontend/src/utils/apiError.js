export function normalizeFetchError(error, apiBaseUrl) {
  if (!error) return 'Something went wrong. Please try again.';
  const message = error.message || String(error);

  if (error instanceof TypeError || message.toLowerCase().includes('failed to fetch')) {
    return `Unable to reach the RepoSense API at ${apiBaseUrl}. Make sure the backend is running.`;
  }

  return message;
}
