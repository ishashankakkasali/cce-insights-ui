import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorAlert } from '../shared/ErrorAlert';
import { TableRangePagination } from '../shared/TableRangePagination';
import { ClickableMetricGroup } from '../shared/ClickableMetricGroup';
import { DistrictFacilityFilter, filterByDistrictFacility, ALL_DISTRICTS, ALL_FACILITIES } from '../shared/DistrictSelect';
import { useAdoptionKpis } from '../../hooks/useFacilities';
import { useGlobalFilters } from '../../hooks/useGlobalFilters';
import { formatNumber, formatPercentage } from '../../utils/formatters';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../../utils/facilityDisplay';

const TABLE_PAGE_SIZE = 10;

export function EbuzimaAdoptionCard({ className }: { className?: string }) {
  const adoption = useAdoptionKpis();
  const { facilityId: globalFacilityId } = useGlobalFilters();
  const facility = globalFacilityId ?? ALL_FACILITIES;
  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState<string>(ALL_DISTRICTS);
  const [page, setPage] = useState(1);

  const adoptionRows = adoption.data ?? [];

  // Country-level roll-up = sum across ALL facilities. Reporting gap is derived from those sums
  // (expected − actual) and the rate from the same sums (actual ÷ expected), so gap and rate always
  // agree (a negative gap = over-reporting, matching a rate above 100%).
  // No expected baseline (expected = 0): mirror the per-facility/backend rule — 100% when there IS
  // actual reporting (fully adopted / over-reporting), and 0% only when both expected AND actual are 0.
  const summary = useMemo(() => {
    const expected = adoptionRows.reduce((s, f) => s + f.expectedVisits, 0);
    const actual = adoptionRows.reduce((s, f) => s + f.actualVisits, 0);
    const gap = expected - actual;
    const rate = expected > 0
      ? Math.round((actual * 1000) / expected) / 10
      : (actual > 0 ? 100 : 0);
    return { expected, actual, gap, rate };
  }, [adoptionRows]);

  // District/facility cascade refines only the facility breakdown table; the summary stays country-level.
  // Display order: district A→Z, then facility A→Z, then highest adoption rate first.
  const filteredRows = useMemo(() => {
    const r = filterByDistrictFacility(adoptionRows, district, facility);
    return [...r].sort((a, b) => {
      const d = (a.district ?? '').localeCompare(b.district ?? '', undefined, { sensitivity: 'base' });
      if (d !== 0) return d;
      const f = (a.facilityName ?? '').localeCompare(b.facilityName ?? '', undefined, { sensitivity: 'base' });
      if (f !== 0) return f;
      return b.adoptionRate - a.adoptionRate;
    });
  }, [adoptionRows, district, facility]);
  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE),
    [filteredRows, page],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / TABLE_PAGE_SIZE));
  const duplicateNames = useMemo(() => findDuplicateFacilityNames(adoption.data ?? []), [adoption.data]);

  useEffect(() => { setPage(1); }, [adoption.data, district, facility]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // Same bordered white tile style as MetricCard, so the adoption summary matches the other cards.
  const stat = (label: string, value: string, valueClass = 'text-gray-900') => (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );

  const detail = (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Adoption Details ({filteredRows.length})</h3>
        <DistrictFacilityFilter
          idPrefix="adoption"
          options={adoptionRows}
          district={district}
          onDistrictChange={setDistrict}
          showFacility={false}
        />
      </div>
      {filteredRows.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No adoption data for this selection.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">District</th>
                  <th className="pb-2 pr-4">Facility</th>
                  <th className="pb-2 pr-4 text-center">Expected Visits</th>
                  <th className="pb-2 pr-4 text-center">Actual Visits</th>
                  <th className="pb-2 pr-4 text-center">Reporting Gap</th>
                  <th className="pb-2 pr-4 text-center">Adoption Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedRows.map((f) => {
                  const rate = f.adoptionRate;
                  const rateColor = rate >= 80 ? 'text-green-700' : rate >= 50 ? 'text-amber-700' : 'text-red-700';
                  return (
                    <tr key={f.facilityId} className="hover:bg-gray-50">
                      <td className="truncate py-2 pr-4 font-medium text-gray-900">{f.district || '—'}</td>
                      <td className="truncate py-2 pr-4 font-medium text-gray-900" title={f.facilityName}>{formatFacilityDisplayName(f, duplicateNames)}</td>
                      <td className="py-2 pr-4 text-center text-gray-600">{formatNumber(f.expectedVisits)}</td>
                      <td className="py-2 pr-4 text-center">{formatNumber(f.actualVisits)}</td>
                      <td className={`py-2 pr-4 text-center font-medium ${f.reportingGap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {f.reportingGap > 0 ? `−${formatNumber(f.reportingGap)}` : `+${formatNumber(Math.abs(f.reportingGap))}`}
                      </td>
                      <td className={`py-2 pr-4 text-center font-semibold ${rateColor}`}>{formatPercentage(rate, 2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TableRangePagination
            page={page}
            pageSize={TABLE_PAGE_SIZE}
            totalCount={filteredRows.length}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );

  if (adoption.isLoading) {
    return <ClickableMetricGroup title="e-Buzima Adoption" open={false} onToggle={() => {}} className={className}><LoadingSpinner /></ClickableMetricGroup>;
  }
  if (adoption.error) {
    return <ClickableMetricGroup title="e-Buzima Adoption" open={false} onToggle={() => {}} className={className}><ErrorAlert error={adoption.error} /></ClickableMetricGroup>;
  }

  return (
    <ClickableMetricGroup
      title="e-Buzima Adoption"
      description="Average daily reporting vs. expected baseline over the selected period. Each day a patient reports at a facility counts once (not unique patients across days). Click for the per-facility breakdown."
      open={open}
      onToggle={() => setOpen((v) => !v)}
      className={className}
      detail={adoptionRows.length === 0 ? undefined : detail}
    >
      {stat('Expected Visits', formatNumber(summary.expected))}
      {stat('Actual Visits', formatNumber(summary.actual))}
      {stat('Reporting Gap',
        summary.gap > 0 ? `−${formatNumber(summary.gap)}` : `+${formatNumber(Math.abs(summary.gap))}`,
        summary.gap > 0 ? 'text-red-600' : 'text-green-600')}
      {stat('Adoption Rate', formatPercentage(summary.rate, 1))}
    </ClickableMetricGroup>
  );
}
