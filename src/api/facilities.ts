import { apiGet, apiGetPaginated } from './client';
import { toLocalDateParam } from '../utils/dates';
import type {
  FacilityRanking, RankBy, SortOrder,
  FacilityActivitySummary, FacilityActivityItem, FacilityReference, AdoptionKpi,
} from './types';

export function getFacilityActivitySummary(params?: {
  startDate?: string;
  endDate?: string;
  facilityId?: string;
  district?: string;
}): Promise<FacilityActivitySummary> {
  return apiGet('/facilities/activity-summary', {
    startDate: toLocalDateParam(params?.startDate),
    endDate:   toLocalDateParam(params?.endDate),
    facilityId: params?.facilityId,
    district: params?.district,
  });
}

export function getFacilityReference(): Promise<FacilityReference[]> {
  return apiGet('/facilities/reference');
}

export function getFacilityActivityDetail(params?: {
  startDate?: string;
  endDate?: string;
  district?: string;
}): Promise<FacilityActivityItem[]> {
  return apiGet('/facilities/activity-detail', {
    startDate: toLocalDateParam(params?.startDate),
    endDate:   toLocalDateParam(params?.endDate),
    district: params?.district,
  });
}

// The adoption endpoint accepts plain LocalDate (YYYY-MM-DD), not ISO datetime.
// Convert the ISO strings the global filters provide to the selected calendar date.
export function getAdoptionKpis(params?: {
  startDate?: string;
  endDate?: string;
  facilityId?: string;
  district?: string;
}): Promise<AdoptionKpi[]> {
  return apiGet('/facilities/adoption', {
    startDate: toLocalDateParam(params?.startDate),
    endDate:   toLocalDateParam(params?.endDate),
    facilityId: params?.facilityId,
    district: params?.district,
  });
}

export function getFacilityRanking(params?: {
  protocolDefinitionId?: string;
  facilityId?: string;
  district?: string;
  rankBy?: RankBy;
  order?: SortOrder;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}) {
  return apiGetPaginated<FacilityRanking>('/facilities/ranking', {
    protocolDefinitionId: params?.protocolDefinitionId,
    facilityId: params?.facilityId,
    district: params?.district,
    rankBy: params?.rankBy,
    order: params?.order,
    startDate: toLocalDateParam(params?.startDate),
    endDate: toLocalDateParam(params?.endDate),
    limit: params?.limit?.toString(),
    cursor: params?.cursor,
  });
}
