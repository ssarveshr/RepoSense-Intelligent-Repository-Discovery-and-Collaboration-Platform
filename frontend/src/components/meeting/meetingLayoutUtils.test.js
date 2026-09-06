import { describe, it, expect } from 'vitest';
import { getParticipantGridClass, connectionStatusLabel } from './meetingLayoutUtils.js';
import { ConnectionState } from '../../services/livekitClient.js';

describe('getParticipantGridClass', () => {
  it('centers a single participant with full-height grid shell', () => {
    const cls = getParticipantGridClass(1);
    expect(cls).toContain('grid-cols-1');
    expect(cls).toContain('h-full');
    expect(cls).toContain('min-h-0');
    expect(cls).toContain('max-w-5xl');
    expect(cls).toContain('auto-rows-[minmax(0,1fr)]');
  });

  it('uses two columns for two participants on desktop', () => {
    const cls = getParticipantGridClass(2, { compact: false });
    expect(cls).toContain('sm:grid-cols-2');
  });

  it('uses three columns for six participants', () => {
    const cls = getParticipantGridClass(6);
    expect(cls).toContain('lg:grid-cols-3');
  });

  it('scales to four columns for large meetings', () => {
    const cls = getParticipantGridClass(10);
    expect(cls).toContain('lg:grid-cols-4');
  });
});

describe('connectionStatusLabel', () => {
  it('maps LiveKit connection states to readable labels', () => {
    expect(
      connectionStatusLabel(ConnectionState.Connecting, ConnectionState),
    ).toBe('Connecting…');
    expect(
      connectionStatusLabel(ConnectionState.Connected, ConnectionState),
    ).toBe('Connected');
    expect(
      connectionStatusLabel(ConnectionState.Disconnected, ConnectionState),
    ).toBe('Disconnected');
  });
});
