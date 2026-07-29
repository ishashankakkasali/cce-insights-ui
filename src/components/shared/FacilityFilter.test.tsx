import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacilityFilter } from './FacilityFilter';
import { FilterContext, type FilterContextValue } from '../../context/FilterContext';
import type { FacilityLookup } from '../../api/types';

const facilities: FacilityLookup[] = [
  { id: '11', name: 'Aditmari UHC', district: 'Kigali (Demo)' },
  { id: '1302', name: 'NCD Upazila', district: 'Gasabo' },
  { id: '9302', name: 'NCD Upazila', district: 'Kicukiro' },
];

vi.mock('../../hooks/useLookups', () => ({
  useFacilityLookup: () => ({ data: facilities }),
}));

function renderWithContext(overrides: Partial<FilterContextValue> = {}) {
  const setFacilityId = vi.fn();
  const value: FilterContextValue = {
    startDate: '2026-01-01',
    endDate: '2026-07-01',
    facilityId: undefined,
    district: undefined,
    setDateRange: vi.fn(),
    setFacilityId,
    setDistrict: vi.fn(),
    ...overrides,
  };
  render(
    <FilterContext.Provider value={value}>
      <FacilityFilter />
    </FilterContext.Provider>,
  );
  return { setFacilityId };
}

describe('FacilityFilter', () => {
  it('renders All Facilities plus every facility option when no district is selected', () => {
    renderWithContext();
    expect(screen.getByRole('option', { name: 'All Facilities' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aditmari UHC' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(4); // All Facilities + 3 facilities
  });

  it('selecting a facility calls setFacilityId with that id', () => {
    const { setFacilityId } = renderWithContext();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '11' } });
    expect(setFacilityId).toHaveBeenCalledWith('11');
  });

  it('selecting "All Facilities" clears the filter (undefined)', () => {
    const { setFacilityId } = renderWithContext({ facilityId: '11' });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(setFacilityId).toHaveBeenCalledWith(undefined);
  });

  it('constrains options to the selected district', () => {
    renderWithContext({ district: 'Gasabo' });
    // Only the Gasabo facility (NCD Upazila / 1302) should be selectable, not Kigali's or Kicukiro's.
    expect(screen.getAllByRole('option')).toHaveLength(2); // All Facilities + 1 facility
    expect(screen.getByRole('option', { name: 'NCD Upazila' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Aditmari UHC' })).not.toBeInTheDocument();
  });

  it('disambiguates same-name facilities across districts with the facility id', () => {
    renderWithContext();
    // Both "NCD Upazila" facilities (1302 in Gasabo, 9302 in Kicukiro) are in scope (no district
    // selected) and share a name, so each option must be suffixed with its id.
    expect(screen.getByRole('option', { name: 'NCD Upazila (1302)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'NCD Upazila (9302)' })).toBeInTheDocument();
  });

  it('resets the facility selection when the district changes and it no longer belongs', () => {
    const { setFacilityId } = renderWithContext({ facilityId: '1302', district: 'Kicukiro' });
    // Facility 1302 belongs to Gasabo, not Kicukiro — the mismatch should trigger an auto-reset.
    expect(setFacilityId).toHaveBeenCalledWith(undefined);
  });
});
