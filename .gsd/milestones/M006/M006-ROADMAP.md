# M006: Performance, E2E Testing, Mobile Offline & Rate Limiting

## Goal

Four production-hardening tracks that make CleanProof enterprise-ready:

1. **Frontend performance** — route-based code splitting (fix 2.7 MB bundle), React.lazy + Suspense
   on all major routes, API response caching via Django cache framework (Redis-backed).
2. **E2E testing (Playwright)** — critical path coverage: signup → trial → create job → check-in →
   photo upload → checkout → PDF report → billing upgrade. Runs in CI against a test Django server.
3. **Mobile offline-first** — persistent offline job cache, checklist state that survives restart,
   photo upload queue (outbox) that syncs on reconnect. Uses existing `AsyncStorage` + `NetInfo`.
4. **Rate limiting & API keys** — per-endpoint granular throttle scopes, Enterprise API key model,
   key-authenticated requests bypass user throttle, usage tracking dashboard at
   `GET /api/enterprise/api-keys/usage/`.

## Scope Decisions

### S01 — Frontend Code Splitting & API Caching
**Frontend (code splitting):**
- `React.lazy` + `Suspense` on every route in `App.tsx` except Login/Signup (above the fold)
- `vite.config.ts` `manualChunks`: vendor (react/react-dom), ui (shadcn/radix), maintenance context,
  cleaning context — target ≤ 400 KB per chunk after gzip
- `<SuspenseFallback>` skeleton component shared across all lazy routes
- **Locked files not touched**: existing page components unchanged; only `App.tsx` import style changes

**Backend (API caching):**
- `CACHES` config in `settings.py` using `django-redis` (falls back to `LocMemCache` in test)
- New `apps/api/cache_utils.py`: `cache_manager_response(key, ttl, fn)` helper + invalidation
- Cache applied to: `GET /api/analytics/live/` (already has 30s cache — migrate to Django cache),
  `GET /api/sla-policies/` (60s), `GET /api/branches/<id>/analytics/` (120s)
- Cache invalidated on write operations via signal or explicit `cache.delete(key)`
- No locked views touched; cache only on new/unlocked endpoints

**Tests:** ~15 (Vite config chunk assertions via build output analysis; Django cache hit/miss headers)

### S02 — E2E Testing (Playwright)
- New `e2e/` directory at repo root with `playwright.config.ts`
- Django test server started via `pytest-django` fixture exported as `live_server`; Playwright connects
- Critical flow tests (one file per flow):
  - `e2e/flows/auth.spec.ts` — signup form, email verification mock, login
  - `e2e/flows/job_lifecycle.spec.ts` — create job, assign cleaner, check-in (GPS mock), photo upload,
    checklist completion, check-out, PDF download
  - `e2e/flows/billing.spec.ts` — trial banner visible, Paddle checkout modal opens (mock)
  - `e2e/flows/branches.spec.ts` — create branch, assign location, view analytics
- Shared `e2e/fixtures/` — API seeding helpers (create company/user/job via direct DB or API)
- `e2e/fixtures/server.ts` — starts Django dev server on random port, tears down after suite
- **Out of scope**: Full Paddle payment flow (requires live sandbox); mobile E2E

**Tests:** ~20 Playwright specs (each spec = 1 test in our count)

### S03 — Mobile Offline-First
- `mobile-cleaner/src/offline/outbox.ts` — persistent outbox using `AsyncStorage`:
  - `enqueue(item: OutboxItem)` — append to queue
  - `flush(apiClient)` — process queue in order; on success remove item; on network error leave
  - `getQueue()` — read current queue
  - `removeItem(id)` — remove by ID
  - Items get a `id` (UUID) and `retriesLeft` (default 3)
- `mobile-cleaner/src/offline/jobCache.ts` — job detail + checklist cache:
  - `cacheJob(job)` / `getCachedJob(id)` / `getCachedJobList()`
  - `saveChecklistState(jobId, items)` / `loadChecklistState(jobId)`
  - TTL: 24h for job detail, checklist has no TTL (persists until synced)
- `JobDetailsScreen.tsx` — wire outbox: photo uploads go through `enqueue()` when offline;
  checklist bulk-save goes through `enqueue()` when offline
- `JobsScreen.tsx` — show cached job list when offline
- `mobile-cleaner/src/services/syncService.ts` — `NetInfo` listener that calls `outbox.flush()`
  on reconnect; started in app root
- **No new backend endpoints required** — uses existing upload/checklist APIs
- **Locked files**: `views_cleaner.py` not touched; existing API contract unchanged

**Tests:** Jest unit tests for outbox (enqueue/flush/retry/dedup) + jobCache ~15 tests

### S04 — Granular Rate Limiting & Enterprise API Keys
**Rate limiting:**
- New `apps/api/throttles.py`:
  - `CheckInThrottle(ScopedRateThrottle)` — scope `check_in`: 60/hour per user
  - `PhotoUploadThrottle` — scope `photo_upload`: 120/hour per user
  - `WebhookDeliveryThrottle` — scope `webhook`: 1000/day per company
  - `ManagerDashboardThrottle` — scope `manager_dashboard`: 300/hour per user
- Wire throttle classes to relevant unlocked views; locked views untouched
- Add throttle scopes to `REST_FRAMEWORK.DEFAULT_THROTTLE_RATES` in settings

**Enterprise API Keys:**
- New `EnterpriseApiKey` model in `apps/api/` (or new `apps/api_keys/`):
  - `company` FK, `name`, `key_hash` (SHA-256 of raw key), `prefix` (first 8 chars for display),
    `scopes` (JSONField list: `["webhooks", "audit_log", "analytics"]`),
    `is_active`, `last_used_at`, `request_count`, `created_at`
  - `generate()` classmethod — returns `(instance, raw_key)`; raw key shown once
  - `verify(raw_key)` — timing-safe compare against hash
- `EnterpriseApiKeyAuthentication` — DRF authentication class; looks for `X-API-Key` header
- New views: `GET/POST /api/enterprise/api-keys/`, `DELETE /api/enterprise/api-keys/<id>/`,
  `GET /api/enterprise/api-keys/usage/` (per-key request counts, last_used_at)
- Throttle bypass: API key auth → `ApiKeyRateThrottle` with higher limits (10000/day)
- Migration for `EnterpriseApiKey`

**Tests:** ~20 (throttle scope tests, API key CRUD, auth bypass, usage endpoint)

## Slices

- [ ] **S01: Frontend Performance + API Caching** `risk:low` `depends:[]`
- [ ] **S02: E2E Testing (Playwright)** `risk:medium` `depends:[]`
- [ ] **S03: Mobile Offline-First** `risk:medium` `depends:[]`
- [ ] **S04: Rate Limiting & Enterprise API Keys** `risk:low` `depends:[]`

## Test Targets
- S01: ~15 tests (cache hit/miss, chunk size assertion)
- S02: ~20 Playwright specs
- S03: ~15 Jest unit tests (outbox + cache)
- S04: ~20 backend tests
- **Total M006 target: ~491 tests (421 existing + 70 new)**

## Key Decisions
- Code splitting: only `App.tsx` import changes — no locked page files touched
- API caching: new `cache_utils.py` only; no locked view modifications
- E2E: separate `e2e/` directory; Django server fixture not pytest (avoids test DB conflicts)
- Outbox: `AsyncStorage`-backed; UUID item IDs; retry-3 default; flush on NetInfo reconnect
- API keys: SHA-256 hash stored (not plaintext); raw key shown once at creation
- Enterprise gate: API key creation requires `plan_tier == enterprise`
- Locked views: `views_manager_jobs.py`, `views_cleaner.py` — no throttle classes added
