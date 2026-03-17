# M004: Arabic Bilingual PDFs, Self-Registration, Live Analytics & Notification Preferences

## Goal

Four product features that increase reach and user autonomy:
1. Bilingual (Arabic + English) Maintenance PDF reports using fpdf2
2. Self-registration with email verification and automatic 7-day trial
3. Live KPI dashboard via polling (fast /api/analytics/live/ endpoint + frontend auto-refresh)
4. Per-user notification preferences API + settings UI (WhatsApp, email, quiet hours, frequency)

## Scope Decisions

### S01 — Arabic/RTL
- **In scope**: Bilingual PDF reports for Maintenance context using fpdf2
  - Company name, location, asset, technician labels in Arabic + English
  - RTL text direction for Arabic strings via fpdf2's built-in RTL support
  - New endpoint: `GET /api/maintenance/visits/<id>/report/bilingual-pdf/`
  - Uses fpdf2 + arabic_reshaper + python-bidi for proper Arabic text shaping
- **Out of scope**: Full portal UI i18n (requires touching 17K LOC of locked Cleaning pages)
  - RTL CSS infrastructure deferred — no locked files can be touched

### S02 — Self-Registration
- **In scope**: Email verification on signup + automatic trial start
  - `EmailVerificationToken` model (UUID token, 24h expiry)
  - `ManagerSignupView` extended: creates unverified user, sends verification email
  - `GET /api/auth/verify-email/?token=<uuid>` — verifies + starts 7-day trial
  - Frontend: verification pending page + token handler route
- **Existing**: `ManagerSignupView` already at `/api/auth/signup/`, trial fields on Company

### S03 — Live Analytics Polling
- **In scope**: Fast KPI polling endpoint
  - `GET /api/analytics/live/` — returns today's KPIs: jobs scheduled/in_progress/completed, 
    SLA breaches today, cleaner utilisation
  - Response cached 30s (Django cache)
  - Frontend Dashboard: auto-refresh every 30s with visual "last updated" indicator
  - Dashboard.tsx is in the Phase 5 unlocked list
- **Out of scope**: WebSocket/django-channels (decided by user — polling instead)

### S04 — Notification Preferences
- **In scope**: Extended notification preferences API + UI
  - `PATCH /api/user/notification-preferences/` — update user's prefs
  - `GET /api/user/notification-preferences/` — read current prefs
  - Extended schema: `email_enabled`, `whatsapp_enabled`, `quiet_hours_start`, `quiet_hours_end`,
    `frequency` (immediate/daily_digest), `job_assignment`, `sla_warning`, `completion`
  - Backend: `notification_preferences` JSONField already exists — extend defaults
  - Frontend: Notification Preferences card in Settings page
  - Wire quiet_hours check into `send_maintenance_notification()` and `send_whatsapp_notification()`

## Slices

- [x] **S01: Bilingual Arabic/English Maintenance PDFs** `risk:medium` `depends:[]`
- [x] **S02: Self-Registration + Email Verification** `risk:low` `depends:[]`
- [x] **S03: Live Analytics Polling** `risk:low` `depends:[]`
- [x] **S04: Notification Preferences** `risk:low` `depends:[]`

## Results
- **305/305 tests passing** (215 M001-M003 + 21 S01 + 22 S02 + 18 S03 + 26 S04 = 302 in new files, 3 pre-existing)
- Frontend build: clean (no errors)
- Root cause fixed: fpdf2 Helvetica Latin-1 limit → Amiri TTF as default font for all text
