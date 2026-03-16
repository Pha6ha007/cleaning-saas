# T01: Install simplejwt, configure settings, add blacklist app

**Slice:** S01
**Milestone:** M001-sijc46

## Goal
Install djangorestframework-simplejwt, configure Django settings for JWT with 30-day access / 90-day refresh token lifetimes, rotation, and blacklisting. Add JWTAuthentication alongside TokenAuthentication so both work simultaneously.

## Must-Haves

### Truths
- `djangorestframework-simplejwt` is in requirements.txt and importable
- `rest_framework_simplejwt.token_blacklist` is in INSTALLED_APPS
- SIMPLE_JWT config has ACCESS_TOKEN_LIFETIME=30 days, REFRESH_TOKEN_LIFETIME=90 days, ROTATE_REFRESH_TOKENS=True, BLACKLIST_AFTER_ROTATION=True
- DEFAULT_AUTHENTICATION_CLASSES contains both JWTAuthentication and TokenAuthentication
- `python manage.py migrate` runs without errors (blacklist tables created)
- Existing Token-authenticated requests still return 200 (no regression)

### Artifacts
- `backend/requirements.txt` — includes `djangorestframework-simplejwt` with version pin
- `backend/config/settings.py` — SIMPLE_JWT dict, updated INSTALLED_APPS, updated REST_FRAMEWORK

### Key Links
- `settings.py` → `rest_framework_simplejwt.authentication.JWTAuthentication` in DEFAULT_AUTHENTICATION_CLASSES
- `settings.py` → `rest_framework_simplejwt.token_blacklist` in INSTALLED_APPS

## Steps
1. Add `djangorestframework-simplejwt` to `backend/requirements.txt`
2. Install it in the backend venv
3. Add `rest_framework_simplejwt.token_blacklist` to INSTALLED_APPS in settings.py
4. Add SIMPLE_JWT configuration dict to settings.py (30d access, 90d refresh, rotate=True, blacklist_after_rotation=True, HS256 algorithm, signing key from SECRET_KEY)
5. Add `rest_framework_simplejwt.authentication.JWTAuthentication` to DEFAULT_AUTHENTICATION_CLASSES (first in list, before TokenAuthentication)
6. Run `python manage.py migrate` to create blacklist tables
7. Verify: existing Token auth still works (quick manual check or existing test)

## Context
- Decision D001: Using djangorestframework-simplejwt (not raw PyJWT)
- Decision D003: Both JWT + Token auth coexist — mobile stays on Token
- Current settings.py has TokenAuthentication + SessionAuthentication in DRF config
- Backend uses Python 3.14, Django 5.2.9, DRF 3.16.1
