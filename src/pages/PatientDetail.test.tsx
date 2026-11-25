import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { JourneyStep, PatientDeviation } from '../api/types';
import PatientDetail from './PatientDetail';

// A visit is a step group: a set of steps that belong together. This patient had two visits. The
// first is done, and the second has one of its two steps done.
const journey: JourneyStep[] = [
  { actionId: 'registration', stepName: 'Registration', status: 'COMPLETED', stepStatus: 'COMPLETED', completionCount: 1, depth: 0 },
  {
    actionId: 'visit', stepName: 'Visit', status: 'COMPLETED', stepStatus: 'COMPLETED', completionCount: 1, depth: 0,
    group: true,
    groupInstances: [
      { groupInstanceId: 'g0', cycleIndex: 0, status: 'COMPLETED', openedAt: '2026-11-02T09:00:00Z', completedSteps: 2, totalSteps: 2 },
      { groupInstanceId: 'g1', cycleIndex: 1, status: 'NOT_STARTED', openedAt: '2026-11-03T09:00:00Z', completedSteps: 1, totalSteps: 2 },
    ],
  },
  {
    actionId: 'history', parentActionId: 'visit', stepName: 'History', status: 'COMPLETED', stepStatus: 'COMPLETED',
    completionCount: 2, depth: 1,
    instances: [
      { stepInstanceId: 'h0', groupInstanceId: 'g0', status: 'COMPLETED', stepStatus: 'COMPLETED', practitioner: 'Dr. First' },
      { stepInstanceId: 'h1', groupInstanceId: 'g1', status: 'COMPLETED', stepStatus: 'COMPLETED', practitioner: 'Dr. Second' },
    ],
  },
  {
    actionId: 'bp', parentActionId: 'visit', stepName: 'Blood Pressure', status: 'COMPLETED', stepStatus: 'COMPLETED',
    completionCount: 1, depth: 1,
    instances: [
      { stepInstanceId: 'b0', groupInstanceId: 'g0', status: 'COMPLETED', stepStatus: 'COMPLETED', slaStatus: 'MET' },
      { stepInstanceId: 'b1', groupInstanceId: 'g1', status: 'NOT_STARTED', stepStatus: 'NOT_STARTED' },
    ],
  },
];

const none = { data: undefined, isLoading: false, error: null };
const deviations: PatientDeviation[] = [];

vi.mock('../hooks/usePatients', () => ({
  usePatientTimeline: () => ({
    data: {
      patientId: 'P-1',
      protocols: [{
        protocolInstanceId: 'pi-1',
        protocolCanonical: 'http://x/PlanDefinition/visits|1.0',
        status: 'ACTIVE',
        complianceRate: 75,
        journey,
        timeline: [],
      }],
    },
    isLoading: false,
    error: null,
  }),
  usePatientProtocolTracking: () => ({ data: [], isLoading: false, error: null }),
  usePatientProtocolTrackingDetail: () => none,
  usePatientDeviations: () => ({ data: deviations, isLoading: false, error: null }),
  usePatientIntelligenceDeliveries: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('../hooks/useProtocols', () => ({ useActionOrder: () => none }));

function renderPage() {
  // jsdom has no matchMedia. The page reads it to pick its desktop layout.
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
  // Nor ResizeObserver. The page measures its sticky header with it.
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

describe('PatientDetail — step groups in the Protocol Journey', () => {
  it('shows a group as a step group, with each of its visits and how many steps are done', () => {
    renderPage();
    const visitRow = screen.getByText('Visit').parentElement!.parentElement!;
    // Each is named by its number and the day it opened.
    expect(within(visitRow).getByText('#1 · Nov 2, 2026')).toBeInTheDocument();
    expect(within(visitRow).getByText('#2 · Nov 3, 2026')).toBeInTheDocument();
    expect(within(visitRow).getByText('· 2/2 steps')).toBeInTheDocument();
    expect(within(visitRow).getByText('· 1/2 steps')).toBeInTheDocument();
    // Its status is in the chip of the latest visit, which is open: the row has no status badge of its own.
    expect(within(visitRow).getByText('· In progress')).toBeInTheDocument();
    expect(within(visitRow).queryByText('In progress')).not.toBeInTheDocument();
  });

  it('starts with every group expanded, and a group has an arrow rather than a status dot', () => {
    renderPage();
    const arrow = screen.getByTitle('Hide its steps');
    expect(arrow).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument();
    expect(screen.queryByLabelText('Its steps')).not.toBeInTheDocument();
  });

  it('hides a collapsed group\'s steps and shows a dot per step, and shows them again when expanded', () => {
    renderPage();
    fireEvent.click(screen.getByTitle('Hide its steps'));

    expect(screen.getByTitle('Show its steps')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    expect(screen.queryByText('Blood Pressure')).not.toBeInTheDocument();
    const dots = screen.getByLabelText('Its steps');
    // Visit #2 is shown: history done, blood pressure still awaited.
    expect(within(dots).getByTitle('History: Completed')).toBeInTheDocument();
    expect(within(dots).getByTitle(/^Blood Pressure: /)).toBeInTheDocument();
    expect(screen.getByText('Show 2 steps')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show 2 steps'));
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.queryByLabelText('Its steps')).not.toBeInTheDocument();
  });

  it('collapses and expands every group at once', () => {
    renderPage();
    fireEvent.click(screen.getByText('Collapse all'));
    expect(screen.queryByText('History')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Expand all'));
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('shows the latest visit\'s steps first, and another visit\'s steps when its chip is picked', () => {
    renderPage();
    const chip = (label: string) => screen.getByText(new RegExp(`^${label} ·`)).closest('button')!;
    const bpRow = () => screen.getByText('Blood Pressure').parentElement!.parentElement!;

    // Visit #2: history done by Dr. Second, blood pressure still awaited.
    expect(chip('#2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Practitioner: Dr. Second')).toBeInTheDocument();
    expect(within(bpRow()).getByText('Pending')).toBeInTheDocument();

    fireEvent.click(chip('#1'));

    expect(chip('#1')).toHaveAttribute('aria-pressed', 'true');
    expect(chip('#2')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Practitioner: Dr. First')).toBeInTheDocument();
    expect(screen.queryByText('Practitioner: Dr. Second')).not.toBeInTheDocument();
    expect(within(bpRow()).getByText('Completed')).toBeInTheDocument();
    expect(within(bpRow()).getByText('ON TIME')).toBeInTheDocument();
  });

  it('counts steps only, not the group, in the protocol header, and says the count covers all visits', () => {
    renderPage();
    // registration, history and bp are steps. The visit is not.
    expect(screen.getAllByText('3/3 steps').length).toBeGreaterThan(0);
    expect(screen.queryByText('4/4 steps')).not.toBeInTheDocument();
    expect(screen.getByText(/3\/3 steps\s*· all visits/)).toBeInTheDocument();
  });

  it('says which visit a deviation is in, and shows that visit when asked', () => {
    deviations.push({
      deviationId: 'd1', protocolInstanceId: 'pi-1', protocolCanonical: 'http://x/PlanDefinition/visits|1.0',
      stepInstanceId: 'b0', actionId: 'bp', stepName: 'Blood Pressure', deviationType: 'OVERDUE',
      detectedAt: '2026-11-03T09:00:00Z', description: 'Blood Pressure was late',
      groupPath: [{ groupActionId: 'visit', groupName: 'Visit', groupInstanceId: 'g0', number: 1, openedAt: '2026-11-02T09:00:00Z' }],
    });
    renderPage();
    // The Deviations panel's card; demo-dev also lists each deviation under Intelligence Alerts.
    const card = screen.getAllByText('Blood Pressure was late')[0].parentElement!;
    expect(within(card).getByText(/In Visit #1 \(Nov 2, 2026\)/)).toBeInTheDocument();

    // Visit #2 is shown; the deviation is in visit #1.
    fireEvent.click(within(card).getByText('· Show this visit'));

    expect(screen.getByText(/^#1 ·/).closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(within(card).getByText('· shown above')).toBeInTheDocument();
    deviations.length = 0;
  });
});
