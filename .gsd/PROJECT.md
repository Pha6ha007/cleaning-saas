# Project

## What This Is

Proof Platform is a multi-context B2B SaaS for verifying physical field work in the UAE. A single proof engine (GPS check-in/out, timestamped before/after photos, checklists, SLA evaluation, immutable audit trail, PDF reports) powers multiple operational contexts — currently CleanProof (cleaning, production-stable) and MaintainProof (maintenance, V3 complete).

The stack: Django 5.2 + DRF backend, React+Vite+shadcn/ui manager portal (`dubai-control/`), React Native cleaner/technician app (`mobile-cleaner/`). Deployed on Ubuntu VPS with Nginx+Gunicorn, PostgreSQL in production, SQLite in dev. Celery+Redis for task queuing.

## Core Value

<!-- This is the primary value anchor for prioritization and tradeoffs.
     If scope must shrink, this should survive. -->

A company can sign up, try the platform for free, pay via Paddle, and immediately use a production-ready proof-of-work system — with reliable billing state that never gets out of sync.

## Current State

- CleanProof: production-stable, LOCKED from changes. Full proof engine working.
- MaintainProof: V3 complete — visits, assets, checklists, recurring templates, contracts, analytics, reports, customer portal, parts/inventory, notifications.
- Auth: Django Token auth (`rest_framework.authtoken`). No JWT implemented yet.
- Billing: Company model has plan (trial/active/blocked), plan_tier (standard/pro/enterprise), trial logic. No payment processor integration. Billing UI exists as scaffolding.
- Email: Centralized email service (`apps.emails`) with HTML templates — verification, password reset, trial expiry reminders, billing notifications. Async via Celery.
- Rate limiting: DRF throttles (auth, uploads, dashboard, webhooks) + nginx L7 rate limiting config.
- Backups: PostgreSQL backup/restore scripts with S3 offsite upload option.
- Logging: Structured JSON logging in production, text in dev. Per-app loggers.
- Landing pages: Platform, product, pricing, legal, contact pages exist. Need minor polish for launch.
- Marketing backend: Demo requests and contact message capture working.
- Mobile: React Native cleaner app with Token auth, GPS, photos, checklists, PDF reports.

## Architecture / Key Patterns

- **Backend**: Django 5.2 + DRF. Monolith in `backend/`. Apps: `accounts`, `api`, `jobs`, `locations`, `maintenance`, `marketing`, `support`. Auth via `rest_framework.authtoken`. Config in `backend/config/settings.py`.
- **Frontend**: React + Vite + TypeScript + Tailwind + shadcn/ui in `dubai-control/`. API client in `dubai-control/src/api/client.ts`. Token stored in localStorage as `authToken`.
- **Mobile**: React Native (Expo) in `mobile-cleaner/`. API client in `mobile-cleaner/src/api/client.ts`. Token in AsyncStorage as `@auth_token`.
- **Product boundary**: CleanProof code is LOCKED. Maintenance code is the active development zone. See `CLAUDE.md` for locked file list.
- **Multi-context**: Single backend serves both CleanProof and MaintainProof. Contexts share auth, company model, and proof engine.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

<!-- Check off milestones as they complete. One-liners should describe intent, not implementation detail. -->

- [ ] M001-sijc46: Launch-Ready Billing & Auth — JWT auth, Paddle billing, trial enforcement, self-serve trial-to-paid flow
