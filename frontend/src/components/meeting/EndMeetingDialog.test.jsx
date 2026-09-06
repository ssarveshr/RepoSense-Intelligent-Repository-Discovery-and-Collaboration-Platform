import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EndMeetingDialog from './EndMeetingDialog';

describe('EndMeetingDialog', () => {
  it('requires confirmation before ending', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <EndMeetingDialog open onCancel={onCancel} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when End meeting is chosen', () => {
    const onConfirm = vi.fn();

    render(
      <EndMeetingDialog open onCancel={vi.fn()} onConfirm={onConfirm} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'End meeting' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
