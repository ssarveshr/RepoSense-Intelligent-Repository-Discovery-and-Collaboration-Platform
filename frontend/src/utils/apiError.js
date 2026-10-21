export function normalizeFetchError(error, apiBaseUrl) {
  if (!error) return 'Something went wrong. Please try again.';
  const message = error.message || String(error);

  if (error instanceof TypeError || message.toLowerCase().includes('failed to fetch')) {
    return (
      `Unable to reach the RepoSense API at ${apiBaseUrl}. ` +
      'This is a network failure or a CORS rejection; it is not a backend HTTP error. ' +
      'Confirm the API URL is current, the backend is running, and CORS_ORIGINS includes this frontend origin.'
    );
  }

  return message;
}
