import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ZoomRoom from './ZoomRoom';

vi.mock('./CollaborationStudio.jsx', () => ({
  default: () => <div>Collaboration Studio Mock</div>,
}));

describe('ZoomRoom backward-compatible route', () => {
  it('renders CollaborationStudio', () => {
    render(<ZoomRoom />);
    expect(screen.getByText('Collaboration Studio Mock')).toBeInTheDocument();
  });
});
