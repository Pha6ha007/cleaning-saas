# GSD State

**Active Milestone:** — (Phase 1–3 complete)
**Status:** in-progress

## Milestone Registry
- ✅ M001-sijc46: Launch-Ready Billing & Auth (71 tests)
- ✅ M002: Observability, API Docs, WhatsApp & Beat Management (141 tests)
- ✅ M003: Mobile JWT, Bulk Import, Photo Watermarking & Outgoing Webhooks (215 tests)
- ✅ M004: Arabic Bilingual PDFs, Self-Registration, Live Analytics & Notification Preferences (305 tests)
- ✅ M005: Multi-Branch, Recurring Jobs, Advanced SLA & Audit Log Viewer (421 tests)
- ✅ M006: Performance, E2E Testing, Mobile Offline & Rate Limiting (477 tests)
- ✅ M007: Production Deploy Prep — Docker, Nginx, CI/CD, Runbook (477 tests)
- ✅ M008: MaintainProof Test Coverage & Frontend Hardening (607 tests)
- ✅ M009: MaintainProof — Remaining 25 Views (746 tests)
- ✅ M010: Customer Portal — Backend Test Coverage (821 tests)
- ✅ M011: Webhook Reliability + DB Indexes + Admin Panel (845 tests)
- ✅ M012: Mobile Cleaner App — Profile Screen (845 backend / 37 mobile)

## Improvement Plan Progress

### Phase 1 — Critical Fixes ✅ DONE (015cc60)
- [x] Wire Contact form to backend (+ phone field migration)
- [x] Add ProtectedRoute guard (redirects to /login)
- [x] Add frontend e2e to CI pipeline
- [x] Remove 38 debug console.log (4 remain in LOCKED files)

### Phase 2 — Stability & Testing ✅ DONE (015cc60)
- [x] Route-level Error Boundaries (46 routes wrapped)
- [x] Frontend unit tests: 0 → 61 (CSV, auth, query keys, image utils)
- [x] Login form accessibility (htmlFor/id + aria-label)
- [x] Audit eslint-disable suppressions (all 7 verified as intentional)

### Phase 3 — Architecture (116cbfd) — partial
- [ ] Split client.ts (3051 lines → modules) — DEFERRED (high-risk, needs dedicated session)
- [ ] Split views_maintenance.py (5511 lines → modules) — DEFERRED (high-risk, needs dedicated session)
- [x] Dynamic xlsx imports at call sites (TechniciansPage, Contracts, RecurringTemplates, Locations)
  - Note: xlsx vendor chunk still 424KB because src/lib/csv.ts (LOCKED) eagerly imports XLSX
  - Full optimization requires unlocking src/lib/csv.ts and src/lib/excel-export.ts
- [x] Dashboard skeleton loading (replaced text with animated skeletons)

### Phase 4 — Polish & Scale (next)
- [ ] Replace `any` types (186 occurrences)
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
- Frontend build: clean
- TypeScript: 0 errors

## Commits This Session
- `552892f` — fix: 8 bugs found during audit
- `44b72a0` — test: Playwright e2e smoke suite (62 tests)
- `a5e3201` — docs: full project audit & 5-phase plan
- `015cc60` — feat: Phase 1–2 (auth guard, contact form, error boundaries, 61 unit tests)
- `116cbfd` — perf: Phase 3 partial (dynamic xlsx imports, dashboard skeleton)

## Full Audit
See `docs/audit/PROJECT_AUDIT_AND_PLAN_2026-03-21.md`
