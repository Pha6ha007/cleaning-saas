---
id: S02
milestone: M001-sijc46
provides:
  - JWT Bearer auth on all manager-facing backend views (74 views across 6 files)
  - Token auth retained on same views (dual auth — mobile unaffected)
  - Cleaner views remain Token-only (JWT rejected — verified by test)
  - Frontend apiFetch/apiFetchBlob send Authorization: Bearer header
  - 401 auto-refresh interceptor with dedup (single _refreshPromise, no storm)
  - Login.tsx calls JWT endpoint, stores access_token + refresh_token
  - AccountDropdown logout blacklists refresh token before clearing localStorage
  - All 7 raw fetch() calls (file upload, import/export, visit photo) fixed to Bearer
  - Dev fallback loginManager() uses JWT endpoint
  - 38 tests passing: 19 S01 + 19 S02
requires:
  - slice: S01
    provides: JWT endpoints (login/refresh/logout), JWTAuthentication in DRF global settings
affects: [S03, S04, S05]
key_files:
  - backend/apps/api/views_manager_jobs.py (LOCKED — additive JWT auth change)
  - backend/apps/api/views_manager_company.py (LOCKED — additive)
  - backend/apps/api/views_reports.py (LOCKED — additive)
  - backend/apps/api/views_maintenance.py
  - backend/apps/api/views_company.py
  - backend/apps/support/views.py
  - backend/tests/test_s02_jwt_migration.py (new — 19 tests)
  - dubai-control/src/api/client.ts (STORAGE_KEYS, syncTokenFromStorage, apiFetch, loginManager, _refreshTokens)
  - dubai-control/src/pages/Login.tsx (JWT endpoint, stores access_token + refresh_token)
  - dubai-control/src/components/layout/AccountDropdown.tsx (async logout with blacklist)
key_decisions:
  - "Dual auth on all manager views: [JWTAuthentication, TokenAuthentication] — never replace Token"
  - "STORAGE_KEYS constants in client.ts — access_token, refresh_token, legacy fallbacks"
  - "_refreshPromise dedup pattern — prevents concurrent 401 refresh storms"
  - "Logout navigates to /login (not /) — user lands on sign-in form"
patterns_established:
  - "localStorage keys: access_token (JWT), refresh_token (JWT), authToken/auth_token (legacy compat)"
  - "apiFetch signature: apiFetch<T>(path, options, _retried=false) — retried flag prevents infinite loop"
  - "_refreshTokens() module-level dedup: let _refreshPromise: Promise<void> | null = null"
  - "Bearer header everywhere: Authorization: Bearer ${token} — no more Token prefix on manager portal"
drill_down_paths:
  - .gsd/milestones/M001-sijc46/slices/S02/S02-PLAN.md
  - backend/tests/test_s02_jwt_migration.py
duration: ~45min
verification_result: pass
completed_at: 2026-03-16T23:59:00Z
---

# S02: Manager Portal JWT Migration

**JWT migration complete — manager portal authenticates with Bearer tokens, auto-refresh works, logout blacklists. 38 tests passing. Token auth unaffected.**

## What Happened

**Backend:** Added `JWTAuthentication` alongside `TokenAuthentication` on 74 manager-facing view classes across 6 files. Pattern is purely additive — `authentication_classes = [JWTAuthentication, TokenAuthentication]`. Three files required user confirmation (LOCKED). Cleaner views and customer portal views untouched — remain Token-only (verified by test).

**Frontend:** Rewrote the auth layer in `client.ts`:
- `STORAGE_KEYS` constants define localStorage keys (`access_token`, `refresh_token`, legacy `authToken`/`auth_token`)
- `syncTokenFromStorage()` prefers JWT access token, falls back to legacy Token for existing sessions
- `apiFetch()` sends `Authorization: Bearer` header; on 401 calls `_refreshTokens()` (with `_refreshPromise` dedup to prevent concurrent refresh storms) then retries once; on refresh failure calls `_clearAuthAndRedirect()`
- `apiFetchBlob()` updated to Bearer header
- `loginManager()` dev fallback switched to JWT endpoint
- All 7 raw `fetch()` calls (asset documents, export, import, import template, visit photo upload/delete, logo upload) updated from `Token` to `Bearer`
- `Login.tsx` posts to `/api/manager/auth/jwt/login/`, stores `access_token` + `refresh_token`
- `AccountDropdown` logout is now async: calls `/api/manager/auth/jwt/logout/` with refresh token, clears all auth keys, navigates to `/login`

## Forward Intelligence for S03/S04

- **S04 needs JWT-aware API client** — it's already ready. All `apiFetch` calls in `client.ts` use Bearer headers and auto-refresh. S04 billing endpoints will just work.
- **S03 webhook endpoint is unauthenticated** — no auth changes needed for the Paddle webhook view.
- **No Token removal yet** — both Token and JWT work on all manager views. Token can be removed from manager views only after mobile migrates (future milestone).
- **localStorage coexistence** — If an existing user has an old `authToken` in localStorage, `syncTokenFromStorage` will use it transparently until they log in again (which stores `access_token`). No forced logout for existing sessions.
- **Trial token expiry is 30 days** — generous, but once S05 adds plan enforcement the 401 auto-refresh path will be exercised when tokens expire during a session.

## Verification

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | JWT Bearer accepted on manager jobs views | ✓ PASS | test_jwt_bearer_on_manager_jobs_today/active |
| 2 | JWT Bearer accepted on manager company views | ✓ PASS | test_jwt_bearer_on_manager_company |
| 3 | JWT Bearer accepted on reports views | ✓ PASS | test_jwt_bearer_on_weekly/monthly_report |
| 4 | JWT Bearer accepted on maintenance views | ✓ PASS | test_jwt_bearer_on_service_visits |
| 5 | JWT Bearer accepted on company profile views | ✓ PASS | test_jwt_bearer_on_company_profile |
| 6 | Token auth still works on manager views | ✓ PASS | test_token_still_works_on_* (5 tests) |
| 7 | Cleaner views reject JWT | ✓ PASS | test_cleaner_checkin_rejects_jwt |
| 8 | Cleaner views accept Token | ✓ PASS | test_cleaner_checkin_accepts_token |
| 9 | All 19 S01 JWT tests still pass | ✓ PASS | test_jwt_auth.py — 19/19 |
| 10 | Frontend build clean | ✓ PASS | npm run build — 0 errors |
