import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import { CHART_COLORS } from '../../utils/colors';
import type { DeviationByFacility } from '../../api/types';

type LabelPosition = { x?: string | number; y?: string | number; width?: string | number; height?: string | number };
const num = (v: string | number | undefined) => (typeof v === 'number' ? v : Number(v) || 0);

// Segment value label — suppressed for zero-width segments, which would otherwise render an
// overlapping "0" with no bar to sit inside.
function segmentLabel(props: LabelPosition & { value?: string | number }) {
  const x = num(props.x), y = num(props.y), width = num(props.width), height = num(props.height);
  const value = num(props.value);
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {value}
    </text>
  );
}

// Total label at the end of the full stack. Recharts' <LabelList> strips arbitrary props like
// `payload` before they reach a custom `content` renderer — only `value` reliably survives. So
// rather than reading payload.totalDeviations inside content (silently renders nothing), a
// `valueAccessor` computes the total AS the value beforehand — valueAccessor gets the raw entry
// (with payload intact) and only runs when no `dataKey` is set. Attached to the LAST stacked
// Bar's x + width, which for a horizontal stack is exactly the right edge of the whole bar,
// since segments accumulate left to right.
function totalLabel(props: LabelPosition & { value?: string | number }) {
  const x = num(props.x), y = num(props.y), width = num(props.width), height = num(props.height);
  return (
    <text x={x + width + 8} y={y + height / 2} fill="#111827" textAnchor="start" dominantBaseline="central" fontSize={13} fontWeight={700}>
      {props.value}
    </text>
  );
}

export type DeviationTypeFilter = '' | 'OVERDUE' | 'MISSED' | 'ORDER_VIOLATION';

interface DeviationsByFacilityChartProps {
  data: DeviationByFacility[];
  getFacilityName: (facilityId: string) => string;
  selectedType: DeviationTypeFilter;
  height?: number;
}

// Same color tokens DeviationTrendChart already uses for these 3 types on this same page —
// kept consistent rather than following the mock-up's blue-for-Order-Violation literally.
const TYPE_META: Record<Exclude<DeviationTypeFilter, ''>, { dataKey: keyof DeviationByFacility; color: string; name: string }> = {
  OVERDUE: { dataKey: 'overdueCount', color: CHART_COLORS.warning, name: 'Overdue' },
  MISSED: { dataKey: 'missedCount', color: CHART_COLORS.danger, name: 'Missed' },
  ORDER_VIOLATION: { dataKey: 'orderViolationCount', color: CHART_COLORS.orderViolation, name: 'Order Violation' },
};

export function DeviationsByFacilityChart({ data, getFacilityName, selectedType, height = 320 }: DeviationsByFacilityChartProps) {
  const chartData = data.map((d) => ({ ...d, facilityName: getFacilityName(d.facilityId) }));
  // Facility Y-axis labels need enough left margin for the longest name; Recharts doesn't
  // auto-size this, so scale roughly with name length (same approach ResourceTypeBarChart uses
  // a fixed value for, but facility names run much longer than resource types).
  const yAxisWidth = Math.min(220, Math.max(100, ...chartData.map((d) => d.facilityName.length * 6)));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} layout="vertical" margin={{ left: yAxisWidth - 100, right: 32, bottom: 28 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            label={{ value: 'Number of deviations', position: 'insideBottom', offset: -8, fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis type="category" dataKey="facilityName" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={yAxisWidth} />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          {/* Below the axis label (extra bottom margin above makes room), matching the rest of
              the page's charts (e.g. Deviation Trends), which all keep their legend at the bottom. */}
          <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 16 }} />
          {selectedType === '' ? (
            <>
              <Bar dataKey="overdueCount" stackId="deviations" fill={CHART_COLORS.warning} name="Overdue" radius={[0, 0, 0, 0]}>
                <LabelList dataKey="overdueCount" content={segmentLabel} />
              </Bar>
              <Bar dataKey="missedCount" stackId="deviations" fill={CHART_COLORS.danger} name="Missed" radius={[0, 0, 0, 0]}>
                <LabelList dataKey="missedCount" content={segmentLabel} />
              </Bar>
              <Bar dataKey="orderViolationCount" stackId="deviations" fill={CHART_COLORS.orderViolation} name="Order Violation" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="orderViolationCount" content={segmentLabel} />
                <LabelList valueAccessor={(entry: { payload?: DeviationByFacility }) => entry?.payload?.totalDeviations} content={totalLabel} />
              </Bar>
            </>
          ) : (
            // Single type selected: no separate "total" annotation needed — the segment's own
            // inline value label already is the total for that view (nothing else stacked on it).
            <Bar dataKey={TYPE_META[selectedType].dataKey} fill={TYPE_META[selectedType].color} name={TYPE_META[selectedType].name} radius={[0, 4, 4, 0]}>
              <LabelList dataKey={TYPE_META[selectedType].dataKey} content={segmentLabel} />
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
      {selectedType === '' && (
        <p className="mt-1 text-xs text-gray-400">Total deviations = Missed + Overdue + Order Violation</p>
      )}
    </div>
  );
}
