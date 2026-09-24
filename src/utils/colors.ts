import type { StepDisplayStatus, ComplianceCategory, ProcessingStatus, ProtocolInstanceStatus } from '../api/types';

export const STATE_COLORS: Record<StepDisplayStatus, { bg: string; text: string; dot: string }> = {
  NOT_STARTED: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  OVERDUE: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  MISSED: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
};

export const COMPLIANCE_COLORS: Record<ComplianceCategory, { bg: string; text: string; dot: string }> = {
  on_track: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  non_compliant: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
};

export const STATUS_COLORS: Record<ProtocolInstanceStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  WITHDRAWN: { bg: 'bg-gray-100', text: 'text-gray-700' },
  EXPIRED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const PROCESSING_COLORS: Record<ProcessingStatus, { bg: string; text: string; chart: string }> = {
  MATCHED: { bg: 'bg-green-100', text: 'text-green-700', chart: '#22c55e' },
  ZERO_MATCH: { bg: 'bg-amber-100', text: 'text-amber-700', chart: '#f59e0b' },
  DUPLICATE: { bg: 'bg-gray-100', text: 'text-gray-500', chart: '#9ca3af' },
};

export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  orderViolation: '#8b5cf6',
  info: '#6366f1',
  muted: '#9ca3af',
  resourceTypes: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'],
};
