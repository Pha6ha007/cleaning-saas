# PROJECT_AUDIT_AND_PLAN.md — Full Application Audit & Improvement Plan

**Created:** 2026-03-21
**Status:** Active
**Scope:** Full-stack audit of Proof Platform (CleanProof + MaintainProof)
**Author:** Automated audit + manual analysis

---

## 1. Audit Summary

### Project Scale

| Metric | Value |
|--------|-------|
| Frontend (dubai-control) | 255 files, ~64k lines TSX/TS |
| Backend (Django apps/) | ~32k lines Python |
| Backend tests | 845 passing |
| Frontend e2e tests | 62 smoke tests (Playwright) |
| Frontend unit tests | **0** (1 empty example file) |
| Mobile app tests | 37 passing (Jest) |
| Routes | 62 |
| API views | 149 |
| Bundle (gzip total JS) | ~700 KB |

### Completed Milestones (M001–M012)

All planned V3 work is complete. The platform has:

- ✅ CleanProof — production-stable, locked
- ✅ MaintainProof V1–V3 — full visit lifecycle, assets, calendar, map, parts, contracts, analytics, recurring schedules
- ✅ Platform marketing — landing, products, pricing, legal pages
- ✅ Auth — JWT + Token dual support, refresh token rotation
- ✅ Mobile Cleaner — login, jobs, check-in/out, photos, checklist, profile
- ✅ CI — GitHub Actions with 845 backend tests
- ✅ Docker + Nginx deployment config
- ✅ Vercel frontend deployment

---

## 2. Bugs Fixed (Session: 2026-03-21)

8 bugs found and fixed during this audit:

| # | Bug | File(s) | Severity |
|---|-----|---------|----------|
| 1 | `/settings/account` route missing → 404 | `App.tsx` | CRITICAL |
| 2 | 4 dead lazy imports (never used in routes) | `App.tsx` | LOW |
| 3 | Support Chat broken for JWT users (`Token` auth) | `api/support.ts` | CRITICAL |
| 4 | Dashboard trial start broken for JWT users | `Dashboard.tsx` | CRITICAL |
| 5 | Reports PDF download — wrong auth + wrong port | `Reports.tsx` | CRITICAL |
| 6 | Settings logo images — wrong fallback port 8000→8001 | `Settings.tsx` | MEDIUM |
| 7 | RecurringTemplates queryKey — object instead of array | `RecurringTemplates.tsx` | MEDIUM |
| 8 | 30 debug console.log lines in production | `CreateVisit.tsx`, `VisitDetail.tsx` | LOW |

Commits:
- `552892f` — fix: 8 bugs
- `44b72a0` — test: Playwright e2e smoke suite (62 tests)

---

## 3. Remaining Work (from documentation)

### 3.1 🔴 Billing Integration — No Automatic Payments

**Current state:** Manual activation via `activate_paid_plan` management command.
Billing page shows stubs (`501 Not Implemented` on invoices). No Paddle/Stripe.

**What's needed:**
- Payment processor integration (Paddle recommended per existing docs)
- Webhook handlers for subscription events
- Automatic plan activation/deactivation
- Invoice generation and download
- Self-serve upgrade flow

**References:** `docs/billing/TRIAL_FLOW.md`, `docs/commercial/COMMERCIAL_READINESS_CHECKLIST.md`

**Impact:** Blocks revenue. Currently every paying customer requires manual Django Admin intervention.

### 3.2 🔴 Contact Form Not Connected

**Current state:** `pages/platform/Contact.tsx` line 21 — `console.log("Form submitted:", formData)`. Data goes nowhere.
Backend marketing app has endpoints, but frontend doesn't call them.

**What's needed:**
- Wire Contact.tsx to `POST /api/marketing/contact/` (or create endpoint)
- Add success/error feedback
- Email notification to sales team

**Impact:** Potential customers lost — form silently discards their data.

### 3.3 🟡 Mobile UX Safety States

**Current state:** Documented as known limitation in `PROJECT_STATE.md`.
No loading/retry/error states on photo upload, check-in/out in mobile app.

**What's needed:**
- Loading indicators during photo upload
- Retry UI on network failure
- Error feedback on check-in/out failure

### 3.4 🟡 Deferred V4 Features (from STATE.md)

| Feature | Status |
|---------|--------|
| GPS check-in/out (mobile) | Deferred |
| Push notifications | Deferred |
| Offline form persistence | Deferred |
| Work Orders | Deferred |

---

## 4. Architecture Improvements

### 4.1 🔴 `client.ts` — God Module (3051 lines, 200 exports)

**Problem:** Single file contains ALL API logic: auth, refresh, all cleaning endpoints, types, helpers. Impossible to unit test, hard to maintain.

**Proposed split:**
```
src/api/
  auth.ts              — login, refresh, logout, storage keys (~150 lines)
  fetch.ts             — base apiFetch + interceptors + retry (~120 lines)
  types.ts             — shared API types
  cleaning/
    jobs.ts            — job CRUD, today jobs, force-complete
    reports.ts         — weekly/monthly reports, PDF, email
    analytics.ts       — KPIs, trends, cleaner performance
    planning.ts        — planning-specific endpoints
    locations.ts       — location CRUD
  settings.ts          — account, billing, company
```

**Effort:** 4 hours
**Risk:** Low — only import paths change, no logic changes. Run e2e tests after.

### 4.2 🟡 `views_maintenance.py` — God View (5511 lines)

**Problem:** Single Python file with ALL maintenance views. Violates Django conventions.

**Proposed split:**
```
views_maintenance/
  __init__.py          — re-exports for URL compatibility
  visits.py            — visit CRUD, status transitions
  assets.py            — asset/asset-type CRUD
  templates.py         — recurring templates, checklists
  analytics.py         — maintenance analytics views
  reports.py           — maintenance PDF reports
```

**Effort:** 3 hours
**Risk:** Low — split along existing class boundaries, update imports in urls.py.

### 4.3 🔴 No Route Guards — Auth Via 401 Redirect

**Problem:** Protected pages render fully, fire API calls, get 401, THEN redirect to `/login`. Causes:
- Content flash before redirect
- Unnecessary API calls
- Poor UX (loading → error → redirect)

**Proposed fix:**
```tsx
// src/components/auth/ProtectedRoute.tsx
function ProtectedRoute({ children }) {
  const hasToken = !!localStorage.getItem("access_token");
  if (!hasToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// App.tsx — wrap protected routes
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  ...all protected routes...
</Route>
```

**Effort:** 2 hours
**Risk:** Low — additive change, existing redirect logic stays as fallback.

### 4.4 🟡 Single Error Boundary — One Crash Kills Everything

**Problem:** Only one top-level `Sentry.ErrorBoundary`. Any component error → full app crash screen.

**Proposed fix:** Add route-level error boundaries:
```tsx
// Wrap each <Route> element in page-level boundary
<Route path="/dashboard" element={
  <PageErrorBoundary pageName="Dashboard">
    <Dashboard />
  </PageErrorBoundary>
} />
```

**Effort:** 3 hours — create `PageErrorBoundary` component + wrap all routes.

---

## 5. Code Quality

### 5.1 🟡 42 `console.log` Remaining in Production Code

**Worst offenders:**
| File | Count | Content |
|------|-------|---------|
| `hooks/usePhotoSync.ts` | 22 | Photo sync debug traces |
| `pages/maintenance/Assets.tsx` | 5 | CRUD debug logs |
| `components/maintenance/PhotoCapture.tsx` | 3 | Photo capture traces |
| `hooks/useOfflinePhotos.ts` | 3 | Compression logs |
| `hooks/useOnlineStatus.ts` | 3 | Online/offline events |
| Other (6 files) | 6 | Mixed |

**Proposed fix:** Remove all debug logs. Keep only `console.error` for real errors, `console.warn` for auth warnings.

**Effort:** 1 hour

### 5.2 🟡 186 Uses of `any` Type

**Problem:** Undermines TypeScript safety. Main sources:
- `client.ts` — API response parsing (`as any`)
- Catch blocks — `catch (err: any)`
- Component props — lazy typing

**Proposed fix:** Phase approach:
1. Replace `catch (err: any)` → `catch (err: unknown)` + type narrowing
2. Add proper API response types for most-used endpoints
3. Address remaining `as any` casts

**Effort:** 6 hours (phased over multiple sessions)

### 5.3 🟡 7 eslint-disable + 1 @ts-ignore

| File | Suppression | Risk |
|------|-------------|------|
| `CreateJobDrawer.tsx` | `exhaustive-deps` | Stale closure possible |
| `PlanningFilters.tsx` | `exhaustive-deps` | Stale closure possible |
| `LocationMapPicker.tsx` | `exhaustive-deps` | Stale closure possible |
| `usePhotoSync.ts` | `exhaustive-deps` | Stale closure possible |
| `Settings.tsx` | `exhaustive-deps` | Stale closure possible |
| `Billing.tsx` | `exhaustive-deps` | Stale closure possible |
| `VisitsLovableLayout.tsx` | `@ts-ignore` | Type mismatch hidden |

**Proposed fix:** Audit each — fix the dependency or document why it's intentionally excluded.

**Effort:** 2 hours

### 5.4 🔴 Zero Frontend Unit Tests

**Problem:** 64k lines of frontend code, 0 unit tests. Only e2e smoke tests exist.

**Proposed test targets (highest value):**
1. `apiFetch` + token refresh logic — most critical shared code
2. `normalizeTime`, `mapApiJobToUi` — data transformation
3. `compute SLA helpers` — business logic
4. Form validation functions
5. Date range / filter helpers

**Effort:** 4 hours for core utility tests
**Framework:** Vitest (already installed)

---

## 6. Performance

### 6.1 🟡 Bundle Size — 3 Chunks Over 400KB

| Chunk | Size | Gzip | Issue |
|-------|------|------|-------|
| `vendor-spreadsheet` | 424 KB | 141 KB | xlsx library loaded eagerly |
| `vendor-misc` | 467 KB | 153 KB | Mixed vendor code |
| `chunk-cleaning-app` | 509 KB | 118 KB | All cleaning pages in one chunk |

**Proposed fixes:**
- **xlsx:** Dynamic `import()` only when user clicks "Export" button → saves 141KB gzip for all non-export users
- **vendor-misc:** Analyze with `rollup-plugin-visualizer`, identify tree-shakeable imports
- **chunk-cleaning-app:** Split into route-level chunks (Dashboard, Reports, Analytics as separate lazy chunks — already lazy-loaded but bundled together)

**Effort:** 4 hours
**Impact:** First-load improvement ~140KB gzip minimum.

### 6.2 🟢 No Skeleton Loading Screens

**Problem:** Dashboard, Jobs, Reports show "Loading jobs..." text instead of skeleton placeholders. Perceived performance feels slow.

**Proposed fix:** Replace text loaders with skeleton screens on Dashboard, Jobs, History (3 most-visited pages).

**Effort:** 2 hours

---

## 7. Accessibility

### 7.1 🟡 Login Form — No Label Association

**Problem:** Custom `IconInput` component uses `<Label>` without `htmlFor` and `<Input>` without `id`. Screen readers can't associate labels with inputs.

**Proposed fix:** Add `id` prop to `IconInput`, wire `htmlFor` on Label.

**Effort:** 1 hour

### 7.2 🟢 Zero `aria-*` Attributes on Pages

**Problem:** 0 `aria-label`, `aria-describedby`, `aria-live` on any page component (only in shared UI primitives). Dynamic content (loading states, error messages, toast notifications) not announced to screen readers.

**Proposed fix:** Start with highest-traffic pages — Dashboard, Login, Jobs.

**Effort:** 3 hours

---

## 8. DevOps / Infrastructure

### 8.1 🔴 Frontend E2E Tests Not in CI

**Problem:** 62 Playwright tests pass locally but aren't in `.github/workflows/ci.yml`.

**Proposed fix:** Add job to CI:
```yaml
frontend-e2e:
  name: Frontend E2E (Playwright)
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: ./dubai-control
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
        cache-dependency-path: dubai-control/package-lock.json
    - run: npm ci
    - run: npx playwright install chromium --with-deps
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v4
      if: failure()
      with:
        name: playwright-report
        path: dubai-control/playwright-report/
```

**Effort:** 1 hour

### 8.2 🟢 No Staging Environment

**Current:** Production (Vercel) + localhost only. No way to test with real backend before deploying to production.

**Proposed:** Add staging branch with auto-deploy to separate Vercel project.

---

## 9. Internationalization (i18n)

### 9.1 🟢 No i18n Infrastructure

**Problem:** Project targets UAE/Gulf region. Docs mention Arabic support as future need. All 64k lines have hardcoded English strings. Retrofitting i18n is exponentially harder as codebase grows.

**Proposed fix:** Install `react-i18next`, extract strings from top 5 pages into JSON locale files. Even with only English locale — the extraction infrastructure is what matters.

**Effort:** 6 hours (infrastructure + 5 pages extracted)

---

## 10. Prioritized Execution Plan

### Phase 1 — Critical Fixes (1 day)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1.1 | Wire Contact form to backend | 2h | Leads captured |
| 1.2 | Add ProtectedRoute guard | 2h | UX + security |
| 1.3 | Add frontend e2e to CI | 1h | CI coverage |
| 1.4 | Remove 42 console.log | 1h | Code hygiene |

### Phase 2 — Stability & Testing (2 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 2.1 | Route-level Error Boundaries | 3h | App resilience |
| 2.2 | Frontend unit tests (core utils) | 4h | Regression safety |
| 2.3 | Login form accessibility (htmlFor/id) | 1h | Accessibility |
| 2.4 | Audit eslint-disable suppressions | 2h | Bug prevention |

### Phase 3 — Architecture (2–3 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 3.1 | Split `client.ts` into modules | 4h | Maintainability |
| 3.2 | Split `views_maintenance.py` | 3h | Backend maintainability |
| 3.3 | Lazy-load xlsx library | 2h | -140KB gzip first load |
| 3.4 | Skeleton loading (Dashboard, Jobs, History) | 2h | Perceived performance |

### Phase 4 — Polish & Scale Prep (3–4 days)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 4.1 | Replace `any` types (phased) | 6h | Type safety |
| 4.2 | i18n infrastructure | 6h | Future-proofing |
| 4.3 | Page-level accessibility audit | 3h | WCAG compliance |
| 4.4 | Bundle analysis + optimization | 4h | Performance |

### Phase 5 — Revenue (timeline TBD)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 5.1 | Paddle billing integration | 2–3 days | Revenue |
| 5.2 | Mobile UX safety states | 1–2 days | Mobile reliability |
| 5.3 | Staging environment | 1 day | Deploy safety |

---

## 11. Test Coverage Targets

| Layer | Current | Target |
|-------|---------|--------|
| Backend unit/integration | 845 tests | Maintain |
| Frontend e2e (Playwright) | 62 tests | 80+ (add critical path tests) |
| Frontend unit (Vitest) | 0 tests | 50+ (core utils, hooks, API client) |
| Mobile (Jest) | 37 tests | Maintain |

---

## 12. Verification Commands

```bash
# TypeScript type check (should be 0 errors)
cd dubai-control && npx tsc --noEmit

# Production build (should pass clean)
cd dubai-control && npm run build

# E2E smoke tests (62 tests, all routes)
cd dubai-control && npm run test:e2e

# Backend tests (845 tests)
cd backend && python -m pytest tests/ -q

# Mobile tests (37 tests)
cd mobile-cleaner && npm test
```

---

**END OF DOCUMENT**
