import { useState, useMemo } from 'react';
import { PageHeader } from '../components/shared/PageHeader';
import { MetricCard } from '../components/shared/MetricCard';
import { ProtocolFilter } from '../components/shared/ProtocolFilter';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { usePractitionerRanking } from '../hooks/usePractitioners';
import { useDashboardComplianceSummary } from '../hooks/useDashboard';
import { formatNumber, formatPercentage } from '../utils/formatters';
import type { PractitionerRankBy, SortOrder } from '../api/types';

const RANK_OPTIONS: { value: PractitionerRankBy; label: string }[] = [
  { value: 'complianceRate', label: 'Compliance Rate' },
  { value: 'totalPatients', label: 'Patients Served' },
];

const ORDER_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'desc', label: 'Highest First' },
  { value: 'asc', label: 'Lowest First' },
];

function formatPractitionerName(ref: string, display: string | null): string {
  if (display) return display;
  const parts = ref.split('/');
  return parts.length > 1 ? parts[1] : ref;
}

export default function CcnPractitionerAnalytics() {
  const [protocolId, setProtocolId] = useState('');
  const [rankBy, setRankBy] = useState<PractitionerRankBy>('complianceRate');
  const [order, setOrder] = useState<SortOrder>('desc');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const ranking = usePractitionerRanking({ rankBy, order, limit: 200 });
  const complianceSummary = useDashboardComplianceSummary();
  const practitionerMetrics = complianceSummary.data?.practitioners;

  const filtered = useMemo(() => {
    if (!ranking.data) return [];
    if (!search) return ranking.data;
    const q = search.toLowerCase();
    return ranking.data.filter((p) => {
      const name = (p.practitionerName ?? p.practitionerRef).toLowerCase();
      return name.includes(q);
    });
  }, [ranking.data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader title="Practitioner Analytics" description="Practitioner leaderboard ranked by compliance performance" />

      {/* Metric Tiles */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tracked Practitioners"
          description="Total practitioners involved in patient care."
          value={formatNumber(practitionerMetrics?.trackedPractitioners ?? 0)}
        />
        <MetricCard
          title="> 90% Compliance"
          description="Practitioners with compliance rate above 90%."
          value={formatNumber(practitionerMetrics?.above90 ?? 0)}
          denomination={formatNumber(practitionerMetrics?.trackedPractitioners ?? 0)}
          bgColor="bg-green-50"
        />
        <MetricCard
          title="75–90% Compliance"
          description="Practitioners with compliance rate between 75% and 90%."
          value={formatNumber(practitionerMetrics?.between75And90 ?? 0)}
          denomination={formatNumber(practitionerMetrics?.trackedPractitioners ?? 0)}
          bgColor="bg-amber-50"
        />
        <MetricCard
          title="< 75% Compliance"
          description="Practitioners with compliance rate below 75%."
          value={formatNumber(practitionerMetrics?.below75 ?? 0)}
          denomination={formatNumber(practitionerMetrics?.trackedPractitioners ?? 0)}
          bgColor="bg-red-50"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Protocol</label>
          <ProtocolFilter value={protocolId} onChange={(v) => { setProtocolId(v); setPage(1); }} />
        </div>
        <div className="flex gap-2 items-end">
          {RANK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRankBy(opt.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                rankBy === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 items-end">
          {ORDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOrder(opt.value)}
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
          <label className="mb-1 block text-xs font-medium text-gray-500">Search Practitioner</label>
          <input
            type="text"
            placeholder="Enter practitioner name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-56 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <Card title="Practitioner Ranking">
        {ranking.isLoading ? <LoadingSpinner /> : ranking.error ? <ErrorAlert error={ranking.error} /> : ranking.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2 pr-4">Rank</th>
                    <th className="pb-2 pr-4">Practitioner</th>
                    <th className="pb-2 pr-4">Facility</th>
                    <th className="pb-2 pr-4">Patients</th>
                    <th className="pb-2 pr-4">Compliance</th>
                    <th className="pb-2">Steps (Done/Total)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((p) => (
                    <tr key={p.practitionerRef} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-bold text-gray-400">{p.rank}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900">
                        {formatPractitionerName(p.practitionerRef, p.practitionerName)}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">{p.facilityName ?? p.facilityId ?? '—'}</td>
                      <td className="py-2 pr-4">{formatNumber(p.totalPatients)}</td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.complianceRate >= 80 ? 'bg-green-50 text-green-700' :
                          p.complianceRate >= 50 ? 'bg-amber-50 text-amber-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {formatPercentage(p.complianceRate)}
                        </span>
                      </td>
                      <td className="py-2">{formatNumber(p.completedSteps)} / {formatNumber(p.totalSteps)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">Compliance:</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> ≥ 80%</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50–79%</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt; 50%</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
              <p className="text-xs text-gray-500">Page {page} of {totalPages} ({filtered.length} results)</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <button
                    onClick={() => setPage(1)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ⟪ First
                  </button>
                )}
                {page > 1 && (
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    ← Previous
                  </button>
                )}
                {page < totalPages && (
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </Card>
    </>
  );
}
