import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingParticipantTile from './MeetingParticipantTile';

describe('MeetingParticipantTile', () => {
  it('shows a raised-hand indicator when handRaised is true', () => {
    render(<MeetingParticipantTile label="Guest" handRaised />);

    expect(screen.getByLabelText('Hand raised')).toBeInTheDocument();
  });
});
