import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMeetingUrl,
  navigateMeetingTab,
  openMeetingInNewTab,
  openMeetingTabPlaceholder,
} from './openMeetingTab';

describe('openMeetingTab', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds an absolute meeting URL', () => {
    expect(getMeetingUrl('meeting-123')).toBe(`${window.location.origin}/meetings/meeting-123`);
  });

  it('opens the meeting route in a new tab', () => {
    const mockTab = { closed: false, focus: vi.fn() };
    window.open.mockReturnValue(mockTab);

    openMeetingInNewTab('meeting-123');

    expect(window.open).toHaveBeenCalledWith(
      `${window.location.origin}/meetings/meeting-123`,
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('navigates a placeholder tab once the meeting id is resolved', () => {
    const mockTab = { closed: false, location: { href: '' }, focus: vi.fn() };
    window.open.mockReturnValue(mockTab);

    openMeetingTabPlaceholder();
    navigateMeetingTab(mockTab, 'meeting-456');

    expect(mockTab.location.href).toBe(`${window.location.origin}/meetings/meeting-456`);
  });

  it('falls back to a direct open when the placeholder tab is unavailable', () => {
    const mockTab = { closed: false, focus: vi.fn() };
    window.open.mockReturnValueOnce(null).mockReturnValueOnce(mockTab);

    navigateMeetingTab(null, 'meeting-789');

    expect(window.open).toHaveBeenCalledWith(
      `${window.location.origin}/meetings/meeting-789`,
      '_blank',
      'noopener,noreferrer',
    );
  });
});
