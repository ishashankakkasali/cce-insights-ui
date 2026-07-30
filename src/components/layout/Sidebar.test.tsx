import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

// RI-67: MoH branding — the sidebar's home link carries the Rwanda MoH seal plus
// "CCE Insights" / "MOH Digital Health", above the nav list.
describe('Sidebar', () => {
  it('renders the MoH seal and branding text', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByRole('img', { name: 'Republic of Rwanda — Ministry of Health' })).toBeInTheDocument();
    expect(screen.getByText('CCE Insights')).toBeInTheDocument();
    expect(screen.getByText('MOH Digital Health')).toBeInTheDocument();
  });

  it('renders all 7 nav links', () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );
    for (const label of ['Dashboard', 'Facilities', 'Compliance', 'Deviations', 'Patients', 'Events', 'Ingestion']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });
});
