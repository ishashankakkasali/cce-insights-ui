import { useQuery } from '@tanstack/react-query';
import { getIngestionFunnel, getIngestionRejections, getSourceQuality, getPipelineLoss, getLastIngestedEvent } from '../api/ingestion';
import { useGlobalFilters } from './useGlobalFilters';

const LAST_EVENT_POLL_INTERVAL = Number(import.meta.env.VITE_POLLING_INTERVAL || 60000);

export function useIngestionFunnel(params?: { source?: string; interval?: string }) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['ingestion', 'funnel', { ...params, ...filters }],
    queryFn: () => getIngestionFunnel({ ...params, ...filters }),
  });
}

export function useIngestionRejections(params?: { source?: string }) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['ingestion', 'rejections', { ...params, ...filters }],
    queryFn: () => getIngestionRejections({ ...params, ...filters }),
  });
}

export function useSourceQuality() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['ingestion', 'source-quality', filters],
    queryFn: () => getSourceQuality(filters),
  });
}

export function usePipelineLoss() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['ingestion', 'pipeline-loss', filters],
    queryFn: () => getPipelineLoss(filters),
  });
}

/** Unfiltered by date range — always reflects the true latest ingest for pipeline freshness. */
export function useLastIngestedEvent() {
  return useQuery({
    queryKey: ['ingestion', 'last-event'],
    queryFn: () => getLastIngestedEvent(),
    refetchInterval: LAST_EVENT_POLL_INTERVAL,
  });
}
