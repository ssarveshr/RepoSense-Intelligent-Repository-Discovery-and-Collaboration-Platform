import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  closeMeetingTab,
  getMeetingUrl,
  launchMeetingInNewTab,
  launchMeetingTabAfterResolve,
  navigateMeetingTab,
  openMeetingInNewTab,
  openMeetingTabPlaceholder,
} from './openMeetingTab';

describe('openMeetingTab', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn());
    vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://example.trycloudflare.com');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('builds an absolute meeting URL from the public frontend base', () => {
    expect(getMeetingUrl('meeting-123')).toBe(
      'https://example.trycloudflare.com/meetings/meeting-123',
    );
  });

  it('opens the meeting route in a new tab', () => {
    const mockTab = { closed: false, focus: vi.fn() };
    window.open.mockReturnValue(mockTab);

    openMeetingInNewTab('meeting-123');

    expect(window.open).toHaveBeenCalledWith(
      'https://example.trycloudflare.com/meetings/meeting-123',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('creates a placeholder tab synchronously without noopener', () => {
    const mockTab = {
      closed: false,
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    window.open.mockReturnValue(mockTab);

    const tab = openMeetingTabPlaceholder();

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(tab).toBe(mockTab);
    expect(mockTab.document.write).toHaveBeenCalled();
  });

  it('navigates the placeholder tab to the resolved meeting URL', () => {
    const mockTab = { closed: false, location: { href: '' }, focus: vi.fn() };
    window.open.mockReturnValue(mockTab);

    openMeetingTabPlaceholder();
    navigateMeetingTab(mockTab, 'meeting-456');

    expect(mockTab.location.href).toBe(
      'https://example.trycloudflare.com/meetings/meeting-456',
    );
  });

  it('launchMeetingInNewTab opens placeholder then navigates the same tab', () => {
    const mockTab = {
      closed: false,
      location: { href: '' },
      focus: vi.fn(),
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    window.open.mockReturnValueOnce(mockTab);

    launchMeetingInNewTab('meeting-launch');

    expect(window.open).toHaveBeenCalledTimes(1);
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockTab.location.href).toBe(
      'https://example.trycloudflare.com/meetings/meeting-launch',
    );
  });

  it('falls back to a direct open when the placeholder tab is unavailable', () => {
    const mockTab = { closed: false, focus: vi.fn() };
    window.open.mockReturnValueOnce(null).mockReturnValueOnce(mockTab);

    navigateMeetingTab(null, 'meeting-789');

    expect(window.open).toHaveBeenCalledWith(
      'https://example.trycloudflare.com/meetings/meeting-789',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('closes the placeholder tab when meeting resolution fails', async () => {
    const mockTab = { closed: false, close: vi.fn(), focus: vi.fn(), location: { href: '' } };

    await expect(
      launchMeetingTabAfterResolve(mockTab, Promise.reject(new Error('Meeting not found'))),
    ).rejects.toThrow('Meeting not found');

    expect(mockTab.close).toHaveBeenCalled();
    expect(mockTab.location.href).toBe('');
  });

  it('navigates the placeholder tab after async meeting resolution', async () => {
    const mockTab = {
      closed: false,
      close: vi.fn(),
      focus: vi.fn(),
      location: { href: '' },
    };

    await launchMeetingTabAfterResolve(
      mockTab,
      Promise.resolve({ id: 'resolved-meeting-id' }),
    );

    expect(mockTab.location.href).toBe(
      'https://example.trycloudflare.com/meetings/resolved-meeting-id',
    );
    expect(mockTab.close).not.toHaveBeenCalled();
  });

  it('closes the tab when navigation is skipped due to a missing meeting id', () => {
    const mockTab = { closed: false, close: vi.fn(), focus: vi.fn(), location: { href: '' } };

    navigateMeetingTab(mockTab, '   ');

    expect(mockTab.close).toHaveBeenCalled();
    expect(mockTab.location.href).toBe('');
  });

  it('closeMeetingTab is safe when tab is already closed', () => {
    const mockTab = { closed: true, close: vi.fn() };
    closeMeetingTab(mockTab);
    expect(mockTab.close).not.toHaveBeenCalled();
  });
});
