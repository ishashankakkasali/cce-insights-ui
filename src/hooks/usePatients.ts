import { useQuery } from '@tanstack/react-query';
import {
  getPatientTimeline, getPatientProtocolTracking,
  getPatientProtocolTrackingDetail, getPatientEvents, getPatientDeviations, getPatientIntelligenceAlerts,
  getAtRiskHotspots, getRepeatDeviations,
} from '../api/patients';
import { useGlobalFilters } from './useGlobalFilters';

export function usePatientTimeline(patientId: string) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['patients', 'timeline', patientId, filters],
    queryFn: () => getPatientTimeline(patientId, filters),
    enabled: !!patientId,
  });
}

export function usePatientProtocolTracking(patientId: string) {
  return useQuery({
    queryKey: ['patients', 'tracking', patientId],
    queryFn: () => getPatientProtocolTracking(patientId),
    enabled: !!patientId,
  });
}

export function usePatientProtocolTrackingDetail(patientId: string, protocolInstanceId: string) {
  return useQuery({
    queryKey: ['patients', 'tracking', patientId, protocolInstanceId],
    queryFn: () => getPatientProtocolTrackingDetail(patientId, protocolInstanceId),
    enabled: !!patientId && !!protocolInstanceId,
  });
}

export function usePatientEvents(patientId: string, params?: { resourceType?: string; source?: string; limit?: number }) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['patients', 'events', patientId, { ...params, ...filters }],
    queryFn: () => getPatientEvents(patientId, { ...params, ...filters }),
    enabled: !!patientId,
  });
}

export function usePatientDeviations(patientId: string, params?: { deviationType?: string; skipDateFilter?: boolean }) {
  const filters = useGlobalFilters();
  const { skipDateFilter, ...restParams } = params || {};
  const effectiveFilters = skipDateFilter ? { facilityId: filters.facilityId } : filters;
  return useQuery({
    queryKey: ['patients', 'deviations', patientId, { ...restParams, ...effectiveFilters }],
    queryFn: () => getPatientDeviations(patientId, { ...restParams, ...effectiveFilters }),
    enabled: !!patientId,
  });
}

// Not date-filtered: like the journey and its deviations, the alerts belong to the whole enrolment.
export function usePatientIntelligenceAlerts(patientId: string) {
  return useQuery({
    queryKey: ['patients', 'intelligence-alerts', patientId],
    queryFn: () => getPatientIntelligenceAlerts(patientId),
    enabled: !!patientId,
  });
}

export function useAtRiskHotspots(params?: { protocolDefinitionId?: string; limit?: number }) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['patients', 'at-risk-hotspots', { ...params, ...filters }],
    queryFn: () => getAtRiskHotspots({ ...params, ...filters }),
  });
}

export function useRepeatDeviations(params?: { minDeviations?: number; protocolDefinitionId?: string; limit?: number }) {
  const filters = useGlobalFilters();
  return useQuery({
    queryKey: ['patients', 'repeat-deviations', { ...params, ...filters }],
    queryFn: () => getRepeatDeviations({ ...params, ...filters }),
  });
}
