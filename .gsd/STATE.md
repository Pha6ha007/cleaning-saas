# GSD State

**Active Milestone:** Phase 4 — Type Safety
**Status:** in-progress

## Improvement Plan Progress (from audit 2026-03-21)

### Phase 1 — Critical Fixes ✅ DONE
- [x] Wire Contact form to backend (+ phone field migration)
- [x] Add ProtectedRoute guard (redirects to /login with redirect-back)
- [x] Add frontend e2e to CI pipeline (Playwright job + gate)
- [x] Remove 38 debug console.log (4 remain in LOCKED files)

### Phase 2 — Stability & Testing ✅ DONE
- [x] Route-level Error Boundaries (46 routes wrapped with PageErrorBoundary)
- [x] Frontend unit tests: 0 → 61 (CSV, auth, query keys, image utils)
- [x] Login form accessibility (htmlFor/id + aria-label)
- [x] Audit eslint-disable suppressions (all 7 verified as intentional)

### Phase 3 — Architecture (partial)
- [x] Dynamic xlsx imports at call sites (4 files)
- [x] Dashboard skeleton loading
- [ ] Split client.ts (3051 lines) — DEFERRED
- [ ] Split views_maintenance.py (5511 lines) — DEFERRED

### Phase 4 — Type Safety ✅ (unlocked files complete)
- **any count: 186 → 107 (79 removed, 43% reduction)**
- [x] catch(err: any) → catch(err: unknown) + instanceof Error
- [x] ApiError type + getApiErrorMessage/getApiErrorCode utilities
- [x] 32× onError any → unknown in 12 maintenance pages
- [x] 5× onError any → unknown + getApiErrorMessage in TechniciansPage
- [x] completionErrors.ts: typed assertions
- [x] ViolationJobsPage: extended ViolationJob type (6× as any removed)
- [x] ReportEmailLogs: ExtendedEmailLog type (7× as any removed)
- [x] AddressAutocompleteInput: google.maps types (3× as any removed)
- [x] Login, Locations, LocationsOld: typed assertions
- Remaining 107: 50 LOCKED, 18 client.ts, 39 other (most are enum casts, window.google, etc.)
- [ ] i18n infrastructure
- [ ] Accessibility audit
- [ ] Bundle optimization

### Phase 5 — Revenue
- [ ] Paddle billing integration
- [ ] Mobile UX safety states
- [ ] Staging environment

## Test Totals
- Backend: 845/845
- Frontend E2E: 62/62 (Playwright)
- Frontend Unit: 61/61 (Vitest)
- Mobile Jest: 37/37
- **Total: 1005 tests**
- TypeScript: 0 errors | Build: clean

## Session Commits (2026-03-21)
1. `552892f` — fix: 8 bugs
2. `44b72a0` — test: 62 e2e tests
3. `a5e3201` — docs: project audit & plan
4. `015cc60` — feat: Phase 1–2
5. `116cbfd` — perf: Phase 3 partial
6. `f37bd35` — refactor: catch any → unknown
7. `1911aae` — refactor: 45× any → typed in maintenance
8. `336b2a8` — refactor: TechniciansPage, Login, Locations
9. `c96a0ca` — refactor: 20 more any (ViolationJobs, ReportEmailLogs, Google Maps)
