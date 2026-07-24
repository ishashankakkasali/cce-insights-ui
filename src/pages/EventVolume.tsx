import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/shared/PageHeader';
import { MetricCard } from '../components/shared/MetricCard';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { TableRangePagination } from '../components/shared/TableRangePagination';
import { EventTrendChart } from '../components/charts/EventTrendChart';
import { ResourceTypeBarChart } from '../components/charts/ResourceTypeBarChart';
import {
  useEventTrends, useEventsByResourceType, useEventsByFacility, useEventSummary, useZeroMatchEvents,
} from '../hooks/useEventVolume';
import { useFacilityLookup } from '../hooks/useLookups';
import { useGlobalFilters } from '../hooks/useGlobalFilters';
import { formatNumber, formatPercentage } from '../utils/formatters';
import { findDuplicateFacilityNames, formatFacilityDisplayName } from '../utils/facilityDisplay';
import { INTERVAL_OPTIONS } from '../config';
import type { FacilityEventCount } from '../api/types';

type Tab = 'resource-type' | 'facility';

const FACILITY_PAGE_SIZE = 10;
const ZERO_MATCH_PAGE_SIZE = 10;

export default function EventVolume() {
  const [interval, setInterval] = useState('weekly');
  const [activeTab, setActiveTab] = useState<Tab>('resource-type');
  const [facilityPage, setFacilityPage] = useState(1);
  const [zeroMatchPage, setZeroMatchPage] = useState(1);

  const summary = useEventSummary();
  const trends = useEventTrends(interval);
  const byResourceType = useEventsByResourceType();
  const byFacility = useEventsByFacility();
  const zeroMatchEvents = useZeroMatchEvents();
  const facilities = useFacilityLookup();
  const { district } = useGlobalFilters();
  // Facilities in scope for the global district (the by-facility table merges these so zero-event
  // facilities still appear — without this it would re-introduce out-of-district facilities).
  const scopedFacilities = useMemo(
    () => (facilities.data ?? []).filter((f) => !district || f.district === district),
    [facilities.data, district],
  );

  // All header tiles (incl. Pipeline Loss) come from /events/summary — every metric is
  // date-filtered by clinical event_time over the same event set, so the rates reconcile.
  const periodTotalEvents = summary.data?.totalEvents ?? 0;
  const matchedCount = summary.data?.processingStatusBreakdown?.matched?.count ?? 0;
  const zeroMatchCount = summary.data?.processingStatusBreakdown?.zeroMatch?.count ?? 0;
  const duplicateCount = summary.data?.processingStatusBreakdown?.duplicate?.count ?? 0;
  const matchedRatePct = summary.data?.processingStatusBreakdown?.matched?.percentage ?? 0;
  const zeroMatchRatePct = summary.data?.processingStatusBreakdown?.zeroMatch?.percentage ?? 0;

  // Merge the API rows with the canonical facility reference list so every facility
  // appears in the table — facilities with no events in the period display 0 events
  // and an empty resource-type breakdown. Names are resolved from the lookup table
  // so the column shows the facility name, not the raw FOSA id.
  const facilityRows = useMemo<FacilityEventCount[]>(() => {
    const byId = new Map<string, FacilityEventCount>();
    for (const row of byFacility.data?.data ?? []) {
      byId.set(row.facilityId, row);
    }
    const merged: FacilityEventCount[] = [];
    const seen = new Set<string>();
    for (const fac of scopedFacilities) {
      const row = byId.get(fac.id);
      merged.push(row ?? { facilityId: fac.id, totalEvents: 0, byResourceType: [] });
      seen.add(fac.id);
    }
    // Defensive: include any API row whose facility id isn't in the (scoped) reference — but when a
    // district is selected, don't re-introduce out-of-district facilities, so only add unseen rows
    // when no district is active.
    if (!district) {
      for (const row of byFacility.data?.data ?? []) {
        if (!seen.has(row.facilityId)) merged.push(row);
      }
    }
    return merged.sort((a, b) => b.totalEvents - a.totalEvents);
  }, [byFacility.data, scopedFacilities, district]);

  const facilityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of facilities.data ?? []) map.set(f.id, f.name);
    return map;
  }, [facilities.data]);

  const facilityRowsWithName = useMemo(
    () => facilityRows.map((r) => ({
      ...r,
      // Facility-less events (RelatedPerson/Patient/etc. with no facility in the source) bucket here
      // so the table reconciles with Total Events.
      facilityName: r.facilityId === '' ? 'Unassigned' : (facilityNameById.get(r.facilityId) ?? r.facilityId),
    })),
    [facilityRows, facilityNameById],
  );

  const duplicateFacilityNames = useMemo(
    () => findDuplicateFacilityNames(facilityRowsWithName),
    [facilityRowsWithName],
  );

  const facilityTotalCount = facilityRowsWithName.length;
  const facilityTotalPages = Math.max(1, Math.ceil(facilityTotalCount / FACILITY_PAGE_SIZE));
  const paginatedFacilities = useMemo(
    () => facilityRowsWithName.slice(
      (facilityPage - 1) * FACILITY_PAGE_SIZE,
      facilityPage * FACILITY_PAGE_SIZE,
    ),
    [facilityRowsWithName, facilityPage],
  );

  useEffect(() => {
    if (facilityPage > facilityTotalPages) setFacilityPage(facilityTotalPages);
  }, [facilityPage, facilityTotalPages]);

  const zeroMatchRowsWithName = useMemo(
    () => (zeroMatchEvents.data ?? []).map((r) => ({
      ...r,
      facilityName: r.facilityId === '' ? 'Unassigned' : (facilityNameById.get(r.facilityId) ?? r.facilityId),
    })),
    [zeroMatchEvents.data, facilityNameById],
  );

  const duplicateZeroMatchFacilityNames = useMemo(
    () => findDuplicateFacilityNames(zeroMatchRowsWithName),
    [zeroMatchRowsWithName],
  );

  const zeroMatchTotalCount = zeroMatchRowsWithName.length;
  const zeroMatchTotalPages = Math.max(1, Math.ceil(zeroMatchTotalCount / ZERO_MATCH_PAGE_SIZE));
  const paginatedZeroMatch = useMemo(
    () => zeroMatchRowsWithName.slice(
      (zeroMatchPage - 1) * ZERO_MATCH_PAGE_SIZE,
      zeroMatchPage * ZERO_MATCH_PAGE_SIZE,
    ),
    [zeroMatchRowsWithName, zeroMatchPage],
  );

  useEffect(() => {
    if (zeroMatchPage > zeroMatchTotalPages) setZeroMatchPage(zeroMatchTotalPages);
  }, [zeroMatchPage, zeroMatchTotalPages]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'resource-type', label: 'By Resource Type' },
    { key: 'facility', label: 'By Facility' },
  ];

  return (
    <>
      <PageHeader title="Event Volume & Activity" description="Clinical event metrics — volume by resource type and facility" />

      {summary.isLoading ? <LoadingSpinner /> : summary.error ? <ErrorAlert error={summary.error} /> : (
        <>
          <div className="mb-1 text-xs text-gray-400">
            All metrics are scoped to the selected date range by clinical event time.
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              title="Total Events"
              value={formatNumber(periodTotalEvents)}
              description="Inbound clinical events (FHIR resources) accepted by the HIE pipeline during the selected date range."
            />
            <MetricCard
              title="Matched Rate"
              value={`${Number(matchedRatePct).toFixed(2)}%`}
              description={`Percentage of events successfully matched to a protocol step instance in the selected period (${formatNumber(matchedCount)} of ${formatNumber(periodTotalEvents)}).`}
              bgColor="bg-green-50"
            />
            <MetricCard
              title="Zero Match Rate"
              value={`${Number(zeroMatchRatePct).toFixed(2)}%`}
              description={`Percentage of events that could not be matched to any protocol step in the selected period (${formatNumber(zeroMatchCount)} of ${formatNumber(periodTotalEvents)}).`}
              bgColor="bg-amber-50"
            />
            <MetricCard
              title="Duplicates"
              value={formatNumber(duplicateCount)}
              description="Events identified as duplicates of a previously received event during the selected period — not processed again."
              bgColor="bg-purple-50"
            />
            <MetricCard
              title="Pipeline Loss"
              value={formatNumber(summary.data?.pipelineLossCount ?? 0)}
              description={`Events accepted by the collector but never reaching the compliance engine in the selected period (${formatNumber(summary.data?.pipelineLossCount ?? 0)} of ${formatNumber(periodTotalEvents)}).`}
              bgColor={(summary.data?.pipelineLossCount ?? 0) > 0 ? 'bg-red-50' : undefined}
            />
          </div>
        </>
      )}

      <Card title="Volume Trends" className="mt-6"
        action={
          <div className="flex gap-1">
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setInterval(opt.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  interval === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        }
      >
        {trends.isLoading ? <LoadingSpinner /> : trends.error ? <ErrorAlert error={trends.error} /> : trends.data ? (
          <EventTrendChart data={trends.data.trends} />
        ) : null}
      </Card>

      <div className="mt-6">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === 'resource-type' && (
            <Card>
              {byResourceType.isLoading ? <LoadingSpinner /> : byResourceType.error ? <ErrorAlert error={byResourceType.error} /> : byResourceType.data ? (
                <ResourceTypeBarChart data={byResourceType.data} />
              ) : null}
            </Card>
          )}

          {activeTab === 'facility' && (
            <Card>
              {byFacility.isLoading || facilities.isLoading ? <LoadingSpinner /> : byFacility.error ? <ErrorAlert error={byFacility.error} /> : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                          <th className="pb-2 pr-4">Facility</th>
                          <th className="pb-2 pr-4">Total Events</th>
                          <th className="pb-2">Resource Types</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedFacilities.map((f) => (
                          <tr key={f.facilityId} className="hover:bg-gray-50">
                            <td className="py-2 pr-4 font-medium text-gray-900">
                              {formatFacilityDisplayName(
                                { facilityId: f.facilityId, facilityName: f.facilityName },
                                duplicateFacilityNames,
                              )}
                            </td>
                            <td className="py-2 pr-4">{formatNumber(f.totalEvents)}</td>
                            <td className="py-2 text-gray-600">
                              {f.byResourceType.length === 0
                                ? '—'
                                : f.byResourceType.map((r) => `${r.resourceType}: ${r.count}`).join(', ')}
                            </td>
                          </tr>
                        ))}
                        {paginatedFacilities.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-sm text-gray-500">
                              No facilities to display.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <TableRangePagination
                    page={facilityPage}
                    pageSize={FACILITY_PAGE_SIZE}
                    totalCount={facilityTotalCount}
                    onPageChange={setFacilityPage}
                  />
                </>
              )}
            </Card>
          )}
        </div>
      </div>

      <Card title="Zero-Match Events Info" className="mt-6">
        {zeroMatchEvents.isLoading || facilities.isLoading ? <LoadingSpinner /> : zeroMatchEvents.error ? <ErrorAlert error={zeroMatchEvents.error} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2 pr-4">Resource Type</th>
                    <th className="pb-2 pr-4">Code</th>
                    <th className="pb-2 pr-4">Category</th>
                    <th className="pb-2 pr-4">Facility</th>
                    <th className="pb-2 pr-4">Count</th>
                    <th className="pb-2">% of Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedZeroMatch.map((r, i) => (
                    <tr key={`${r.resourceType}-${r.code}-${r.category}-${r.facilityId}-${i}`} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium text-gray-900">{r.resourceType || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.code || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.category || '—'}</td>
                      <td className="py-2 pr-4 text-gray-600">
                        {formatFacilityDisplayName(
                          { facilityId: r.facilityId, facilityName: r.facilityName },
                          duplicateZeroMatchFacilityNames,
                        )}
                      </td>
                      <td className="py-2 pr-4">{formatNumber(r.count)}</td>
                      <td className="py-2">{formatPercentage(r.percentage)}</td>
                    </tr>
                  ))}
                  {paginatedZeroMatch.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                        No zero-match events in the selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TableRangePagination
              page={zeroMatchPage}
              pageSize={ZERO_MATCH_PAGE_SIZE}
              totalCount={zeroMatchTotalCount}
              onPageChange={setZeroMatchPage}
            />
          </>
        )}
      </Card>
    </>
  );
}
