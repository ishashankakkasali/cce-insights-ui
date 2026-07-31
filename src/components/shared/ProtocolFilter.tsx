import { useEffect, useRef } from 'react';
import { useProtocols } from '../../hooks/useLookups';

interface ProtocolFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProtocolFilter({ value, onChange }: ProtocolFilterProps) {
  const protocols = useProtocols();

  // Default to the first protocol on initial load ONLY. Resolves (one way or the other) the
  // first time protocols.data becomes available, then never runs again — otherwise, if the page
  // loaded with a protocol already selected, this stayed "unused" and would fire the very next
  // time the user manually picked "All Protocols" (value = ''), immediately overwriting it back
  // to the first protocol and making "All Protocols" impossible to select.
  const didDefault = useRef(false);
  useEffect(() => {
    if (didDefault.current || !protocols.data) return;
    didDefault.current = true;
    if (!value && protocols.data.length > 0) {
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
