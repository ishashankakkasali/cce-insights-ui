import { useEffect, useMemo, useState } from 'react';
import { MetricCard } from '../shared/MetricCard';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { TableRangePagination } from '../shared/TableRangePagination';
import { ClickableMetricGroup } from '../shared/ClickableMetricGroup';
import {
  DistrictFacilityFilter, filterByDistrictFacility, LabeledSelect,
  ALL_DISTRICTS, ALL_FACILITIES,
} from '../shared/DistrictSelect';
import { useReferralsKpi } from '../../hooks/useDashboard';
import { useGlobalFilters } from '../../hooks/useGlobalFilters';
import { formatNumber, formatPercentage } from '../../utils/formatters';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../../utils/facilityDisplay';

const PAGE_SIZE = 10;

/**
 * Referral metrics (RI-35): country-level cards — Received by HIE, Compliant, Non-Compliant and
 * Referral Compliance Rate — in one white card. Clicking it reveals the per-facility breakdown
 * inside the same card, with Status (All/Compliant/Non-Compliant), District and Facility filters.
 * "Compliant" = referral matched to a Referral step in a tracked care journey.
 */
export function ReferralMetricsCard({ className }: { className?: string }) {
  const referrals = useReferralsKpi();
  const { facilityId: globalFacilityId } = useGlobalFilters();
  const facility = globalFacilityId ?? ALL_FACILITIES;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'all' | 'compliant' | 'noncompliant'>('all');
  const [district, setDistrict] = useState<string>(ALL_DISTRICTS);
  const [page, setPage] = useState(1);

  const data = referrals.data;
  // Only facilities that received at least one referral in the period are worth listing.
  const rows = useMemo(
    () => (data?.byFacility ?? []).filter((f) => f.count > 0).sort((a, b) => b.count - a.count),
    [data],
  );
  // Append the facility id when two facilities share a display name.
  const duplicateNames = useMemo(() => findDuplicateFacilityNames(data?.byFacility ?? []), [data]);
  const filtered = useMemo(() => {
    let r = filterByDistrictFacility(rows, district, facility);
    if (status === 'compliant') r = r.filter((f) => f.nonCompliant === 0);
    else if (status === 'noncompliant') r = r.filter((f) => f.nonCompliant > 0);
    // Display order: district A→Z, then facility A→Z, then most referrals received first.
    return [...r].sort((a, b) => {
      const d = (a.district ?? '').localeCompare(b.district ?? '', undefined, { sensitivity: 'base' });
      if (d !== 0) return d;
      const f = (a.facilityName ?? '').localeCompare(b.facilityName ?? '', undefined, { sensitivity: 'base' });
      if (f !== 0) return f;
      return b.count - a.count;
    });
  }, [rows, district, facility, status]);

  useEffect(() => { setPage(1); }, [data, open, status, district, facility]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  const v = (n: number | undefined) =>
    referrals.isLoading ? '…' : referrals.error ? '—' : formatNumber(n ?? 0);

  const detail = (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900">Referral Details ({filtered.length})</h3>
        <div className="flex flex-wrap items-center gap-2">
          <LabeledSelect
            id="referral-status"
            label="Status"
            value={status}
            onChange={(val) => setStatus(val as 'all' | 'compliant' | 'noncompliant')}
            options={[
              { value: 'all', label: 'All' },
              { value: 'compliant', label: 'Compliant' },
              { value: 'noncompliant', label: 'Non-Compliant' },
            ]}
          />
          <DistrictFacilityFilter
            idPrefix="referral"
            options={data?.byFacility ?? []}
            district={district}
            onDistrictChange={setDistrict}
            showFacility={false}
          />
        </div>
      </div>

      {referrals.isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">No referrals for this selection.</p>
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
                  <th className="pb-2 pr-4 text-center">Received</th>
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
                    <td className="py-2 pr-4 text-center tabular-nums text-gray-700">{formatNumber(f.count)}</td>
                    <td className="py-2 pr-4 text-center tabular-nums text-green-700">{formatNumber(f.compliant)}</td>
                    <td className="py-2 pr-4 text-center tabular-nums text-red-700">{formatNumber(f.nonCompliant)}</td>
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

  return (
    <ClickableMetricGroup
      title="Referrals"
      description="Referrals received by HIE and their compliant / non-compliant split for the selected period. Click for the per-facility breakdown."
      open={open}
      onToggle={() => setOpen((o) => !o)}
      className={className}
      detail={detail}
    >
      <MetricCard
        title="Referrals received by HIE"
        description="Referrals received by the HIE across all in-scope facilities in the selected period (by inbound event event_time)."
        value={v(data?.totalReferralsReceived)}
      />
      <MetricCard
        title="Compliant Referrals"
        description="Received referrals matched to a Referral step in a tracked care journey."
        value={v(data?.compliantReferrals)}
        denomination={formatNumber(data?.totalReferralsReceived ?? 0)}
      />
      <MetricCard
        title="Non-Compliant Referrals"
        description="Received referrals not matched to a tracked care journey (received − compliant). May be debugged individually."
        value={v(data?.nonCompliantReferrals)}
        denomination={formatNumber(data?.totalReferralsReceived ?? 0)}
      />
      <MetricCard
        title="Referral Compliance Rate"
        description="Compliant referrals as a percentage of referrals received by HIE."
        value={referrals.isLoading ? '…' : referrals.error ? '—' : formatPercentage(data?.referralComplianceRate ?? 0)}
      />
    </ClickableMetricGroup>
  );
}
