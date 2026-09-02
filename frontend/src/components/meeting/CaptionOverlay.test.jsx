import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CaptionOverlay from './CaptionOverlay';

describe('CaptionOverlay', () => {
  it('renders caption lines above the control area', () => {
    render(
      <CaptionOverlay
        visible
        lines={[{ id: '1', sender: 'Alice', text: 'Hello team', isLocal: false }]}
        interimText=""
        error={null}
      />,
    );

    expect(screen.getByTestId('caption-overlay')).toBeInTheDocument();
    expect(screen.getByText('Alice:')).toBeInTheDocument();
    expect(screen.getByText('Hello team')).toBeInTheDocument();
  });

  it('shows unsupported browser message', () => {
    render(
      <CaptionOverlay
        visible
        lines={[]}
        interimText=""
        error="Live captions are not supported in this browser."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/not supported/i);
  });

  it('renders interim transcript while listening', () => {
    render(
      <CaptionOverlay
        visible
        lines={[]}
        interimText="partial words"
        error={null}
      />,
    );

    expect(screen.getByText('partial words')).toBeInTheDocument();
  });

  it('returns null when captions are hidden', () => {
    const { container } = render(
      <CaptionOverlay visible={false} lines={[]} interimText="" error={null} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
