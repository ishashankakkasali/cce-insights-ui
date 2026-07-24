import { apiGet } from './client';
import type { IngestionFunnel, RejectionAnalytics, SourceDataQuality, PipelineLoss, LastIngestedEvent } from './types';

export function getIngestionFunnel(params?: {
  facilityId?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  interval?: string;
}): Promise<IngestionFunnel> {
  return apiGet('/ingestion/funnel', params);
}

export function getIngestionRejections(params?: {
  facilityId?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
}): Promise<RejectionAnalytics> {
  return apiGet('/ingestion/rejections', params);
}

export function getSourceQuality(params?: {
  facilityId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<SourceDataQuality> {
  return apiGet('/ingestion/source-quality', params);
}

export function getPipelineLoss(params?: {
  facilityId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<PipelineLoss> {
  return apiGet('/ingestion/pipeline-loss', params);
}

export function getLastIngestedEvent(): Promise<LastIngestedEvent> {
  return apiGet('/ingestion/last-event');
}
