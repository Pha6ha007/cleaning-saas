---
id: T01
parent: S01
milestone: M001-sijc46
provides:
  - djangorestframework-simplejwt installed and configured
  - Blacklist app with migrations applied
  - JWTAuthentication in DEFAULT_AUTHENTICATION_CLASSES (alongside Token)
  - SIMPLE_JWT settings (30d access, 90d refresh, rotation, blacklisting)
requires:
  - slice: none
    provides: none (first task)
affects: [T02, T03]
key_files:
  - backend/requirements.txt
  - backend/config/settings.py
key_decisions:
  - "simplejwt 5.5.1 pinned — latest stable, works with Django 5.2"
  - "JWTAuthentication placed first in DEFAULT_AUTHENTICATION_CLASSES, before TokenAuthentication"
  - "UPDATE_LAST_LOGIN=True to track JWT login timestamps"
patterns_established:
  - "SIMPLE_JWT config block lives in settings.py after REST_FRAMEWORK block"
drill_down_paths:
  - .gsd/milestones/M001-sijc46/slices/S01/tasks/T01-PLAN.md
duration: 8min
verification_result: pass
completed_at: 2026-03-16T22:30:00Z
---

# T01: Install simplejwt, configure settings, add blacklist app

**simplejwt 5.5.1 installed with PyJWT 2.12.1, blacklist tables migrated, dual auth configured**

## What Happened

Installed djangorestframework-simplejwt 5.5.1 (pulls PyJWT 2.12.1). Added `rest_framework_simplejwt.token_blacklist` to INSTALLED_APPS. Configured SIMPLE_JWT with 30-day access, 90-day refresh, rotation enabled, blacklisting after rotation. Added JWTAuthentication as the first auth class in DRF settings, keeping TokenAuthentication for mobile compatibility.

Also had to install whitenoise and sentry-sdk in the dev venv (were in requirements.txt but not installed locally — pre-existing gap).

## Deviations
- Also installed whitenoise and sentry-sdk in dev venv (not in plan but needed for Django to load settings). Pre-existing missing dependency.

## Files Created/Modified
- `backend/requirements.txt` — added `djangorestframework-simplejwt==5.5.1`
- `backend/config/settings.py` — added blacklist to INSTALLED_APPS, SIMPLE_JWT config, JWTAuthentication to DEFAULT_AUTHENTICATION_CLASSES
