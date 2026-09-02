import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MeetingControls from './MeetingControls';

function renderControls(overrides = {}) {
  const props = {
    isAudioEnabled: true,
    isVideoEnabled: true,
    isScreenSharing: false,
    isChatOpen: false,
    handRaised: false,
    showParticipants: false,
    captionsEnabled: false,
    onToggleAudio: vi.fn(),
    onToggleVideo: vi.fn(),
    onToggleScreenShare: vi.fn(),
    onToggleChat: vi.fn(),
    onToggleParticipants: vi.fn(),
    onToggleHand: vi.fn(),
    onSendReaction: vi.fn(),
    onToggleCaptions: vi.fn(),
    onLeave: vi.fn(),
    ...overrides,
  };

  render(<MeetingControls {...props} />);
  return props;
}

describe('MeetingControls', () => {
  it('toggles captions from the control bar', () => {
    const onToggleCaptions = vi.fn();
    renderControls({ onToggleCaptions });

    fireEvent.click(screen.getByRole('button', { name: 'Turn captions on' }));
    expect(onToggleCaptions).toHaveBeenCalledTimes(1);
  });

  it('shows End meeting for hosts on desktop', () => {
    const onRequestEndMeeting = vi.fn();
    renderControls({ isHost: true, onRequestEndMeeting, compact: false });

    fireEvent.click(screen.getByRole('button', { name: 'End meeting for everyone' }));
    expect(onRequestEndMeeting).toHaveBeenCalledTimes(1);
  });

  it('does not show End meeting for non-host participants', () => {
    renderControls({ isHost: false, compact: false });

    expect(screen.queryByRole('button', { name: 'End meeting for everyone' })).not.toBeInTheDocument();
  });

  it('keeps Leave separate from End meeting', () => {
    const onLeave = vi.fn();
    const onRequestEndMeeting = vi.fn();
    renderControls({ isHost: true, onLeave, onRequestEndMeeting, compact: false });

    fireEvent.click(screen.getByRole('button', { name: 'Leave meeting' }));
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onRequestEndMeeting).not.toHaveBeenCalled();
  });

  it('offers host end meeting inside More on compact layouts', () => {
    const onRequestEndMeeting = vi.fn();
    renderControls({ isHost: true, compact: true, onRequestEndMeeting });

    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    fireEvent.click(screen.getByRole('button', { name: 'End meeting for everyone' }));
    expect(onRequestEndMeeting).toHaveBeenCalledTimes(1);
  });
});
