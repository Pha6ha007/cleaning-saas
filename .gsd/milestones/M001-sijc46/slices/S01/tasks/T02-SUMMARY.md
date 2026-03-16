---
id: T02
parent: S01
milestone: M001-sijc46
provides:
  - JWTManagerLoginView at /api/manager/auth/jwt/login/
  - JWTRefreshView at /api/manager/auth/jwt/refresh/
  - JWTLogoutView at /api/manager/auth/jwt/logout/
  - ProofTokenObtainPairSerializer with role + company_id claims
requires:
  - slice: none
    provides: none (same slice)
affects: [S02, T03]
key_files:
  - backend/apps/api/views_jwt.py
  - backend/apps/api/serializers_jwt.py
  - backend/apps/api/urls.py
key_decisions:
  - "Custom login view instead of simplejwt's TokenObtainPairView — needed role validation and must_change_password check"
  - "JWTLogoutView requires authentication (IsAuthenticated) — both JWT and Token auth accepted during transition"
  - "Login response includes user profile data (user_id, email, full_name, role) alongside tokens — matches existing Token login shape"
patterns_established:
  - "JWT views live in views_jwt.py, serializers in serializers_jwt.py — parallel to existing views_auth.py"
  - "JWT URLs under /api/manager/auth/jwt/ namespace — coexists with /api/manager/auth/login/"
drill_down_paths:
  - .gsd/milestones/M001-sijc46/slices/S01/tasks/T02-PLAN.md
duration: 10min
verification_result: pass
completed_at: 2026-03-16T22:35:00Z
---

# T02: Custom JWT serializer, login/refresh/logout views, URL routing

**JWT login/refresh/logout endpoints wired at /api/manager/auth/jwt/ with custom claims and manager role validation**

## What Happened

Created `serializers_jwt.py` with `ProofTokenObtainPairSerializer` adding role, company_id, email claims to JWT tokens. Created `views_jwt.py` with three views:
- `JWTManagerLoginView`: validates manager credentials (owner/manager/staff only), checks must_change_password, returns access+refresh tokens plus user profile
- `JWTRefreshView`: wraps simplejwt's TokenRefreshView (rotation/blacklisting from settings)
- `JWTLogoutView`: accepts refresh token, blacklists it (requires authentication)

Wired URL routes in urls.py under `/api/manager/auth/jwt/`.

## Deviations
None.

## Files Created/Modified
- `backend/apps/api/serializers_jwt.py` — new: custom JWT serializer with platform claims
- `backend/apps/api/views_jwt.py` — new: JWT login, refresh, logout views
- `backend/apps/api/urls.py` — added JWT URL routes
