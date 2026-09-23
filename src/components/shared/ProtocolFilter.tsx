import { useEffect, useRef } from 'react';
import { useProtocols } from '../../hooks/useLookups';

interface ProtocolFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProtocolFilter({ value, onChange }: ProtocolFilterProps) {
  const protocols = useProtocols();
  // Only default to the first protocol once, when the list first loads - not every time
  // `value` goes back to '' (empty), which also happens when the user deliberately picks
  // "All Protocols". Without this guard that selection was immediately overwritten back
  // to the first protocol by this same effect re-firing.
  const hasDefaulted = useRef(false);

  useEffect(() => {
    if (!hasDefaulted.current && !value && protocols.data && protocols.data.length > 0) {
      hasDefaulted.current = true;
      onChange(protocols.data[0].id);
    }
  }, [protocols.data, value, onChange]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-56 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      <option value="">All Protocols</option>
      {protocols.data?.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title || p.url.split('/').pop()} (v{p.version})
        </option>
      ))}
    </select>
  );
}
