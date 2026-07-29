import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/shared/PageHeader';
import { MetricCard } from '../components/shared/MetricCard';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { useProtocolComplianceSummary } from '../hooks/useComplianceSummary';
import { useStepAnalytics, useActionOrder } from '../hooks/useProtocols';
import { useProtocols } from '../hooks/useLookups';
import { formatNumber, formatPercentage } from '../utils/formatters';
import { buildWorkflowTree } from '../utils/serviceWorkflow';

/* Collapsible sub-actions panel for the Service Workflow Compliance timeline */
function SubActionsPanel({
  children,
  titleMap,
}: {
  children: { actionId: string; totalInstances: number; completedCount: number }[];
  titleMap: Map<string, string | null>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 text-left"
      >
        <svg
          className={`h-3 w-3 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Sub-actions ({children.length})
        </span>
      </button>
      {open && (
        <div className="relative ml-2 mt-2">
          {/* Sub-action connector line */}
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-gray-200" />
          {children.map((child) => {
            const childDenom = child.totalInstances;
            const childPct = childDenom > 0 ? Math.round((child.completedCount / childDenom) * 100) : 0;
            const childLabel = titleMap.get(child.actionId) || child.actionId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const childBarColor = childPct >= 80 ? 'bg-green-500' : childPct >= 50 ? 'bg-amber-500' : 'bg-red-400';
            const childDotColor = childPct >= 80 ? 'bg-green-500' : childPct >= 50 ? 'bg-amber-500' : 'bg-red-400';
            const childPctColor = childPct >= 80 ? 'text-green-700' : childPct >= 50 ? 'text-amber-700' : 'text-red-700';

            return (
              <div key={child.actionId} className="relative flex items-start gap-3 py-1.5 pl-5">
                {/* Sub-action dot */}
                <div className={`absolute left-[2px] top-[10px] h-[8px] w-[8px] rounded-full ${childDotColor} ring-2 ring-white`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-medium text-gray-700">{childLabel}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-bold ${childPctColor}`}>{childPct}%</span>
                      <span className="text-[10px] text-gray-400">{child.completedCount}/{childDenom}</span>
                    </div>
                  </div>
                  <div className="mt-0.5 h-1 w-4/5 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${childBarColor}`} style={{ width: `${childPct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ComplianceOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  // RI-49 consistency: Protocol + Facility are URL-synced (query params are the single source of
  // truth) so the address bar reflects the current view and is shareable; deep-links
  // (?protocol=<id> / ?facility=<id>, e.g. from Facility Ranking) round-trip.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const protocolId = searchParams.get('protocol') ?? '';
  const setProtocolId = (v: string) => setParam('protocol', v);

  const protocols = useProtocols();

  // Default to the first protocol on initial load ONLY. Runs once — otherwise selecting
  // "All Protocols" (protocolId = '') would be immediately overwritten back to the first
  // protocol, so the national (all-protocols) compliant/non-compliant view could never be shown.
  const didDefaultProtocol = useRef(false);
  useEffect(() => {
    if (!didDefaultProtocol.current && !protocolId && protocols.data && protocols.data.length > 0) {
      didDefaultProtocol.current = true;
      setProtocolId(protocols.data[0].id);
    }
  }, [protocols.data, protocolId]);

  // Compliance Overview is ALWAYS Clinical Event Date based (patients with a protocol-matched event by
  // clinical event_time in range), so it reconciles with the Dashboard "Service Compliance" card. No
  // toggle — the Clinical Event Date / Enrollment radio lives only on the Patients page.
  const summary = useProtocolComplianceSummary(protocolId, 'eventTime');
  const stepAnalytics = useStepAnalytics(protocolId);
  const actionOrder = useActionOrder(protocolId);

  const data = summary.data;

  return (
    <>
      <PageHeader title="Compliance Overview" description="Protocol & facility compliance summaries" />

      <Card title="Protocol Compliance">
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Protocol</label>
            <select
              value={protocolId}
              onChange={(e) => setProtocolId(e.target.value)}
              className="w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Protocols</option>
              {protocols.data?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.url.split('/').pop()} (v{p.version})
                </option>
              ))}
            </select>
          </div>
        </div>

        {summary.isLoading && <LoadingSpinner />}
        {summary.error && <ErrorAlert error={summary.error} />}

        {data && (
          <>
            <p className="mb-3 text-xs text-gray-400">
              Compliance metrics cover patients with a protocol-matched clinical event received via HIE during the selected date range (by clinical event date, not enrollment), not a sum across days.
            </p>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricCard title="Tracked Patients" value={formatNumber(data.totalEnrollments)} description="Distinct patients with a protocol-matched clinical event received via HIE in the selected range (by event time, not enrollment)." />
              <MetricCard title="Compliant Patients" value={formatNumber(data.compliantPatients)} denomination={formatNumber(data.totalEnrollments)} description="Patients with no deviations (overdue, missed, or order violations) under this protocol." />
              <MetricCard title="Non-Compliant Patients" value={formatNumber(data.totalEnrollments - data.compliantPatients)} denomination={formatNumber(data.totalEnrollments)} description="Patients with at least one deviation (overdue, missed, or order violation) under this protocol." />
              <MetricCard title="Compliance Rate" value={formatPercentage(data.complianceRate)} description="Percentage of compliant patients out of total tracked patients under this protocol." />
            </div>

            <div className="mt-1">
              <h4 className="mb-3 text-xs font-semibold text-gray-500 uppercase">Transactions</h4>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(() => {
                  const completed = data.stepMetrics.completed ?? 0;
                  const onTime = (data.stepMetrics.onTime ?? 0) + (data.stepMetrics.early ?? 0);
                  const late = data.stepMetrics.late ?? 0;
                  const due = data.stepMetrics.due ?? 0;
                  const overdue = data.stepMetrics.overdue ?? 0;
                  const missed = data.stepMetrics.missed ?? 0;
                  const pending = data.stepMetrics.pending ?? 0;
                  const totalSteps = data.stepMetrics.totalSteps ?? 0;
                  // Carry the current protocol selection forward to the Deviations page. (Facility
                  // no longer needs carrying — it's the same global filter on both pages now.)
                  const carry = new URLSearchParams();
                  if (protocolId) carry.set('protocol', protocolId);
                  const protoQ = carry.toString();

                  const tiles = [
                    { key: 'total', label: 'Total Steps', value: totalSteps, denom: totalSteps, color: 'bg-gray-500', text: 'text-gray-800', bg: 'bg-gray-50', desc: 'Total applicable steps across all tracked patients.' },
                    { key: 'completed', label: 'Completed', value: completed, denom: totalSteps, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', sub: { onTime, late }, desc: 'Steps that have been completed (on time or late).' },
                    { key: 'due', label: 'Due', value: due, denom: totalSteps, color: 'bg-indigo-500', text: 'text-indigo-700', bg: 'bg-indigo-50', desc: 'Steps that are currently due and within the allowed window. Click to open the Deviations page.', nav: `/deviations${protoQ ? `?${protoQ}` : ''}` },
                    { key: 'overdue', label: 'Overdue', value: overdue, denom: totalSteps, color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', desc: 'Steps that have exceeded their due date but are not yet missed. Click to see the overdue deviations.', nav: `/deviations?type=OVERDUE${protoQ ? `&${protoQ}` : ''}` },
                    { key: 'missed', label: 'Missed', value: missed, denom: totalSteps, color: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', desc: 'Steps that were never completed within the allowed window. Click to see the missed deviations.', nav: `/deviations?type=MISSED${protoQ ? `&${protoQ}` : ''}` },
                    { key: 'pending', label: 'Pending', value: pending, denom: totalSteps, color: 'bg-gray-400', text: 'text-gray-700', bg: 'bg-gray-100', desc: 'Steps not yet triggered — waiting for a preceding step to complete.' },
                  ];

                  return tiles.map(({ key, label, value, denom, color, text, bg, sub, desc, nav }) => {
                    const pct = Math.round((value / (denom || 1)) * 100);
                    return (
                      <div
                        key={key}
                        onClick={nav ? () => navigate(nav) : undefined}
                        role={nav ? 'button' : undefined}
                        tabIndex={nav ? 0 : undefined}
                        onKeyDown={nav ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(nav); } } : undefined}
                        className={`rounded-lg ${bg} p-3 relative group ${nav ? 'cursor-pointer transition-shadow hover:ring-2 hover:ring-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500' : ''}`}
                      >
                        <p className={`text-2xl font-bold ${text}`}>
                          {formatNumber(value)}
                          <span className="text-sm font-normal text-gray-400">/{formatNumber(denom)}</span>
                          {key !== 'total' && (
                            <span className="ml-2 text-base font-semibold text-gray-500">({pct}%)</span>
                          )}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1">
                          <p className="text-xs font-medium text-gray-600">{label}</p>
                          {desc && (
                            <div className="relative">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-gray-400 cursor-help peer">
                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                              </svg>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 z-30 mb-2 w-48 rounded-lg border border-gray-200 bg-gray-800 px-3 py-2 text-xs text-white shadow-lg opacity-0 pointer-events-none peer-hover:opacity-100 transition-opacity">
                                {desc}
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-800" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                        {sub && (
                          <div className="mt-2 flex gap-3 border-t border-gray-200 pt-2">
                            <span className="text-[10px] text-blue-600 font-medium">On Time: {sub.onTime}</span>
                            <span className="text-[10px] text-amber-600 font-medium">Late: {sub.late}</span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Service Workflow Compliance */}
            {stepAnalytics.data && stepAnalytics.data.steps.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">Service Workflow Compliance</h4>
                </div>
                {(() => {
                  const order = actionOrder.data ?? [];
                  const titleMap = new Map(order.map((e) => [e.actionId, e.title]));
                  const labelOf = (id: string) =>
                    titleMap.get(id) || id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                  // RI-50: build the tree via the shared helper, which synthesizes a container for a
                  // parent whose only activity is a data-bearing sub-action (e.g. a referral-only
                  // journey) so that sub-action is never hidden.
                  const tree = buildWorkflowTree(stepAnalytics.data.steps, order);

                  return (
                    <div className="space-y-0 relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-[11px] top-6 bottom-6 w-0.5 bg-gray-200" />

                      {tree.map((node) => {
                        const denom = node.totalInstances;
                        const pct = denom > 0 ? Math.round((node.completedCount / denom) * 100) : 0;
                        const missing = Math.max(denom - node.completedCount, 0);
                        const label = labelOf(node.actionId);
                        const barColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                        const pctColor = pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700';
                        const dotColor = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400';

                        return (
                          <div key={node.actionId} className="relative pl-10 pb-4">
                            {/* Timeline dot - bold & bright (grey for a synthetic grouping) */}
                            <div className={`absolute left-1.5 top-5 h-4 w-4 rounded-full ${node.synthetic ? 'bg-gray-300' : dotColor} shadow-md z-10 ring-3 ring-white`} />

                            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                              {/* Header row */}
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-bold text-gray-900">{label}</h5>
                                {node.synthetic ? (
                                  <span className="text-[11px] font-medium text-gray-400">sub-actions only</span>
                                ) : (
                                  <span className={`text-lg font-bold ${pctColor}`}>{pct}%</span>
                                )}
                              </div>

                              {/* A synthetic parent has no measurement of its own — show its children only. */}
                              {!node.synthetic && (
                                <>
                                  {/* Progress bar */}
                                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                  </div>

                                  {/* Stats */}
                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                    <span className="text-gray-600">{node.completedCount} of {denom} completed</span>
                                    {missing > 0 && (
                                      <span className="text-red-500 font-medium">· {missing} missing</span>
                                    )}
                                  </div>
                                </>
                              )}

                              {/* Collapsible child steps as sub-timeline nodes */}
                              {node.children.length > 0 && (
                                <SubActionsPanel children={node.children} titleMap={titleMap} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}
