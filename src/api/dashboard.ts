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

export interface DashboardComplianceSummary {
  patients: ComplianceMetric;
  facilities: FacilityComplianceMetric;
  practitioners: PractitionerComplianceMetric;
}

export function getDashboardOverview(params?: {
  facilityId?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DashboardOverview> {
  return apiGet('/dashboard/overview', params);
}

export function getDashboardComplianceSummary(params?: {
  startDate?: string;
  endDate?: string;
  facilityId?: string;
}): Promise<DashboardComplianceSummary> {
  return apiGet('/dashboard/compliance-summary', params);
}

/**
 * Referrals KPI — per-facility count of referral forms successfully received by
 * HIE plus the total, filtered by inbound event {@code event_time}. Backed by
 * {@code GET /v1/insights/dashboard/referrals}.
 */
export interface FacilityReferralCount {
  facilityId: string;
  facilityName: string;
  /** Facility's district (may be empty). */
  district: string;
  /** Referrals received by HIE. */
  count: number;
  /** Compliant (matched to a care journey). */
  compliant: number;
  /** Non-compliant (received - matched). */
  nonCompliant: number;
  /** Compliant as a percentage of received. */
  complianceRate: number;
}

export interface ReferralsKpi {
  totalReferralsReceived: number;
  /** Of those received, matched to a Referral step ("compliant"). */
  compliantReferrals: number;
  /** Received but not matched to a care journey ("non-compliant"). */
  nonCompliantReferrals: number;
  /** Compliant as a percentage of received. */
  referralComplianceRate: number;
  byFacility: FacilityReferralCount[];
}

export function getReferralsKpi(params?: {
  facilityId?: string;
  district?: string;
  startDate?: string;
  endDate?: string;
}): Promise<ReferralsKpi> {
  return apiGet('/dashboard/referrals', params);
}
