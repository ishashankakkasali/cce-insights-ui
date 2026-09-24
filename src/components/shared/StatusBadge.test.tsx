import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the label text', () => {
    render(<StatusBadge label="OVERDUE" color={{ bg: 'bg-amber-100', text: 'text-amber-700' }} />);
    expect(screen.getByText('OVERDUE')).toBeInTheDocument();
  });

  it('applies the provided colour classes', () => {
    render(<StatusBadge label="ACTIVE" color={{ bg: 'bg-green-100', text: 'text-green-700' }} />);
    const badge = screen.getByText('ACTIVE');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });

  it('renders the status dot only when a dot colour is supplied', () => {
    const { container: withDot } = render(
      <StatusBadge label="OVERDUE" color={{ bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }} />,
    );
    expect(withDot.querySelector('.bg-blue-500')).not.toBeNull();

    const { container: withoutDot } = render(
      <StatusBadge label="OVERDUE" color={{ bg: 'bg-blue-100', text: 'text-blue-700' }} />,
    );
    // The only child of the badge should be the label text — no dot span.
    expect(withoutDot.querySelector('span > span')).toBeNull();
  });
});
