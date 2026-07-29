import { useMemo } from 'react';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../../utils/facilityDisplay';

/** Sentinel values for "no filter applied". */
export const ALL_DISTRICTS = '__all__';
export const ALL_FACILITIES = '__all__';

/** Minimal shape every drill-down row shares. */
export interface FacilityRow {
  facilityId: string;
  facilityName?: string;
  district?: string;
}

/**
 * Small labeled dropdown for a category/status filter inside a drill-down (e.g. Active/Inactive,
 * Compliant/Non-Compliant). Same styling as the district/facility selects.
 */
export function LabeledSelect({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-gray-500" htmlFor={id}>{label}</label>
      <select
        id={id}
        className="w-40 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/** Distinct, case-insensitively sorted non-empty districts from a set of rows. */
export function districtOptions(rows: Array<{ district?: string }>): string[] {
  return Array.from(new Set(rows.map((r) => r.district).filter((d): d is string => !!d)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** Apply the district + facility cascade to a set of rows (client-side, in place). */
export function filterByDistrictFacility<T extends FacilityRow>(
  rows: T[],
  district: string,
  facility: string,
): T[] {
  return rows.filter(
    (r) =>
      (district === ALL_DISTRICTS || r.district === district) &&
      (facility === ALL_FACILITIES || r.facilityId === facility),
  );
}

/**
 * District + Facility cascade used to refine a drill-down list in place (RI-35, compliance-page
 * style). Selecting a district narrows the facility options to that district and resets the facility
 * to "all"; selecting a facility drills to a single one. Filtering is client-side; the global date
 * filter still applies.
 *
 * {@code options} is the FULL facility list (all in-scope facilities with their district), so the
 * dropdowns always offer every district/facility — not just the ones that happen to have data in the
 * current metric. The parent applies {@link filterByDistrictFacility} to its own (metric) rows.
 *
 * RI-56: Facility is now a global header filter, so this cascade's facility half is optional
 * (`showFacility={false}`) for callers that only need the District refinement — the global facility
 * filter already narrows the underlying rows for them.
 */
export function DistrictFacilityFilter<T extends FacilityRow>({
  idPrefix,
  options,
  district,
  facility,
  onDistrictChange,
  onFacilityChange,
  showFacility = true,
}: {
  idPrefix: string;
  options: T[];
  district: string;
  facility?: string;
  onDistrictChange: (value: string) => void;
  onFacilityChange?: (value: string) => void;
  showFacility?: boolean;
}) {
  const districts = useMemo(() => districtOptions(options), [options]);

  // Facilities available for the selected district (deduped by id, id appended for duplicate names).
  const facilities = useMemo(() => {
    if (!showFacility) return [];
    const inDistrict = district === ALL_DISTRICTS ? options : options.filter((r) => r.district === district);
    const byId = new Map<string, T>();
    for (const r of inDistrict) if (!byId.has(r.facilityId)) byId.set(r.facilityId, r);
    const list = [...byId.values()];
    const dupes = findDuplicateFacilityNames(list);
    return list
      .map((f) => ({ id: f.facilityId, label: formatFacilityDisplayName(f, dupes) }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }, [options, district, showFacility]);

  const selectClass = 'truncate rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs font-medium text-gray-500" htmlFor={`${idPrefix}-district`}>District</label>
      <select
        id={`${idPrefix}-district`}
        className={`${selectClass} w-40`}
        value={district}
        onChange={(e) => {
          onDistrictChange(e.target.value);
          // Reset facility — it may not belong to the new district — only when we're tracking it.
          if (showFacility) onFacilityChange?.(ALL_FACILITIES);
        }}
      >
        <option value={ALL_DISTRICTS}>All districts</option>
        {districts.map((d) => (
          <option key={d} value={d}>{d}</option>
        ))}
      </select>

      {showFacility && (
        <>
          <label className="text-xs font-medium text-gray-500" htmlFor={`${idPrefix}-facility`}>Facility</label>
          <select
            id={`${idPrefix}-facility`}
            className={`${selectClass} w-52`}
            value={facility}
            onChange={(e) => onFacilityChange?.(e.target.value)}
          >
            <option value={ALL_FACILITIES}>All facilities</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
