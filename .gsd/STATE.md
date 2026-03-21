# GSD State

**Active Milestone:** Improvement Plan (Phases 1–4)
**Status:** mostly complete

## Improvement Plan Progress (from audit 2026-03-21)

### Phase 1 — Critical Fixes ✅ DONE
- [x] Wire Contact form to backend (+ phone field migration)
- [x] Add ProtectedRoute guard (redirects to /login with redirect-back)
- [x] Add frontend e2e to CI pipeline (Playwright job + gate)
- [x] Remove 38 debug console.log (4 remain in LOCKED files)

### Phase 2 — Stability & Testing ✅ DONE
- [x] Route-level Error Boundaries (46 routes wrapped)
- [x] Frontend unit tests: 0 → 61
- [x] Login form accessibility (htmlFor/id + aria-label)
- [x] Audit eslint-disable suppressions (all 7 verified)

### Phase 3 — Architecture (partial)
- [x] Dynamic xlsx imports at call sites (4 files)
- [x] Dashboard skeleton loading
- [ ] Split client.ts (3051 lines) — DEFERRED
- [ ] Split views_maintenance.py (5511 lines) — DEFERRED

### Phase 4 — Quality & Performance ✅ DONE (unlocked scope)
- **Type safety: 186 → 107 any (43% reduction)**
  - 50 in LOCKED files, 18 in client.ts, 39 remaining unlocked
  - ApiError type + getApiErrorMessage/getApiErrorCode utilities
  - 79 individual any→typed fixes across 25+ files
- **Bundle optimization: vendor-misc 154→131 KB gzip (-15%)**
  - Split vendor-dnd (13KB), vendor-paddle (5KB), vendor-qrcode (6KB)
  - These load lazily only when needed (calendar/billing/QR pages)
- [ ] i18n infrastructure — DEFERRED
- [ ] Accessibility audit — DEFERRED

### Phase 5 — Revenue (not started)
- [ ] Paddle billing integration
- [ ] Mobile UX safety states  
- [ ] Staging environment

## Test Totals
- Backend: 845 | Frontend E2E: 62 | Frontend Unit: 61 | Mobile: 37
- **Total: 1005 tests** — TSC: 0 errors — Build: clean

## Session Commits (2026-03-21)
1. `552892f` — fix: 8 bugs
2. `44b72a0` — test: 62 e2e tests
3. `a5e3201` — docs: project audit & plan
4. `015cc60` — feat: Phase 1–2
5. `116cbfd` — perf: Phase 3 partial
6. `f37bd35` — refactor: catch any → unknown
7. `1911aae` — refactor: 45× any in maintenance
8. `336b2a8` — refactor: TechniciansPage, Login, Locations
9. `c96a0ca` — refactor: 20 more any
10. `9ba08c8` — fix: missing SuspenseFallback (Vercel deploy fix)
11. `303e8c9` — perf: vendor chunk splitting (-23KB gzip)
