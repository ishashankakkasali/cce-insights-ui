import { useQuery } from '@tanstack/react-query';
import { getDashboardOverview, getDashboardComplianceSummary, getDashboardHandoffs } from '../api/dashboard';
import { useGlobalFilters } from './useGlobalFilters';
import { getEnv } from '../env';

const POLLING_INTERVAL = Number(getEnv('VITE_POLLING_INTERVAL') || 60000);
// Hand-offs are polled faster, so a deviation shows on the dashboard soon after its event flows.
const HANDOFF_POLLING_INTERVAL = Number(getEnv('VITE_HANDOFF_POLLING_INTERVAL') || 10000);

export function useDashboardOverview() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['dashboard', 'overview', filters],
    queryFn: () => getDashboardOverview(filters),
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useDashboardComplianceSummary() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['dashboard', 'compliance-summary', filters.startDate, filters.endDate],
    queryFn: () => getDashboardComplianceSummary(filters),
    refetchInterval: POLLING_INTERVAL,
  });
}

export function useDashboardHandoffs() {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['dashboard', 'handoffs', filters.startDate, filters.endDate],
    queryFn: () => getDashboardHandoffs(filters),
    refetchInterval: HANDOFF_POLLING_INTERVAL,
  });
}
