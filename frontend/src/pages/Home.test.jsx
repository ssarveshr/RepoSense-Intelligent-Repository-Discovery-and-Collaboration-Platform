import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { ProfileAuthContext } from '../providers/profileAuthContext.js';
import { fetchTrending, searchRepositories } from '../services/api';

vi.mock('../services/api', () => ({
  fetchTrending: vi.fn(),
  searchRepositories: vi.fn(),
}));

const authValue = {
  clerkEnabled: true,
  isLoaded: true,
  isSignedIn: true,
  user: { fullName: 'Suhan G' },
  usernameSetupState: 'ready',
  getAuthToken: vi.fn(),
  openUserProfile: vi.fn(),
};

function renderHome(overrides = {}) {
  return render(
    <MemoryRouter>
      <ProfileAuthContext.Provider value={{ ...authValue, ...overrides }}>
        <Home />
      </ProfileAuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('Home search', () => {
  beforeEach(() => {
    fetchTrending.mockReset();
    searchRepositories.mockReset();
    fetchTrending.mockResolvedValue([]);
  });

  it('shows a user-visible error and retry for failed search', async () => {
    searchRepositories.mockRejectedValueOnce(new Error('backend down'));
    searchRepositories.mockResolvedValueOnce({
      results: [
        {
          id: 1,
          name: 'recover-repo',
          description: 'Recovered after retry',
          url: 'https://github.com/example/recover-repo',
          stars: 10,
          category: 'Web Development',
        },
      ],
    });

    renderHome();
    await waitFor(() => expect(fetchTrending).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Search repositories'), {
      target: { value: 'react charts' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Search could not be completed. Please try again.');
    expect(screen.queryByText('No repositories found in our index.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('recover-repo')).toBeInTheDocument();
    expect(searchRepositories).toHaveBeenLastCalledWith('react charts');
  });

  it('searches for the category that was clicked', async () => {
    searchRepositories.mockResolvedValue({ results: [] });
    renderHome();
    await waitFor(() => expect(fetchTrending).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText('Search repositories'), {
      target: { value: 'stale query' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search category Machine Learning' }));

    await waitFor(() => {
      expect(searchRepositories).toHaveBeenCalledWith('Machine Learning');
    });
    expect(await screen.findByText('Search Results for "Machine Learning"')).toBeInTheDocument();
    expect(searchRepositories).not.toHaveBeenCalledWith('stale query');
  });

  it('activates category chips with the keyboard', async () => {
    searchRepositories.mockResolvedValue({ results: [] });
    renderHome();
    await waitFor(() => expect(fetchTrending).toHaveBeenCalled());

    const chip = screen.getByRole('button', { name: 'Search category DevOps' });
    chip.focus();
    expect(chip).toHaveFocus();
    fireEvent.keyDown(chip, { key: 'Enter', code: 'Enter' });
    fireEvent.click(chip);

    await waitFor(() => {
      expect(searchRepositories).toHaveBeenCalledWith('DevOps');
    });
  });

  it('does not start a second search while one is in flight', async () => {
    let resolveSearch;
    searchRepositories.mockImplementation(
      () => new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );

    renderHome();
    await waitFor(() => expect(fetchTrending).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Search' })).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Search repositories'), {
      target: { value: 'react' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Searching' }));

    expect(searchRepositories).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Searching' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Search category DevOps' })).toBeDisabled();

    resolveSearch({ results: [] });
    expect(await screen.findByText('No repositories found in our index.')).toBeInTheDocument();
  });

  it('lets search complete even if trending is still loading', async () => {
    let resolveTrending;
    fetchTrending.mockImplementation(
      () => new Promise((resolve) => {
        resolveTrending = resolve;
      }),
    );
    searchRepositories.mockResolvedValue({
      results: [
        {
          id: 7,
          name: 'search-winner',
          description: 'Should not be replaced by late trending results',
          url: 'https://github.com/example/search-winner',
          stars: 3,
          category: 'Web Development',
        },
      ],
    });

    renderHome();
    fireEvent.change(screen.getByLabelText('Search repositories'), {
      target: { value: 'charts' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByText('search-winner')).toBeInTheDocument();
    resolveTrending([
      {
        id: 99,
        name: 'late-trending',
        description: 'Stale',
        url: 'https://github.com/example/late-trending',
        stars: 1,
        category: 'Web Development',
      },
    ]);
    await waitFor(() => expect(fetchTrending).toHaveBeenCalled());
    expect(screen.queryByText('late-trending')).not.toBeInTheDocument();
    expect(screen.getByText('search-winner')).toBeInTheDocument();
  });

  it('does not send results to hardcoded repository details', async () => {
    fetchTrending.mockResolvedValue([
      {
        id: 42,
        name: 'vite',
        description: 'Frontend tooling',
        url: 'https://github.com/vitejs/vite',
        stars: 100,
        category: 'Web Development',
      },
    ]);

    renderHome();
    expect(await screen.findByText('vite')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'vite' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/vitejs/vite',
    );
    expect(screen.getByRole('link', { name: 'Analyze with GitHub Summarizer' })).toHaveAttribute(
      'href',
      '/github-summarizer',
    );
  });
});
