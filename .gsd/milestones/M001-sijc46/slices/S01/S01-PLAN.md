# S01: JWT Auth Backend

**Goal:** Add JWT authentication to the Django backend using djangorestframework-simplejwt, running alongside existing Token auth. Produce login, refresh, and logout endpoints with custom claims (role, company_id). Blacklist support enabled.

**Demo:** POST to `/api/manager/auth/jwt/login/` returns access+refresh tokens with custom claims. POST to `/api/manager/auth/jwt/refresh/` rotates tokens. POST to `/api/manager/auth/jwt/logout/` blacklists the refresh token. Existing Token auth endpoints continue working unchanged.

## Must-Haves
- JWT login endpoint returns access + refresh tokens with user_id, email, role, company_id claims
- JWT refresh endpoint rotates tokens (returns new access + new refresh, old refresh blacklisted)
- JWT logout endpoint blacklists the refresh token
- Existing Token auth (mobile cleaner app) continues working — no regression
- Access token lifetime: 30 days; Refresh token lifetime: 90 days
- Blacklisted tokens are rejected on refresh attempts
- Django tests prove all JWT endpoints and Token coexistence

## Tasks

- [x] **T01: Install simplejwt, configure settings, add blacklist app**
  Install djangorestframework-simplejwt, add to INSTALLED_APPS with blacklist app, configure SIMPLE_JWT settings (30d access, 90d refresh, rotation, blacklisting), add JWTAuthentication alongside TokenAuthentication in DRF settings. Run migrations for blacklist tables.

- [x] **T02: Custom JWT serializer, login/refresh/logout views, URL routing**
  Create custom TokenObtainPairSerializer with role + company_id claims. Create JWTLoginView (wraps token obtain + returns user profile data), JWTRefreshView, JWTLogoutView. Wire URL routes under /api/manager/auth/jwt/. Manager-only login validation (role check).

- [x] **T03: Tests — JWT endpoints + Token coexistence**
  Write Django tests: JWT login returns correct claims, refresh rotates tokens, logout blacklists, blacklisted token rejected, Token auth still works on existing endpoints, invalid credentials rejected, non-manager roles rejected on manager JWT login.

## Files Likely Touched
- `backend/requirements.txt` — add djangorestframework-simplejwt
- `backend/config/settings.py` — INSTALLED_APPS, SIMPLE_JWT config, DRF auth classes
- `backend/apps/api/views_jwt.py` — new file: JWT views
- `backend/apps/api/serializers_jwt.py` — new file: custom JWT serializers
- `backend/apps/api/urls.py` — JWT URL routes
- `backend/tests/test_jwt_auth.py` — new file: JWT tests
