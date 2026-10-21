import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  it('labels the control for switching to dark theme', () => {
    render(<ThemeToggle isDarkMode={false} onToggle={() => {}} />);
    const button = screen.getByRole('button', { name: 'Switch to dark theme' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('labels the control for switching to light theme and invokes the toggle', () => {
    const onToggle = vi.fn();
    render(<ThemeToggle isDarkMode onToggle={onToggle} />);
    const button = screen.getByRole('button', { name: 'Switch to light theme' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
