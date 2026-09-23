import { PageHeader } from '../components/shared/PageHeader';
import { MetricCard } from '../components/shared/MetricCard';
import { Card } from '../components/shared/Card';
import { StatusBadge } from '../components/shared/StatusBadge';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { DeviationTrendChart } from '../components/charts/DeviationTrendChart';
import { EventTrendChart } from '../components/charts/EventTrendChart';
import { useEventTrends } from '../hooks/useEventVolume';
import { useDeviationTrends } from '../hooks/useDeviations';
import { useDashboardOverview, useDashboardComplianceSummary } from '../hooks/useDashboard';
import { formatNumber, formatPercentage } from '../utils/formatters';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const deviationTrends = useDeviationTrends('daily');
  const eventTrends = useEventTrends('daily');
  const overview = useDashboardOverview();
  const complianceSummary = useDashboardComplianceSummary();

  const isLoading = overview.isLoading || complianceSummary.isLoading;

  if (isLoading) return <LoadingSpinner />;

  const firstError = overview.error || complianceSummary.error;
  if (firstError) return <ErrorAlert error={firstError} />;

  const dash = overview.data;
  const compliance = complianceSummary.data;

  const patients = compliance?.patients;
  const facilities = compliance?.facilities;
  const practitioners = compliance?.practitioners;
  const consent = compliance?.consent;

  return (
    <>
      <PageHeader title="Dashboard" description="High-level operational metrics and trend snapshots" />

      {/* Patient Compliance Metrics */}
      <div className="rounded-xl border border-gray-200 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tracked Cohort"
          description="Total patients enrolled and tracked across all protocols."
          value={formatNumber(patients?.trackedPatients ?? 0)}
        />
        <MetricCard
          title="Compliant Care Journeys"
          description="Patients with no active deviations across all protocols."
          value={formatNumber(patients?.compliantPatients ?? 0)}
          denomination={formatNumber(patients?.trackedPatients ?? 0)}
        />
        <MetricCard
          title="Non-Compliant Care Journeys"
          description="Patients with at least one active deviation across all protocols."
          value={formatNumber(patients?.nonCompliantPatients ?? 0)}
          denomination={formatNumber(patients?.trackedPatients ?? 0)}
        />
        <MetricCard
          title="Compliance Rate"
          description="Percentage of compliant patients out of total tracked patients."
          value={formatPercentage(patients?.complianceRate ?? 0)}
        />
      </div>
      </div>

      {/* Consent Metrics — Tiberbu (Kenya SHA protocol) specific */}
      <div className="mt-4 rounded-xl border border-gray-200 p-4">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700">Consent Metrics</h3>
        <StatusBadge label="Tiberbu" color={{ bg: 'bg-blue-50', text: 'text-blue-700' }} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Consents Received"
          description="Consent-request steps completed (patient consent requested)."
          value={formatNumber(consent?.totalReceived ?? 0)}
        />
        <MetricCard
          title="Total Consents Verified"
          description="Consent-verification steps completed (2nd step of the consent flow)."
          value={formatNumber(consent?.totalVerified ?? 0)}
          denomination={formatNumber(consent?.totalReceived ?? 0)}
        />
        <MetricCard
          title="Consent Verification Rate"
          description="Percentage of received consents that have gone on to be verified."
          value={formatPercentage(consent?.verificationRate ?? 0)}
        />
      </div>
      </div>

      {/* Facility Compliance Metrics */}
      <div className="mt-4 rounded-xl border border-gray-200 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tracked Facilities"
          description="Total healthcare facilities being tracked across all protocols."
          value={formatNumber(facilities?.trackedFacilities ?? 0)}
        />
        <MetricCard
          title="> 90% Compliance"
          description="Facilities with compliance rate above 90%."
          value={formatNumber(facilities?.above90 ?? 0)}
          denomination={formatNumber(facilities?.trackedFacilities ?? 0)}
          bgColor="bg-green-50"
        />
        <MetricCard
          title="75–90% Compliance"
          description="Facilities with compliance rate between 75% and 90%."
          value={formatNumber(facilities?.between75And90 ?? 0)}
          denomination={formatNumber(facilities?.trackedFacilities ?? 0)}
          bgColor="bg-amber-50"
        />
        <MetricCard
          title="< 75% Compliance"
          description="Facilities with compliance rate below 75%."
          value={formatNumber(facilities?.below75 ?? 0)}
          denomination={formatNumber(facilities?.trackedFacilities ?? 0)}
          bgColor="bg-red-50"
        />
      </div>
      </div>

      {/* Top & Bottom Facilities */}
      {dash && (dash.topFacilities?.length > 0 || dash.bottomFacilities?.length > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Top 3 Facilities" subtitle="by compliance rate">
            <div className="space-y-3">
              {dash.topFacilities?.map((f, i) => (
                <FacilityRow key={f.facilityId} facility={f} index={i} variant="top" />
              ))}
              {(!dash.topFacilities || dash.topFacilities.length === 0) && (
                <p className="py-4 text-center text-sm text-gray-500">No facility data available</p>
              )}
            </div>
          </Card>
          <Card title="Bottom 3 Facilities" subtitle="by compliance rate">
            <div className="space-y-3">
              {dash.bottomFacilities?.map((f, i) => (
                <FacilityRow key={f.facilityId} facility={f} index={i} variant="bottom" />
              ))}
              {(!dash.bottomFacilities || dash.bottomFacilities.length === 0) && (
                <p className="py-4 text-center text-sm text-gray-500">No facility data available</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Practitioner Compliance Metrics */}
      <div className="mt-4 rounded-xl border border-gray-200 p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tracked Practitioners"
          description="Total practitioners involved in patient care across all protocols."
          value={formatNumber(practitioners?.trackedPractitioners ?? 0)}
        />
        <MetricCard
          title="> 90% Compliance"
          description="Practitioners with compliance rate above 90%."
          value={formatNumber(practitioners?.above90 ?? 0)}
          denomination={formatNumber(practitioners?.trackedPractitioners ?? 0)}
          bgColor="bg-green-50"
        />
        <MetricCard
          title="75–90% Compliance"
          description="Practitioners with compliance rate between 75% and 90%."
          value={formatNumber(practitioners?.between75And90 ?? 0)}
          denomination={formatNumber(practitioners?.trackedPractitioners ?? 0)}
          bgColor="bg-amber-50"
        />
        <MetricCard
          title="< 75% Compliance"
          description="Practitioners with compliance rate below 75%."
          value={formatNumber(practitioners?.below75 ?? 0)}
          denomination={formatNumber(practitioners?.trackedPractitioners ?? 0)}
          bgColor="bg-red-50"
        />
      </div>
      </div>

      {/* Trend Charts */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Deviation Trends">
          {deviationTrends.isLoading ? (
            <LoadingSpinner />
          ) : deviationTrends.data ? (
            <DeviationTrendChart data={deviationTrends.data.trends} height={240} />
          ) : null}
        </Card>
        <Card title="Event Volume">
          {eventTrends.isLoading ? (
            <LoadingSpinner />
          ) : eventTrends.data ? (
            <EventTrendChart data={eventTrends.data.trends} height={240} />
          ) : null}
        </Card>
      </div>
    </>
  );
}

function FacilityRow({ facility, index, variant }: {
  facility: { facilityId: string; facilityName?: string; complianceRate: number; activeDeviations: number; totalEvents: number; totalEnrollments: number };
  index: number;
  variant: 'top' | 'bottom';
}) {
  const Icon = variant === 'top' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const accentColor = variant === 'top' ? 'text-green-600' : 'text-red-600';
  const badgeBg = variant === 'top' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700';

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${badgeBg}`}>
          {index + 1}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-800">{facility.facilityName || facility.facilityId}</p>
          <p className="text-xs text-gray-500">{formatNumber(facility.totalEvents)} events · {formatNumber(facility.activeDeviations)} deviations</p>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs">
        <div className="text-center">
          <p className="text-gray-500">Enrollments</p>
          <p className="font-semibold text-gray-700">{formatNumber(facility.totalEnrollments)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Events</p>
          <p className="font-semibold text-gray-700">{formatNumber(facility.totalEvents)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Compliance</p>
          <div className="flex items-center justify-center gap-1">
            <Icon className={`h-4 w-4 ${accentColor}`} />
            <span className={`font-semibold ${accentColor}`}>
              {formatPercentage(facility.complianceRate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
