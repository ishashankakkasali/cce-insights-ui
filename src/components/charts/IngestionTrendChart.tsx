import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface IngestionTrendChartProps {
  data: { period: string; total: number; byStatus: Record<string, number> }[];
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  DUPLICATE: '#9ca3af',
};

const ALL_STATUSES = ['ACCEPTED', 'REJECTED', 'DUPLICATE'];

export function IngestionTrendChart({ data, height = 280 }: IngestionTrendChartProps) {
  const [view, setView] = useState<'combined' | 'byStatus'>('combined');
  const statuses = ALL_STATUSES.filter((s) => data.some((d) => (d.byStatus ?? {})[s] !== undefined));

  return (
    <div>
      <div className="flex justify-end gap-1 mb-2">
        {(['combined', 'byStatus'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
              view === v
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {v === 'combined' ? 'Combined' : 'By Status'}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <XAxis dataKey="period" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50} />
          <Tooltip />
          <Legend />
          {view === 'combined' ? (
            <Line
              type="monotone"
              dataKey="total"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Total Received"
            />
          ) : (
            statuses.map((status) => (
              <Line
                key={status}
                type="monotone"
                dataKey={`byStatus.${status}`}
                stroke={STATUS_COLORS[status]}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={status.charAt(0) + status.slice(1).toLowerCase()}
              />
            ))
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
