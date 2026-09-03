import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MicIcon, MicOffIcon } from './MeetingIcons';

describe('MeetingIcons', () => {
  it('renders a microphone icon when unmuted', () => {
    const { container } = render(<MicIcon />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    expect(container.innerHTML).toContain('M19 11a7 7');
    expect(container.innerHTML).not.toContain('M5.586 15H4');
  });

  it('renders a microphone-off icon with slash when muted', () => {
    const { container } = render(<MicOffIcon />);
    expect(container.innerHTML).toContain('M19 11a7 7');
    expect(container.innerHTML).toContain('M3 3l18 18');
    expect(container.innerHTML).not.toContain('M5.586 15H4');
  });
});
