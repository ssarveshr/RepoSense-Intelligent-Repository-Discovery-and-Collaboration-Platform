import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RepositoryDetails from './RepositoryDetails';

function renderDetails(path = '/repo/998877') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/repo/:id" element={<RepositoryDetails />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RepositoryDetails', () => {
  it('uses the route ID and does not show hardcoded repository data', () => {
    renderDetails('/repo/998877');
    expect(screen.getByRole('heading', { name: 'Repository 998877' })).toBeInTheDocument();
    expect(screen.getByText(/fetch repository #998877 by this route ID/i)).toBeInTheDocument();
    expect(screen.queryByText('React Task Manager')).not.toBeInTheDocument();
    expect(screen.queryByText('https://github.com/facebook/react')).not.toBeInTheDocument();
  });

  it('does not present clone or issues as successful actions', () => {
    renderDetails('/repo/998877');
    const clone = screen.getByRole('button', { name: 'Clone unavailable' });
    expect(clone).toBeDisabled();
    expect(screen.getByText('Issue matching is not available for this repository.')).toBeInTheDocument();
    expect(screen.queryByText('Fix alignment on login button')).not.toBeInTheDocument();

    fireEvent.click(clone);
    expect(screen.queryByText(/cloned/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/success/i)).not.toBeInTheDocument();
  });
});
