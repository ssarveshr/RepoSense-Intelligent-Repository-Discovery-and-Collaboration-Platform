import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import GitHubSummarizer from './GitHubSummarizer';
import { summarizeRepo } from '../services/api';

vi.mock('../services/api', () => ({
  summarizeRepo: vi.fn(),
}));

function renderSummarizer(initialEntries = ['/github-summarizer']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/github-summarizer" element={<GitHubSummarizer />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GitHubSummarizer navigation state', () => {
  it('prefills a GitHub URL from search result navigation without auto-submitting', () => {
    renderSummarizer([
      {
        pathname: '/github-summarizer',
        state: { githubUrl: 'https://github.com/vitejs/vite' },
      },
    ]);

    expect(screen.getByDisplayValue('https://github.com/vitejs/vite')).toBeInTheDocument();
    expect(screen.queryByText(/Qwen is analyzing/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Back to Home/i })).not.toBeInTheDocument();
  });
});

describe('GitHubSummarizer submission states', () => {
  beforeEach(() => {
    summarizeRepo.mockReset();
  });

  it('shows a validation error without calling the API', () => {
    renderSummarizer();
    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a GitHub repository URL');
    expect(summarizeRepo).not.toHaveBeenCalled();
  });

  it('does not start a second analysis while one is in flight', async () => {
    let resolveSummary;
    summarizeRepo.mockImplementation(
      () => new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );

    renderSummarizer();
    fireEvent.change(screen.getByLabelText('GitHub repository URL'), {
      target: { value: 'https://github.com/facebook/react' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));
    fireEvent.click(screen.getByRole('button', { name: 'Analyzing…' }));

    expect(summarizeRepo).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Analyzing repository. This can take a while.');

    resolveSummary({ status: 'ok', summary: { name: 'react', what_it_does: 'A UI library' } });
    expect(await screen.findByText('react')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('shows an API error instead of success content', async () => {
    summarizeRepo.mockResolvedValue({ status: 'error', message: 'Repository not found' });
    renderSummarizer();
    fireEvent.change(screen.getByLabelText('GitHub repository URL'), {
      target: { value: 'https://github.com/missing/repo' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Repository not found');
    expect(screen.queryByText('Repository Overview')).not.toBeInTheDocument();
  });
});
