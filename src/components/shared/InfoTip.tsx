import { useState } from 'react';

/**
 * Small ⓘ help icon with a hover tooltip — the same treatment KpiCard uses, extracted so the
 * Dashboard's grouped indicator card can show a per-KPI description. Anchored to the right so the
 * tooltip opens inward and doesn't overflow the card edge.
 */
export function InfoTip({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-label="More info"
        role="img"
        className="h-4 w-4 cursor-help text-gray-300 hover:text-gray-500"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
          clipRule="evenodd"
        />
      </svg>
      {open && (
        <span className="absolute right-0 top-full z-30 mt-1 w-60 rounded-lg border border-gray-200 bg-gray-800 px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
