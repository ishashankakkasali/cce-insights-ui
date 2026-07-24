import { useState } from 'react';
import { PageHeader } from '../components/shared/PageHeader';
import { MetricCard } from '../components/shared/MetricCard';
import { Card } from '../components/shared/Card';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { ErrorAlert } from '../components/shared/ErrorAlert';
import { IngestionFunnelChart } from '../components/charts/IngestionFunnelChart';
import { IngestionTrendChart } from '../components/charts/IngestionTrendChart';
import { useIngestionFunnel, useIngestionRejections, useSourceQuality, usePipelineLoss, useLastIngestedEvent } from '../hooks/useIngestion';
import { formatNumber, formatPercentage } from '../utils/formatters';
import { formatDateTime, formatRelative } from '../utils/dates';
import { INTERVAL_OPTIONS } from '../config';

export default function IngestionPipeline() {
  const [interval, setInterval] = useState('weekly');
  const funnel = useIngestionFunnel({ interval });
  const rejections = useIngestionRejections();
  const quality = useSourceQuality();
  const loss = usePipelineLoss();
  const lastEvent = useLastIngestedEvent();

  return (
    <>
      <PageHeader title="Ingestion Pipeline" description="Ingestion health — acceptance/rejection funnel, rejection reasons, source quality, pipeline loss" />

      {funnel.isLoading ? <LoadingSpinner /> : funnel.error ? <ErrorAlert error={funnel.error} /> : funnel.data ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard title="Received" value={formatNumber(funnel.data.totalReceived)} description="Total number of clinical events received by the ingestion pipeline from all sources." />
            <MetricCard title="Accepted" value={formatPercentage(funnel.data.acceptanceRate)} subtitle={formatNumber(funnel.data.accepted)} description="Percentage of received events that passed validation and were accepted for processing." bgColor="bg-green-50" />
            <MetricCard title="Rejected" value={formatPercentage(funnel.data.rejectionRate)} subtitle={formatNumber(funnel.data.rejected)} description="Percentage of received events that failed validation and were rejected (malformed, missing fields, etc.)." bgColor={funnel.data.rejected > 0 ? 'bg-red-50' : undefined} />
            <MetricCard title="Duplicates" value={formatPercentage(funnel.data.duplicateRate ?? 0)} subtitle={formatNumber(funnel.data.duplicate)} description="Events identified as exact duplicates of a previously received event — not reprocessed." bgColor="bg-purple-50" />
            <MetricCard
              title="Pipeline Loss"
              value={loss.data ? formatPercentage(loss.data.lossRate) : '—'}
              subtitle={loss.data ? `${formatNumber(loss.data.lostEvents)} events` : undefined}
              description="Events accepted by the Collector but not found in the Compliance engine — indicates data loss between pipeline stages."
              bgColor={loss.data && loss.data.lostEvents > 0 ? 'bg-red-50' : undefined}
            />
            <MetricCard
              title="Last Ingested Event"
              value={lastEvent.data?.lastEventTime ? formatRelative(lastEvent.data.lastEventTime) : '—'}
              subtitle={lastEvent.data?.lastEventTime ? formatDateTime(lastEvent.data.lastEventTime) : undefined}
              description="Timestamp the collector last received an inbound event, across all sources — independent of the selected date range. Indicates whether the pipeline is actively receiving data."
            />
          </div>

          <Card title="Ingestion Funnel" className="mt-6">
            <IngestionFunnelChart data={funnel.data.breakdown} />
          </Card>

          <Card title="Ingestion Volume Trends" className="mt-6"
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
            {funnel.data.trends ? <IngestionTrendChart data={funnel.data.trends} /> : null}
          </Card>
        </>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Rejection Reasons">
          {rejections.isLoading ? <LoadingSpinner /> : rejections.error ? <ErrorAlert error={rejections.error} /> : rejections.data ? (
            rejections.data.byReason.length > 0 ? (
              <div className="space-y-2">
                {rejections.data.byReason.map((r) => (
                  <div key={r.reason} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm text-gray-700">{r.reason}</span>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${r.percentage}%` }} />
                      </div>
                    </div>
                    <span className="w-16 text-right text-xs text-gray-500">{formatPercentage(r.percentage)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-green-600">No rejections — all events accepted</p>
            )
          ) : null}
        </Card>

        <Card title="Source Quality">
          {quality.isLoading ? <LoadingSpinner /> : quality.error ? <ErrorAlert error={quality.error} /> : quality.data ? (
            quality.data.sources.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-500">
                      <th className="pb-2 pr-4">Source</th>
                      <th className="pb-2 pr-4">Total</th>
                      <th className="pb-2 pr-4">Accept</th>
                      <th className="pb-2 pr-4">Reject</th>
                      <th className="pb-2">Duplicate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quality.data.sources.map((s) => (
                      <tr key={s.source} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-900">{s.source}</td>
                        <td className="py-2 pr-4 text-gray-600">{formatNumber(s.totalEvents)}</td>
                        <td className="py-2 pr-4 text-green-600">{formatPercentage(s.acceptanceRate)}</td>
                        <td className="py-2 pr-4 text-red-600">{formatPercentage(s.rejectionRate)}</td>
                        <td className="py-2 text-purple-600">{formatPercentage(s.duplicateRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-400">No source quality data</p>
            )
          ) : null}
        </Card>
      </div>

      {loss.data && loss.data.lostEvents > 0 && (
        <Card className="mt-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-lg">⚠</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatNumber(loss.data.lostEvents)} events accepted by Collector but not found in Compliance event_log
              </p>
              <p className="text-xs text-gray-500">
                Loss rate: {formatPercentage(loss.data.lossRate)}
              </p>
              {loss.data.bySource && (
                <p className="mt-1 text-xs text-gray-500">
                  Lost by Source: {loss.data.bySource.map((s: { source: string; lostEvents: number }) => `${s.source}: ${s.lostEvents}`).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
