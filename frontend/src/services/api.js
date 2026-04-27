const API_BASE_URL = 'http://localhost:8000';

export const fetchTrending = async () => {
  const response = await fetch(`${API_BASE_URL}/trending`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const searchRepositories = async (query) => {
  const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};

export const summarizeRepo = async (githubUrl) => {
  const response = await fetch(`${API_BASE_URL}/summarize-github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ github_url: githubUrl }),
  });
  if (!response.ok) throw new Error('Network response was not ok');
  return response.json();
};
