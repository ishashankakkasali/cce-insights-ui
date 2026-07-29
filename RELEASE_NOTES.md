# Release Notes — CCE Insights UI v2.0.0

**Release Date:** 2026-06-02

## Unreleased

### Global Top-Level Facility Filter + Ingestion District Parity (RI-56)

- **New global `Facility` filter** in the header, next to `District`, before the date range —
  consistently scopes Dashboard, Patients, Compliance, Deviations, Events, and Ingestion.
  Defaults to "All Facilities". Options are constrained to the selected District and auto-reset
  to "All Facilities" if the district changes and the current selection no longer belongs to it.
  Same-name facilities (e.g. two "NCD Upazila" in different districts) are disambiguated with
  `(facilityId)`, matching the existing convention used elsewhere (Facility Ranking table, etc.).
- **Removed the ~6 per-page/per-card local facility pickers** this replaces: Deviations,
  Compliance Overview, the Events page's Zero-Match Events table, and the Facility half of the
  bundled `DistrictFacilityFilter` control on 4 cards (`PatientReferralCards`,
  `EbuzimaAdoptionCard`, `ReferralMetricsCard`, `ComplianceFacilityBreakdown` — District remains a
  per-card refinement on these). Also removed the now-redundant "Search Facility" text box on the
  Facilities page's ranking table.
- **District filter now renders on every page, including Ingestion** — previously hidden there
  because the backend had no district support at all for ingestion metrics; added end-to-end
  (funnel, rejections, source-quality, pipeline-loss, last-event).
- **Bug fix — dropdown header reflow:** `District`/`Facility` used `max-w-[12rem]`, so the
  `<select>` shrank/grew to fit the selected option's text width, shifting every control to its
  right (Facility, dates, Sign out) each time the selection changed. Fixed to a stable `w-48`.
- **Bug fix — Dashboard "Total Facilities" ignoring a combined district+facility selection**
  (frontend dropdown wasn't scoped to the selected district, plus a backend controller
  branch-order bug — see cce-insights-service release notes).
- **Bug fix — Ingestion metrics not responding to District/Facility changes:** root cause was
  `@Cacheable` cache keys on the backend not including the new params (see service release notes).
- **Bug fix — Events page "By Facility" table not narrowing to the selected facility:** the
  backend already scoped correctly, but the frontend's zero-fill merge (which re-adds facilities
  with no events so they still show a 0 row) only accounted for the district filter, so selecting
  a specific facility still merged in every other facility in that district with a synthetic
  0-event row. Fixed `scopedFacilities`/the merge guard in `EventVolume.tsx` to also filter by
  `facilityId`.
- **Bug fix — jump-to-card scroll landing under the sticky header:** clicking the Total Events /
  Zero Match Rate metric cards scrolls to and highlights the corresponding section
  (`scrollIntoView({ block: 'start' })`), but the header (`sticky top-0 z-20`) has no way to
  account for its own height, so the target card's top/title got tucked under it — worse on
  narrower windows where the header wraps to two lines. Fixed with `scroll-mt-24` on both scroll
  targets in `EventVolume.tsx`.

### Patient Compliance — Date Filter Mode Toggle

- **Radio button toggle** added to the Patient Compliance page (`PatientList.tsx`) between the status filter buttons and the search box. Options: **Enrollment Date** (default) / **Activity Date**.
  - *Enrollment Date* — lists patients enrolled in the selected date range (unchanged behaviour).
  - *Activity Date* — lists patients who had any step activity (step `updated_at`) in the selected date range, regardless of when they enrolled. Useful for checking "who had a visit this week?" without filtering by enrollment cohort.
- **Page subtitle** under the "Patient Compliance" heading updates dynamically when the mode is toggled to describe the cohort being shown.
- Passed through `dateFilterMode` in `useProtocolPatients` hook and `getProtocolPatients` API helper. Defaults to `enrollment` so existing bookmarks and integrations are unaffected.

### Protocol Journey Sub-Step Visibility Fix

- **Bug fixed:** on the Patient Detail page, a root protocol step that was `NOT_STARTED` and suppressed from the Protocol Journey could still have its sub-steps rendered (e.g., "Laboratory Results" appearing without its parent "Lab Order" ever showing).
- The Protocol Journey section now pre-computes visible root steps first, then inherits that visibility down to sub-steps, preventing orphaned sub-step entries.

### Follow-up Date Range / Filter Audit

Second-pass audit caught five categories of date-range or facility-filter bypass
that survived the first metric-alignment pass:

- **Facility activity tile** (Dashboard + Facility Analytics): now respects the
  global facility filter — when one facility is selected, the tile reflects whether
  that facility transmitted in the period (1 in-scope / 1 active or inactive).
- **Step analytics, completion funnel, practitioner step completion** now narrow to
  enrollments enrolled in the selected period (and a selected facility where
  applicable). Previously the cache key was date-aware but the underlying SQL was
  not.
- **Patient compliance timeline** filters events by timestamp within the global
  date range (Protocol Journey remains the full step list by design).
- **Patient Detail Deviations** card no longer bypasses the date filter — it now
  obeys the global range like every other surface.
- **Event Volume By Facility** table now resolves facility names from the lookup
  service, includes zero-event facilities, and uses the standard "1-N of M" range
  pagination.
- **Event Volume header KPIs** (Total Events / Matched Rate / Zero Match Rate /
  Duplicates) now reflect the selected date range; Pipeline Loss is explicitly
  labelled as cumulative.
- **e-Buzima Adoption** can be narrowed by global facility filter.
- **Outcome distribution** + **enrollment trends** + **deviation trends** caches
  now include `facilityId`; trends/outcome respect the facility filter.
- **At-risk hotspots** and **repeat deviations** caches now include
  date / facility / protocol so filter changes invalidate stale results.

### Metric Alignment & Filter Wiring

A workspace-wide audit aligned every KPI surface to a single set of definitions and
wired the global filters end-to-end. Highlights:

- **Tracked Cohort = enrolled in period** on both the Dashboard and Compliance Overview
  (previously the two pages used different cohorts and disagreed).
- **Active Facilities** counts any facility with ≥1 successful HIE submission in the
  period (matches the requirements doc), so a facility submitting accepted-but-unmatched
  events is no longer marked inactive.
- **Facility Ranking events** sourced from inbound events — aligns with the Active tile
  and the Events → By Facility table.
- **Deviations header** counts distinct deviations from the base table, not summed
  daily snapshots; UI copy updated to reflect that.
- **e-Buzima Adoption** period columns are now **daily averages** (Avg Visits / Day,
  Gap / Day) so they are comparable to the per-day baseline. API fields renamed to
  `expectedVisitsPerDay`, `actualVisitsPerDay`, `reportingGapPerDay`. Column order
  swapped: Gap now sits before Adoption Rate.
- **Practitioner page** relabelled to make clear the rate is **step completion**, not
  the deviation-based patient compliance shown on the Dashboard.
- **Global facility filter** now narrows the Dashboard, Facility Ranking, Event Volume,
  Patient List, Deviations KPIs, and deviation recent-activity counts. Previously the
  control changed nothing on those pages.
- **Patient List** is deduplicated to one row per patient (most recent enrollment in
  the period) — the total no longer counts re-enrollments separately.
- **Protocol filter** on Intelligence and Practitioner Analytics now reaches the
  backend; Practitioner Analytics narrows to practitioners with step rows in that
  protocol.

### Removed

- **Source Comparison** — Removed `/events/source-comparison` page, Compare Sources link on Events, and related API client/types (`compareSourceSystems`, `SourceComparison`, `SourceTimelineChart`).
- **Events page tabs** — Removed By Practitioner, By Source, and Processing Quality tabs and their API integrations (`/events/by-practitioner`, `/events/by-source`, `/events/processing-quality`).

## Overview

Major UX refresh focused on binary compliance model (Compliant / Non-Compliant only), new pages (Intelligence, Practitioner Analytics), redesigned Service Workflow Compliance as a vertical timeline, and visual polish across all views.

## Breaking Changes

- **Compliance categories are now binary**: Only `on_track` (Compliant) and `non_compliant` (Non-Compliant). The `at_risk` category has been fully removed from the UI, API types, and backend classification logic.
- **Default date range changed to 180 days** (from 30 days). Set `VITE_DEFAULT_DATE_RANGE_DAYS` to override.
- **Keycloak dependency removed** from the API client. Auth now uses `VITE_AUTH_TOKEN` or `sessionStorage('access_token')` only.

## New Features

### New Pages

- **Intelligence** (`/intelligence`) — Action instance metrics, delivery status donut chart, destinations & adaptors tables, Intelligence Actions table
- **Practitioner Analytics** (`/practitioners`) — Practitioner compliance table with color-coded badges and legend

### Compliance Overview Redesign

- **Service Workflow Compliance** section rewritten as a vertical timeline with light cards (`bg-white`, subtle shadow)
- Each parent step shows: title (from action-order API), completion %, full-width progress bar, "X of Y completed · Z missing" stats
- Child steps (sub-actions) rendered as collapsible sub-timeline graph nodes (expanded by default, togglable)
- Timeline dots: `h-4 w-4`, solid color, `shadow-md`, `ring-3 ring-white` — green=≥80%, amber=≥50%, red=<50%
- Sub-action dots are 8px with thinner progress bars (`h-1`, `w-4/5`) to reduce visual competition with parent steps

### Dashboard

- Metric cards renamed: **Tracked Cohort**, **Compliant Care Journeys**, **Non-Compliant Care Journeys**
- Chart titles no longer display "(30 days)" — they use the global date filter
- Added facility/practitioner summary cards

### Patient Detail

- **Source color-coded pills** in Protocol Journey (spice=purple, openmrs=sky, dhis2=teal, fhir=indigo, hl7=pink)
- Removed mandatory/policy badges from step indicators
- **Protocol thumbnail images** from Google Drive now display correctly (auto-converts share/uc URLs to thumbnail API)

### Facility Analytics

- Renamed "At-Risk Hotspots" → **"Non-Compliant Hotspots"**
- Compliance column now color-coded (🟢 ≥80%, 🟡 50-79%, 🔴 <50%)
- Legend added below table

### Patient List

- Only **Compliant** and **Non-Compliant** filter buttons (removed "At Risk")
- Badge labels updated to "Compliant" / "Non-Compliant"

## Technical Changes

- **Pagination normalization**: `apiGetPaginated` now handles both camelCase (`hasMore`/`nextCursor`) and snake_case (`has_more`/`next_cursor`) from the API
- **New API modules**: `dashboard.ts`, `intelligence.ts`, `practitioners.ts`
- **New hooks**: `useDashboard.ts`, `useIntelligence.ts`, `usePractitioners.ts`
- **Sidebar navigation updated**: Dashboard → Compliance → Facilities → Practitioners → Deviations → Intelligence → Patients → Events → Ingestion → Exports
- **Removed unused code**: `DonutRing` component from ComplianceOverview, unused imports

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_DEFAULT_DATE_RANGE_DAYS` | `180` | Default date range (changed from 30) |

---

---

# Release Notes — CCE Insights UI v1.0.0

**Release Date:** 2026-03-31

## Overview

Initial release of the CCE Insights UI — an analytics dashboard for the Clinical Care Engine platform. Provides compliance analytics, deviation trends, event volume metrics, facility rankings, patient risk analysis, and ingestion pipeline monitoring by consuming 38 REST endpoints (33 analytics + 5 lookup) from the CCE Insights Service.

## Features

### Pages (12 routes)

- **Dashboard** — Overview metrics (total events, active deviations, facilities tracked, pipeline loss rate), trend sparklines, quick navigation
- **Compliance Overview** — Protocol compliance summaries with status breakdown, step metrics, patient list with status filtering
- **Protocol Analytics** — Step-level analytics table, completion funnel, outcome distribution, enrollment trends with interval toggle
- **Patient List** — Patients by compliance status, risk hotspots by facility (stacked bar chart), repeat deviation patients
- **Patient Detail** — Protocol enrollments with progress bars, step-level detail, compliance timeline, deviation list, event history
- **Deviation Analytics** — Intelligence summary, deviation trends (daily/weekly/monthly), most-deviated steps, resolution rate, paginated deviation list with type filter
- **Event Volume** — Tabbed view: by resource type (bar chart) and by facility
- **Facility Analytics** — Ranked leaderboard (by compliance rate, deviation count, or event volume), at-risk hotspot chart
- **Ingestion Pipeline** — Acceptance/rejection funnel, rejection reasons (horizontal bars), source quality, pipeline loss alert
- **Exports** — Download compliance data as CSV or JSON with protocol/facility/date filters

### Technical

- **React 18** with TypeScript 5, lazy-loaded route-based code splitting
- **TanStack Query 5** for server state with auto-polling on key dashboards
- **Tailwind CSS 4** for utility-first styling
- **Recharts 2** for charts (area, bar, pie, funnel)
- **keycloak-js** for Keycloak OIDC authentication (PKCE, auto-refresh)
- **Cursor-based pagination** throughout all paginated views
- **Global filters** (date range + facility) applied across all data queries via React Context
- **Docker deployment** — multi-stage build (node:20 → caddy:2-alpine), Caddy reverse proxy to insights-service

### API Integration

- 34 endpoints consumed across 10 API groups (9 analytics + 1 lookups)
- Centralized API client with shared URL builder, auth header injection (`VITE_AUTH_TOKEN` or `sessionStorage`), and error handling
- Lookups API (`/lookups/protocols`, `/lookups/facilities`, `/lookups/practitioners`, `/lookups/sources`, `/lookups/patients`) for populating selectors
- Relative URL support for Docker (Caddy proxy) and absolute URL support for local development

## Docker Deployment

```bash
docker compose up -d --build
# UI available at http://localhost:3001
# API proxied to cce-insights-service:8084 on deploy-scripts_cce-net
```

## Known Limitations

- Protocol and Facility IDs are entered as free text (no dropdown selection from API)
- OAuth/gateway integration is configurable (`VITE_AUTH_ENABLED=true` + `VITE_AUTH_TOKEN`) — no gateway deployed locally
- No unit tests shipped in v1.0.0 (test infrastructure is in place with Vitest + Testing Library + MSW)

---

## Bug Fixes (post-release)

### Date format mismatch (Invalid request: undefined)
All API calls failed with `Invalid request: undefined` because the UI sent dates as `YYYY-MM-DD` but the Insights Service expects ISO 8601 `OffsetDateTime` (`2026-03-01T00:00:00Z`). The `useGlobalFilters` hook now converts dates via `toStartOfDayISO()` / `toEndOfDayISO()`.

### Error body unwrapping
The API returns errors as `{ error: { code, message } }` but `handleResponse` passed the outer object — so `body.message` was `undefined`. Fixed to unwrap `raw.error ?? raw`.

### ProtocolInstanceStatus casing (blank Patient Detail page)
The API returns `status: "ACTIVE"` (uppercase) but `STATUS_COLORS` had lowercase keys (`active`). Lookup returned `undefined`, then `color.bg` in `StatusBadge` crashed React. Changed `ProtocolInstanceStatus` type and `STATUS_COLORS` to uppercase (`ACTIVE`, `COMPLETED`, `WITHDRAWN`, `EXPIRED`). Added fallback colors for all badge lookups.

### Null-safe numeric rendering (toFixed / toLocaleString on null)
Several API fields return `null` instead of a number (`processingStatusBreakdown`, `avgDaysToResolve`, `lossRate`, etc.). All formatter functions (`formatNumber`, `formatPercentage`, `formatRate`) now accept `null | undefined` and return `'—'`. All pages guard nullable nested objects before accessing properties.

### ProcessingQuality data shape mismatch
The `processing-quality` API nests status counts under a `breakdown` object per source (`bySource[].breakdown.matched.count`) and uses `zero_match` (snake_case). The chart component now reads `d.breakdown?.matched?.count ?? 0` and handles missing fields gracefully.

### API client refactoring
Extracted shared `buildUrl()`, `authHeaders()`, and `handleResponse()` helpers from duplicated code in `apiGet` and `apiGetPaginated`. Changed default `BASE_URL` from `http://localhost:8084` to empty string (relative URLs) so Caddy proxy works in Docker. The exports module now reuses `buildUrl()` from the client.

### Caddy directive ordering
Initial Caddyfile used `try_files` and `reverse_proxy` at the same level, causing `try_files` to run before the proxy. Fixed by using `handle` blocks for proper routing precedence.

### Ingestion funnel chart colors
Both ACCEPTED and REJECTED bars rendered in black because the chart used raw `<rect>` elements instead of Recharts `<Cell>` components. Fixed to use `<Cell>` with proper color mapping: ACCEPTED (green `#22c55e`), REJECTED (red `#ef4444`).

### Auth token configuration
Added `VITE_AUTH_TOKEN` build-time environment variable for providing a gateway bearer token. When `VITE_AUTH_ENABLED=true`, the token is read from `VITE_AUTH_TOKEN` first, falling back to `sessionStorage('access_token')`.

### Keycloak OIDC integration
Added full Keycloak authentication support via `keycloak-js`. When `VITE_AUTH_ENABLED=true` and `VITE_KEYCLOAK_URL` is set, the app initializes Keycloak with Authorization Code flow + PKCE before rendering. The token is auto-refreshed every 30 seconds. Token priority: `VITE_AUTH_TOKEN` (static override) → `keycloak.token` (OIDC) → `sessionStorage('access_token')` (manual). New env variables: `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`. When Keycloak is not configured, the app renders normally (demo mode).

### Lookup API integration
Added `src/api/lookups.ts` module with 5 lookup endpoints (`/lookups/protocols`, `/lookups/facilities`, `/lookups/practitioners`, `/lookups/sources`, `/lookups/patients`) and corresponding `useLookups.ts` hook with 5-minute `staleTime` for populating protocol/facility/source selectors.
