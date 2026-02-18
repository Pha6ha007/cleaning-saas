# Foundation Plan — Infrastructure Hardening

> **Status**: Active
> **Created**: February 2026
> **Goal**: Make Proof Platform production-ready before first paying client

## Non-Goals

- No new features (no Property context, no Fit-out)
- No frontend changes (Cleaning LOCKED, Maintenance LOCKED)
- No database schema changes (except PR6 PostgreSQL migration)
- No Celery / async infrastructure

---

## PR Breakdown

### PR1 — Test Harness + Critical Path Tests
**Branch**: `foundation/pr1-tests`
**Scope**:
- Install pytest + pytest-django (dev dependency only)
- Copy test files from `proof_tests/` package into `backend/tests/`
- Add `backend/pytest.ini`
- Run `pytest tests/ -v`, fix any import/path issues in TESTS ONLY
- Do NOT modify any production code (models, views, urls, serializers)

**Files to create/modify**:
```
backend/pytest.ini                    — NEW
backend/tests/__init__.py             — NEW
backend/tests/conftest.py             — NEW (fixtures)
backend/tests/test_check_in_out.py    — NEW (18 tests)
backend/tests/test_rbac.py            — NEW (15+ tests)
backend/tests/test_force_complete.py  — NEW (14 tests)
backend/tests/test_invariants.py      — NEW (16 tests)
```

**Definition of Done**:
- [ ] `pytest tests/ -v` → all green
- [ ] No production files changed
- [ ] Commit message: `test: add 63 pytest tests on critical paths`

---

### PR2 — Additional Tests (SLA + Photos + Maintenance)
**Branch**: `foundation/pr2-more-tests`
**Scope**:
- Add `test_photos.py` — upload/delete flow, EXIF, before→after order
- Add `test_sla.py` — SLA calculations if SLA engine exists
- Add `test_maintenance.py` — asset CRUD, service visits, context isolation
- Target: 80+ total tests

**Definition of Done**:
- [ ] `pytest tests/ -v` → all green (80+ tests)
- [ ] No production files changed
- [ ] Commit message: `test: add photo, SLA, maintenance tests`

---

### PR3 — Token Expiry + Rate Limiting
**Branch**: `foundation/pr3-auth-security`
**Scope**:
- Add token expiration (24h) to TokenAuthentication
- Add DRF throttling (settings.py only): 100/hour anon, 1000/hour auth
- Add tests for both

**Files to modify**:
```
backend/config/settings.py            — ADD REST_FRAMEWORK throttle config
backend/tests/test_auth_security.py   — NEW
```

**Definition of Done**:
- [ ] Token expires after 24h
- [ ] Rate limiting returns 429 on excess
- [ ] All existing tests still pass
- [ ] Commit message: `security: add token expiry and rate limiting`

---

### PR4 — GitHub Actions CI
**Branch**: `foundation/pr4-ci`
**Scope**:
- Create `.github/workflows/test.yml`
- Runs `pytest tests/` on every push and PR
- Python 3.11+, SQLite (for now)
- Fail PR if tests fail

**Files to create**:
```
.github/workflows/test.yml           — NEW
```

**Definition of Done**:
- [ ] Push to branch triggers CI
- [ ] PR shows green/red status
- [ ] Commit message: `ci: add GitHub Actions pytest workflow`

---

### PR5 — Sentry Error Monitoring
**Branch**: `foundation/pr5-sentry`
**Scope**:
- Backend: `pip install sentry-sdk`, init in settings.py (env-gated)
- Frontend (dubai-control): `npm install @sentry/react`, init in main.tsx
- Mobile (mobile-cleaner): `npx expo install sentry-expo`, init in App.tsx
- All gated by `SENTRY_DSN` env variable (no-op if not set)

**Files to modify**:
```
backend/config/settings.py            — ADD Sentry init
backend/requirements.txt              — ADD sentry-sdk
dubai-control/src/main.tsx             — ADD Sentry init
dubai-control/package.json             — ADD @sentry/react
mobile-cleaner/App.tsx                 — ADD Sentry init
mobile-cleaner/package.json            — ADD sentry-expo
```

**Definition of Done**:
- [ ] Backend errors reported to Sentry (when DSN set)
- [ ] Frontend errors reported to Sentry (when DSN set)
- [ ] No errors when SENTRY_DSN not set
- [ ] All existing tests still pass
- [ ] Commit message: `monitoring: add Sentry to backend, web, mobile`

---

### PR6 — PostgreSQL Migration
**Branch**: `foundation/pr6-postgres`
**Scope**:
- Add `docker-compose.yml` with postgres container for dev
- Update settings.py to use DATABASE_URL (psycopg2) when set, SQLite as fallback
- Add `.env.example` with all required variables
- Test all migrations on fresh Postgres
- Update CI to test on both SQLite and Postgres

**Files to create/modify**:
```
docker-compose.yml                     — NEW
.env.example                           — NEW
backend/config/settings.py             — MODIFY (DATABASE_URL support)
backend/requirements.txt               — ADD psycopg2-binary
.github/workflows/test.yml             — MODIFY (add Postgres job)
```

**Definition of Done**:
- [ ] `docker-compose up -d` → Postgres running
- [ ] `python manage.py migrate` → clean on fresh Postgres
- [ ] All tests pass on Postgres
- [ ] SQLite still works as fallback (no regression)
- [ ] Commit message: `infra: add PostgreSQL support with Docker`

---

### PR7 — Documentation Cleanup
**Branch**: `foundation/pr7-docs`
**Scope**:
- Extract invariants from DEV_BRIEF.md → create `INVARIANTS.md` (2 pages max)
- Move historical sections from DEV_BRIEF.md → `docs/archive/HISTORY.md`
- Create `TESTING.md` — how to run tests, what to test for new features
- Create `DEPLOYMENT.md` — domains, CORS, env vars, deploy process
- Update PROJECT_STATE.md with test coverage section

**Files to create/modify**:
```
INVARIANTS.md                          — NEW
TESTING.md                             — NEW
DEPLOYMENT.md                          — NEW
docs/archive/HISTORY.md                — NEW
DEV_BRIEF.md                           — MODIFY (remove duplicates)
PROJECT_STATE.md                       — MODIFY (add test coverage)
```

**Definition of Done**:
- [ ] INVARIANTS.md < 2 pages, only rules
- [ ] DEV_BRIEF.md reduced by 50%+ sections
- [ ] TESTING.md has "how to add tests for new context" section
- [ ] Commit message: `docs: clean up DEV_BRIEF, add INVARIANTS and TESTING`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Claude modifies production code while fixing tests | PR1 constraint: only `backend/tests/` and `backend/pytest.ini` |
| PostgreSQL migration breaks dev environment | PR6 comes AFTER CI (PR4), fallback to SQLite preserved |
| Sentry SDK breaks build | Gated by env variable, no-op without DSN |
| Rate limiting blocks legitimate usage | Conservative defaults (1000/hour auth), easy to tune |
| Claude touches locked Cleaning files | CLAUDE.md rules enforced, git diff check before commit |

---

---

## Phase 2 — Notification Layer (after Foundation)

> **Prerequisite**: All PR1-PR7 merged. Tests green. CI running.
> **Goal**: Platform-level notification engine that works across ALL contexts (cleaning, maintenance, property, fit-out)

### Architecture

```
Job lifecycle event
  → Django signal (post_save / custom)
    → Notification Engine (creates Notification record)
      → Transport adapters:
          ├── Telegram Bot (PR9)
          ├── Expo Push (PR10)
          └── Email (future)
```

**Key principle**: Notification Engine is context-agnostic. It reacts to Job model events.
Since all contexts use the same Job model with `context` field — cleaning, maintenance,
and future contexts are covered automatically. Zero code changes when new context launches.

---

### PR8 — Notification Engine (backend)
**Branch**: `notifications/pr8-engine`
**Scope**:
- Create new app: `backend/apps/notifications/`
- Models:
  ```
  NotificationChannel(user, channel_type, channel_id, is_active)
    — channel_type: "telegram" | "expo_push" | "email"
    — channel_id: telegram chat_id, expo push token, or email address

  Notification(event_type, recipient, channel, payload, status, created_at, sent_at, error)
    — event_type: "job_overdue" | "sla_violation" | "force_complete" | "daily_summary"
    — status: "pending" | "sent" | "failed"
  
  NotificationPreference(user, event_type, channels[], is_enabled)
    — user decides which events they want and via which channels
  ```
- Django signals on Job model:
  ```
  job_checked_in    — Job status → in_progress
  job_completed     — Job status → completed
  job_overdue       — scheduled_start_time + 15min passed, still scheduled
  job_force_completed — verification_override = True
  sla_violated      — actual vs scheduled exceeded threshold
  ```
- Signal handlers create Notification records with status="pending"
- Management command: `python manage.py send_notifications` (processes pending → sends via adapters)
- NO Celery. The command runs via cron (every 5 min) or GitHub Actions schedule.

**Files to create**:
```
backend/apps/notifications/__init__.py
backend/apps/notifications/models.py
backend/apps/notifications/signals.py
backend/apps/notifications/handlers.py       — signal handlers
backend/apps/notifications/adapters/base.py  — abstract transport adapter
backend/apps/notifications/admin.py
backend/apps/notifications/apps.py
backend/apps/notifications/management/commands/send_notifications.py
backend/tests/test_notifications.py
```

**Files to modify**:
```
backend/config/settings.py    — add 'apps.notifications' to INSTALLED_APPS
```

**Definition of Done**:
- [ ] Signal fires on job status change → Notification created in DB
- [ ] `send_notifications` command processes pending notifications
- [ ] Adapter pattern: base class with send() method, easy to extend
- [ ] Tests: signal fires, notification created, preferences respected
- [ ] No changes to Job model, views, or any existing code
- [ ] `pytest tests/ -v` → all green (existing + new)
- [ ] Commit: `feat: add notification engine with signal-based events`

---

### PR9 — Telegram Transport
**Branch**: `notifications/pr9-telegram`
**Scope**:
- Create Telegram bot adapter: `backend/apps/notifications/adapters/telegram.py`
- Bot setup:
  ```
  /start <token>  — links telegram user to Proof Platform user
  /status         — today's summary (jobs scheduled/completed/overdue)
  /mute / /unmute — toggle notifications
  ```
- Adapter reads from Notification(channel_type="telegram", status="pending")
- Sends via `python-telegram-bot` library (sync, no webhook needed for MVP)
- Env vars: `TELEGRAM_BOT_TOKEN` (no-op if not set)
- Message templates:
  ```
  🔴 SLA Violation
  Job #142 — Dubai Marina Tower
  Cleaner: Ahmed K.
  Scheduled: 09:00 | Actual: 09:47
  Delay: 47 min

  ⚠️ Force-Complete
  Job #155 — JBR Office
  By: Manager Sarah
  Reason: "Client confirmed by phone"

  📊 Daily Summary (18:00)
  ✅ Completed: 12/14
  ⚠️ Unverified: 1
  🔴 SLA violations: 2
  ```

**Files to create**:
```
backend/apps/notifications/adapters/telegram.py
backend/apps/notifications/management/commands/start_telegram_bot.py
backend/tests/test_telegram_adapter.py
```

**Files to modify**:
```
backend/requirements.txt                — add python-telegram-bot
backend/apps/notifications/handlers.py  — register telegram adapter
```

**Definition of Done**:
- [ ] `/start <token>` links Telegram account to user
- [ ] SLA violation → message in Telegram
- [ ] Force-complete → message in Telegram
- [ ] Daily summary at configured time
- [ ] Without TELEGRAM_BOT_TOKEN — no errors, no-op
- [ ] Tests with mocked Telegram API
- [ ] Commit: `feat: add Telegram notification transport`

---

### PR10 — Expo Push Transport
**Branch**: `notifications/pr10-expo-push`
**Scope**:
- Create push adapter: `backend/apps/notifications/adapters/expo_push.py`
- Mobile app registers push token on login → saved to NotificationChannel
- Adapter sends via Expo Push API (HTTP, no SDK needed)
- Target: cleaners (field workers) — job assigned, schedule changed
- Env vars: none needed for Expo Push (uses token-based auth)

**Files to create**:
```
backend/apps/notifications/adapters/expo_push.py
backend/tests/test_expo_push_adapter.py
```

**Files to modify**:
```
backend/apps/api/views_auth.py          — save push token on login (if provided)
mobile-cleaner/src/services/push.ts     — register for push, send token to backend
mobile-cleaner/App.tsx                   — init push notifications
```

**Definition of Done**:
- [ ] Mobile login sends push token → saved in NotificationChannel
- [ ] Job assigned → push notification to cleaner
- [ ] Tests with mocked Expo Push API
- [ ] Existing mobile functionality unchanged
- [ ] Commit: `feat: add Expo Push notification transport`

---

## Execution Rules

1. **One PR at a time** — never combine PRs
2. **All existing tests must pass** before merging any PR
3. **git diff check** — verify only expected files changed
4. **No production behavior changes** unless explicitly required by the PR
5. **If uncertain — STOP and ASK**

---
---

# Phase 2 — Notification Layer

> **Prerequisite**: Phase 1 (PR1-PR7) must be completed
> **Goal**: Platform-level notification engine that works across ALL contexts (Cleaning, Maintenance, Property, Fit-out)

## Architecture Principle

Notification Engine is a **platform layer**, not a feature of a specific context.
It follows the same pattern as Job model — context-agnostic, driven by events.

```
Job event (any context) → Django signal → Notification Engine → Transport adapters
                                                                  ├── Telegram
                                                                  ├── Expo Push
                                                                  └── Email (future)
```

One event → many channels. New context = zero notification code changes.

---

### PR8 — Notification Engine (Backend)
**Branch**: `notifications/pr8-engine`
**Scope**:
- Create new app `backend/apps/notifications/`
- Models:
  - `NotificationEvent` — immutable log of what happened
    - `event_type`: choices (job_overdue, sla_violated, force_completed, job_completed, daily_summary)
    - `job`: FK to Job (nullable for summary events)
    - `company`: FK to Company
    - `context`: CharField (cleaning/maintenance — copied from job.context)
    - `payload`: JSONField (flexible event data)
    - `created_at`: auto
  - `NotificationChannel` — user's delivery preferences
    - `user`: FK to User
    - `channel_type`: choices (telegram, push, email)
    - `channel_id`: CharField (telegram chat_id, expo push token, email)
    - `is_active`: BooleanField
    - `created_at`: auto
  - `NotificationDelivery` — delivery log (immutable)
    - `event`: FK to NotificationEvent
    - `channel`: FK to NotificationChannel
    - `status`: choices (pending, sent, failed)
    - `sent_at`: DateTimeField (nullable)
    - `error_message`: TextField (blank)
- Django signals (in `signals.py`):
  - `post_save` on Job: detect status transitions
  - `job_overdue`: when job.scheduled_start_time + 15min < now and status still scheduled
  - `sla_violated`: when check-out distance > 100m or time exceeded
  - `force_completed`: when verification_override becomes True
- Management command: `python manage.py check_overdue_jobs` (cron-friendly)
  - Finds jobs where scheduled_start_time + 15min < now and status = scheduled
  - Creates NotificationEvent(event_type=job_overdue) for each
  - Idempotent: won't create duplicate events for same job
- Management command: `python manage.py send_daily_summary` (cron-friendly)
  - Aggregates: jobs completed, violations, force-completes, pending
  - Creates NotificationEvent(event_type=daily_summary) per company
- Notification dispatcher (in `dispatch.py`):
  - Takes NotificationEvent → finds all active NotificationChannels for company console users
  - Creates NotificationDelivery(status=pending) for each
  - Calls transport adapter (but transports are stubs in this PR — just mark as sent)
  - Synchronous for now (no Celery). One management command: `python manage.py dispatch_notifications`
- Tests in `backend/tests/test_notifications.py`:
  - Signal fires on job status change
  - NotificationEvent created with correct type and payload
  - check_overdue_jobs finds overdue jobs, idempotent
  - send_daily_summary creates one event per company
  - Dispatcher creates deliveries for all active channels
  - Events are immutable (cannot be updated)

**Files to create**:
```
backend/apps/notifications/__init__.py
backend/apps/notifications/models.py
backend/apps/notifications/signals.py
backend/apps/notifications/apps.py          — connect signals in ready()
backend/apps/notifications/admin.py
backend/apps/notifications/dispatch.py
backend/apps/notifications/migrations/
backend/apps/notifications/management/commands/check_overdue_jobs.py
backend/apps/notifications/management/commands/send_daily_summary.py
backend/apps/notifications/management/commands/dispatch_notifications.py
backend/tests/test_notifications.py
```

**Files to modify**:
```
backend/config/settings.py                  — add apps.notifications to INSTALLED_APPS
```

**Definition of Done**:
- [ ] `python manage.py migrate` — clean
- [ ] `pytest tests/test_notifications.py -v` — all green
- [ ] All existing tests still pass
- [ ] NotificationEvent is immutable (save with pk raises error)
- [ ] check_overdue_jobs is idempotent
- [ ] Zero changes to Job model, views, or existing apps
- [ ] Commit message: `feat: add notification engine (platform layer)`

---

### PR9 — Telegram Transport
**Branch**: `notifications/pr9-telegram`
**Scope**:
- Telegram bot using `python-telegram-bot` library
- Bot commands:
  - `/start <token>` — links telegram account to Proof Platform user
    - Token generated via management command or API endpoint
    - Creates NotificationChannel(channel_type=telegram, channel_id=chat_id)
  - `/status` — shows today's summary (jobs count, violations, pending)
  - `/mute` / `/unmute` — toggle notifications
- Telegram transport adapter in `dispatch.py`:
  - Reads NotificationDelivery(status=pending, channel__channel_type=telegram)
  - Formats message per event_type (templates in `notifications/templates/`)
  - Sends via Bot API
  - Updates delivery status (sent/failed)
- Management command: `python manage.py run_telegram_bot` (long-running, for deployment)
- Env-gated: `TELEGRAM_BOT_TOKEN` — no-op if not set
- Message templates (Russian + English, based on company settings later):
  - job_overdue: "⚠️ Job #{id} at {location} — cleaner {name} hasn't checked in. Scheduled: {time}"
  - force_completed: "🔶 Job #{id} force-completed by {manager}. Reason: {reason}"
  - sla_violated: "🔴 SLA violation on Job #{id}: {details}"
  - daily_summary: "📊 Daily: {completed}/{total} jobs, {violations} violations, {force} overrides"
- API endpoint for generating link token:
  - `POST /api/me/telegram-link/` → returns { token, bot_link }
  - Manager/Owner only
- Tests:
  - Bot /start creates NotificationChannel
  - Dispatcher sends to telegram channels
  - Mute/unmute toggles is_active
  - No crash when TELEGRAM_BOT_TOKEN not set

**Files to create**:
```
backend/apps/notifications/transports/__init__.py
backend/apps/notifications/transports/telegram.py
backend/apps/notifications/templates/telegram/job_overdue.txt
backend/apps/notifications/templates/telegram/force_completed.txt
backend/apps/notifications/templates/telegram/sla_violated.txt
backend/apps/notifications/templates/telegram/daily_summary.txt
backend/apps/notifications/management/commands/run_telegram_bot.py
backend/tests/test_telegram_transport.py
```

**Files to modify**:
```
backend/requirements.txt                    — add python-telegram-bot
backend/apps/notifications/dispatch.py      — add telegram transport
backend/config/urls.py                      — add telegram-link endpoint
```

**Definition of Done**:
- [ ] Bot responds to /start, /status, /mute
- [ ] Notifications delivered to Telegram when bot token set
- [ ] No errors when TELEGRAM_BOT_TOKEN not set
- [ ] All existing tests pass
- [ ] Commit message: `feat: add Telegram notification transport`

---

### PR10 — Expo Push Transport
**Branch**: `notifications/pr10-push`
**Scope**:
- Push transport adapter for cleaner mobile app
- API endpoint for registering push token:
  - `POST /api/me/push-token/` — saves Expo push token
  - Creates NotificationChannel(channel_type=push, channel_id=expo_push_token)
- Push transport in `dispatch.py`:
  - Uses Expo Push API (https://exp.host/--/api/v2/push/send)
  - Sends to channels with channel_type=push
- Mobile integration points (documented, not implemented in this PR):
  - mobile-cleaner registers push token on login
  - mobile-cleaner handles incoming notifications
- Cleaner notifications (different from manager):
  - new_job_assigned: "📋 New job at {location}, {date} {time}"
  - job_reminder: "⏰ Job at {location} starts in 30 minutes"
- Tests:
  - Push token registration endpoint works
  - Dispatcher creates deliveries for push channels
  - Push API called with correct payload (mock)

**Files to create**:
```
backend/apps/notifications/transports/push.py
backend/apps/notifications/templates/push/new_job_assigned.txt
backend/apps/notifications/templates/push/job_reminder.txt
backend/tests/test_push_transport.py
```

**Files to modify**:
```
backend/apps/notifications/dispatch.py      — add push transport
backend/config/urls.py                      — add push-token endpoint
```

**Definition of Done**:
- [ ] Push token saved via API
- [ ] Dispatcher sends to Expo Push API (mocked in tests)
- [ ] All existing tests pass
- [ ] Commit message: `feat: add Expo Push notification transport`

---

## Phase 2 Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Signals cause side effects in existing tests | Signals only CREATE events, never modify Job or other models |
| Telegram bot blocks main thread | Separate management command, not in Django request cycle |
| Notification spam | check_overdue_jobs is idempotent, daily_summary runs once per day |
| No Celery for async dispatch | Management commands run via cron. Synchronous dispatch is fine for <100 jobs/day |
| Push token leaks | NotificationChannel is company-scoped, tokens only readable by owner |
