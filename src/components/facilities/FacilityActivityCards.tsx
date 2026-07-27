import { MetricCard } from '../shared/MetricCard';
import { Card } from '../shared/Card';
import { ErrorAlert } from '../shared/ErrorAlert';
import { useFacilityActivitySummary } from '../../hooks/useFacilities';
import { formatNumber } from '../../utils/formatters';

export type FacilityStatusFilter = 'all' | 'active' | 'inactive';

/**
 * Facility Status: Total / Active / Inactive indicators. Active and Inactive are clickable and act
 * as a filter on the Facility Ranking table below (state lifted to the page). Clicking the selected
 * indicator again — or Total — clears the filter back to all facilities. (The previous per-indicator
 * drill-down list was removed; the ranking table is now the single facility list.)
 */
export function FacilityActivityCards({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: FacilityStatusFilter;
  onChange: (s: FacilityStatusFilter) => void;
}) {
  const summary = useFacilityActivitySummary();

  const cardValue = (n: number | undefined) =>
    summary.isLoading ? '…' : summary.error ? '—' : formatNumber(n ?? 0);

  // Toggle a filter: clicking the active one again clears back to "all".
  const pick = (s: FacilityStatusFilter) => onChange(value === s ? 'all' : s);

  return (
    <Card
      title="Facility Status"
      description="Active vs inactive facilities for the selected period. Click Active or Inactive to filter the Facility Ranking below."
      className={className}
    >
      {summary.error && <ErrorAlert error={summary.error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Facilities"
          description="All in-scope healthcare facilities in the facility reference list."
          value={cardValue(summary.data?.totalInScope)}
          onClick={() => onChange('all')}
          selected={value === 'all'}
        />
        <MetricCard
          title="Active Facilities"
          description="Facilities with at least one accepted HIE event within the selected period, regardless of whether the event was matched to a protocol. Click to show only these in the ranking."
          value={cardValue(summary.data?.activeFacilities)}
          bgColor="bg-green-50"
          onClick={() => pick('active')}
          selected={value === 'active'}
        />
        <MetricCard
          title="Inactive Facilities"
          description="In-scope facilities with no accepted HIE events within the selected period. Click to show only these in the ranking."
          value={cardValue(summary.data?.inactiveFacilities)}
          bgColor="bg-red-50"
          onClick={() => pick('inactive')}
          selected={value === 'inactive'}
        />
      </div>
    </Card>
  );
}
