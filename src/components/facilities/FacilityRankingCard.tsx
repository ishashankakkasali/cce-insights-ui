import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../shared/Card';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorAlert } from '../shared/ErrorAlert';
import { TableRangePagination } from '../shared/TableRangePagination';
import { useFacilityRanking, useAdoptionKpis, useFacilityActivityDetail } from '../../hooks/useFacilities';
import { useReferralsKpi } from '../../hooks/useDashboard';
import { formatNumber, formatPercentage } from '../../utils/formatters';
import { getFacilityName } from '../../utils/facilityNames';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../../utils/facilityDisplay';
import { SORT_ORDER_OPTIONS } from '../../config';
import type { SortOrder, AdoptionKpi } from '../../api/types';
import type { FacilityStatusFilter } from './FacilityActivityCards';

const TABLE_PAGE_SIZE = 10;

// The ranking is sorted client-side because two of the three sort metrics (Referrals, Adoption Rate)
// are joined in from other endpoints and are not sortable on the ranking API.
type SortKey = 'referrals' | 'complianceRate' | 'adoptionRate';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'referrals', label: 'Referrals' },
  { value: 'complianceRate', label: 'Compliance' },
  { value: 'adoptionRate', label: 'Adoption Rate' },
];

export function FacilityRankingCard({ statusFilter = 'all' }: { statusFilter?: FacilityStatusFilter }) {
  const [sortKey, setSortKey] = useState<SortKey>('referrals');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Fetch all facility rows once; ordering is applied client-side below.
  const ranking = useFacilityRanking({ rankBy: 'complianceRate', order: 'desc', limit: 200 });
  const referrals = useReferralsKpi();
  const adoption = useAdoptionKpis();
  const activity = useFacilityActivityDetail();

  // Per-facility lookups (same period/filters) keyed for O(1) row joins.
  const referralByFacility = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of referrals.data?.byFacility ?? []) m.set(r.facilityId, r.count);
    return m;
  }, [referrals.data]);

  const adoptionByFacility = useMemo(() => {
    const m = new Map<string, AdoptionKpi>();
    for (const a of adoption.data ?? []) m.set(a.facilityId, a);
    return m;
  }, [adoption.data]);

  const activeByFacility = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const f of activity.data ?? []) m.set(f.facilityId, f.active);
    return m;
  }, [activity.data]);

  const sortValue = useMemo(() => (facilityId: string, complianceRate: number) => {
    if (sortKey === 'referrals') return referralByFacility.get(facilityId) ?? 0;
    if (sortKey === 'adoptionRate') return adoptionByFacility.get(facilityId)?.adoptionRate ?? 0;
    return complianceRate;
  }, [sortKey, referralByFacility, adoptionByFacility]);

  const filteredRows = useMemo(() => {
    let rows = [...(ranking.data?.data ?? [])];
    // Facility Status filter (driven by the top indicator cards).
    if (statusFilter !== 'all') {
      const wantActive = statusFilter === 'active';
      rows = rows.filter((f) => (activeByFacility.get(f.facilityId) ?? false) === wantActive);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((f) =>
        (f.facilityName ?? getFacilityName(f.facilityId)).toLowerCase().includes(q));
    }
    // Client-side sort by the selected metric + order (Best First = desc, Worst First = asc).
    rows.sort((a, b) => {
      const diff = sortValue(a.facilityId, a.complianceRate) - sortValue(b.facilityId, b.complianceRate);
      return order === 'desc' ? -diff : diff;
    });
    return rows;
  }, [ranking.data, search, statusFilter, activeByFacility, sortValue, order]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / TABLE_PAGE_SIZE));
  const paginatedRows = useMemo(
    () => filteredRows.slice((page - 1) * TABLE_PAGE_SIZE, page * TABLE_PAGE_SIZE),
    [filteredRows, page],
  );

  const duplicateFacilityNames = useMemo(
    () => findDuplicateFacilityNames(filteredRows),
    [filteredRows],
  );

  useEffect(() => { setPage(1); }, [sortKey, order, search, statusFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statusLabel = statusFilter === 'active' ? 'Active' : statusFilter === 'inactive' ? 'Inactive' : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex gap-2 items-end">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSortKey(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                sortKey === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          {SORT_ORDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOrder(opt.value as SortOrder)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                order === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Search Facility</label>
          <input
            type="text"
            placeholder="Enter facility name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <Card title="Facility Ranking" description="Tracked patients — those with a protocol-matched clinical event in the selected period (by clinical event date, not enrollment) — counted once at their assigned facility. Compliance % reflects deviations that occurred in the period. Adoption columns show expected vs. actual visit volume for the period. Click a facility to open it on the Compliance page.">
        {statusLabel && (
          <p className="mb-3 text-xs text-gray-500">
            Filtered to <span className="font-semibold text-gray-700">{statusLabel}</span> facilities
            {' '}(click the {statusLabel} indicator again to clear).
          </p>
        )}
        {ranking.isPending ? <LoadingSpinner /> : ranking.error ? <ErrorAlert error={ranking.error} /> : ranking.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  {/* Grouped header: Referrals | Compliance | e-Buzima Adoption | Status.
                      Identity columns (Rank/Facility/Referrals/Status) span both rows and are
                      bottom-aligned + styled like the sub-headers, so every column label lands on
                      one line while the group labels float above their sub-columns. */}
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                    <th className="border-b border-gray-200 pt-3 pb-2 pr-4 align-bottom text-xs font-medium text-gray-500" rowSpan={2}>Rank</th>
                    <th className="border-b border-gray-200 pt-3 pb-2 pr-4 align-bottom text-xs font-medium text-gray-500" rowSpan={2}>Facility</th>
                    <th className="border-b border-l border-gray-200 pt-3 pb-2 pl-4 pr-4 align-bottom text-xs font-medium text-gray-500" rowSpan={2}>Referrals</th>
                    <th className="border-b border-l border-gray-200 pt-3 pb-1.5 pl-4 pr-4 text-center" colSpan={3}>Compliance</th>
                    <th className="border-b border-l border-gray-200 pt-3 pb-1.5 pl-4 pr-4 text-center" colSpan={4}>e-Buzima Adoption (Selected Period)</th>
                    <th className="border-b border-l border-gray-200 pt-3 pb-2 pl-4 pr-4 align-bottom text-xs font-medium text-gray-500" rowSpan={2}>Events</th>
                    <th className="border-b border-l border-gray-200 pt-3 pb-2 pl-4 align-bottom text-xs font-medium text-gray-500" rowSpan={2}>Status</th>
                  </tr>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="border-l border-gray-200 pt-2.5 pb-2 pl-4 pr-4">Tracked Patients</th>
                    <th className="pt-2.5 pb-2 pr-4">Deviations</th>
                    <th className="pt-2.5 pb-2 pr-4">Compliance</th>
                    <th className="border-l border-gray-200 pt-2.5 pb-2 pl-4 pr-4 text-center">Expected Visits (Period)</th>
                    <th className="pt-2.5 pb-2 pr-4 text-center">Actual Visits (Period)</th>
                    <th className="pt-2.5 pb-2 pr-4 text-center">Reporting Gap</th>
                    <th className="pt-2.5 pb-2 pr-4 text-center">Adoption Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedRows.map((f, i) => {
                    const rank = (page - 1) * TABLE_PAGE_SIZE + i + 1;
                    const active = activeByFacility.get(f.facilityId) ?? false;
                    const a = adoptionByFacility.get(f.facilityId);
                    const gap = a?.reportingGap ?? 0;
                    const adoptionRate = a?.adoptionRate ?? 0;
                    const rateColor = adoptionRate >= 80 ? 'text-green-700' : adoptionRate >= 50 ? 'text-amber-700' : 'text-red-700';
                    return (
                      <tr key={f.facilityId} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-bold text-gray-400">{rank}</td>
                        <td className="py-2 pr-4 font-medium">
                          <Link
                            to={`/compliance?facility=${encodeURIComponent(f.facilityId)}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline"
                            title="Open this facility on the Compliance page"
                          >
                            {formatFacilityDisplayName(f, duplicateFacilityNames)}
                          </Link>
                        </td>
                        <td className="border-l border-gray-200 py-2 pl-4 pr-4 tabular-nums">{formatNumber(referralByFacility.get(f.facilityId) ?? 0)}</td>
                        <td className="border-l border-gray-200 py-2 pl-4 pr-4">{formatNumber(f.totalEnrollments)}</td>
                        <td className="py-2 pr-4">{formatNumber(f.activeDeviations)}</td>
                        <td className="py-2 pr-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            f.complianceRate >= 80 ? 'bg-green-50 text-green-700' :
                            f.complianceRate >= 50 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {formatPercentage(f.complianceRate)}
                          </span>
                        </td>
                        <td className="border-l border-gray-200 py-2 pl-4 pr-4 text-center tabular-nums text-gray-600">{formatNumber(a?.expectedVisits ?? 0)}</td>
                        <td className="py-2 pr-4 text-center tabular-nums">{formatNumber(a?.actualVisits ?? 0)}</td>
                        <td className={`py-2 pr-4 text-center font-medium tabular-nums ${gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {gap > 0 ? `−${formatNumber(gap)}` : `+${formatNumber(Math.abs(gap))}`}
                        </td>
                        <td className={`py-2 pr-4 text-center font-semibold ${rateColor}`}>{formatPercentage(adoptionRate, 2)}</td>
                        <td className="border-l border-gray-200 py-2 pl-4 pr-4 tabular-nums">{formatNumber(f.totalEvents)}</td>
                        <td className="border-l border-gray-200 py-2 pl-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-red-400'}`} />
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {paginatedRows.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">No facilities match the current filters</p>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Compliance &amp; Adoption Rate:</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> ≥ 80%</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50–79%</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt; 50%</span>
            </div>
            <TableRangePagination
              page={page}
              pageSize={TABLE_PAGE_SIZE}
              totalCount={filteredRows.length}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}
