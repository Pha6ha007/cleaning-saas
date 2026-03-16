---
id: S01
milestone: M001-sijc46
provides:
  - djangorestframework-simplejwt 5.5.1 configured with 30d access / 90d refresh / rotation / blacklisting
  - JWT login endpoint: POST /api/manager/auth/jwt/login/ (manager roles only, returns access+refresh+profile)
  - JWT refresh endpoint: POST /api/manager/auth/jwt/refresh/ (rotates tokens, blacklists old)
  - JWT logout endpoint: POST /api/manager/auth/jwt/logout/ (blacklists refresh token)
  - Custom claims in access token: user_id, email, role, company_id
  - Token auth (mobile) continues working unchanged
  - 19 passing tests covering all JWT endpoints and Token coexistence
requires:
  - slice: none
    provides: none (first slice)
affects: [S02, S03, S04, S05]
key_files:
  - backend/requirements.txt
  - backend/config/settings.py
  - backend/apps/api/views_jwt.py
  - backend/apps/api/serializers_jwt.py
  - backend/apps/api/urls.py
  - backend/tests/test_jwt_auth.py
key_decisions:
  - "D001: djangorestframework-simplejwt over raw PyJWT"
  - "Custom login view (not simplejwt built-in) for role validation and must_change_password"
  - "JWT login returns user profile data alongside tokens — matches Token login response shape"
  - "JWTAuthentication in global settings, but existing views override with explicit TokenAuthentication"
patterns_established:
  - "JWT files: views_jwt.py, serializers_jwt.py parallel to views_auth.py"
  - "JWT URLs: /api/manager/auth/jwt/ namespace"
  - "Test pattern: autouse fixture for throttle reset, APIClient with format='json'"
drill_down_paths:
  - .gsd/milestones/M001-sijc46/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001-sijc46/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001-sijc46/slices/S01/tasks/T03-SUMMARY.md
duration: 33min
verification_result: pass
completed_at: 2026-03-16T22:45:00Z
---

# S01: JWT Auth Backend

**JWT auth backend fully operational — login/refresh/logout endpoints with custom claims, rotation, blacklisting. 19 tests passing. Token auth unaffected.**

## What Happened

Installed djangorestframework-simplejwt 5.5.1, configured with 30-day access / 90-day refresh token lifetimes, automatic rotation, and blacklisting. Created custom JWT serializer adding platform claims (role, company_id, email). Built three endpoints:

- **JWTManagerLoginView** — validates manager credentials (owner/manager/staff only), respects must_change_password flag, returns JWT pair + user profile
- **JWTRefreshView** — wraps simplejwt's refresh with rotation (returns new pair, blacklists old)
- **JWTLogoutView** — blacklists refresh token on logout

Both JWT and Token authentication classes coexist in DRF settings.

**Key discovery for S02:** Every existing view in the codebase explicitly sets `authentication_classes = [TokenAuthentication]`. The S02 frontend migration must update each manager view to accept JWT — changing only the global DRF setting is not sufficient. This is the main work in S02.

## Verification

### Observable Truths
| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | JWT login returns access+refresh with claims | ✓ PASS | 19 tests pass |
| 2 | JWT refresh rotates tokens | ✓ PASS | test_refresh_returns_new_tokens |
| 3 | JWT logout blacklists refresh | ✓ PASS | test_logout_blacklists_refresh |
| 4 | Token auth still works | ✓ PASS | test_token_auth_on_protected_endpoint |
| 5 | Blacklisted tokens rejected | ✓ PASS | test_old_refresh_blacklisted_after_rotation |
| 6 | Custom claims in token | ✓ PASS | test_access_token_has_custom_claims |

### Artifacts
| File | Expected | Status | Evidence |
|------|----------|--------|---------|
| backend/apps/api/views_jwt.py | JWT views | ✓ SUBSTANTIVE | 3 views, 150 lines |
| backend/apps/api/serializers_jwt.py | Custom serializer | ✓ SUBSTANTIVE | Custom claims |
| backend/tests/test_jwt_auth.py | JWT tests | ✓ SUBSTANTIVE | 19 tests, all passing |

### Key Links
| From | To | Via | Status |
|------|----|----|--------|
| urls.py | views_jwt.py | URL patterns | ✓ WIRED |
| views_jwt.py | serializers_jwt.py | import | ✓ WIRED |
| serializers_jwt.py | accounts.models | custom claims | ✓ WIRED |
| settings.py | simplejwt | INSTALLED_APPS + SIMPLE_JWT | ✓ WIRED |
