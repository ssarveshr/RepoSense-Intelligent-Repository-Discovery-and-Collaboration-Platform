import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingsHub from './MeetingsHub';

vi.mock('./CollaborationStudio.jsx', () => ({
  default: () => <div>Collaboration Studio Mock</div>,
}));

describe('MeetingsHub route entry', () => {
  it('renders CollaborationStudio', () => {
    render(<MeetingsHub />);
    expect(screen.getByText('Collaboration Studio Mock')).toBeInTheDocument();
  });
});
