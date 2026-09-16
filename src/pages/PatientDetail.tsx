import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { PageHeader } from '../components/shared/PageHeader';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { StatusBadge } from '../components/shared/StatusBadge';
import { usePatientTimeline, usePatientProtocolTracking, usePatientProtocolTrackingDetail, usePatientDeviations } from '../hooks/usePatients';
import { formatDate, formatDateTime } from '../utils/dates';
import { formatPercentage } from '../utils/formatters';
import { STATUS_COLORS, STATE_COLORS } from '../utils/colors';
import type { ProtocolInstanceStatus, StepState, JourneyStep } from '../api/types';

type JourneyDisplayStatus = JourneyStep['status'] | 'DEVIATION';

/** Convert Google Drive URLs to embeddable thumbnail URLs */
function toDirectImageUrl(url: string): string {
  // Match /file/d/ID or uc?...id=ID formats
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w200`;
  const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([^&]+)/);
  if (ucMatch) return `https://drive.google.com/thumbnail?id=${ucMatch[1]}&sz=w200`;
  return url;
}

const JOURNEY_STATUS: Record<JourneyDisplayStatus, { bg: string; text: string; dot: string; label: string }> = {
  COMPLETED:   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Completed' },
  PENDING:     { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400',   label: 'Pending' },
  DUE:         { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400',   label: 'Due' },
  OVERDUE:     { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Overdue' },
  MISSED:      { bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'Missed' },
  SKIPPED:     { bg: 'bg-gray-50',   text: 'text-gray-600',   dot: 'bg-gray-400',   label: 'Skipped' },
  NOT_STARTED: { bg: 'bg-gray-50',   text: 'text-gray-400',   dot: 'bg-gray-300',   label: 'Not Started' },
  DEVIATION:   { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Deviation' },
};

const SOURCE_COLORS: Record<string, string> = {
  spice: 'bg-purple-100 text-purple-700',
  openmrs: 'bg-sky-100 text-sky-700',
  dhis2: 'bg-teal-100 text-teal-700',
  fhir: 'bg-indigo-100 text-indigo-700',
  hl7: 'bg-pink-100 text-pink-700',
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
}

const SOURCE_LABELS: Record<string, string> = {
  spice: 'CHW App',
};

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source.toLowerCase()] ?? source;
}

/** Pins the protocol the user came here for to the top of the list, leaving the rest in place. */
function reorderByRequestedProtocol<T extends { protocolInstanceId: string }>(items: T[], requestedProtocolInstanceId: string | null): T[] {
  if (!requestedProtocolInstanceId) return items;
  const idx = items.findIndex((item) => item.protocolInstanceId === requestedProtocolInstanceId);
  if (idx <= 0) return items;
  const reordered = [...items];
  const [requested] = reordered.splice(idx, 1);
  reordered.unshift(requested);
  return reordered;
}

function isReferralInitiated(step: JourneyStep): boolean {
  const actionId = step.actionId?.toLowerCase() ?? '';
  return actionId.includes('referral') && !actionId.includes('consultation') && !actionId.includes('ack') && step.status === 'COMPLETED';
}

function isReferralClosed(step: JourneyStep): boolean {
  const actionId = step.actionId?.toLowerCase() ?? '';
  return actionId.includes('referral') && actionId.includes('ack') && step.status === 'COMPLETED';
}

function ReferralTable({ title, steps, emptyLabel }: { title: string; steps: JourneyStep[]; emptyLabel: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase text-gray-400">{title}</p>
      {steps.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                <th className="pb-2 pr-4">Step</th>
                <th className="pb-2 pr-4">Source</th>
                <th className="pb-2 pr-4">Facility</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {steps.map((step, idx) => (
                <tr key={`${title}-${idx}`} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">{step.stepName}</td>
                  <td className="py-2 pr-4">
                    {step.source ? (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getSourceColor(step.source)}`}>
                        {getSourceLabel(step.source)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-2 pr-4 text-gray-600">{step.facilityName || step.facilityId || '—'}</td>
                  <td className="py-2 text-gray-600">{step.effectiveDateTime ? formatDateTime(step.effectiveDateTime) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-3 text-center text-xs text-gray-400">{emptyLabel}</p>
      )}
    </div>
  );
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedProtocolInstanceId = searchParams.get('protocolInstanceId');
  const patientId = id ?? '';
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [expandedProtocolInstanceId, setExpandedProtocolInstanceId] = useState<string | null>(null);
  const [hasSetDefaultExpansion, setHasSetDefaultExpansion] = useState(false);

  const tracking = usePatientProtocolTracking(patientId);
  const timeline = usePatientTimeline(patientId);
  const deviations = usePatientDeviations(patientId, { skipDateFilter: true });
  const detail = usePatientProtocolTrackingDetail(patientId, selectedProtocol);

  // Whichever protocol the user came here for (clicked from the Patient
  // List's protocol-filtered table, carried via ?protocolInstanceId=) is
  // pinned to the top of both lists below so it's immediately visible
  // instead of buried among the patient's other enrollments.
  const orderedTracking = useMemo(
    () => reorderByRequestedProtocol(tracking.data ?? [], requestedProtocolInstanceId),
    [tracking.data, requestedProtocolInstanceId]
  );
  const orderedProtocols = useMemo(
    () => reorderByRequestedProtocol(timeline.data?.protocols ?? [], requestedProtocolInstanceId),
    [timeline.data, requestedProtocolInstanceId]
  );

  // On first load, auto-expand whichever protocol the user actually came here
  // for, else the protocol most likely to need attention (has deviations,
  // else the first active one, else just the first) — the rest stay
  // collapsed so a patient enrolled in many protocols gets a scannable
  // overview instead of every journey rendered in full.
  useEffect(() => {
    if (hasSetDefaultExpansion || orderedProtocols.length === 0) return;
    const protocolsWithDeviations = new Set((deviations.data ?? []).map((d) => d.protocolInstanceId));
    const defaultProtocol =
      orderedProtocols.find((p) => p.protocolInstanceId === requestedProtocolInstanceId) ??
      orderedProtocols.find((p) => protocolsWithDeviations.has(p.protocolInstanceId)) ??
      orderedProtocols.find((p) => p.status === 'ACTIVE') ??
      orderedProtocols[0];
    setExpandedProtocolInstanceId(defaultProtocol.protocolInstanceId);
    setHasSetDefaultExpansion(true);
  }, [orderedProtocols, deviations.data, hasSetDefaultExpansion, requestedProtocolInstanceId]);

  // Single-open accordion: expanding one protocol collapses whichever was
  // open before it.
  function toggleProtocolExpanded(protocolInstanceId: string) {
    setExpandedProtocolInstanceId((prev) => (prev === protocolInstanceId ? null : protocolInstanceId));
  }

  // Used by the "Details →" link on the Protocol Tracking card above: expand
  // that protocol's journey below (collapsing whichever was open), without
  // scrolling — the Step Details table opens above and scrolling down would
  // just hide it again.
  function focusProtocolJourney(protocolInstanceId: string) {
    setExpandedProtocolInstanceId(protocolInstanceId);
  }

  // Build set of actionIds that have deviations (incomplete prerequisites from ORDER_VIOLATION)
  const deviationActionIds = new Set<string>();
  if (deviations.data) {
    for (const d of deviations.data) {
      if (d.deviationType === 'ORDER_VIOLATION' && d.metadata?.incompletePrerequisites) {
        d.metadata.incompletePrerequisites.forEach((actionId) => deviationActionIds.add(actionId));
      }
      if ((d.deviationType === 'OVERDUE' || d.deviationType === 'MISSED') && d.actionId) {
        deviationActionIds.add(d.actionId);
      }
    }
  }

  const isLoading = tracking.isLoading || timeline.isLoading;
  const error = tracking.error || timeline.error;

  return (
    <>
      <div className="mb-2">
        <Link to="/compliance/patients" className="text-sm text-blue-600 hover:text-blue-700">← Back to Patient List</Link>
      </div>
      <PageHeader title={`Patient: ${patientId}`} />

      <Card title="Protocol Tracking">
        {tracking.isLoading && <LoadingSpinner />}
        {tracking.error && <ErrorAlert error={tracking.error} />}
        {tracking.data && tracking.data.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">No protocol tracking found.</p>
        )}
        {tracking.data && (
          <div className="space-y-3">
            {orderedTracking.map((p) => {
              const docArtifact = p.relatedArtifact?.find((a) => a.type === 'documentation');
              const thumbnailUrl = docArtifact?.extension?.find((e) => e.url === 'http://openphc.org/fhir/thumbnail')?.valueCode;
              const displayTitle = p.protocolTitle || p.protocolCanonical;
              return (
                <div key={p.protocolInstanceId} className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {thumbnailUrl && (
                        <a href={docArtifact?.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                          <img
                            src={toDirectImageUrl(thumbnailUrl)}
                            alt={docArtifact?.display || 'Protocol thumbnail'}
                            className="h-10 w-10 rounded object-cover border border-gray-200"
                          />
                        </a>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            label={p.status}
                            color={STATUS_COLORS[p.status as ProtocolInstanceStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }}
                          />
                          {docArtifact ? (
                            <a href={docArtifact.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-blue-700 hover:underline">
                              {displayTitle}
                            </a>
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">{displayTitle}</span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Tracking Since: {formatDate(p.enrolledAt)} · Rate: {formatPercentage(p.complianceRate)} · Steps: {p.stepsCompleted}/{p.totalSteps}
                        </p>
                        <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${(p.stepsCompleted / Math.max(p.totalSteps, 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProtocol(p.protocolInstanceId);
                        focusProtocolJourney(p.protocolInstanceId);
                      }}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {selectedProtocol && detail.data && (
        <Card title={`Step Details — ${detail.data.protocolCanonical}`} className="mt-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Action</th>
                  <th className="pb-2 pr-4">State</th>
                  <th className="pb-2 pr-4">Due Date</th>
                  <th className="pb-2 pr-4">Completed</th>
                  <th className="pb-2">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {detail.data.steps.map((s) => (
                  <tr key={s.stepInstanceId} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">{s.actionId}</td>
                    <td className="py-2 pr-4">
                      <StatusBadge label={s.state} color={STATE_COLORS[s.state as StepState] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }} />
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{s.dueDate ? formatDate(s.dueDate) : '—'}</td>
                    <td className="py-2 pr-4 text-gray-600">{s.completedAt ? formatDateTime(s.completedAt) : '—'}</td>
                    <td className="py-2 text-gray-600">{s.completedBySource || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Protocol Journey" className="mt-6">
        {isLoading && <LoadingSpinner />}
        {error && <ErrorAlert error={error} />}
        {timeline.data && timeline.data.protocols.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">No protocols found for this patient.</p>
        )}

        {timeline.data && timeline.data.protocols.length > 0 && (
          <>
            {/* Legend */}
            <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-xs text-gray-600">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600">Deviation</span>
              </div>
            </div>

            {deviations.isLoading && <div className="mb-3"><LoadingSpinner /></div>}
            {deviations.error && <div className="mb-3"><ErrorAlert error={deviations.error} /></div>}

            <div className="space-y-3">
              {orderedProtocols.map((proto) => {
                const isExpanded = expandedProtocolInstanceId === proto.protocolInstanceId;
                const trackingMatch = tracking.data?.find((t) => t.protocolInstanceId === proto.protocolInstanceId);
                const title = trackingMatch?.protocolTitle || proto.protocolCanonical;
                const docArtifact = trackingMatch?.relatedArtifact?.find((a) => a.type === 'documentation');
                const thumbnailUrl = docArtifact?.extension?.find((e) => e.url === 'http://openphc.org/fhir/thumbnail')?.valueCode;
                const journeySteps = proto.journey ?? [];
                const completedCount = journeySteps.filter((s) => s.status === 'COMPLETED').length;
                const protoDeviations = (deviations.data ?? []).filter((d) => d.protocolInstanceId === proto.protocolInstanceId);
                const protoOutbound = journeySteps.filter(isReferralInitiated);
                const protoInbound = journeySteps.filter(isReferralClosed);
                const hasReferralEvents = protoOutbound.length > 0 || protoInbound.length > 0;

                return (
                  <div key={proto.protocolInstanceId} className="rounded-lg border border-gray-200">
                    <button
                      type="button"
                      onClick={() => toggleProtocolExpanded(proto.protocolInstanceId)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <svg
                          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {thumbnailUrl && (
                          <img
                            src={toDirectImageUrl(thumbnailUrl)}
                            alt={docArtifact?.display || 'Protocol thumbnail'}
                            className="h-8 w-8 flex-shrink-0 rounded object-cover border border-gray-200"
                          />
                        )}
                        <StatusBadge
                          label={proto.status}
                          color={STATUS_COLORS[proto.status as ProtocolInstanceStatus] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
                          <p className="truncate text-xs text-gray-500">
                            {proto.protocolCanonical}
                            {trackingMatch?.enrolledAt && <> · Enrolled: {formatDate(trackingMatch.enrolledAt)}</>}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-3">
                        {protoDeviations.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            {protoDeviations.length} deviation{protoDeviations.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="hidden text-xs text-gray-500 sm:inline">
                          {completedCount}/{journeySteps.length} steps
                        </span>
                        <span className="text-xs font-medium text-gray-700">{formatPercentage(proto.complianceRate)}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="space-y-6 border-t border-gray-200 px-4 py-4">
                        <div className="space-y-0">
                          {journeySteps.map((step, i, arr) => {
                            const hasDeviation = deviationActionIds.has(step.actionId);
                            const displayStatus: JourneyDisplayStatus = hasDeviation && step.status !== 'COMPLETED' && step.status !== 'SKIPPED'
                              ? 'DEVIATION'
                              : step.status;
                            const info = JOURNEY_STATUS[displayStatus] ?? JOURNEY_STATUS.NOT_STARTED;
                            const depth = step.depth ?? 0;
                            const isSubStep = depth > 0;
                            const isDeviation = displayStatus === 'DEVIATION';
                            const isNotStarted = displayStatus === 'NOT_STARTED';

                            return (
                              <div
                                key={`${proto.protocolInstanceId}-j-${i}`}
                                className={`flex gap-3 py-2.5 ${isDeviation ? 'rounded-lg bg-red-50 border border-red-200' : ''}`}
                                style={{ paddingLeft: `${depth * 24}px` }}
                              >
                                <div className="flex flex-col items-center">
                                  {isNotStarted ? (
                                    <div className="mt-1 h-3.5 w-3.5 rounded-full border-2 border-gray-300 bg-white" />
                                  ) : (
                                    <div className={`mt-1 ${isSubStep ? 'h-3 w-3' : 'h-3.5 w-3.5'} rounded-full ${info.dot}`} />
                                  )}
                                  {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-200" />}
                                </div>
                                <div className="min-w-0 pb-1 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`${isSubStep ? 'text-sm' : 'text-base'} font-semibold ${isNotStarted ? 'text-gray-400' : 'text-gray-900'}`}>{step.stepName}</p>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${info.bg} ${info.text}`}>
                                      {info.label}
                                    </span>

                                    {step.completionCount > 1 && (
                                      <span className="text-xs text-gray-400">×{step.completionCount}</span>
                                    )}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {step.dueDate && (step.status === 'MISSED' || step.status === 'OVERDUE' || step.status === 'PENDING' || step.status === 'DUE') && (
                                      <span className="text-xs text-gray-500">Due: {formatDate(step.dueDate)}</span>
                                    )}
                                    {(step.status === 'OVERDUE' || step.status === 'MISSED') && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-red-700 bg-red-100">
                                        SLA BREACHED
                                      </span>
                                    )}
                                    {step.effectiveDateTime && (
                                      <span className="text-xs text-gray-500">{formatDateTime(step.effectiveDateTime)}</span>
                                    )}
                                    {step.completionStatus && step.completionStatus !== 'ON_TIME' && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-100">
                                        LATE
                                      </span>
                                    )}
                                    {step.completionStatus === 'ON_TIME' && (
                                      <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-green-700 bg-green-100">
                                        ON TIME
                                      </span>
                                    )}
                                    {step.source && (
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getSourceColor(step.source)}`}>
                                        {getSourceLabel(step.source)}
                                      </span>
                                    )}
                                    {step.practitioner && (
                                      <span className="text-xs text-gray-500">Practitioner: {step.practitioner}</span>
                                    )}
                                    {(step.facilityName || step.facilityId) && (
                                      <span className="text-xs text-gray-500">Facility: {step.facilityName || step.facilityId}</span>
                                    )}
                                  </div>
                                  {isDeviation && step.description && (
                                    <p className="mt-1 text-xs text-red-600">{step.description}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {hasReferralEvents && (
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Referral Events</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200">
                              <div className="md:pr-4">
                                <ReferralTable title="Initiated" steps={protoOutbound} emptyLabel="No referral initiated." />
                              </div>
                              <div className="mt-4 md:mt-0 md:pl-4">
                                <ReferralTable title="Closed" steps={protoInbound} emptyLabel="No referral closure." />
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-gray-200">
                            <div className="md:pr-4">
                              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Deviations</h4>
                              {protoDeviations.length > 0 ? (
                                <div className="space-y-2">
                                  {protoDeviations.map((d) => (
                                    <div key={`dev-${d.deviationId}`} className="rounded-lg border border-gray-200 p-3">
                                      <span className={`text-xs font-bold ${d.deviationType === 'OVERDUE' ? 'text-amber-600' : d.deviationType === 'ORDER_VIOLATION' ? 'text-purple-600' : 'text-red-600'}`}>
                                        {d.deviationType === 'OVERDUE' ? '⚠' : d.deviationType === 'ORDER_VIOLATION' ? '🔀' : '🔴'} {d.deviationType}
                                      </span>
                                      <p className="mt-1 text-sm font-medium text-gray-900">{d.description || d.stepName || d.actionId || 'Unknown Step'}</p>
                                      <p className="text-xs text-gray-500">Detected: {formatDate(d.detectedAt)}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="py-3 text-center text-xs text-gray-400">No deviations found.</p>
                              )}
                            </div>

                            <div className="mt-4 md:mt-0 md:pl-4">
                              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Intelligence Alerts</h4>
                              {protoDeviations.length > 0 ? (
                                <div className="space-y-2">
                                  {protoDeviations.map((d) => (
                                    <div key={`alert-${d.deviationId}`} className="rounded-lg border border-gray-200 p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className={`text-xs font-bold ${d.deviationType === 'OVERDUE' ? 'text-amber-600' : d.deviationType === 'ORDER_VIOLATION' ? 'text-purple-600' : 'text-red-600'}`}>
                                          {d.deviationType === 'OVERDUE' ? '⚠' : d.deviationType === 'ORDER_VIOLATION' ? '🔀' : '🔴'} {d.deviationType}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-200 flex-shrink-0">
                                          ✓ Notification Sent
                                        </span>
                                      </div>
                                      <p className="mt-1 text-sm font-medium text-gray-900">{d.description || d.stepName || d.actionId || 'Unknown Step'}</p>
                                      <p className="text-xs text-gray-500">Detected: {formatDate(d.detectedAt)}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="py-3 text-center text-xs text-gray-400">No alerts found.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
