import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MetricCard } from '../shared/MetricCard';
import { Card } from '../shared/Card';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { ErrorAlert } from '../shared/ErrorAlert';
import { TableRangePagination } from '../shared/TableRangePagination';
import {
  DistrictFacilityFilter,
  filterByDistrictFacility,
  ALL_DISTRICTS,
  ALL_FACILITIES,
} from '../shared/DistrictSelect';
import { usePatientReferralsReceived } from '../../hooks/usePatients';
import { useFacilityRanking } from '../../hooks/useFacilities';
import { useGlobalFilters } from '../../hooks/useGlobalFilters';
import { formatNumber } from '../../utils/formatters';
import { formatDate } from '../../utils/dates';

const PAGE_SIZE = 12; // divisible by 2 and 3 — fills the drill-down grid rows evenly

/**
 * RI-44: Referral indicators on the Patients page — Created / Received by HIE / Failed. Each is a
 * clickable indicator; today only "Referrals Received by HIE" is data-backed and opens a drill-down
 * of the patients behind it (→ patient detail). "Created" and "Failed" are placeholders pending a
 * product definition (non-clickable, value "—").
 *
 * The drill-down has its own District filter (shared DistrictFacilityFilter, District-only mode,
 * same as the Facilities-page Facility Status drill-down). Facility is the global header filter now
 * (RI-56). Referral rows carry a facility but no district, so the district is resolved via the
 * facility catalog (useFacilityRanking, which includes district) — the same list that feeds the
 * filter's options. Card values stay the unfiltered totals; the drill-down count + list reflect the
 * filter.
 */
export function PatientReferralCards({ className }: { className?: string }) {
  const received = usePatientReferralsReceived();
  // Facility catalog for the filter options + district resolution (facilityId/facilityName/district).
  const facilityRanking = useFacilityRanking({ rankBy: 'complianceRate', order: 'asc', limit: 1000 });
  const facilityCatalog = facilityRanking.data?.data ?? [];
  const { facilityId: globalFacilityId } = useGlobalFilters();
  const facility = globalFacilityId ?? ALL_FACILITIES;

  const [open, setOpen] = useState(false);
  const [district, setDistrict] = useState<string>(ALL_DISTRICTS);
  const [page, setPage] = useState(1);

  const allRows = received.data ?? [];
  const receivedTotal = allRows.length;

  const districtByFacilityId = useMemo(
    () => new Map(facilityCatalog.map((f) => [f.facilityId, f.district])),
    [facilityCatalog],
  );
  // Referral patients narrowed by the drill-down's District filter + the global Facility filter.
  const patients = useMemo(() => {
    const rows = allRows.map((r) => ({ ...r, district: districtByFacilityId.get(r.facilityId) }));
    return filterByDistrictFacility(rows, district, facility);
  }, [allRows, districtByFacilityId, district, facility]);

  // Reset paging when the data, drill-down state, or filter changes.
  useEffect(() => { setPage(1); }, [received.data, open, district, facility]);
  const totalPages = Math.max(1, Math.ceil(patients.length / PAGE_SIZE));
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paginated = useMemo(
    () => patients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [patients, page],
  );

  const receivedValue = received.isLoading ? '…' : received.error ? '—' : formatNumber(receivedTotal);
  const filtered = district !== ALL_DISTRICTS || facility !== ALL_FACILITIES;

  return (
    <Card
      title="Referrals"
      description="Referral indicators for the selected period. Click an indicator for its patient list."
      className={className}
    >
      {received.error && <ErrorAlert error={received.error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Created Referrals"
          value="—"
          description="Referrals created / ordered by a facility. Definition pending — indicator placeholder."
        />
        <MetricCard
          title="Referrals Received by HIE"
          value={receivedValue}
          bgColor="bg-green-50"
          description="Distinct patients with a referral received by HIE in the selected period (by clinical event date). Click for the patient list."
          onClick={() => setOpen((o) => !o)}
          selected={open}
        />
        <MetricCard
          title="Failed Referrals"
          value="—"
          description="Referrals that failed to complete. Definition pending — indicator placeholder."
        />
        <MetricCard
          title="Referral Rate"
          value="—"
          description="Referral rate. Definition pending — indicator placeholder (depends on Created / Failed definitions)."
        />
      </div>

      {open && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Referrals Received by HIE ({patients.length})</h3>
            {!received.isLoading && !received.error && receivedTotal > 0 && (
              <DistrictFacilityFilter
                idPrefix="referrals"
                options={facilityCatalog}
                district={district}
                onDistrictChange={setDistrict}
                showFacility={false}
              />
            )}
          </div>

          {received.isLoading ? (
            <LoadingSpinner />
          ) : received.error ? (
            <ErrorAlert error={received.error} />
          ) : patients.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              {filtered
                ? 'No patients with referrals match the selected filters.'
                : 'No patients with referrals received in this period.'}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {paginated.map((p) => {
                  const facilityLabel = p.facilityName || p.facilityId || '—';
                  const sub = p.lastReferral ? `${facilityLabel} · ${formatDate(p.lastReferral)}` : facilityLabel;
                  return (
                    <Link
                      key={p.patientId}
                      to={`/compliance/patients/${encodeURIComponent(p.patientId)}`}
                      className="flex flex-col gap-0.5 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
                    >
                      <p className="truncate text-sm font-medium text-blue-600" title={p.patientId}>{p.patientId}</p>
                      <p className="truncate text-xs text-gray-500" title={sub}>{sub}</p>
                    </Link>
                  );
                })}
              </div>
              <TableRangePagination
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={patients.length}
                onPageChange={setPage}
              />
            </>
          )}
        </div>
      )}
    </Card>
  );
}
