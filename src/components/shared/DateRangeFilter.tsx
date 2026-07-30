import { useContext } from 'react';
import { FilterContext } from '../../context/FilterContext';

export function DateRangeFilter() {
  const { startDate, endDate, setDateRange } = useContext(FilterContext);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-blue-100">From</label>
      <input
        type="date"
        value={startDate}
        onChange={(e) => setDateRange(e.target.value, endDate)}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
      <label className="text-xs font-medium text-blue-100">To</label>
      <input
        type="date"
        value={endDate}
        onChange={(e) => setDateRange(startDate, e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
