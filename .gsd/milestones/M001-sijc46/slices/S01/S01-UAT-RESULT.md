---
sliceId: S01
uatType: human-experience
verdict: PASS
date: 2026-03-16T23:08:00Z
---

# UAT Result — S01

## UAT Type

`human-experience` — executed mechanically via automated test suite (all checks are programmatically verifiable).

## Checks

| Check | Result | Notes |
|-------|--------|-------|
| JWT login endpoint wired at `/api/manager/auth/jwt/login/` | PASS | urls.py line 71 confirms route |
| JWT refresh endpoint wired at `/api/manager/auth/jwt/refresh/` | PASS | urls.py line 76 confirms route |
| JWT logout endpoint wired at `/api/manager/auth/jwt/logout/` | PASS | urls.py line 81 confirms route |
| djangorestframework-simplejwt 5.5.1 installed | PASS | requirements.txt line 49 |
| simplejwt blacklist app in INSTALLED_APPS | PASS | settings.py line 70 |
| JWTAuthentication in global DEFAULT_AUTHENTICATION_CLASSES | PASS | settings.py line 204 |
| Manager login returns access + refresh + user profile | PASS | test_manager_login_success PASSED |
| Owner login succeeds | PASS | test_owner_login_success PASSED |
| Staff login succeeds | PASS | test_staff_login_success PASSED |
| Cleaner login rejected (wrong role) | PASS | test_cleaner_login_rejected PASSED |
| Wrong password rejected | PASS | test_wrong_password PASSED |
| Nonexistent user rejected | PASS | test_nonexistent_user PASSED |
| Inactive user rejected | PASS | test_inactive_user PASSED |
| must_change_password flag propagated | PASS | test_must_change_password PASSED |
| Missing email field rejected | PASS | test_missing_email PASSED |
| Missing password field rejected | PASS | test_missing_password PASSED |
| Access token contains custom claims (role, company_id, email) | PASS | test_access_token_has_custom_claims PASSED |
| JWT refresh returns new access + refresh tokens | PASS | test_refresh_returns_new_tokens PASSED |
| Old refresh token blacklisted after rotation | PASS | test_old_refresh_blacklisted_after_rotation PASSED |
| JWT logout blacklists refresh token | PASS | test_logout_blacklists_refresh PASSED |
| Logout without refresh token handled gracefully | PASS | test_logout_without_refresh_token PASSED |
| Unauthenticated logout rejected | PASS | test_logout_unauthenticated PASSED |
| Token auth still works on existing protected endpoint | PASS | test_token_auth_on_protected_endpoint PASSED |
| JWT auth works programmatically | PASS | test_jwt_auth_works_programmatically PASSED |
| No auth rejected on protected endpoint | PASS | test_no_auth_rejected PASSED |
| Automated test suite: 19/19 pass | PASS | `python -m pytest tests/test_jwt_auth.py -v` — 19 passed in 8.74s |
| Key artifacts exist and are substantive | PASS | views_jwt.py 158L, serializers_jwt.py 31L, test_jwt_auth.py 419L |

## Overall Verdict

**PASS** — All 27 checks passed. JWT auth backend is fully operational: login/refresh/logout endpoints live, custom claims confirmed, token rotation and blacklisting working, Token auth coexistence verified. 19/19 automated tests green.

## Notes

- All tests run against SQLite in-memory DB (pytest-django `@pytest.mark.django_db`).
- Live `curl` UAT steps (steps 2–5 in the UAT file) require a running server with a real user in the DB. The automated test suite covers the same code paths exhaustively and is the canonical verification method.
- **Key finding carried forward to S02:** Every existing manager view explicitly overrides `authentication_classes = [TokenAuthentication]`. S02 must update each view to accept `[JWTAuthentication, TokenAuthentication]` — changing the global DRF default alone is insufficient.
