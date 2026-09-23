import { apiGet } from './client';
import type { FacilityRanking } from './types';

export interface DashboardOverview {
  totalPatientsEBuzima: number;
  patientsReceivedHIE: number;
  transmissionRate: number;
  activeFacilities: number;
  activeDeviations: number;
  newDeviations24h: number;
  hieEventCount: number;
  topFacilities: FacilityRanking[];
  bottomFacilities: FacilityRanking[];
}

export interface ComplianceMetric {
  trackedPatients: number;
  compliantPatients: number;
  nonCompliantPatients: number;
  complianceRate: number;
}

export interface FacilityComplianceMetric {
  trackedFacilities: number;
  above90: number;
  between75And90: number;
  below75: number;
}

export interface PractitionerComplianceMetric {
  trackedPractitioners: number;
  above90: number;
  between75And90: number;
  below75: number;
}

export interface ConsentComplianceMetric {
  totalReceived: number;
  totalVerified: number;
  verificationRate: number;
}

export interface DashboardComplianceSummary {
  patients: ComplianceMetric;
  facilities: FacilityComplianceMetric;
  practitioners: PractitionerComplianceMetric;
  consent: ConsentComplianceMetric;
}

export function getDashboardOverview(params?: {
  facilityId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DashboardOverview> {
  return apiGet('/dashboard/overview', params);
}

export function getDashboardComplianceSummary(): Promise<DashboardComplianceSummary> {
  return apiGet('/dashboard/compliance-summary');
}
