# T03: Tests — JWT endpoints + Token coexistence

**Slice:** S01
**Milestone:** M001-sijc46

## Goal
Write comprehensive Django tests proving JWT endpoints work correctly and Token auth is unaffected. Cover happy paths, error cases, blacklisting, and coexistence.

## Must-Haves

### Truths
- All tests pass with `pytest backend/tests/test_jwt_auth.py -v`
- Tests cover: JWT login (success + error cases), refresh (rotation + blacklist), logout, Token coexistence, custom claims, must_change_password
- No existing tests broken

### Artifacts
- `backend/tests/test_jwt_auth.py` — JWT auth test suite (min 10 test cases)

### Key Links
- `test_jwt_auth.py` → `apps.api.views_jwt` via URL reverse
- `test_jwt_auth.py` → `apps.accounts.models.User` + `Company` for test fixtures

## Steps
1. Create `backend/tests/test_jwt_auth.py` with test fixtures (Company + User for owner, manager, cleaner roles)
2. Write tests:
   - `test_jwt_login_success` — manager login returns access + refresh + user data
   - `test_jwt_login_owner_success` — owner can also JWT login
   - `test_jwt_login_cleaner_rejected` — cleaner role gets 401
   - `test_jwt_login_wrong_password` — returns 401
   - `test_jwt_login_inactive_user` — inactive user gets 401
   - `test_jwt_login_must_change_password` — returns 403 with code
   - `test_jwt_refresh_returns_new_tokens` — refresh returns new access+refresh
   - `test_jwt_refresh_blacklists_old` — old refresh token rejected after rotation
   - `test_jwt_logout_blacklists_token` — logout blacklists refresh, subsequent refresh fails
   - `test_jwt_access_token_custom_claims` — decode access token, verify role + company_id claims
   - `test_token_auth_still_works` — existing Token auth on a protected endpoint returns 200
   - `test_jwt_auth_on_existing_endpoint` — JWT Bearer token on a protected endpoint returns 200
3. Run full test suite, verify no regressions

## Context
- pytest with DJANGO_SETTINGS_MODULE=config.settings
- Test database is SQLite (default for dev)
- Existing test structure: backend/tests/ with pytest.ini markers (django_db, security, unit)
- Use `@pytest.mark.django_db` for all tests
- API client: `rest_framework.test.APIClient`
