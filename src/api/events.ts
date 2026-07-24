import { apiGet, apiGetPaginated } from './client';
import type {
  EventVolumeSummary, EventVolumeTrend, ResourceTypeCount,
  FacilityEventCount, EventKpis, ZeroMatchEvent,
} from './types';

export function getEventSummary(params?: {
  facilityId?: string;
  source?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<EventVolumeSummary> {
  return apiGet('/events/summary', params);
}

export function getEventTrends(params?: {
  interval?: string;
  resourceType?: string;
  facilityId?: string;
  source?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<EventVolumeTrend> {
  return apiGet('/events/trends', params);
}

export function getEventsByResourceType(params?: {
  facilityId?: string;
  source?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ResourceTypeCount[]> {
  return apiGet('/events/by-resource-type', params);
}

export function getEventsByFacility(params?: {
  resourceType?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}) {
  return apiGetPaginated<FacilityEventCount>('/events/by-facility', {
    resourceType: params?.resourceType,
    district: params?.district,
    startDate: params?.startDate,
    endDate: params?.endDate,
    limit: params?.limit?.toString(),
    cursor: params?.cursor,
  });
}

export function getEventKpis(): Promise<EventKpis> {
  return apiGet('/events/kpis');
}

export function getZeroMatchEvents(params?: {
  facilityId?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ZeroMatchEvent[]> {
  return apiGet('/events/zero-match', params);
}
