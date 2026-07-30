import { useContext, useEffect, useMemo } from 'react';
import { FilterContext } from '../../context/FilterContext';
import { useFacilityLookup } from '../../hooks/useLookups';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../../utils/facilityDisplay';

/**
 * Global Facility filter (header, next to District). Scopes every page to the selected
 * facility, alongside the district and date range. "All Facilities" clears it.
 *
 * Options are constrained to the selected District (mirrors the per-page pickers this replaced,
 * e.g. Deviations'/Compliance Overview's old `!district || f.district === district` filter) — a
 * facility outside the selected district would otherwise be selectable, making every other page's
 * combined district+facility query silently empty. If the district changes and the currently
 * selected facility no longer belongs to it, the facility selection resets to "All Facilities".
 */
export function FacilityFilter() {
  const { facilityId, setFacilityId, district } = useContext(FilterContext);
  const facilities = useFacilityLookup();

  const facilityOptions = useMemo(
    () => (facilities.data ?? []).filter((f) => !district || f.district === district),
    [facilities.data, district],
  );

  // Disambiguate facilities that share a display name (e.g. two "NCD Upazila" with different ids) —
  // same convention as the Facility Ranking table / Deviations page.
  const duplicateNames = useMemo(
    () => findDuplicateFacilityNames(facilityOptions.map((f) => ({ facilityId: f.id, facilityName: f.name }))),
    [facilityOptions],
  );

  useEffect(() => {
    if (facilityId && facilityOptions.length > 0 && !facilityOptions.some((f) => f.id === facilityId)) {
      setFacilityId(undefined);
    }
  }, [district, facilityId, facilityOptions, setFacilityId]);

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-blue-100">Facility</label>
      <select
        value={facilityId || ''}
        onChange={(e) => setFacilityId(e.target.value || undefined)}
        className="w-48 truncate rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">All Facilities</option>
        {facilityOptions.map((f) => (
          <option key={f.id} value={f.id}>
            {formatFacilityDisplayName({ facilityId: f.id, facilityName: f.name }, duplicateNames)}
          </option>
        ))}
      </select>
    </div>
  );
}
