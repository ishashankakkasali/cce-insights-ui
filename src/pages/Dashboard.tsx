import { useMemo, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentCheckIcon,
  BuildingOffice2Icon,
  ArrowTrendingUpIcon,
  ArrowsRightLeftIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '../components/shared/PageHeader';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { rateTone, type Tone } from '../components/shared/KpiCard';
import { InfoTip } from '../components/shared/InfoTip';
import { useFacilityActivitySummary, useAdoptionKpis, useFacilityRanking } from '../hooks/useFacilities';
import { useReferralsKpi, useDashboardOverview } from '../hooks/useDashboard';
import { useDeviationKpis } from '../hooks/useDeviations';
import { formatNumber, formatPercentage } from '../utils/formatters';

const TONE_COLOR: Record<Tone, string> = {
  good: 'text-green-600',
  warn: 'text-amber-600',
  bad: 'text-red-600',
  neutral: 'text-gray-900',
};

interface Indicator {
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  value: string;
  tone: Tone;
  context: ReactNode;
  /** RI-53 — optional override for the context line size (e.g. larger active/inactive text). */
  contextClass?: string;
  /** ⓘ tooltip explaining how the KPI is derived. */
  description: string;
}

// RI-38 — the Dashboard is only high-level NATIONAL indicators. Since every indicator drills into the
// same Facilities page, the four tiles are grouped into ONE card that navigates there on click.
export default function Dashboard() {
  // Per-facility compliance rates (same cohort/rates the Facilities → Ranking page shows) — the
  // national Service Compliance Rate is the simple average of these.
  const complianceRanking = useFacilityRanking({ rankBy: 'complianceRate', order: 'desc', limit: 1000 });
  const facilities = useFacilityActivitySummary();
  const adoption = useAdoptionKpis();
  // RI-53 — "Patients Received by HIE" = distinct PROTOCOL-TRACKED patients (ACCEPTED + matched to a
  // protocol), event_time-scoped and district-filtered like the other cards. /dashboard/overview →
  // patientsReceivedHIE (backed by the shared matched-cohort query, not a raw source count).
  const overview = useDashboardOverview();
  // RI-51 — Total Referrals reads the SAME referrals-received-by-HIE KPI (event count from
  // mv_daily_referral_kpis) that the Facility Ranking "Referrals" column and the Facilities
  // "Referral Details" card use, so the three surfaces always agree. (The Compliance page's
  // "Referral" workflow step is a different, step-based metric — patients who *completed* the
  // referral step — and is intentionally not reconciled with this received count.)
  const referrals = useReferralsKpi();
  // RI-54 — Total Deviations reads the SAME totalDeviations KPI (from /deviations/kpis) that the
  // Deviations page's "Total Deviations" card uses, so the two surfaces always agree.
  const deviations = useDeviationKpis();

  // National Service Compliance Rate = simple (equal-weight) average of each facility's own
  // compliance rate across ALL in-scope facilities (facility-level aggregation, not the pooled
  // distinct-patient ratio). Every facility counts once and the divisor is the full facility count —
  // a facility with no tracked patients contributes 0%, same treatment as the Adoption Rate tile.
  const svc = useMemo(() => {
    const rows = complianceRanking.data?.data ?? [];
    const rate = rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.complianceRate, 0) / rows.length) * 10) / 10
      : 0;
    return { rate, facilities: rows.length };
  }, [complianceRanking.data]);

  // National eBuzima Adoption Rate = simple (equal-weight) average of each facility's own adoption
  // rate, exactly as shown in the Adoption breakdown table — every in-scope facility counts once.
  // (We do NOT drop facilities with a zero expected baseline: the backend still gives them a defined
  // rate — 0% when not reporting, 100% when reporting above a zero baseline — so excluding them would
  // wipe out the whole average in environments where no baseline is configured.)
  const adopt = useMemo(() => {
    const rows = adoption.data ?? [];
    const rate = rows.length > 0
      ? Math.round((rows.reduce((s, f) => s + f.adoptionRate, 0) / rows.length) * 10) / 10
      : 0;
    return { rate, facilities: rows.length };
  }, [adoption.data]);

  const f = facilities.data;
  const loading = complianceRanking.isLoading || facilities.isLoading || adoption.isLoading || referrals.isLoading || overview.isLoading || deviations.isLoading;

  // RI-54 — order: Patients Received by HIE, Total Facilities, eBuzima Adoption Rate,
  // Service Compliance Rate, Total Referrals, Total Deviations.
  const indicators: Indicator[] = [
    {
      icon: UserGroupIcon,
      iconClass: 'bg-sky-50 text-sky-600',
      title: 'Patients Received by HIE',
      value: formatNumber(overview.data?.patientsReceivedHIE ?? 0),
      tone: 'neutral',
      context: 'distinct protocol-tracked patients',
      description: 'Distinct patients whose events were received via HIE and matched to a protocol (event_time-scoped, district-filtered).',
    },
    {
      icon: BuildingOffice2Icon,
      iconClass: 'bg-blue-50 text-blue-600',
      title: 'Total Facilities',
      value: formatNumber(f?.totalInScope ?? 0),
      tone: 'neutral',
      // RI-53 — larger active/inactive breakdown, colour-coded (active = green, inactive = red).
      context: f ? (
        <>
          <span className="font-semibold text-green-600">{formatNumber(f.activeFacilities)} active</span>
          <span className="text-gray-400"> · </span>
          <span className="font-semibold text-red-600">{formatNumber(f.inactiveFacilities)} inactive</span>
        </>
      ) : '',
      contextClass: 'text-base',
      description: 'Facilities in scope for the selected district. Active = reported activity in the selected period; inactive = none.',
    },
    {
      icon: ArrowTrendingUpIcon,
      iconClass: 'bg-violet-50 text-violet-600',
      title: 'eBuzima Adoption Rate',
      value: formatPercentage(adopt.rate),
      tone: rateTone(adopt.rate),
      context: `avg across ${formatNumber(adopt.facilities)} ${adopt.facilities === 1 ? 'facility' : 'facilities'}`,
      description: "Simple (equal-weight) average of each facility's e-Buzima adoption rate (actual ÷ expected visits) over the selected period.",
    },
    {
      icon: ClipboardDocumentCheckIcon,
      iconClass: 'bg-emerald-50 text-emerald-600',
      title: 'Service Compliance Rate',
      value: formatPercentage(svc.rate),
      tone: rateTone(svc.rate),
      context: `avg across ${formatNumber(svc.facilities)} ${svc.facilities === 1 ? 'facility' : 'facilities'}`,
      description: "Simple (equal-weight) average of each in-scope facility's own compliance rate — every facility counts once.",
    },
    {
      icon: ArrowsRightLeftIcon,
      iconClass: 'bg-amber-50 text-amber-600',
      title: 'Total Referrals',
      value: formatNumber(referrals.data?.totalReferralsReceived ?? 0),
      tone: 'neutral',
      context: 'referrals received by HIE',
      description: 'Referral events received by HIE in the selected period (by event_time). Same source as the Facility Ranking Referrals column.',
    },
    {
      icon: ExclamationTriangleIcon,
      iconClass: 'bg-red-50 text-red-600',
      title: 'Total Deviations',
      value: formatNumber(deviations.data?.totalDeviations ?? 0),
      tone: 'neutral',
      context: 'protocol deviations detected',
      description: 'Distinct deviations detected during the selected period (counted from the deviation table, no double-counting across snapshot days). Same source as the Deviations page.',
    },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description="High-level national indicators for the selected period" />

      {complianceRanking.error && <ErrorAlert error={complianceRanking.error} />}

      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">National Indicators</p>

      {/* One card grouping all indicators — clicking anywhere navigates to the Facilities page. */}
      <Link
        to="/facilities"
        className="group block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {/* RI-54 — 6 indicators on a uniform 3-column grid (equal widths, columns align across
            both rows): 3 on top, 3 on the second row. Cells are separated by hairline dividers
            (left border on non-first columns, top border on row 2). */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {indicators.map(({ icon: Icon, iconClass, title, value, tone, context, contextClass, description }, i) => (
            <div
              key={title}
              className={[
                'flex flex-col py-4 lg:py-5',
                i % 3 !== 0 ? 'lg:border-l lg:border-gray-100 lg:pl-6' : '',
                i >= 3 ? 'lg:border-t lg:border-gray-100' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between pr-1">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <InfoTip text={description} />
              </div>
              <p className="mt-4 text-base font-semibold text-gray-600">{title}</p>
              <p className={`mt-1.5 text-5xl font-bold tabular-nums ${loading ? 'text-gray-300' : TONE_COLOR[tone]}`}>
                {loading ? '—' : value}
              </p>
              <p className={`mt-2 min-h-[18px] ${contextClass ?? 'text-sm text-gray-500'}`}>{loading ? '' : context}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end border-t border-gray-100 pt-3">
          <span className="text-xs font-semibold text-blue-600 opacity-70 transition-opacity group-hover:opacity-100">
            View facilities <span aria-hidden="true">&rarr;</span>
          </span>
        </div>
      </Link>
    </>
  );
}
