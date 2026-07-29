import { useQuery } from '@tanstack/react-query';
import {
  getDeviationTrends, getDeviationsByAction,
  getDeviationResolutionRate, getIntelligenceSummary, getDeviationKpis,
} from '../api/deviations';
import { useGlobalFilters } from './useGlobalFilters';

// RI-56: facilityId now comes exclusively from the global header filter (useGlobalFilters).
export function useDeviationKpis(protocolDefinitionId?: string) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['deviations', 'kpis', { protocolDefinitionId, ...filters }],
    queryFn: () => getDeviationKpis({
      protocolDefinitionId,
      facilityId: filters.facilityId,
      district: filters.district,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    refetchInterval: Number(import.meta.env.VITE_POLLING_INTERVAL || 60000),
  });
}

export function useDeviationTrends(interval = 'weekly', protocolDefinitionId?: string) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['deviations', 'trends', { interval, protocolDefinitionId, ...filters }],
    queryFn: () => getDeviationTrends({ interval, protocolDefinitionId, ...filters }),
  });
}

export function useDeviationsByAction(protocolDefinitionId?: string) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['deviations', 'by-action', { protocolDefinitionId, ...filters }],
    queryFn: () => getDeviationsByAction({ protocolDefinitionId, ...filters }),
  });
}

export function useDeviationResolution() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['deviations', 'resolution', filters],
    queryFn: () => getDeviationResolutionRate(filters),
  });
}

export function useIntelligenceSummary() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['deviations', 'intelligence-summary', filters],
    queryFn: () => getIntelligenceSummary(filters),
    refetchInterval: Number(import.meta.env.VITE_POLLING_INTERVAL || 60000),
  });
}
