import type { HandoffMetric } from '../../api/dashboard';
import { formatNumber, formatPercentage } from '../../utils/formatters';
import { MetricCard } from './MetricCard';

/**
 * Referral hand-off deviations: one card per hand-off of the referral pathway, in order, like the other dashboard
 * metrics: how many missed their time limit (done late, or still not done past it), out of those due.
 */
export function HandoffMetrics({ handoffs }: { handoffs: HandoffMetric[] }) {
  if (handoffs.length === 0) {
    return <p className="py-2 text-sm text-gray-500">No referral hand-offs are configured.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {handoffs.map((h) => {
        const due = h.total - h.pending;
        return (
          <div key={h.key} data-testid={`handoff-${h.key}`}>
            <MetricCard
              title={h.label}
              subtitle={due > 0 ? `${formatPercentage(100 - h.deviationRate)} on time` : 'None due yet'}
              description={h.description}
              value={formatNumber(h.deviations)}
              denomination={formatNumber(due)}
              bgColor={h.deviations > 0 ? 'bg-red-50' : due > 0 ? 'bg-green-50' : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
