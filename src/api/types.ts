// ─── Lookups ─────────────────────────────────────────────────

export interface ProtocolLookup {
  id: string;
  url: string;
  version: string;
  canonical: string;
  status: string;
  title?: string;
}

// ─── Response Envelopes ──────────────────────────────────────

export interface ErrorResponse {
  code: string;
  message: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    next_cursor: string | null;
    has_more: boolean;
    total_count?: number;
  };
}

// ─── Global Filters ──────────────────────────────────────────

export interface GlobalFilters {
  startDate?: string;
  endDate?: string;
  facilityId?: string;
  district?: string;
}

// ─── Compliance Summaries ────────────────────────────────────

export interface ComplianceSummary {
  protocolDefinitionId: string;
  protocolCanonical: string;
  totalEnrollments: number;
  compliantPatients: number;
  statusBreakdown: {
    active: number;
    completed: number;
    withdrawn: number;
    expired: number;
  };
  complianceRate: number;
  stepMetrics: {
    totalSteps: number;
    completed: number;
    onTime: number;
    late: number;
    early: number;
    overdue: number;
    missed: number;
    due: number;
    pending: number;
  };
  deviationCount: number;
  deviationBreakdown: {
    overdue: number;
    missed: number;
    orderViolation: number;
  };
}

export interface FacilitySummary {
  facilityId: string;
  totalPatients: number;
  totalEnrollments: number;
  overallComplianceRate: number;
  protocolBreakdown: {
    protocolDefinitionId: string;
    protocolCanonical: string;
    enrollments: number;
    complianceRate: number;
    activeDeviations: number;
  }[];
}

export interface PatientCompliance {
  patientId: string;
  protocolInstanceId: string;
  protocolCanonical: string;
  enrolledAt: string;
  status: ProtocolInstanceStatus;
  complianceRate: number;
  /** `on_track` = no deviations; `non_compliant` = at least one deviation (matches dashboard). */
  complianceCategory: ComplianceCategory;
  stepsCompleted: number;
  totalSteps: number;
  activeDeviations: number;
  facilityId: string;
}

export type ProtocolInstanceStatus = 'ACTIVE' | 'COMPLETED' | 'WITHDRAWN' | 'EXPIRED';
export type ComplianceCategory = 'on_track' | 'non_compliant';

// ─── Patient Compliance ──────────────────────────────────────

export interface PatientTimeline {
  patientId: string;
  protocols: {
    protocolInstanceId: string;
    protocolCanonical: string;
    status: ProtocolInstanceStatus;
    complianceRate: number;
    journey: JourneyStep[];
    timeline: TimelineEntry[];
  }[];
}

export interface JourneyStep {
  actionId: string;
  parentActionId?: string;
  stepName: string;
  status: 'COMPLETED' | 'PENDING' | 'NOT_STARTED' | 'OVERDUE' | 'MISSED' | 'SKIPPED' | 'DUE';
  completionCount: number;
  effectiveDateTime?: string;
  dueDate?: string;
  completionStatus?: CompletionStatus;
  source?: string;
  practitioner?: string;
  facilityId?: string;
  facilityName?: string;
  requiredBehavior?: 'must' | 'could';
  depth?: number;
  description?: string;
}

export interface TimelineEntry {
  timestamp: string;
  type: 'enrollment' | 'step_completed' | 'step_overdue' | 'step_missed' | 'step_due' | 'step_pending' | 'step_skipped';
  description?: string;
  actionId?: string;
  stepName?: string;
  state?: StepState | 'ENROLLED';
  completionStatus?: CompletionStatus;
  source?: string;
  daysOverdue?: number;
  effectiveDateTime?: string;
}

export interface RelatedArtifactExtension {
  url: string;
  valueCode: string;
}

export interface RelatedArtifact {
  type: string;
  label: string;
  display: string;
  url: string;
  extension?: RelatedArtifactExtension[];
}

export interface ProtocolTracking {
  protocolInstanceId: string;
  protocolCanonical: string;
  protocolTitle?: string;
  relatedArtifact?: RelatedArtifact[];
  enrolledAt: string;
  status: ProtocolInstanceStatus;
  complianceRate: number;
  stepsCompleted: number;
  totalSteps: number;
}

export interface ProtocolTrackingDetail {
  protocolInstanceId: string;
  patientId: string;
  protocolCanonical: string;
  protocolDefinitionId?: string;
  status: ProtocolInstanceStatus;
  enrolledAt: string;
  complianceRate: number;
  steps: StepInstance[];
  deviations: DeviationRecord[];
}

export interface PatientIntelligenceDelivery {
  id: string;
  actionType: string;
  status: string;
  severity: string | null;
  destination: string | null;
  protocolCanonical: string | null;
  actionId: string | null;
  attemptCount: number;
  createdAt: string;
  deliveredAt: string | null;
}

export interface StepInstance {
  stepInstanceId: string;
  actionId: string;
  state: StepState;
  dueDate: string | null;
  overdueDate: string | null;
  missedDate: string | null;
  completedAt: string | null;
  completedBySource: string | null;
  completionStatus: CompletionStatus | null;
  daysOverdue?: number;
}

export type StepState = 'PENDING' | 'DUE' | 'OVERDUE' | 'MISSED' | 'COMPLETED' | 'SKIPPED';
export type CompletionStatus = 'EARLY' | 'ON_TIME' | 'LATE';

export interface PatientEvent {
  eventId: string;
  cloudeventsId: string;
  type: string;
  eventTime: string;
  source: string;
  resourceType: string;
  processingStatus: ProcessingStatus;
  facilityId: string | null;
  protocolInstanceId: string | null;
  actionId: string | null;
  matchedStepInstanceId: string | null;
}

export type ProcessingStatus = 'MATCHED' | 'ZERO_MATCH' | 'DUPLICATE';

export interface PatientDeviation {
  deviationId: string;
  protocolInstanceId: string;
  protocolCanonical: string;
  stepInstanceId: string;
  actionId?: string;
  stepName?: string;
  deviationType: DeviationType;
  detectedAt: string;
  metadata?: {
    completedActionId?: string;
    incompletePrerequisites?: string[];
    backfilled?: boolean;
  };
  description?: string;
}

export type DeviationType = 'OVERDUE' | 'MISSED' | 'ORDER_VIOLATION';

// ─── Deviations & Intelligence ───────────────────────────────

export interface DeviationRecord {
  deviationId: string;
  patientId: string;
  protocolInstanceId: string;
  protocolCanonical: string;
  stepInstanceId: string;
  actionId: string;
  deviationType: DeviationType;
  occurredAt: string;   // clinical occurrence date (when the deviation happened)
  detectedAt: string;   // system detection date (when we flagged it)
  facilityId: string;
}

export interface DeviationTrend {
  interval: string;
  trends: {
    period: string;
    overdue: number;
    missed: number;
    orderViolation: number;
    total: number;
  }[];
}

export interface DeviationByAction {
  actionId: string;
  protocolDefinitionId: string;
  protocolCanonical: string;
  totalDeviations: number;
  overdueCount: number;
  missedCount: number;
  orderViolationCount: number;
  affectedPatients: number;
}

export interface DeviationResolution {
  totalOverdueDeviations: number;
  resolved: {
    count: number;
    percentage: number;
    avgDaysToResolve: number;
  };
  escalatedToMissed: {
    count: number;
    percentage: number;
  };
  byProtocol: {
    protocolDefinitionId: string;
    protocolCanonical: string;
    totalOverdue: number;
    resolvedCount: number;
    resolutionRate: number;
    escalatedCount: number;
  }[];
}

export interface IntelligenceSummary {
  totalDeviations: number;
  byType: { overdue: number; missed: number; orderViolation: number };
  bySeverity: { warning: number; critical: number };
  recentActivity: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
  };
}

// ─── Event Volume ────────────────────────────────────────────

export interface EventVolumeSummary {
  totalEvents: number;
  processingStatusBreakdown: {
    matched?: { count: number; percentage: number };
    zeroMatch?: { count: number; percentage: number };
    duplicate?: { count: number; percentage: number };
  } | null;
  byResourceType: { resourceType: string; count: number }[];
  byFacility: { facilityId: string; count: number }[];
  bySource: { source: string; count: number }[];
  pipelineLossCount: number;
}

export interface EventVolumeTrend {
  interval: string;
  trends: {
    period: string;
    total: number;
    byResourceType: Record<string, number>;
  }[];
}

export interface ResourceTypeCount {
  resourceType: string;
  count: number;
  percentage: number;
}

export interface FacilityEventCount {
  facilityId: string;
  totalEvents: number;
  byResourceType: { resourceType: string; count: number }[];
}

export interface ZeroMatchEvent {
  resourceType: string;
  code: string;
  category: string;
  facilityId: string;
  count: number;
  percentage: number;
}

// ─── Protocol Analytics ──────────────────────────────────────

export interface StepAnalytics {
  protocolDefinitionId: string;
  protocolCanonical: string;
  steps: {
    actionId: string;
    totalInstances: number;
    completedCount: number;
    completionRate: number;
    timelinessDistribution: {
      early: number;
      onTime: number;
      late: number;
    };
    overdueCount: number;
    missedCount: number;
    skippedCount: number;
    pendingCount: number;
    avgDaysToComplete: number;
    medianDaysToComplete: number;
    requiredBehavior?: 'must' | 'could';
  }[];
}

export interface ActionOrderEntry {
  actionId: string;
  parentActionId: string | null;
  type: string | null;
  title: string | null;
}

export interface CompletionFunnel {
  protocolDefinitionId: string;
  protocolCanonical: string;
  totalEnrollments: number;
  funnel: {
    actionId: string;
    stepOrder: number;
    reachedCount: number;
    completedCount: number;
    completionRate: number;
    dropOffRate: number;
  }[];
}

export interface OutcomeDistribution {
  protocolDefinitionId: string;
  protocolCanonical: string;
  totalInstances: number;
  distribution: {
    active: { count: number; percentage: number };
    completed: { count: number; percentage: number };
    expired: { count: number; percentage: number };
    withdrawn: { count: number; percentage: number };
  };
}

export interface EnrollmentTrend {
  protocolDefinitionId: string;
  interval: string;
  trends: {
    period: string;
    enrollments: number;
  }[];
}

// ─── Facility Analytics ──────────────────────────────────────

export interface FacilityRanking {
  rank: number;
  facilityId: string;
  facilityName?: string;
  /** Facility's district (may be empty). */
  district?: string;
  totalEnrollments: number;
  compliantPatients: number;
  nonCompliantPatients: number;
  complianceRate: number;
  activeDeviations: number;
  totalEvents: number;
  outboundEvents: number;
  inboundEvents: number;
  patientsFromHIE: number;
}

export type RankBy = 'complianceRate' | 'deviationCount' | 'eventVolume';
export type SortOrder = 'asc' | 'desc';

// ─── Practitioner Analytics ──────────────────────────────────

export interface PractitionerRanking {
  rank: number;
  practitionerRef: string;
  practitionerName: string | null;
  facilityId: string | null;
  facilityName: string | null;
  totalPatients: number;
  complianceRate: number;
  totalSteps: number;
  completedSteps: number;
  activeDeviations: number;
  totalEvents: number;
}

export type PractitionerRankBy = 'complianceRate' | 'totalPatients' | 'totalEvents';

// ─── Patient Risk ────────────────────────────────────────────

export interface FacilityLookup {
  id: string;
  name: string;
  /** Facility's district (may be empty) — enables constraining pickers to the global district. */
  district?: string;
}

export interface AtRiskHotspot {
  facilityId: string;
  facilityName?: string;
  totalPatients: number;
  onTrack: { count: number; percentage: number };
  atRisk: { count: number; percentage: number };
  nonCompliant: { count: number; percentage: number };
}

export interface RepeatDeviationPatient {
  patientId: string;
  totalDeviations: number;
  overdueCount: number;
  missedCount: number;
  orderViolationCount: number;
  affectedProtocols: number;
  affectedSteps: number;
  facilityId: string;
  deviations: {
    protocolCanonical: string;
    actionId: string;
    deviationType: DeviationType;
    detectedAt: string;
  }[];
}

// ─── Facility Activity Summary ───────────────────────────────

export interface FacilityActivitySummary {
  totalInScope: number;
  activeFacilities: number;
  inactiveFacilities: number;
  activeFacilityRate: number;
}

// One facility in the Active/Inactive drill-down list (RI-29).
export interface FacilityActivityItem {
  facilityId: string;
  facilityName: string;
  district: string;
  lastActivity: string | null; // yyyy-MM-dd of last accepted event in range; null if inactive
  active: boolean;
}

// One patient behind the "Referrals Received by HIE" indicator (RI-44 drill-down).
export interface PatientReferral {
  patientId: string;
  facilityId: string;
  facilityName: string;
  lastReferral: string;   // ISO datetime of the most recent referral event
  referralCount: number;
  matchedCount: number;
}

// ─── Facility Reference ──────────────────────────────────────

export interface FacilityReference {
  facilityId: string;
  facilityName: string;
  expectedVisitsPerDay: number;
}

// ─── Adoption KPIs ───────────────────────────────────────────

export interface AdoptionKpi {
  facilityId: string;
  facilityName: string;
  /** Facility's district (may be empty). */
  district: string;
  /** RI-33: expected visits over the whole selected period (baseline/day × days), not per day. */
  expectedVisits: number;
  /** Actual visits summed over the selected period. */
  actualVisits: number;
  adoptionRate: number;
  /** expectedVisits − actualVisits over the period; positive = under-reporting. */
  reportingGap: number;
}

// ─── Event KPIs (from mv_daily_event_kpis) ───────────────────

export interface EventKpis {
  totalEvents: number;
  matchedCount: number;
  zeroMatchCount: number;
  duplicateCount: number;
  matchedRatePct: number;
  zeroMatchRatePct: number;
  pipelineLossCount: number;
}

// ─── Deviation KPIs (from mv_daily_deviation_kpis) ───────────

export interface DeviationKpis {
  totalDeviations: number;
  overdueCount: number;
  missedCount: number;
  orderViolationCount: number;
}

// ─── Ingestion Analytics ─────────────────────────────────────

export interface IngestionFunnel {
  totalReceived: number;
  accepted: number;
  rejected: number;
  duplicate: number;
  acceptanceRate: number;
  rejectionRate: number;
  duplicateRate: number;
  breakdown: { status: string; count: number; percentage: number }[];
  trends?: {
    period: string;
    byStatus: Record<string, number>;
    total: number;
  }[];
}

export interface RejectionAnalytics {
  totalRejected: number;
  byReason: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  bySource: {
    source: string;
    totalEvents: number;
    rejectedEvents: number;
    rejectionRate: number;
    topReasons: { reason: string; count: number; percentage: number }[];
  }[];
}

export type RejectionReason =
  | 'INVALID_ENVELOPE'
  | 'INVALID_FHIR'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_CONTENT_TYPE'
  | 'DUPLICATE'
  | 'MISSING_SUBJECT'
  | 'PAYLOAD_TOO_LARGE'
  | 'DESERIALIZATION_ERROR'
  | 'KAFKA_PUBLISH_FAILURE'
  | 'INTERNAL_ERROR';

export interface SourceDataQuality {
  sources: {
    source: string;
    totalEvents: number;
    accepted: number;
    rejected: number;
    duplicate: number;
    acceptanceRate: number;
    rejectionRate: number;
    duplicateRate: number;
  }[];
}

export interface PipelineLoss {
  totalAcceptedByCollector: number;
  totalInComplianceEventLog: number;
  lostEvents: number;
  lossRate: number;
  bySource: { source: string; lostEvents: number }[];
}

export interface LastIngestedEvent {
  lastEventTime: string | null;
}
