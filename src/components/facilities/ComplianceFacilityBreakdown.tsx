import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorAlert } from '../shared/ErrorAlert';
import { TableRangePagination } from '../shared/TableRangePagination';
import { DistrictFacilityFilter, filterByDistrictFacility, LabeledSelect, ALL_DISTRICTS, ALL_FACILITIES } from '../shared/DistrictSelect';
import { useFacilityRanking } from '../../hooks/useFacilities';
import { useGlobalFilters } from '../../hooks/useGlobalFilters';
import { formatNumber, formatPercentage } from '../../utils/formatters';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../../utils/facilityDisplay';

const PAGE_SIZE = 10;

/**
 * Service Compliance drill-down (RI-35): per-facility compliant / non-compliant / rate for the
 * selected period, rendered inline inside the Service Compliance card. Worst compliance first so
 * under-performing facilities surface at the top. Status / District / Facility filters refine it.
 */
export function ComplianceFacilityBreakdown() {
  const ranking = useFacilityRanking({ rankBy: 'complianceRate', order: 'asc', limit: 1000 });
  const { facilityId: globalFacilityId } = useGlobalFilters();
  const facility = globalFacilityId ?? ALL_FACILITIES;
  const [district, setDistrict] = useState<string>(ALL_DISTRICTS);
  const [status, setStatus] = useState<'all' | 'compliant' | 'noncompliant'>('all');
  const [page, setPage] = useState(1);

  // Only facilities with tracked patients are meaningful for a compliance breakdown.
  const rows = useMemo(
    () => (ranking.data?.data ?? []).filter((f) => f.totalEnrollments > 0),
    [ranking.data],
  );
  // Append the facility id when two facilities share a display name (e.g. same name, different FOSA id).
  const duplicateNames = useMemo(() => findDuplicateFacilityNames(ranking.data?.data ?? []), [ranking.data]);
  const filtered = useMemo(() => {
    let r = filterByDistrictFacility(rows, district, facility);
    if (status === 'compliant') r = r.filter((f) => f.nonCompliantPatients === 0);
    else if (status === 'noncompliant') r = r.filter((f) => f.nonCompliantPatients > 0);
    // Display order: district A→Z, then facility A→Z, then highest compliance rate first.
    return [...r].sort((a, b) => {
      const d = (a.district ?? '').localeCompare(b.district ?? '', undefined, { sensitivity: 'base' });
      if (d !== 0) return d;
      const f = (a.facilityName ?? '').localeCompare(b.facilityName ?? '', undefined, { sensitivity: 'base' });
      if (f !== 0) return f;
      return b.complianceRate - a.complianceRate;
    });
  }, [rows, district, facility, status]);

  useEffect(() => { setPage(1); }, [ranking.data, district, facility, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Compliance Details ({filtered.length})</h3>
        <div className="flex flex-wrap items-center gap-2">
          <LabeledSelect
            id="compliance-status"
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as 'all' | 'compliant' | 'noncompliant')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'compliant', label: 'Compliant' },
              { value: 'noncompliant', label: 'Non-Compliant' },
            ]}
          />
          <DistrictFacilityFilter
            idPrefix="compliance"
            options={ranking.data?.data ?? []}
            district={district}
            onDistrictChange={setDistrict}
            showFacility={false}
          />
        </div>
      </div>

      {ranking.isLoading ? (
        <LoadingSpinner />
      ) : ranking.error ? (
        <ErrorAlert error={ranking.error} />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No facilities with tracked patients for this selection.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm">
              <colgroup>
                <col style={{ width: '20%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">District</th>
                  <th className="pb-2 pr-4">Facility</th>
                  <th className="pb-2 pr-4 text-center">Tracked</th>
                  <th className="pb-2 pr-4 text-center">Compliant</th>
                  <th className="pb-2 pr-4 text-center">Non-Compliant</th>
                  <th className="pb-2 pr-4 text-center">Compliance Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((f) => (
                  <tr key={f.facilityId} className="hover:bg-gray-50">
                    <td className="truncate py-2 pr-4 font-medium text-gray-900">{f.district || '—'}</td>
                    <td className="truncate py-2 pr-4 font-medium text-gray-900" title={formatFacilityDisplayName(f, duplicateNames)}>{formatFacilityDisplayName(f, duplicateNames)}</td>
                    <td className="py-2 pr-4 text-center tabular-nums text-gray-700">{formatNumber(f.totalEnrollments)}</td>
                    <td className="py-2 pr-4 text-center tabular-nums text-green-700">{formatNumber(f.compliantPatients)}</td>
                    <td className="py-2 pr-4 text-center tabular-nums text-red-700">{formatNumber(f.nonCompliantPatients)}</td>
                    <td className={`py-2 pr-4 text-center font-semibold tabular-nums ${f.complianceRate >= 80 ? 'text-green-700' : f.complianceRate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{formatPercentage(f.complianceRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TableRangePagination
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}
    </>
  );
}
