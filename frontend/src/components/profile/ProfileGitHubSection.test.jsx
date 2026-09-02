import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileGitHubSection from './ProfileGitHubSection';

describe('ProfileGitHubSection', () => {
  it('shows connect GitHub state when not connected', () => {
    render(
      <ProfileGitHubSection
        data={{ connected: false }}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onConnectGitHub={vi.fn()}
        onDisconnectGitHub={vi.fn()}
        isOAuthConnected={false}
      />,
    );

    expect(screen.getByText('Connect GitHub to display your repositories and activity.')).toBeInTheDocument();
    expect(screen.queryByText(/Completed meeting/i)).not.toBeInTheDocument();
  });

  it('renders real repository metadata when connected', () => {
    render(
      <ProfileGitHubSection
        data={{
          connected: true,
          github_username: 'octocat',
          profile: {
            login: 'octocat',
            name: 'The Octocat',
            avatarUrl: 'https://avatars.example/octocat',
            htmlUrl: 'https://github.com/octocat',
          },
          repositories: [
            {
              name: 'Hello-World',
              fullName: 'octocat/Hello-World',
              description: 'My first repo',
              htmlUrl: 'https://github.com/octocat/Hello-World',
              language: 'JavaScript',
              stars: 12,
              forks: 3,
              private: false,
              updatedAt: '2026-01-01T00:00:00Z',
            },
          ],
          activity: [
            {
              id: '1',
              summary: 'Pushed 2 commits to octocat/Hello-World',
              createdAt: '2026-01-02T00:00:00Z',
            },
          ],
          languages: [{ name: 'JavaScript', count: 1 }],
        }}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onConnectGitHub={vi.fn()}
        onDisconnectGitHub={vi.fn()}
        isOAuthConnected={true}
        githubLogin="octocat"
      />,
    );

    expect(screen.getByText('@octocat')).toBeInTheDocument();
    expect(screen.getByText('Hello-World')).toBeInTheDocument();
    expect(screen.getByText('My first repo')).toBeInTheDocument();
    expect(screen.getByText('★ 12')).toBeInTheDocument();
    expect(screen.getByText(/Pushed 2 commits/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Languages' })).toBeInTheDocument();
    expect(screen.getAllByText('JavaScript').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Completed meeting/i)).not.toBeInTheDocument();
  });

  it('shows GitHub error state with retry', () => {
    render(
      <ProfileGitHubSection
        data={null}
        loading={false}
        error="Unable to load GitHub data."
        onRetry={vi.fn()}
        onConnectGitHub={vi.fn()}
        onDisconnectGitHub={vi.fn()}
        isOAuthConnected={false}
      />,
    );

    expect(screen.getByText('Unable to load GitHub data.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry profile data' })).toBeInTheDocument();
  });

  it('shows OAuth connection details when connected via connection hook only', () => {
    render(
      <ProfileGitHubSection
        data={null}
        loading={false}
        error={null}
        onRetry={vi.fn()}
        onConnectGitHub={vi.fn()}
        onDisconnectGitHub={vi.fn()}
        isOAuthConnected
        connection={{
          connected: true,
          github_user: {
            login: 'dev-user',
            name: 'Dev User',
            avatar_url: 'https://avatars.example/dev-user',
          },
        }}
      />,
    );

    expect(screen.getByText('@dev-user')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });
});
