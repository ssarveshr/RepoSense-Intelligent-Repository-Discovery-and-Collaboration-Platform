import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AICodeAgent from './AICodeAgent';

describe('AICodeAgent audit controls', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not start a second repository audit while one is in flight', () => {
    render(<AICodeAgent />);
    fireEvent.click(screen.getByRole('button', { name: /Audit Chosen Repo Bugs/ }));

    const auditing = screen.getByRole('button', { name: 'Auditing Repo...' });
    expect(auditing).toBeDisabled();
    fireEvent.click(auditing);
    fireEvent.click(screen.getByRole('button', { name: 'Current RepoSense' }));

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
