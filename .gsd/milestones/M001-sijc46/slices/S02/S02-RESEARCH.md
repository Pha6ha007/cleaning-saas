# S02: Manager Portal JWT Migration — Research

**Date:** 2026-03-16
**Requirement:** R002 — Manager portal authenticates with JWT instead of Token.

---

## Summary

S02 is a surgical migration: swap `Authorization: Token xxx` for `Authorization: Bearer access_token` in the frontend, update backend manager views to accept JWT, and add refresh-on-401 logic. No new endpoints, no new data models, no new pages.

The critical constraint (surfaced in S01 summary and confirmed in code) is that every manager-facing backend view explicitly declares `authentication_classes = [TokenAuthentication]`. The global DRF setting already includes `JWTAuthentication` alongside `TokenAuthentication`, but it is overridden at the view level. S02 must update those view-level overrides across **four backend files**: `views_manager_jobs.py`, `views_manager_company.py`, `views_reports.py`, and `views_maintenance.py`. Two additional files (`views_company.py`, `support/views.py`) also serve manager endpoints and need the same treatment.

The frontend work is concentrated in a single file: `dubai-control/src/api/client.ts`. The `apiFetch` and `apiFetchBlob` helpers both hardcode `Token ${currentToken}`. Six raw `fetch()` calls (file uploads, export/import) separately pull from `localStorage.getItem("token")` — a different key than the main flow which stores to `"authToken"` / `"auth_token"`. These raw calls are already partially broken for Token auth and will need updating to `Bearer access_token`. The Login page (`Login.tsx`) and logout flow also need changes.

The overall volume is medium-large but the pattern is uniform: change the Authorization header everywhere, store/read the JWT pair instead of a single token, add a single refresh-on-401 interceptor in the central `apiFetch` helper.

## Recommendation

**Approach:** Two parallel tracks — backend view-level auth update + frontend client rewrite.

**Backend:** Add `JWTAuthentication` to `authentication_classes` on every manager-facing view alongside `TokenAuthentication` (both, not replacing). This maintains full backward compatibility: Token auth (mobile, any existing session) continues to work on the same endpoints. Pattern: `authentication_classes = [JWTAuthentication, TokenAuthentication]`. Do NOT touch cleaner views or customer portal views — those stay Token-only.

**Frontend:** Rewrite the auth layer in `client.ts`:
1. `loginManager()` → switch from Token login endpoint to JWT login endpoint (`/api/manager/auth/jwt/login/`), store `access_token` + `refresh_token` to localStorage.
2. `apiFetch` → change header from `Token ${token}` to `Bearer ${access_token}`.
3. Add `apiFetch` refresh-on-401 interceptor: on 401, call `/api/manager/auth/jwt/refresh/`, store new tokens, retry the original request once. If refresh fails, clear tokens and redirect to `/login`.
4. Fix six raw `fetch()` calls (file upload, import/export, visit photo) that currently read `localStorage.getItem("token")` — change to read access token from the new JWT key.
5. `Login.tsx` → change `handleSignIn` to call JWT endpoint, store `access` + `refresh` tokens. Change `handlePasswordChange` post-change re-login to use JWT endpoint.
6. `AccountDropdown.handleLogout` → call `/api/manager/auth/jwt/logout/` with the refresh token before navigating away. Clear both tokens from localStorage.

**Verification:** Run existing JWT tests + add S02-specific tests proving: (a) JWT Bearer token works on manager views, (b) Token auth still works on the same views, (c) 401 triggers refresh and retry.

---

## Implementation Landscape

### Key Files

**Backend — must update:**

- `backend/apps/api/views_manager_jobs.py` — 11 views with explicit `authentication_classes = [TokenAuthentication]`. Change to `[JWTAuthentication, TokenAuthentication]`. **LOCKED file** — requires explicit permission per CLAUDE.md since it's CleanProof-adjacent, but the change is purely additive (adding an auth class, not changing business logic).
- `backend/apps/api/views_manager_company.py` — 5 views. Same treatment. **LOCKED.**
- `backend/apps/api/views_reports.py` — 10 views. Same treatment. **LOCKED.**
- `backend/apps/api/views_maintenance.py` — 48 views. Same treatment. In maintenance zone (allowed).
- `backend/apps/api/views_company.py` — 9 views. Not in locked list but serves manager portal (`/api/company/`, `/api/company/cleaners/`, `/api/company/users/`). Same additive change.
- `backend/apps/support/views.py` — 3 views. Chat support endpoints used by manager portal. Same treatment.

**Backend — no change needed:**
- `backend/apps/accounts/api/views_settings.py` — Uses `permissions.IsAuthenticated` without explicit `authentication_classes`, so it already inherits the global DRF setting (JWT + Token both work). No change needed.
- `backend/apps/api/views_cleaner.py` — **Stays Token-only.** Mobile cleaner app.
- `backend/apps/api/views_customer_portal.py` — Stays Token-only.

**Frontend — must update:**

- `dubai-control/src/api/client.ts` — Central auth file. Three changes:
  - `syncTokenFromStorage()` — Add reading `access_token` from `localStorage.getItem("access_token")`. Keep backward compatibility for existing Token sessions.
  - `apiFetch()` / `apiFetchBlob()` — Change `Token ${currentToken}` to `Bearer ${currentToken}`. Add 401-intercept + refresh retry loop (guard against infinite retry with `retried` flag).
  - `loginManager()` — Switch to JWT login endpoint. Store `access` as `"access_token"` and `refresh` as `"refresh_token"` in localStorage. Remove dev-fallback auto-login or update it to use JWT endpoint.
  - Six raw `fetch()` calls that use `localStorage.getItem("token")` — change key to read access token. Affected functions: `uploadAssetDocument`, `exportAssets`, `importAssets`, `downloadAssetImportTemplate`, `uploadVisitPhoto`, `deleteVisitPhoto`.

- `dubai-control/src/pages/Login.tsx` — `handleSignIn`: POST to `/api/manager/auth/jwt/login/`, store `data.access` as `"access_token"`, `data.refresh` as `"refresh_token"`, keep storing `data.role` and `data.email` for UI. Remove `data.token` storage (backward compat can coexist during transition). `handlePasswordChange` re-login: same endpoint change.

- `dubai-control/src/components/layout/AccountDropdown.tsx` — `handleLogout`: Before navigating, POST to `/api/manager/auth/jwt/logout/` with the stored refresh token. Clear `access_token`, `refresh_token`, `authToken`, `auth_token` from localStorage. **This file is in `src/components/layout/` which is not explicitly LOCKED.**

### Build Order

1. **Backend first**: Update manager view `authentication_classes` to accept both JWT and Token. This is pure addition — no behavior change, Token still works. Enables frontend to be tested against real backend.

2. **Frontend token storage + header**: Update `syncTokenFromStorage` to prefer `access_token`, update `apiFetch`/`apiFetchBlob` to use `Bearer`. At this point, the frontend works with both old Token sessions (falls back) and new JWT sessions.

3. **Frontend refresh interceptor**: Add 401-on-retry in `apiFetch`. This is the most delicate piece — must avoid infinite loops and race conditions if multiple concurrent requests 401 simultaneously. Pattern: module-level `refreshPromise` variable to deduplicate concurrent refreshes.

4. **Frontend login flow**: Update `Login.tsx` to call JWT endpoint and store JWT pair. This is the "cutover" moment — new logins get JWT, existing sessions continue on Token until they expire or log out.

5. **Frontend logout + cleanup**: Update `AccountDropdown` to call JWT logout endpoint and clear both token sets.

6. **Verification**: Run existing 19 JWT tests + add S02 contract tests.

### Verification Approach

**Backend:**
```bash
cd backend && python manage.py test tests.test_jwt_auth -v 2
```
The existing 19 tests cover JWT endpoints. Add tests to `test_jwt_auth.py` (or new `test_s02_jwt_migration.py`) proving:
- `test_jwt_bearer_on_manager_jobs` — Bearer token accepted on `GET /api/manager/jobs/today/`
- `test_token_still_works_on_manager_jobs` — Token accepted on same endpoint (coexistence)
- `test_cleaner_views_reject_jwt` — Cleaner views still reject JWT (Token-only)

**Frontend (manual, no existing frontend test infra):**
1. Start Django dev server + Vite
2. Log in → inspect localStorage: should see `access_token` + `refresh_token` keys
3. Inspect network: `Authorization: Bearer <jwt>` on all API requests
4. Wait for token expiry (or manually set a short expiry) → verify auto-refresh fires and page stays functional
5. Log out → verify `/api/manager/auth/jwt/logout/` called, localStorage cleared, redirect to login

---

## Constraints

- `views_manager_jobs.py`, `views_manager_company.py`, `views_reports.py` are LOCKED per CLAUDE.md. The change needed (adding `JWTAuthentication` to `authentication_classes`) is purely additive and does not touch business logic. Still requires explicit user confirmation before editing.
- `src/components/ui/**` and `src/lib/**` are LOCKED — no changes needed for S02.
- `src/index.css` and `tailwind.config.ts` are LOCKED — no CSS changes needed.
- `src/hooks/useUserRole.ts` is LOCKED — reads user from `/api/me/` which already accepts JWT via global DRF settings (no explicit `authentication_classes`). No change needed.
- Mobile cleaner app stays on Token — backend must retain Token auth on all views (dual auth, not replacement).
- The six raw `fetch()` calls in `client.ts` use `localStorage.getItem("token")` — a key that is never written by the current auth flow (which writes `"authToken"` and `"auth_token"`). These calls are currently broken for Token auth too. Fixing them to read the JWT access token is safe — it's not a regression.

## Common Pitfalls

- **Concurrent 401 refresh storms** — If three API calls all 401 at once, three simultaneous refresh calls will be made. Third call will fail because the first call already rotated the refresh token. Use a module-level `let _refreshPromise: Promise<string> | null = null` that all callers await, so only one refresh fires at a time.
- **Logout without blacklisting** — Current `AccountDropdown.handleLogout` just navigates to `/`. Without calling the logout endpoint, the refresh token remains valid for 90 days. Must call `/api/manager/auth/jwt/logout/` before clearing tokens.
- **Dev fallback auto-login** — `loginManager()` has a fallback that auto-logs in using env vars via the Token endpoint. This fallback must be updated to use the JWT endpoint, or it will silently succeed but produce a Token instead of JWT pair.
- **Password change flow** — `Login.tsx` `handlePasswordChange` re-logs in after password change. Uses `data.token` from the response. This second login call must also switch to JWT endpoint.
- **Logo upload uses `syncTokenFromStorage` but raw fetch calls use `localStorage.getItem("token")`** — These are two separate code paths. Logo upload will work after updating `syncTokenFromStorage`. The six raw fetch calls need their own fix (different localStorage key).

## Open Risks

- The locked backend files (`views_manager_jobs.py`, `views_manager_company.py`, `views_reports.py`) require user confirmation per CLAUDE.md. The planner should flag this as a gate: executor cannot proceed with backend step without explicit approval.
- `views_company.py` is not in the LOCKED list but serves company/cleaners/team endpoints. It needs the same treatment but should be safe to modify without confirmation since it isn't in the locked file list.
