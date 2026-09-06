import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingHeader from './MeetingHeader';
import { ConnectionState } from '../../services/livekitClient';

describe('MeetingHeader connection styling', () => {
  it('uses neutral connected badge styling without neon green background', () => {
    render(
      <MeetingHeader
        meetingTitle="Daily"
        meetingCode="RS-ABC123"
        participantCount={2}
        connectionState={ConnectionState.Connected}
        onToggleParticipants={() => {}}
        showParticipants={false}
      />,
    );

    const status = screen.getByRole('status');
    expect(status.className).toContain('bg-[#161A20]');
    expect(status.className).toContain('text-[#9CA3AF]');
    expect(status.className).not.toContain('emerald');
    expect(status.className).not.toContain('bg-emerald');
  });
});
