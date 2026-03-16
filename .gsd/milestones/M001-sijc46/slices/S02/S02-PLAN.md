# S02: Manager Portal JWT Migration

**Goal:** Manager portal authenticates entirely with JWT Bearer tokens. New logins store access+refresh pair, all API requests use `Authorization: Bearer`, expired tokens auto-refresh transparently, logout blacklists the refresh token. Token auth continues working for mobile and existing sessions.

**Demo:** Log in via the manager portal login page → localStorage shows `access_token` + `refresh_token` → network inspector shows `Authorization: Bearer <jwt>` on every API call → after token expires or is cleared, a protected request triggers silent refresh and succeeds without re-login → logout calls `/api/manager/auth/jwt/logout/` and clears all tokens.

## Must-Haves

- Backend manager views accept JWT Bearer tokens (alongside Token — both work)
- `apiFetch` sends `Authorization: Bearer <access_token>` header
- On 401, `apiFetch` silently refreshes and retries the original request once
- Concurrent 401s share a single refresh call (no refresh storm)
- Login page calls JWT endpoint, stores `access_token` + `refresh_token`
- Logout calls JWT blacklist endpoint before clearing localStorage
- All 6 raw `fetch()` file-upload/export calls use Bearer header (not broken `localStorage.getItem("token")`)
- Existing Token auth still works on every updated view (mobile regression test passes)
- Cleaner views remain Token-only (no JWT accepted)

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (Django tests against real DB)
- Human/UAT required: yes (browser verification of login/refresh/logout flow)

## Verification

```bash
# Backend contract tests
cd backend && python manage.py test tests.test_jwt_auth tests.test_s02_jwt_migration -v 2

# Build check (frontend must compile cleanly)
cd dubai-control && npm run build
```

S02 tests file: `backend/tests/test_s02_jwt_migration.py`

Passing conditions:
- All 19 existing S01 JWT tests still pass
- `test_jwt_bearer_on_manager_jobs_today` — Bearer accepted on `GET /api/manager/jobs/today/`
- `test_jwt_bearer_on_manager_company` — Bearer accepted on `GET /api/manager/company/`
- `test_jwt_bearer_on_reports_weekly` — Bearer accepted on `GET /api/manager/reports/weekly/`
- `test_jwt_bearer_on_maintenance_visits` — Bearer accepted on `GET /api/manager/service-visits/`
- `test_token_still_works_on_manager_jobs` — Token still accepted (coexistence)
- `test_token_still_works_on_maintenance_views` — Token still accepted on maintenance views
- `test_cleaner_views_reject_jwt` — Cleaner-only endpoint rejects JWT with 401
- `npm run build` exits 0

## Observability / Diagnostics

- Runtime signals: Django logs auth method on 401 (existing DRF logging). Frontend `console.warn('[auth] token refresh triggered')` on each refresh cycle.
- Inspection surfaces: `localStorage.getItem('access_token')` in browser DevTools; Network tab filtered by `Authorization` header; `django_blacklist_outstandingtoken` table for active tokens.
- Failure visibility: On refresh failure, `console.error('[auth] refresh failed, redirecting to login')` before redirect. Token key presence in localStorage shows auth state.
- Redaction constraints: Never log token values — log only event type and success/failure.

## Integration Closure

- Upstream surfaces consumed: `POST /api/manager/auth/jwt/login/` (returns `{access, refresh, user_id, email, role}`), `POST /api/manager/auth/jwt/refresh/` (returns `{access, refresh}`), `POST /api/manager/auth/jwt/logout/` (body `{refresh}`)
- New wiring introduced: `client.ts` JWT auth layer consumed by all pages. `AccountDropdown` calls logout endpoint.
- What remains before milestone is usable end-to-end: S03 (Paddle backend), S04 (checkout + billing dashboard)

---

## ⚠️ GATE: Locked File Permission Required

Tasks T01 and T02 modify backend files that are LOCKED per CLAUDE.md:
- `backend/apps/api/views_manager_jobs.py` (LOCKED)
- `backend/apps/api/views_manager_company.py` (LOCKED)
- `backend/apps/api/views_reports.py` (LOCKED)

The changes are purely additive: adding `JWTAuthentication` to `authentication_classes` alongside `TokenAuthentication`. No business logic changes. Still requires explicit user confirmation before editing.

**Executor must confirm with user before editing any locked file.**

---

## Tasks

- [x] **T01: Backend — update locked manager views to accept JWT alongside Token** `est:30m`
  - Why: Every manager-facing view overrides global DRF auth with `[TokenAuthentication]`. JWT Bearer tokens are rejected. This task makes them accept both.
  - Files: `backend/apps/api/views_manager_jobs.py` (**LOCKED — confirm first**), `backend/apps/api/views_manager_company.py` (**LOCKED — confirm first**), `backend/apps/api/views_reports.py` (**LOCKED — confirm first**)
  - Do:
    - **STOP and confirm with user before editing any of these files.**
    - Add import at top of each file: `from rest_framework_simplejwt.authentication import JWTAuthentication`
    - On every class that has `authentication_classes = [TokenAuthentication]`, change to `authentication_classes = [JWTAuthentication, TokenAuthentication]`
    - Do NOT change any permission_classes, business logic, or anything else
    - 11 occurrences in views_manager_jobs.py, 5 in views_manager_company.py, 10 in views_reports.py
  - Verify: `cd backend && python manage.py test tests.test_jwt_auth -v 2` — all 19 existing tests pass (no regression)
  - Done when: All three files updated, existing tests green

- [x] **T02: Backend — update unlocked manager views to accept JWT alongside Token** `est:20m`
  - Why: `views_maintenance.py` (48 views), `views_company.py` (9 views), and `support/views.py` (3 views) all serve manager endpoints but are not in the locked list. Same treatment needed.
  - Files: `backend/apps/api/views_maintenance.py`, `backend/apps/api/views_company.py`, `backend/apps/support/views.py`
  - Do:
    - Add import: `from rest_framework_simplejwt.authentication import JWTAuthentication`
    - Change `authentication_classes = [TokenAuthentication]` → `authentication_classes = [JWTAuthentication, TokenAuthentication]` on every class
    - Do NOT touch `views_cleaner.py` or `views_customer_portal.py` — those stay Token-only
    - `views_accounts/api/views_settings.py` already inherits global DRF setting — no change needed
  - Verify: `cd backend && python manage.py test tests.test_jwt_auth -v 2` — 19 tests still pass
  - Done when: All three files updated, tests still green

- [x] **T03: Backend — write S02 contract tests** `est:25m`
  - Why: Prove JWT Bearer works on manager views and Token coexistence holds. Also verify cleaner views remain Token-only.
  - Files: `backend/tests/test_s02_jwt_migration.py` (new file)
  - Do:
    - Follow test pattern from `backend/tests/test_jwt_auth.py` (autouse throttle reset fixture, APIClient with format='json')
    - Test class `TestManagerViewsJWTCoexistence`:
      - `test_jwt_bearer_on_manager_jobs_today` — get JWT tokens via login, set `HTTP_AUTHORIZATION: Bearer <access>`, GET `/api/manager/jobs/today/`, assert 200
      - `test_jwt_bearer_on_manager_company` — same pattern, GET `/api/manager/company/`
      - `test_jwt_bearer_on_reports_weekly` — same pattern, GET `/api/manager/reports/weekly/`
      - `test_jwt_bearer_on_maintenance_service_visits` — same pattern, GET `/api/manager/service-visits/`
      - `test_token_still_works_on_manager_jobs` — get Token, set `HTTP_AUTHORIZATION: Token <key>`, GET `/api/manager/jobs/today/`, assert 200
      - `test_token_still_works_on_maintenance_views` — same with maintenance endpoint
      - `test_cleaner_view_rejects_jwt` — get JWT tokens, attempt GET on a cleaner-only endpoint (e.g. `/api/jobs/<id>/`), assert 401 (JWT not accepted, Token required)
      - `test_unauthenticated_rejects_all_manager_views` — no credentials, GET manager endpoint, assert 401
  - Verify: `cd backend && python manage.py test tests.test_s02_jwt_migration -v 2` — all new tests pass
  - Done when: All 8 tests pass, 0 failures

- [x] **T04: Frontend — rewrite auth layer in client.ts (storage, headers, refresh)** `est:45m`
  - Why: Core of the migration. `apiFetch`/`apiFetchBlob` send `Token` header. `loginManager` uses Token endpoint. Six raw fetch calls read wrong localStorage key. All need updating.
  - Files: `dubai-control/src/api/client.ts`
  - Do:
    - **Token storage constants** — Add at top:
      ```ts
      const STORAGE_KEYS = {
        ACCESS: 'access_token',
        REFRESH: 'refresh_token',
        // Legacy keys kept for backward compat during transition
        AUTH_TOKEN: 'authToken',
        AUTH_TOKEN_ALT: 'auth_token',
      } as const;
      ```
    - **`syncTokenFromStorage()`** — Read from `STORAGE_KEYS.ACCESS` first. If not found, fall back to `authToken`/`auth_token` (existing Token sessions still work). Update `auth.token` from whichever is found.
    - **`apiFetch()` header** — Change `Authorization: Token ${currentToken}` → `Authorization: Bearer ${currentToken}`. Add 401 refresh interceptor:
      - If response is 401 and `!retried` (add `retried?: boolean` param):
        - Await `_refreshTokens()` helper
        - If refresh succeeds: retry original request once with new token, return result
        - If refresh fails: call `_clearAuthAndRedirect()`, throw
      - `_refreshTokens()` — module-level `let _refreshPromise: Promise<void> | null = null` to deduplicate concurrent calls. Calls `POST /api/manager/auth/jwt/refresh/` with `localStorage.getItem('refresh_token')`, stores new `access` and `refresh` to localStorage, nulls `_refreshPromise`.
      - `_clearAuthAndRedirect()` — clears all 4 localStorage keys, sets `auth.token = null`, redirects to `/login` via `window.location.href`
    - **`apiFetchBlob()` header** — Same header change: `Token` → `Bearer`
    - **`loginManager()`** — Switch from `GET /api/manager/auth/login/` to `POST /api/manager/auth/jwt/login/`. Store `data.access` → `STORAGE_KEYS.ACCESS`, `data.refresh` → `STORAGE_KEYS.REFRESH`. Keep storing `data.role` and `data.email` for UI. Remove/update the dev-fallback branch to also use JWT endpoint.
    - **Six raw fetch() calls** — Change `localStorage.getItem("token")` → `localStorage.getItem(STORAGE_KEYS.ACCESS)` in: `uploadCompanyLogo` (already uses syncTokenFromStorage — check), `uploadAssetDocument`, `exportAssets`, `importAssets`, `downloadAssetImportTemplate`, `uploadVisitPhoto`, `deleteVisitPhoto`. Also change header from `Token ${token}` → `Bearer ${token}`.
  - Verify: `cd dubai-control && npm run build` — 0 TypeScript errors. Then manual: log in, check DevTools Network tab shows `Bearer` header.
  - Done when: Build passes, no TypeScript errors

- [x] **T05: Frontend — update Login.tsx to use JWT endpoint** `est:20m`
  - Why: `handleSignIn` calls the Token login endpoint and stores `data.token`. `handlePasswordChange` does the same for re-login after password change. Both must switch to the JWT endpoint.
  - Files: `dubai-control/src/pages/Login.tsx` (not in LOCKED list — allowed to modify for Phase 5 / JWT migration)
  - Do:
    - `handleSignIn`: Change fetch URL from `/api/manager/auth/login/` → `/api/manager/auth/jwt/login/`
    - Store response: `localStorage.setItem('access_token', data.access)` and `localStorage.setItem('refresh_token', data.refresh)` instead of `localStorage.setItem('authToken', data.token)`
    - Keep storing `data.role` → `authUserRole` and `data.email` → `authUserEmail` (used by UI)
    - Remove `localStorage.setItem('auth_token', data.token)` (legacy duplicate)
    - `handlePasswordChange` re-login block: same URL + storage changes
    - The `PASSWORD_CHANGE_REQUIRED` 403 flow is unchanged (no login happens at that point)
    - Trial flow localStorage.setItem for `cleanproof_trial_entry` is unchanged
  - Verify: `cd dubai-control && npm run build` — 0 errors. Manual: log in → DevTools Application → localStorage: `access_token` and `refresh_token` present, no `token` key.
  - Done when: Build passes, login stores JWT pair

- [x] **T06: Frontend — update AccountDropdown logout to blacklist JWT** `est:15m`
  - Why: Current logout just navigates to `/`. Refresh token stays valid for 90 days — effectively no session revocation.
  - Files: `dubai-control/src/components/layout/AccountDropdown.tsx`
  - Do:
    - `handleLogout`: Before navigate, call logout endpoint:
      ```ts
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          await fetch(`${API_BASE_URL}/api/manager/auth/jwt/logout/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: JSON.stringify({ refresh: refreshToken }),
          });
        } catch {
          // Best-effort — clear tokens regardless
        }
      }
      ```
    - Clear all token keys: `['access_token', 'refresh_token', 'authToken', 'auth_token', 'authUserRole', 'authUserEmail'].forEach(k => localStorage.removeItem(k))`
    - Then `navigate('/login')` (change from `'/'` to `'/login'` so user lands on login, not marketing page)
    - Import `API_BASE_URL` from `@/api/client` — check if it's exported (it is, via `export { API_BASE_URL }` at bottom of client.ts)
  - Verify: `cd dubai-control && npm run build` — 0 errors. Manual: log out → network shows POST to `/api/manager/auth/jwt/logout/`, localStorage is empty after.
  - Done when: Build passes, logout calls blacklist endpoint

- [x] **T07: Run full verification** `est:15m`
  - Why: Confirm all backend tests pass, frontend builds, and CleanProof Token auth is unbroken.
  - Files: none (verification only)
  - Do:
    - `cd backend && python manage.py test tests.test_jwt_auth tests.test_s02_jwt_migration -v 2`
    - Confirm: 19 existing tests pass + 8 new S02 tests pass = 27 total
    - `cd dubai-control && npm run build`
    - Confirm: build exits 0, no TypeScript errors
    - Run a quick sanity: `cd backend && python manage.py test tests/ -v 1` — no regressions in broader test suite
  - Verify: All commands exit 0
  - Done when: 27 tests pass, build clean, no regressions

## Files Likely Touched

- `backend/apps/api/views_manager_jobs.py` (**LOCKED** — confirm before editing)
- `backend/apps/api/views_manager_company.py` (**LOCKED** — confirm before editing)
- `backend/apps/api/views_reports.py` (**LOCKED** — confirm before editing)
- `backend/apps/api/views_maintenance.py`
- `backend/apps/api/views_company.py`
- `backend/apps/support/views.py`
- `backend/tests/test_s02_jwt_migration.py` (new file)
- `dubai-control/src/api/client.ts`
- `dubai-control/src/pages/Login.tsx`
- `dubai-control/src/components/layout/AccountDropdown.tsx`
