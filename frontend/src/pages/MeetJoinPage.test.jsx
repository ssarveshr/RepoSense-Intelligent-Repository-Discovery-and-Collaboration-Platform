import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MeetJoinPage from './MeetJoinPage';
import StandaloneMeetLayout from '../layouts/StandaloneMeetLayout.jsx';

vi.mock('../services/collaborationApi.js', () => ({
  resolveMeeting: vi.fn(),
}));

import { resolveMeeting } from '../services/collaborationApi.js';

function renderJoinRoute(initialEntry) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<StandaloneMeetLayout />}>
          <Route path="/meet/join/:code" element={<MeetJoinPage />} />
          <Route path="/meetings/:id" element={<div>Meeting room</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('MeetJoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves a short code and redirects to the meeting room', async () => {
    resolveMeeting.mockResolvedValue({ id: 'meeting-uuid-123' });

    renderJoinRoute('/meet/join/ABCD-EFGH');

    await waitFor(() => {
      expect(resolveMeeting).toHaveBeenCalledWith('ABCD-EFGH');
      expect(screen.getByText('Meeting room')).toBeInTheDocument();
    });
  });

  it('shows an error for unknown meeting codes', async () => {
    resolveMeeting.mockRejectedValue(new Error('Meeting not found.'));

    renderJoinRoute('/meet/join/INVALID');

    expect(await screen.findByText('Meeting not found.')).toBeInTheDocument();
  });

  it('shows ended state for ended meetings', async () => {
    resolveMeeting.mockRejectedValue(new Error('Meeting has ended.'));

    renderJoinRoute('/meet/join/ENDED-CODE');

    expect(await screen.findByText('Meeting ended')).toBeInTheDocument();
  });
});
