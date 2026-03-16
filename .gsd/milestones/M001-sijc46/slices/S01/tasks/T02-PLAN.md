# T02: Custom JWT serializer, login/refresh/logout views, URL routing

**Slice:** S01
**Milestone:** M001-sijc46

## Goal
Create JWT login, refresh, and logout endpoints for the manager portal. The login endpoint validates manager credentials, returns access+refresh tokens with custom claims (role, company_id), plus user profile data. Refresh rotates tokens. Logout blacklists the refresh token.

## Must-Haves

### Truths
- POST `/api/manager/auth/jwt/login/` with valid manager credentials returns {access, refresh, user_id, email, full_name, role}
- POST `/api/manager/auth/jwt/login/` with cleaner credentials returns 401 (manager-only)
- POST `/api/manager/auth/jwt/login/` with wrong password returns 401
- POST `/api/manager/auth/jwt/refresh/` with valid refresh token returns {access, refresh} (new pair)
- POST `/api/manager/auth/jwt/logout/` with refresh token blacklists it
- JWT access token payload contains: user_id, email, role, company_id claims
- User with must_change_password=True gets 403 with PASSWORD_CHANGE_REQUIRED code

### Artifacts
- `backend/apps/api/serializers_jwt.py` — CustomTokenObtainPairSerializer with role + company_id claims, ProofTokenObtainPairView serializer
- `backend/apps/api/views_jwt.py` — JWTManagerLoginView, JWTRefreshView, JWTLogoutView
- `backend/apps/api/urls.py` — JWT URL patterns under /api/manager/auth/jwt/

### Key Links
- `views_jwt.py` → `serializers_jwt.py` via import of CustomTokenObtainPairSerializer
- `urls.py` → `views_jwt.py` via URL pattern registration
- `serializers_jwt.py` → `apps.accounts.models.User` for custom claims

## Steps
1. Create `backend/apps/api/serializers_jwt.py` with CustomTokenObtainPairSerializer that adds role, company_id, email claims to the token
2. Create `backend/apps/api/views_jwt.py` with:
   - JWTManagerLoginView: validates email+password, checks manager role (owner/manager/staff), checks must_change_password, uses custom serializer, returns tokens + user profile
   - JWTRefreshView: wraps simplejwt's TokenRefreshView (rotation configured in settings)
   - JWTLogoutView: accepts refresh token, blacklists it
3. Add URL routes in `backend/apps/api/urls.py`:
   - `api/manager/auth/jwt/login/` → JWTManagerLoginView
   - `api/manager/auth/jwt/refresh/` → JWTRefreshView
   - `api/manager/auth/jwt/logout/` → JWTLogoutView
4. Verify manually: login returns tokens, decode access token shows custom claims

## Context
- Existing ManagerLoginView in views_auth.py returns {token, user_id, email, full_name, role} — JWT login should return similar shape plus access+refresh
- User roles: owner, manager, staff (console users), cleaner (mobile only)
- User.must_change_password flag exists — must be respected in JWT login too
- The JWT login view is separate from existing Token login — both routes coexist
