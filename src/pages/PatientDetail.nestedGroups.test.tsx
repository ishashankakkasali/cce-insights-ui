import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { JourneyStep } from '../api/types';
import PatientDetail from './PatientDetail';

// A care group with a group nested in it: the care group's own steps, then an ECG workup group.
const instance = (id: string, done: number, total: number) => (
  { groupInstanceId: id, cycleIndex: 0, status: 'NOT_STARTED' as const, openedAt: '2026-11-25T05:00:00Z', completedSteps: done, totalSteps: total }
);
const journey: JourneyStep[] = [
  { actionId: 'care', stepName: 'Care', status: 'NOT_STARTED', stepStatus: 'NOT_STARTED', completionCount: 0, depth: 0,
    group: true, groupInstances: [instance('g-care', 3, 4)] },
  { actionId: 'assessment', parentActionId: 'care', stepName: 'Assessment', status: 'COMPLETED', stepStatus: 'COMPLETED',
    completionCount: 1, depth: 1 },
  { actionId: 'referral', parentActionId: 'care', stepName: 'Referral', status: 'COMPLETED', stepStatus: 'COMPLETED',
    completionCount: 1, depth: 1 },
  { actionId: 'ecg', parentActionId: 'care', stepName: 'ECG workup', status: 'NOT_STARTED', stepStatus: 'NOT_STARTED',
    completionCount: 0, depth: 1, group: true, groupInstances: [instance('g-ecg', 1, 2)] },
  { actionId: 'ecg-recorded', parentActionId: 'ecg', stepName: 'ECG Recorded', status: 'COMPLETED', stepStatus: 'COMPLETED',
    completionCount: 1, depth: 2 },
  { actionId: 'ecg-reviewed', parentActionId: 'ecg', stepName: 'ECG reviewed', status: 'NOT_STARTED', stepStatus: 'NOT_STARTED',
    completionCount: 0, depth: 2 },
];

const none = { data: undefined, isLoading: false, error: null };

vi.mock('../hooks/usePatients', () => ({
  usePatientTimeline: () => ({
    data: {
      patientId: 'P-1',
      protocols: [{
        protocolInstanceId: 'pi-1', protocolCanonical: 'http://x/PlanDefinition/care|1.0', status: 'ACTIVE',
        complianceRate: 100, journey, timeline: [],
      }],
    },
    isLoading: false,
    error: null,
  }),
  usePatientProtocolTracking: () => ({ data: [], isLoading: false, error: null }),
  usePatientProtocolTrackingDetail: () => none,
  usePatientDeviations: () => ({ data: [], isLoading: false, error: null }),
  usePatientIntelligenceDeliveries: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('../hooks/useProtocols', () => ({ useActionOrder: () => none }));

function renderPage() {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  render(
    <MemoryRouter initialEntries={['/patients/P-1']}>
      <Routes>
        <Route path="/patients/:id" element={<PatientDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

const groupRow = (name: string) => screen.getByText(name).parentElement!.parentElement!.parentElement!;

describe('PatientDetail — a group nested in a group', () => {
  it('splits a collapsed group\'s dots into its own steps and each group nested in it', () => {
    renderPage();
    fireEvent.click(within(groupRow('Care')).getByTitle('Hide its steps'));

    expect(screen.queryByText('ECG workup')).not.toBeInTheDocument();
    const dots = screen.getByLabelText('Its steps');
    expect(within(dots).getByTitle('Assessment: Completed')).toBeInTheDocument();
    expect(within(dots).getByTitle('Referral: Completed')).toBeInTheDocument();
    // The nested group's steps are a segment of their own, named after it.
    const ecg = within(dots).getByTitle('ECG workup');
    expect(within(ecg).getByTitle('ECG workup › ECG Recorded: Completed')).toBeInTheDocument();
    expect(within(ecg).getByTitle(/^ECG workup › ECG reviewed: /)).toBeInTheDocument();
    expect(within(ecg).queryByTitle(/Assessment/)).not.toBeInTheDocument();
  });

  it('collapses a nested group on its own, keeping its parent\'s steps', () => {
    renderPage();
    fireEvent.click(within(groupRow('ECG workup')).getByTitle('Hide its steps'));

    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.queryByText('ECG Recorded')).not.toBeInTheDocument();
    const dots = screen.getByLabelText('Its steps');
    expect(within(dots).getByTitle('ECG Recorded: Completed')).toBeInTheDocument();
    expect(within(dots).queryByTitle(/Assessment/)).not.toBeInTheDocument();
  });
});
