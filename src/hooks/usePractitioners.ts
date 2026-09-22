import { useQuery } from '@tanstack/react-query';
import { getPractitionerRanking } from '../api/practitioners';
import { useGlobalFilters } from './useGlobalFilters';
import type { PractitionerRankBy, SortOrder } from '../api/types';

export function usePractitionerRanking(params?: {
  rankBy?: PractitionerRankBy;
  order?: SortOrder;
  limit?: number;
  protocolDefinitionId?: string;
}) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['practitioners', 'ranking', { ...params, ...filters }],
    queryFn: () => getPractitionerRanking({ ...params, ...filters }),
  });
}
