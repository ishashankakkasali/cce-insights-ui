import { useState } from 'react';
import { PageHeader } from '../components/shared/PageHeader';
import { MetricCard } from '../components/shared/MetricCard';
import { ProtocolFilter } from '../components/shared/ProtocolFilter';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { CursorPagination } from '../components/shared/CursorPagination';
import { useFacilityRanking } from '../hooks/useFacilities';
import { useDashboardComplianceSummary } from '../hooks/useDashboard';
import { useAtRiskHotspots } from '../hooks/usePatients';
import { formatNumber, formatPercentage } from '../utils/formatters';
import { getFacilityName } from '../utils/facilityNames';
import { RANK_BY_OPTIONS, SORT_ORDER_OPTIONS } from '../config';
import type { RankBy, SortOrder, FacilityRanking } from '../api/types';

const RUHUHA_DUMMY: FacilityRanking = {
  rank: 0,
  facilityId: 'ruhuha-hc',
  totalEnrollments: 0,
  complianceRate: 0,
  activeDeviations: 0,
  totalEvents: 0,
  outboundEvents: 0,
  inboundEvents: 0,
  patientsFromHIE: 0,
};

const KIBOGORA_DUMMY: FacilityRanking = {
  rank: 0,
  facilityId: 'kibogora-hc',
  totalEnrollments: 0,
  complianceRate: 0,
  activeDeviations: 0,
  totalEvents: 0,
  outboundEvents: 0,
  inboundEvents: 0,
  patientsFromHIE: 0,
};

export default function FacilityAnalytics() {
  const [protocolId, setProtocolId] = useState('');
  const [rankBy, setRankBy] = useState<RankBy>('complianceRate');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [cursor, setCursor] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const ranking = useFacilityRanking({ rankBy, order, cursor, protocolDefinitionId: protocolId || undefined });
  const hotspots = useAtRiskHotspots({ limit: 10 });
  const complianceSummary = useDashboardComplianceSummary();
  const facilityMetrics = complianceSummary.data?.facilities;

  return (
    <>
      <PageHeader title="Facility Analytics" description="Facility leaderboard and non-compliant hotspots" />

      {/* Metric Tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Facilities"
          description="All healthcare facilities being tracked."
          value={formatNumber((facilityMetrics?.trackedFacilities ?? 0) + 2)}
        />
        <MetricCard
          title="Active Facilities"
          description="Facilities with patient enrollments in the period."
          value={formatNumber(facilityMetrics?.trackedFacilities ?? 0)}
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Inactive Facilities"
          description="Facilities with no enrollments in the period."
          value="2"
          bgColor="bg-red-50"
        />
        <MetricCard
          title="> 90% Compliance"
          description="Facilities with compliance rate above 90%."
          value={formatNumber(facilityMetrics?.above90 ?? 0)}
          denomination={formatNumber((facilityMetrics?.trackedFacilities ?? 0) + 2)}
          bgColor="bg-emerald-50"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Protocol</label>
          <ProtocolFilter value={protocolId} onChange={(v) => { setProtocolId(v); setCursor(undefined); setPage(1); }} />
        </div>
        <div className="flex gap-2 items-end">
          {RANK_BY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setRankBy(opt.value as RankBy); setCursor(undefined); setPage(1); }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                rankBy === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              onClick={() => { setOrder(opt.value as SortOrder); setCursor(undefined); setPage(1); }}
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

      <Card title="Facility Ranking">
        {ranking.isLoading ? <LoadingSpinner /> : ranking.error ? <ErrorAlert error={ranking.error} /> : ranking.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2 pr-4">Rank</th>
                    <th className="pb-2 pr-4">Facility</th>
                    <th className="pb-2 pr-4">Tracked Patients</th>
                    <th className="pb-2 pr-4">Compliance</th>
                    <th className="pb-2 pr-4">Deviations</th>
                    <th className="pb-2 pr-4">Outbound Events</th>
                    <th className="pb-2 pr-4">Inbound Events</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...ranking.data.data, { ...RUHUHA_DUMMY, rank: ranking.data.data.length + 1 }, { ...KIBOGORA_DUMMY, rank: ranking.data.data.length + 2 }]
                    .filter((f) => {
                      if (!search) return true;
                      const name = (f.facilityName ?? getFacilityName(f.facilityId)).toLowerCase();
                      return name.includes(search.toLowerCase());
                    })
                    .map((f) => {
                    const isInactive = f.facilityId === 'ruhuha-hc' || f.facilityId === 'kibogora-hc';
                    return (
                    <tr key={f.facilityId} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-bold text-gray-400">{f.rank}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900">{f.facilityName ?? getFacilityName(f.facilityId)}</td>
                      <td className="py-2 pr-4">{formatNumber(f.totalEnrollments)}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          f.complianceRate >= 80 ? 'bg-green-50 text-green-700' :
                          f.complianceRate >= 50 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {formatPercentage(f.complianceRate)}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{formatNumber(f.activeDeviations)}</td>
                      <td className="py-2 pr-4">{formatNumber(f.outboundEvents ?? 0)}</td>
                      <td className="py-2 pr-4">{formatNumber(f.inboundEvents ?? 0)}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isInactive
                            ? 'bg-red-50 text-red-700'
                            : 'bg-green-50 text-green-700'
                        }`}>
                          {isInactive ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Compliance:</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> ≥ 80%</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50–79%</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt; 50%</span>
            </div>
            <CursorPagination
              hasMore={ranking.data.pagination.has_more}
              nextCursor={ranking.data.pagination.next_cursor}
              onNext={(c) => { setCursor(c); setPage((p) => p + 1); }}
              onReset={() => { setCursor(undefined); setPage(1); }}
              currentPage={page}
            />
          </>
        ) : null}
      </Card>

      <Card title="Non-Compliant Hotspots" description="Facilities with the highest non-compliant patient counts" className="mt-6">
        {hotspots.isLoading ? <LoadingSpinner /> : hotspots.error ? <ErrorAlert error={hotspots.error} /> : hotspots.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2 pr-4">Facility</th>
                    <th className="pb-2 pr-4">Total</th>
                    <th className="pb-2 pr-4">Compliance Rate</th>
                    <th className="pb-2 pr-4">Compliant</th>
                    <th className="pb-2">Non-Compliant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hotspots.data.data.map((h) => {
                    const compliancePct = h.onTrack.percentage;
                    const barColor = compliancePct >= 80 ? 'bg-green-500' : compliancePct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <tr key={h.facilityId} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">{h.facilityName ?? h.facilityId}</td>
                        <td className="py-2.5 pr-4">{formatNumber(h.totalPatients)}</td>
                        <td className="py-2.5 pr-4 w-48">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${compliancePct}%` }} />
                            </div>
                            <span className={`text-xs font-semibold ${compliancePct >= 80 ? 'text-green-700' : compliancePct >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                              {formatPercentage(compliancePct)}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-green-600">{h.onTrack.count}</td>
                        <td className="py-2.5 text-red-600">{h.atRisk.count + h.nonCompliant.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </Card>
    </>
  );
}
