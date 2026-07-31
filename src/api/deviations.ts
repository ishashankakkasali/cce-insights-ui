import { apiGet, apiGetPaginated } from './client';
import type {
  DeviationRecord, DeviationTrend, DeviationByAction, DeviationByFacility,
  DeviationResolution, IntelligenceSummary, DeviationKpis,
} from './types';

export function getDeviationKpis(params?: {
  protocolDefinitionId?: string;
  facilityId?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DeviationKpis> {
  return apiGet('/deviations/kpis', {
    protocolDefinitionId: params?.protocolDefinitionId,
    facilityId: params?.facilityId,
    district: params?.district,
    startDate: params?.startDate,
    endDate: params?.endDate,
  });
}

export function getDeviations(params?: {
  deviationType?: string;
  facilityId?: string;
  district?: string;
  protocolDefinitionId?: string;
  startDate?: string;
  endDate?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}) {
  return apiGetPaginated<DeviationRecord>('/deviations', {
    deviationType: params?.deviationType,
    facilityId: params?.facilityId,
    district: params?.district,
    protocolDefinitionId: params?.protocolDefinitionId,
    startDate: params?.startDate,
    endDate: params?.endDate,
    sort: params?.sort,
    limit: params?.limit?.toString(),
    cursor: params?.cursor,
  });
}

export function getDeviationTrends(params?: {
  interval?: string;
  facilityId?: string;
  district?: string;
  protocolDefinitionId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DeviationTrend> {
  return apiGet('/deviations/trends', {
    interval: params?.interval,
    facilityId: params?.facilityId,
    district: params?.district,
    protocolDefinitionId: params?.protocolDefinitionId,
    startDate: params?.startDate,
    endDate: params?.endDate,
  });
}

export function getDeviationsByAction(params?: {
  protocolDefinitionId?: string;
  deviationType?: string;
  facilityId?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<DeviationByAction[]> {
  return apiGet('/deviations/by-action', {
    protocolDefinitionId: params?.protocolDefinitionId,
    deviationType: params?.deviationType,
    facilityId: params?.facilityId,
    district: params?.district,
    startDate: params?.startDate,
    endDate: params?.endDate,
    limit: params?.limit?.toString(),
  });
}

export function getDeviationsByFacility(params?: {
  facilityId?: string;
  district?: string;
  protocolDefinitionId?: string;
  startDate?: string;
  endDate?: string;
  deviationType?: string;
  limit?: number;
  cursor?: string;
}) {
  return apiGetPaginated<DeviationByFacility>('/deviations/by-facility', {
    facilityId: params?.facilityId,
    district: params?.district,
    protocolDefinitionId: params?.protocolDefinitionId,
    startDate: params?.startDate,
    endDate: params?.endDate,
    deviationType: params?.deviationType,
    limit: params?.limit?.toString(),
    cursor: params?.cursor,
  });
}

export function getDeviationResolutionRate(params?: {
  protocolDefinitionId?: string;
  facilityId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DeviationResolution> {
  return apiGet('/deviations/resolution-rate', {
    protocolDefinitionId: params?.protocolDefinitionId,
    facilityId: params?.facilityId,
    startDate: params?.startDate,
    endDate: params?.endDate,
  });
}

export function getIntelligenceSummary(params?: {
  startDate?: string;
  endDate?: string;
  facilityId?: string;
}): Promise<IntelligenceSummary> {
  return apiGet('/deviations/intelligence-summary', {
    startDate: params?.startDate,
    endDate: params?.endDate,
    facilityId: params?.facilityId,
  });
}
