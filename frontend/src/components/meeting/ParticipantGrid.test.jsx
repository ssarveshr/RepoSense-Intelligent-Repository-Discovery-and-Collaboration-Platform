import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ParticipantGrid from './ParticipantGrid';

function createStream() {
  const track = { kind: 'video', id: `track-${Math.random()}`, enabled: true };
  return {
    track,
    stream: { getVideoTracks: () => [track], getTracks: () => [track] },
  };
}

function buildLocalTile(overrides = {}) {
  const { stream } = createStream();
  return {
    id: 'host-1',
    label: 'Host',
    stream,
    cameraStream: stream,
    screenStream: null,
    muted: false,
    mirror: true,
    isScreenShare: false,
    isActiveSpeaker: false,
    isLocal: true,
    ...overrides,
  };
}

function buildRemoteTile(overrides = {}) {
  return {
    id: 'guest-1',
    label: 'Guest',
    stream: null,
    cameraStream: null,
    screenStream: null,
    muted: true,
    isScreenShare: false,
    isActiveSpeaker: false,
    isLocal: false,
    ...overrides,
  };
}

describe('ParticipantGrid', () => {
  it('renders one local participant', () => {
    render(
      <ParticipantGrid
        localTile={buildLocalTile()}
        remoteTiles={[]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByText('Host (You)')).toBeInTheDocument();
  });

  it('renders host and remote participant without video', () => {
    render(
      <ParticipantGrid
        localTile={buildLocalTile()}
        remoteTiles={[buildRemoteTile()]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByText('Host (You)')).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('renders host and remote participant with camera track', () => {
    const { stream } = createStream();
    render(
      <ParticipantGrid
        localTile={buildLocalTile()}
        remoteTiles={[buildRemoteTile({ stream, cameraStream: stream })]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(document.querySelectorAll('video')).toHaveLength(2);
  });

  it('renders presentation mode when a participant shares their screen', () => {
    const { stream: screenStream } = createStream();
    render(
      <ParticipantGrid
        localTile={buildLocalTile({
          screenStream,
          stream: screenStream,
          isScreenShare: true,
        })}
        remoteTiles={[buildRemoteTile()]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByText('Host is presenting')).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('renders multiple remote participants', () => {
    render(
      <ParticipantGrid
        localTile={buildLocalTile()}
        remoteTiles={[
          buildRemoteTile({ id: 'guest-1', label: 'Guest One' }),
          buildRemoteTile({ id: 'guest-2', label: 'Guest Two' }),
          buildRemoteTile({ id: 'guest-3', label: 'Guest Three' }),
        ]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByText('Guest One')).toBeInTheDocument();
    expect(screen.getByText('Guest Two')).toBeInTheDocument();
    expect(screen.getByText('Guest Three')).toBeInTheDocument();
  });

  it('marks solo layout for one participant', () => {
    render(
      <ParticipantGrid
        localTile={buildLocalTile()}
        remoteTiles={[]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByTestId('participant-grid')).toHaveAttribute('data-participant-count', '1');
    expect(screen.getAllByTestId('participant-tile')).toHaveLength(1);
  });

  it('renders six participants in the grid', () => {
    render(
      <ParticipantGrid
        localTile={buildLocalTile()}
        remoteTiles={Array.from({ length: 5 }, (_, index) =>
          buildRemoteTile({ id: `guest-${index}`, label: `Guest ${index + 1}` }),
        )}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByTestId('participant-grid')).toHaveAttribute('data-participant-count', '6');
    expect(screen.getAllByTestId('participant-tile')).toHaveLength(6);
  });

  it('shows avatar fallback when remote video is missing', () => {
    render(
      <ParticipantGrid
        localTile={buildLocalTile({ stream: null, cameraStream: null })}
        remoteTiles={[buildRemoteTile()]}
        chatOpen={false}
        isMobile={false}
        handStates={{}}
      />,
    );

    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(document.querySelectorAll('video')).toHaveLength(0);
  });
});
