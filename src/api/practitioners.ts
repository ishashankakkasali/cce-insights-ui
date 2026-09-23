import { apiGet } from './client';
import type { PractitionerRanking } from './types';

export function getPractitionerRanking(params?: {
  rankBy?: string;
  order?: string;
  limit?: number;
  startDate?: string;
  endDate?: string;
  facilityId?: string;
  protocolDefinitionId?: string;
}) {
  return apiGet<PractitionerRanking[]>('/practitioners/ranking', {
    rankBy: params?.rankBy,
    order: params?.order,
    limit: params?.limit?.toString(),
    startDate: params?.startDate,
    endDate: params?.endDate,
    facilityId: params?.facilityId,
    protocolDefinitionId: params?.protocolDefinitionId,
  });
}
