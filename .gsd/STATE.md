# GSD State

**Active Milestone:** — (audit complete, ready for Phase 1)
**Status:** planning

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

## Full Audit (2026-03-21)

**8 bugs found and fixed:**
1. Missing `/settings/account` route → 404 (CRITICAL)
2. Dead lazy imports — 4 unused CleanProof marketing components
3. Support Chat broken for JWT users — wrong auth scheme (CRITICAL)
4. Dashboard trial start broken for JWT users (CRITICAL)
5. Reports PDF download — wrong auth + wrong port (CRITICAL)
6. Settings logo — wrong fallback port 8000→8001
7. RecurringTemplates queryKey — object instead of array
8. 30 debug console.log in production code

**62 Playwright e2e smoke tests added** — all routes covered.

**Full improvement plan:** `docs/audit/PROJECT_AUDIT_AND_PLAN_2026-03-21.md`

## Test Totals
- Backend: 845/845
- Frontend E2E: 62/62 (Playwright)
- Mobile Jest: 37/37
- Frontend build: clean
- TypeScript: 0 errors

## Prioritized Next Actions (from audit)

### Phase 1 — Critical Fixes (1 day)
- [ ] Wire Contact form to backend (leads being lost)
- [ ] Add ProtectedRoute guard (auth UX)
- [ ] Add frontend e2e to CI pipeline
- [ ] Remove remaining 42 console.log

### Phase 2 — Stability & Testing (2 days)
- [ ] Route-level Error Boundaries
- [ ] Frontend unit tests (core utils — apiFetch, SLA, date helpers)
- [ ] Login form accessibility (htmlFor/id)
- [ ] Audit eslint-disable suppressions

### Phase 3 — Architecture (2–3 days)
- [ ] Split client.ts (3051 lines → 6 modules)
- [ ] Split views_maintenance.py (5511 lines → 6 modules)
- [ ] Lazy-load xlsx library (-140KB gzip)
- [ ] Skeleton loading screens

### Phase 4 — Polish & Scale
- [ ] Replace `any` types (186 occurrences)
- [ ] i18n infrastructure
- [ ] Accessibility audit
- [ ] Bundle optimization

### Phase 5 — Revenue
- [ ] Paddle billing integration
- [ ] Mobile UX safety states
- [ ] Staging environment

## Deferred (V4)
- GPS check-in/out (mobile)
- Push notifications
- Offline form persistence
- Work Orders
