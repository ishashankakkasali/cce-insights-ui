import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// RI-51 — the "Total Referrals" indicator must read the referrals-received-by-HIE KPI
// (event count, totalReferralsReceived) — the SAME source the Facility Ranking column and the
// Facilities "Referral Details" card use — NOT a distinct-patient list length. Mock the four data
// hooks the page reads so we can assert the rendered value without a network/react-query layer.
vi.mock('../hooks/useFacilities', () => ({
  useFacilityRanking: () => ({ data: { data: [] }, isLoading: false, error: null }),
  useFacilityActivitySummary: () => ({
    data: { totalInScope: 8, activeFacilities: 3, inactiveFacilities: 5 },
    isLoading: false,
  }),
  useAdoptionKpis: () => ({ data: [], isLoading: false }),
}));

const referralsKpi = { totalReferralsReceived: 5 };
vi.mock('../hooks/useDashboard', () => ({
  useReferralsKpi: () => ({ data: referralsKpi, isLoading: false }),
  // RI-53 — the "Patients Received by HIE" indicator reads /dashboard/overview.
  useDashboardOverview: () => ({ data: { patientsReceivedHIE: 2639 }, isLoading: false }),
}));

function renderDashboard() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard — RI-51 Total Referrals', () => {
  it('renders the referrals-received-by-HIE event total (totalReferralsReceived), not a patient count', () => {
    renderDashboard();
    const title = screen.getByText('Total Referrals');
    expect(title).toBeInTheDocument();
    // 5 = event count from the shared KPI; the Facility Ranking column + Facilities card show the same.
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('referrals received by HIE')).toBeInTheDocument();
  });
});

describe('Dashboard — RI-53 Patients Received by HIE', () => {
  it('renders the retained Patients Received by HIE indicator from /dashboard/overview', () => {
    renderDashboard();
    expect(screen.getByText('Patients Received by HIE')).toBeInTheDocument();
    expect(screen.getByText('2,639')).toBeInTheDocument();
    expect(screen.getByText('distinct protocol-tracked patients')).toBeInTheDocument();
  });

  it('colour-codes the Total Facilities active/inactive breakdown (green / red)', () => {
    renderDashboard();
    const active = screen.getByText('3 active');
    const inactive = screen.getByText('5 inactive');
    expect(active).toHaveClass('text-green-600');
    expect(inactive).toHaveClass('text-red-600');
  });
});
