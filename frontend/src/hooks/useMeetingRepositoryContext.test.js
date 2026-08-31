import { describe, it, expect } from 'vitest';
import { parseGithubRepoInput, parseGithubRepoUrl } from './useMeetingRepositoryContext.js';

describe('useMeetingRepositoryContext helpers', () => {
  it('parses GitHub repository URLs', () => {
    expect(parseGithubRepoUrl('https://github.com/owner/repo')).toEqual({
      owner: 'owner',
      repo: 'repo',
      slug: 'owner/repo',
      githubUrl: 'https://github.com/owner/repo',
      repoName: 'repo',
    });
    expect(parseGithubRepoUrl('https://github.com/owner/repo/')).toEqual({
      owner: 'owner',
      repo: 'repo',
      slug: 'owner/repo',
      githubUrl: 'https://github.com/owner/repo',
      repoName: 'repo',
    });
  });

  it('parses owner/repo shorthand', () => {
    expect(parseGithubRepoInput('facebook/react')).toEqual({
      owner: 'facebook',
      repo: 'react',
      slug: 'facebook/react',
      githubUrl: 'https://github.com/facebook/react',
      repoName: 'react',
    });
  });

  it('rejects invalid URLs', () => {
    expect(parseGithubRepoUrl('not-a-url')).toBeNull();
    expect(parseGithubRepoUrl('')).toBeNull();
    expect(parseGithubRepoUrl('https://github.com/')).toBeNull();
    expect(parseGithubRepoInput('owner')).toBeNull();
  });
});
