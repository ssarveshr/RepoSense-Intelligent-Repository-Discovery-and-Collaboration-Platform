import { fetchFromApi } from '../config/apiBase.js';

export const fetchTrending = async () => {
  const response = await fetchFromApi('/trending');
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const searchRepositories = async (query) => {
  const response = await fetchFromApi(`/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const summarizeRepo = async (githubUrl) => {
  const response = await fetchFromApi('/summarize-github', {
    method: 'POST',
    body: JSON.stringify({ github_url: githubUrl }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};
