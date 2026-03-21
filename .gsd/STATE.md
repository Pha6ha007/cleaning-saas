# GSD State

**Active Milestone:** — (Phase 1–4 in progress)
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
- [ ] Split client.ts (3051 lines) — DEFERRED (dedicated session)
- [ ] Split views_maintenance.py (5511 lines) — DEFERRED (dedicated session)

### Phase 4 — Type Safety (in progress)
- [x] catch(err: any) → catch(err: unknown) + instanceof Error (7 catches in 5 non-maint files)
- [x] ApiError type + getApiErrorMessage/getApiErrorCode utilities in maintenance.ts
- [x] 32× onError any → unknown in 12 maintenance page files
- [x] 5× onError any → unknown in TechniciansPage
- [x] 3× (error as any) → typed assertions in completionErrors.ts
- [x] Login.tsx: location.state + res.json() properly typed
- [x] Locations.tsx: onError any → unknown
- [x] LocationsOld.tsx: raw as any → String(raw)
- [x] Dashboard maintenance: as any → readonly string[]
- [x] VisitDetail: item: any → typed checklist items
- **any count: 186 → 127 (59 removed, 31% reduction)**
  - 50 in LOCKED files (untouchable)
  - 18 in client.ts (needs file split first)
  - 59 in unlocked files (ongoing)
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
- TypeScript: 0 errors
- Build: clean

## Session Commits (2026-03-21)
1. `552892f` — fix: 8 bugs found during audit
2. `44b72a0` — test: Playwright e2e smoke suite (62 tests)
3. `a5e3201` — docs: full project audit & 5-phase plan
4. `015cc60` — feat: Phase 1–2 (auth guard, contact form, error boundaries, 61 unit tests, CI)
5. `116cbfd` — perf: Phase 3 (dynamic xlsx imports, dashboard skeleton)
6. `86789de` — docs: STATE.md update
7. `f37bd35` — refactor: Phase 4 catch any → unknown (5 files)
8. `40aa019` — docs: STATE.md update
9. `1911aae` — refactor: 45× any → typed in maintenance pages + ApiError utilities
10. `336b2a8` — refactor: any → typed in TechniciansPage, Login, Locations

## Full Audit
See `docs/audit/PROJECT_AUDIT_AND_PLAN_2026-03-21.md`
