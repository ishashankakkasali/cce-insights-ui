import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProtocolFilter } from './ProtocolFilter';

vi.mock('../../hooks/useLookups', () => ({
  useProtocols: () => ({
    data: [
      { id: 'proto-1', title: 'Facility service journey', url: 'http://x/proto-1', version: '1.0.0' },
      { id: 'proto-2', title: 'RMNCH', url: 'http://x/proto-2', version: '1.0.0' },
    ],
  }),
}));

// Controlled wrapper mirroring how a real consumer (e.g. Deviations.tsx) holds the value —
// the bug only reproduces when `value` actually changes across renders, which a bare onChange
// spy without real state wouldn't exercise.
function ControlledProtocolFilter({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  return <ProtocolFilter value={value} onChange={setValue} />;
}

describe('ProtocolFilter', () => {
  it('does not auto-default when a protocol is already selected on mount', () => {
    render(<ControlledProtocolFilter initial="proto-2" />);
    expect(screen.getByRole('combobox')).toHaveValue('proto-2');
  });

  it('auto-defaults to the first protocol when mounted with no selection', () => {
    render(<ControlledProtocolFilter initial="" />);
    expect(screen.getByRole('combobox')).toHaveValue('proto-1');
  });

  // Regression test for RI-34: selecting "All Protocols" after the page loaded with a protocol
  // already selected used to be immediately overwritten back to the first protocol, because the
  // auto-default guard was never marked "used" on a mount that skipped it.
  it('lets "All Protocols" be selected after mounting with a protocol already set', () => {
    render(<ControlledProtocolFilter initial="proto-2" />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '' } });
    expect(select).toHaveValue('');
  });
});
