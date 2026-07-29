import { useContext } from 'react';
import { FilterContext } from '../../context/FilterContext';
import { useDistricts } from '../../hooks/useLookups';

/**
 * Global District filter (header, next to the date range). Scopes every page to the selected
 * district's facilities, alongside the date range. "All Districts" clears it.
 */
export function DistrictFilter() {
  const { district, setDistrict } = useContext(FilterContext);
  const districts = useDistricts();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500">District</label>
      <select
        value={district ?? ''}
        onChange={(e) => setDistrict(e.target.value || undefined)}
        className="w-48 truncate rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All Districts</option>
        {districts.data?.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}
