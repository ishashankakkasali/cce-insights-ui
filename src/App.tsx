import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { DateRangeFilter } from './components/shared/DateRangeFilter';
import { DistrictFilter } from './components/shared/DistrictFilter';
import { FacilityFilter } from './components/shared/FacilityFilter';
import { authEnabled, logout } from './auth/keycloak';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ComplianceOverview = lazy(() => import('./pages/ComplianceOverview'));
const ProtocolAnalytics = lazy(() => import('./pages/ProtocolAnalytics'));
const PatientList = lazy(() => import('./pages/PatientList'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const Deviations = lazy(() => import('./pages/Deviations'));
const EventVolume = lazy(() => import('./pages/EventVolume'));
const FacilityAnalytics = lazy(() => import('./pages/FacilityAnalytics'));
const PractitionerAnalytics = lazy(() => import('./pages/PractitionerAnalytics'));
const IngestionPipeline = lazy(() => import('./pages/IngestionPipeline'));
const Exports = lazy(() => import('./pages/Exports'));
const Intelligence = lazy(() => import('./pages/Intelligence'));

export function App() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="ml-56 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-end gap-4 border-b border-gray-200 bg-white px-6 py-2.5">
          <DistrictFilter />
          <FacilityFilter />
          <DateRangeFilter />
          {authEnabled && (
            <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
              >
                Sign out
              </button>
            </div>
          )}
        </header>
        <main className="p-6">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/compliance" element={<ComplianceOverview />} />
              <Route path="/compliance/protocols/:id" element={<ProtocolAnalytics />} />
              <Route path="/compliance/patients" element={<PatientList />} />
              <Route path="/compliance/patients/:id" element={<PatientDetail />} />
              <Route path="/deviations" element={<Deviations />} />
              <Route path="/events" element={<EventVolume />} />
              <Route path="/facilities" element={<FacilityAnalytics />} />
              <Route path="/practitioners" element={<PractitionerAnalytics />} />
              <Route path="/ingestion" element={<IngestionPipeline />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/exports" element={<Exports />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
