# Cleaning SaaS — FACTUAL PROJECT STATE (v7.13)

Обновлено: 2026-02-15

## Changelog

### v7.13 — 2026-02-15

**Maintenance Context V1 — PROOF PARITY COMPLETE 🔒**

**Status: LOCKED** (see `MAINTENANCE_V1_RELEASE_LOCK.md`)

All 6 Proof Parity features implemented and verified:
- P1: Checklist Parity ✅ (CreateVisit selector, VisitDetail display/toggle)
- P2: Evidence/Photos Parity ✅ (before/after grid in VisitDetail)
- P3: Completion Enforcement ✅ (standardized errors, CompletionBlockersPanel)
- P4: SLA UI Parity ✅ (Visit List column, VisitDetail badges)
- P5: Visit PDF Report ✅ (neutral colors, maintenance-specific)
- P6: Asset History PDF ✅ (AssetHistoryReportView, RBAC enforced)

Regression Safety Verified:
- `verify_roles.sh` — 18/18 PASS
- Cleaning context — Jobs/History/Planning work
- Context isolation — maintenance ≠ cleaning views
- RBAC — Asset History PDF blocked for cleaners (403)

Documentation:
- MAINTENANCE_PROOF_PARITY_PLAN.md v1.6 — Status: COMPLETE
- MAINTENANCE_V1_RELEASE_LOCK.md — Created (baseline lock)

### v7.12 — 2026-02-15

**Maintenance Context V1 — Frontend UI + Proof Parity Assessment**

Frontend Pages Implemented:
- Dashboard (`/maintenance/dashboard`) with 4 KPI widgets ✅
- Visit List (`/maintenance/visits`) with filters + deep links ✅
- Create Visit (`/maintenance/visits/new`) with asset prefill ✅
- Visit Detail (`/maintenance/visits/:id`) basic info ✅
- Assets List (`/maintenance/assets`) with CRUD ✅
- Asset Detail (`/maintenance/assets/:id`) with service history ✅
- Asset Types (`/maintenance/asset-types`) CRUD ✅

Documentation:
- MAINTENANCE_CONTEXT_V1_SCOPE.md updated to v1.1 (Proof Parity Requirements)
- MAINTENANCE_PROOF_PARITY_PLAN.md created

### v7.11 — 2026-02-14

**Maintenance Context V1 — Backend Asset Layer — DONE ✅**

Models:
- AssetType model (company-scoped) — DONE ✅
- Asset model (company-scoped, location FK, asset_type FK) — DONE ✅
- Job.asset nullable FK for service visit tracking — DONE ✅

API Endpoints:
- GET/POST /api/manager/asset-types/ — list and create ✅
- GET/PATCH/DELETE /api/manager/asset-types/:id/ — detail, update, delete ✅
- GET/POST /api/manager/assets/ — list (filterable) and create ✅
- GET/PATCH/DELETE /api/manager/assets/:id/ — detail, update, delete ✅

RBAC:
- owner/manager: full CRUD access ✅
- staff: read-only access ✅
- cleaner: 403 Forbidden ✅

**Documentation:**
- API_CONTRACTS.md updated to v1.11.0 (section 14)
- docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md reference

**Scope Boundaries (LOCKED):**
- No new lifecycle states (Platform Layer protected)
- No new roles (RBAC matrix locked)
- No separate maintenance engine
- Additive models only

### v7.10 — 2026-02-14

**PDF Reports Enhancement + XLSX Export — DONE ✅**

Job Report PDF:
- Company logo in header — DONE ✅
- Color-coded status badges (completed/in_progress/scheduled) — DONE ✅
- Blue header for summary table — DONE ✅
- Styled notes sections with backgrounds (Manager=gray, Cleaner=yellow) — DONE ✅
- SLA status as colored blocks (green OK / red violated) — DONE ✅
- Human-readable SLA reason labels — DONE ✅
- Human-readable audit event types (Check In / Check Out) — DONE ✅
- Improved table styling with alternating rows — DONE ✅

Company SLA Report PDF:
- KPI summary cards (Total Jobs, Violations, Success Rate) — DONE ✅
- Grammar fix for singular/plural (1 job was / 2 jobs were) — DONE ✅
- Human-readable SLA reason labels — DONE ✅
- Footer with page numbers and generation date — DONE ✅
- Color-coded tables (blue headers, red for violations) — DONE ✅
- Alternating row colors — DONE ✅

XLSX Export (replaced CSV):
- Excel format with openpyxl — DONE ✅
- Blue header with white text — DONE ✅
- Both readable names and IDs included — DONE ✅
- Auto-sized columns — DONE ✅
- Alternating row colors — DONE ✅

**Documentation:**
- docs/reports/PDF_REPORTS.md created
- DOCS_INDEX.md updated

### v7.9 — 2026-02-13

**Manual Paid Activation Flow (Pre-Paddle) — DONE ✅**

- Management command `activate_paid_plan` for manual paid plan activation — DONE ✅
- Paid companies (`plan=active`) bypass trial expiry checks — job creation always allowed — DONE ✅
- API responses include `is_paid` boolean flag — DONE ✅
- Frontend reflects paid state:
  - Billing page shows "Active Plan" banner — DONE ✅
  - Dashboard shows green paid banner — DONE ✅
  - JobPlanning allows job creation for paid companies — DONE ✅
  - Upgrade CTAs hidden for paid companies — DONE ✅

**Documentation:**
- docs/product/PAID_ACTIVATION_FLOW_v1.md created
- API_CONTRACTS.md updated to v1.10.0
- COMMERCIAL_READINESS_CHECKLIST.md updated

**Usage:**
```bash
python manage.py activate_paid_plan --company-id 18
python manage.py activate_paid_plan --company-id 18 --tier pro
python manage.py activate_paid_plan --company-id 18 --deactivate
```

### v7.8 — 2026-02-13

**RBAC & Trial Enforcement Verification — DONE ✅**

- Trial expired → job creation blocked (`code: "trial_expired"`, HTTP 403) — DONE ✅
- Billing RBAC enforced:
  - Staff blocked (403 FORBIDDEN) — DONE ✅
  - Manager read-only (`can_manage=false`) — DONE ✅
  - Owner full access (`can_manage=true`) — DONE ✅
- Invoice download RBAC enforced:
  - Owner-only (returns 501 stub) — DONE ✅
  - Manager blocked (403 FORBIDDEN) — DONE ✅
- Copy consistency for trial expired UX (unified `trial_expired` code) — DONE ✅
- `verify_roles.sh` smoke test script — passes 17/17 tests ✅

**Documentation:**
- API_CONTRACTS.md updated with RBAC summary table (section 0.5.1)
- API_CONTRACTS.md updated with Trial enforcement section (section 0.5.2)
- VERIFICATION_CHECKLIST.md updated with `verify_roles.sh` instructions

### v7.7 — 2026-02-13

**NEW:**
- Owner Assignment Deterministic — DONE ✅
- First user of new company is automatically Owner (not Manager)
- Management command `ensure_company_owner` to fix existing companies
- Management command `create_company_with_owner` for sales-assisted onboarding
- Cleaner Lifecycle Model (is_active enforcement) — DONE ✅
- Role-oriented UI polish (Owner vs Manager) — DONE ✅

**CHANGED:**
- ManagerSignupView now creates Owner (was: Manager)
- Email uniqueness check includes all console roles (owner, manager, staff)
- Inactive cleaners blocked from: login, job assignment, check-in, check-out
- Billing page: Owner sees "billing administrator" banner, Manager sees "read-only" banner
- Settings home: role badge shown, descriptions adapt to role
- Billing micro-copy: clear messaging about who can modify vs view

**ARCHITECTURE:**
- Every company guaranteed to have exactly 1 Owner (Billing Admin)
- Owner/Manager role distinction formalized in docs/product/OWNER_MANAGER_MODEL_v1.md
- RBAC helpers expanded: isOwner, isManager, getRoleLabel, getRoleDescription

### v7.6 — 2026-02-12

**NEW:**
- Cleaner Access Lifecycle (Reset Access System) — DONE ✅
- POST /api/company/cleaners/{id}/reset-access/ — генерация временного 4-значного PIN (consistent с регистрацией)
- User.must_change_password field — флаг обязательной смены пароля
- Login enforcement — блокировка login с 403 PASSWORD_CHANGE_REQUIRED до смены пароля

**CHANGED:**
- Login flow (все endpoints) — проверка must_change_password перед выдачей токена
- POST /api/me/change-password/ — сбрасывает must_change_password после успешной смены

**ARCHITECTURE:**
- Полноценный lifecycle управления доступом клинера (не просто "сброс пароля")
- Deterministic error format с кодом PASSWORD_CHANGE_REQUIRED

### v7.5 — 2026-02-12

**NEW:**
- Company Logo Upload с валидацией (max 2MB, PNG/JPG/JPEG/WEBP) — DONE ✅

**CHANGED:**
- Company logo теперь сохраняется в ImageField (`company.logo`) с персистентным хранением в `media/company_logos/`
- GET /api/company/ и PATCH /api/company/ возвращают `logo_url: null` вместо пустой строки, если логотип не загружен
- POST /api/company/logo/ валидирует размер файла (max 2MB) и формат (PNG/JPG/JPEG/WEBP)

**FIXED:**
- Логотип теперь сохраняется после перезапуска сервера (ImageField вместо текстового поля)

### v7.4 — 2026-02-12

**NEW:**
- Company API v1.0 (Org-scope, Owner/Manager) — DONE ✅
- Backend endpoints: GET /api/company, PATCH /api/company, POST /api/company/logo, GET /api/company/cleaners, POST /api/company/cleaners
- RBAC: Owner/Manager allowed (full access), Staff/Cleaner blocked (403 FORBIDDEN)
- Standardized error format: `{code, message, fields?}` across all Company API endpoints
- Frontend Company section: `/company/profile`, `/company/team` (READY for backend integration)
- API documentation: API_CONTRACTS.md section 10 (Company API)
- Verification script: `backend/verify_company_api.sh`

**ARCHITECTURE:**
- Clear separation: Company API (org-scope) vs Settings API (user-scope)
- RBAC expanded: Owner + Manager (not just Manager as in legacy endpoints)

### v7.3 — 2026-02-12

**NEW:**
- Settings API v1.1 (Account & Billing MVP) — DONE ✅
- Account Settings: profile management, password change (password-auth only), notification preferences
- Billing page: plan summary, usage metrics, payment method stub, RBAC (Owner/Manager/Staff)
- Standardized error format: `{code, message, fields?}` across all Settings API endpoints
- RBAC enforcement: Owner (full access), Manager (read-only billing), Staff/Cleaner (403 blocked)
- Frontend Settings integration: AccountSettings.tsx, Billing.tsx wired to backend API
- Verification checklist: `docs/settings/VERIFICATION_CHECKLIST.md`
- Backend verification script: `backend/verify_rbac.sh`

**CHANGED:**
- User model extended: roles (owner/manager/staff/cleaner), auth_type (password/sso), notification_preferences (JSONField)
- AccountDropdown: Billing link hidden for Staff role

**FIXED:**
- Settings API documentation consolidated in API_CONTRACTS.md (section 9)

**ARCHITECTURE:**
- Platform Layer v1 Definition of Done created (architectural lock document)

### v7.2 — 2026-02-12

**NEW:**
- Hybrid Verified Model: `completed` (verified) vs `completed_unverified` (manager override)
- Job status: `completed_unverified` (force-completed jobs, excluded from standard KPIs)
- Audit fields: `verification_override`, `force_completed_at`, `force_completed_by`, `force_complete_reason`
- JobCheckEvent immutability: save() override prevents updates
- Row-level locking: `select_for_update()` + `transaction.atomic()` on all mutation endpoints

**CHANGED:**
- Force-complete allowed only from `in_progress` status (was: `scheduled`)
- Force-complete transitions to `completed_unverified` (was: `completed`)
- Analytics: all standard KPI endpoints exclude `completed_unverified`

**FIXED:**
- All CRITICAL audit risks resolved (force-complete security, race conditions, GPS bypass prevention)
- All HIGH audit risks resolved (check-out integrity, event immutability)
- Race conditions eliminated on checklist, check-out, photo upload

---

**Формат статусов:**  
✅ сделано 🟡 частично / в процессе ⛔ не делали

Документ фиксирует **исключительно текущее фактическое состояние проекта**.  
Без планов, гипотез, обещаний и дорожных карт.

---

## 🧠 СЛОЙ 0 — ЯДРО (Backend + Manager Portal)

### Backend (Django, API-first)

#### Core execution (Jobs)

* Jobs: модель, связи, бизнес-логика ✅
* Статусный флоу: `scheduled → in_progress → completed / completed_unverified` ✅
* Row-level locking: `select_for_update()` + `transaction.atomic()` на всех mutation endpoints ✅
* Audit integrity: все CRITICAL + HIGH риски устранены ✅

**Check-in / Check-out**
* GPS check-in/out
* distance validation (≤ 100 м) ✅

**Checklist**
* JobChecklistItem (snapshot)
* required items enforcement
* toggle / bulk update (cleaner-only) ✅

**Photos before / after**
* EXIF extraction
* distance validation
* normalization to JPEG
* storage + File model
* связь с Job ✅

**Audit**
* JobCheckEvent (полный audit trail) ✅
* JobCheckEvent immutability (save() override) ✅

**Job PDF**
* реальная генерация бинарного PDF
* endpoint `/api/jobs/<id>/report/pdf/`
* single source of truth (те же данные, что UI)
* используется для download и email ✅

---

## Locations — operational safeguards (summary)

Принцип:

> Location нельзя "удалить", если по ней уже есть jobs.  
> Исторические jobs и отчёты всегда остаются валидными, даже если локация больше не используется.

---

## Locations — operational safeguards

✅ `is_active` флаг в модели Location реализован и используется как единственный операционный переключатель.

✅ Физическое удаление локаций с job history запрещено:
- `Job.location` использует `on_delete=PROTECT`;
- попытка удалить локацию с джобами невозможна на уровне БД и backend.

✅ Archive / deactivate flow реализован через `is_active = false`:
- неактивные локации скрыты из job planning и dropdown’ов;
- существующие jobs, история, PDF-отчёты и аналитика продолжают ссылаться на локацию.

✅ UI менеджера поддерживает deactivate / reactivate:
- явное отображение статуса (Active / Inactive);
- предупреждение о последствиях деактивации;
- деактивация не воспринимается как удаление.

✅ Создание новых jobs на `is_active = false` запрещено backend-guard’ом  
(`400 Bad Request`, `code: "location_inactive"`).

---

## Locations — Manager UI (operational UX)

* Create / Edit Location:
  * двухколоночная форма (адрес / координаты)
  * разделение:
    - Address search (Google Places Autocomplete)
    - Editable human-readable address (для отчётов и PDF)
  * live-синхронизация:
    - autocomplete → address + coordinates
    - draggable marker → coordinates
  * валидация и нормализация координат (lat / lng диапазоны) ✅

* Location status:
  * Active / Inactive toggle
  * явное объяснение последствий
  * поддержка re-activate
  * deactivation ≠ deletion (чётко отражено в UI) ✅

* Locations list:
  * поиск по имени и адресу
  * фильтр по статусу (active / inactive)
  * сортировка (name / status / created)
  * визуальные status badges
  * click-to-edit строка таблицы ✅

---

## Locations — Maps & Addressing

* Address search: Google Places Autocomplete ✅
* Map provider: Google Maps JavaScript API ✅
* Coordinate source:
  * autocomplete
  * draggable marker ✅
* Leaflet / OpenStreetMap: не используется ⛔

---

## Google Maps & Places — security and billing

* API key restricted by HTTP referrer:
  * `http://localhost:8080/*`
* API key restricted to required services:
  * Maps JavaScript API
  * Places API
* Monthly billing budget enabled:
  * limit: $10 / month
  * alerts at 50%, 90%, 100%
* Цель: предотвращение неконтролируемых расходов

Status: ✅ enforced

👉 Backend-ядро job execution **полностью закрыто**.

---

## Backend — Trial & Commercial Enforcement

* Trial lifecycle (create / active / expired) ✅
* Usage tracking (jobs / cleaners) ✅
* Enforcement через error codes:
  * `trial_expired`
  * `trial_jobs_limit_reached`
  * `company_blocked` ✅
* `Company.is_active`, suspended state ✅
* Trial expired → job creation blocked (HTTP 403, `code: "trial_expired"`) ✅
* Copy consistency: unified `trial_expired` code across backend + frontend ✅

👉 Backend — **единственный источник истины**.

---

## 🧑‍💼 Manager Portal (Web)

### Jobs / Execution

* Today Jobs (API-driven) ✅
* Job Details (manager view) ✅

**Job Details включает:**
* timeline (`JobCheckEvent`)
* фото before / after
* чеклист (read-only)
* GPS + Open in Maps
* SLA status + reasons
* Generate / Download PDF
* Email PDF ✅

---

### Job PDF Email (Manager)

* endpoint: `POST /api/manager/jobs/<id>/report/email/`
* используется тот же PDF, что и download
* email:
  * default → `request.user.email`
  * optional custom email
* UI:
  * modal выбора получателя
  * loading / success / error
* каждая отправка логируется в БД ✅

---

### Job Planning

* `/planning` — работает end-to-end ✅
* API → UI → Create Job → refetch
* editing existing jobs — ⛔ (осознанно)

---

### Job History

* Полный архив jobs
* Фильтры, периоды, SLA-фильтр
* Основа для audit и reports ✅

---

## 📊 Performance & SLA Layer

### SLA Engine (micro-SLA v1)

* `sla_status` (`ok` / `violated`) ✅
* `sla_reasons[]` (machine-readable) ✅
* единый helper:
  `compute_sla_status_and_reasons_for_job(job)` ✅
* используется в:
  * Job Details
  * Planning
  * History
  * Reports
  * Analytics ✅

---

### Force-complete (Manager-only)

**Backend**
* `POST /api/manager/jobs/{id}/force-complete/`
* Allowed only from `in_progress` status (check-in required) ✅
* job → `completed_unverified` (excluded from standard KPIs) ✅
* SLA = `violated`
* audit:
  * `verification_override` (boolean)
  * `force_completed_at` (timestamp)
  * `force_completed_by` (User FK)
  * `force_complete_reason` (text) ✅
* Row-level locking: `select_for_update()` + `transaction.atomic()` ✅

**Frontend**
* Force-complete modal
* free-text reason (was: reason_code + comment)
* только для jobs с status=in_progress
* auto-refetch Job Details ✅

---

## 📈 Reports v2 (PDF + Email + Audit)

### Backend

* Weekly:
  * `/api/manager/reports/weekly/`
  * `/api/manager/reports/weekly/pdf/`
  * `/api/manager/reports/weekly/email/` ✅
* Monthly:
  * `/api/manager/reports/monthly/`
  * `/api/manager/reports/monthly/pdf/`
  * `/api/manager/reports/monthly/email/` ✅
* Aggregation:
  * completed jobs only
  * SLA-based calculations ✅

---

### ReportEmailLog (Audit)

* company
* user
* kind: `job_report / weekly_report / monthly_report`
* job / period_from / period_to
* to_email
* subject
* status
* error_message
* created_at

Логируется:
* Job PDF
* Weekly report
* Monthly report ✅

---

## 📊 Analytics (Manager)

* `/analytics` ✅
* KPI summary (live)
* Trends
* Cleaner performance
* SLA performance
* Unified date range
* completed jobs only
* frontend без бизнес-логики ✅

👉 Analytics **реально работает**, не stub.

---

## 📱 СЛОЙ 1 — Mobile Cleaner App

**Статус:** 🟡 рабочий MVP

* Login (PIN)
* Today Jobs
* Job Details
* Check-in / Check-out
* Photos before / after
* Checklist
* Timeline
* Job PDF
* GPS enforcement

Открытые вопросы (UX safety, не логика):
* явные loading / retry / error состояния (photo upload, check-in/out) ⛔

---

## 🧑‍💼 СЛОЙ 2 — Управление

* Manager Portal стабилен ✅
* Planning / History / Reports / Analytics работают ✅
* Settings v1.1 (Account & Billing MVP) — DONE ✅
  * Account Settings (profile, password, notifications)
  * Billing (plan summary, usage, RBAC enforcement)
  * Frontend integration complete
  * Verification checklist: `docs/settings/VERIFICATION_CHECKLIST.md`
  * RBAC verified:
    * Staff blocked from billing (403) ✅
    * Manager read-only billing (`can_manage=false`) ✅
    * Owner full billing access (`can_manage=true`) ✅
    * Invoice download owner-only (Manager → 403) ✅
  * Smoke test: `backend/verify_roles.sh` (17/17 pass) ✅
* Company API v1.0 (Org Scope) — DONE ✅
  * Backend: GET /api/company, PATCH /api/company, POST /api/company/logo, GET /api/company/cleaners, POST /api/company/cleaners
  * Frontend: `/company/profile`, `/company/team` (ready for backend integration)
  * RBAC: Owner/Manager only (Staff/Cleaner → 403 FORBIDDEN)
  * Error format: `{code, message, fields?}` standardized
  * Verification script: `backend/verify_company_api.sh`
  * Documentation: API_CONTRACTS.md section 10

---

## 🔧 Maintenance Context V1 — COMPLETE 🔒

**Status:** ✅ Backend COMPLETE | ✅ Frontend COMPLETE | ✅ Proof Parity COMPLETE

**LOCKED** — See `MAINTENANCE_V1_RELEASE_LOCK.md` for baseline definition.

### Backend
* AssetType model (company-scoped) ✅
* Asset model (company-scoped, location FK, asset_type FK) ✅
* Job.asset nullable FK ✅
* Job.context field (explicit cleaning/maintenance separation) ✅
* MaintenanceCategory model ✅
* CRUD API endpoints ✅
* Service Visits API (`/api/manager/service-visits/`) with `sla_status` ✅
* Asset Service History API (`/api/manager/assets/:id/visits/`) ✅
* Visit PDF Report (`/api/maintenance/visits/:id/report/`) ✅
* Asset History PDF (`/api/maintenance/assets/:id/history/report/`) ✅
* RBAC enforcement (owner/manager write, staff read, cleaner blocked) ✅

### Frontend
* Dashboard with 4 KPI widgets ✅
* Visit List with filters + SLA column ✅
* Create Visit with checklist template selector ✅
* Visit Detail with checklist, photos, SLA, PDF download ✅
* Assets list with CRUD ✅
* Asset Detail with service history + PDF export ✅
* Asset Types CRUD ✅

### Proof Parity (6/6 COMPLETE)
| Feature | Status | Implementation |
|---------|--------|----------------|
| P1: Checklist execution | ✅ | CreateVisit selector, VisitDetail toggle |
| P2: Evidence/photos | ✅ | Before/after grid in VisitDetail |
| P3: Completion enforcement | ✅ | CompletionBlockersPanel, standardized errors |
| P4: SLA UI | ✅ | Visit List column, VisitDetail badges |
| P5: Visit PDF report | ✅ | Neutral colors, maintenance-specific |
| P6: Asset history PDF | ✅ | RBAC: cleaners get 403 |

### Context Isolation
| Check | Status |
|-------|--------|
| Maintenance visits filtered by context | ✅ |
| Cleaning views exclude maintenance | ✅ |
| Cross-context isolation tests | ✅ |
| Cleaning UI unaffected | ✅ |
| `verify_roles.sh` passes | ✅ (18/18) |

### Scope Boundaries (LOCKED)
* No new lifecycle states (Platform Layer locked)
* No new roles (RBAC matrix locked)
* No separate maintenance engine
* Vocabulary layer only (Service Visit = Job, Technician = Cleaner)

**Reference:**
* `docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md`
* `docs/execution/MAINTENANCE_PROOF_PARITY_PLAN.md` (v1.6 — COMPLETE)
* `docs/execution/MAINTENANCE_V1_RELEASE_LOCK.md` (baseline lock)

---

## 💳 СЛОЙ 3 — Коммерция

* Trial lifecycle ✅
* Usage limits (jobs / cleaners) ✅
* Settings API v1.1 (Account & Billing MVP) ✅
  * Billing page UI (plan, status, usage, RBAC)
  * Payment method stub (ready for provider integration)
  * Invoice download stub (501 Not Implemented)
* Payment provider integration ⛔ (not included in v1)

---

## 🌍 СЛОЙ 4 — Маркетинг

* Landing + Demo (static) 🟡

---

## 📊 СЛОЙ 5 — Масштаб

* SLA aggregation ✅
* Performance layer ✅
* Reports v2 (PDF + Email + Audit) ✅
* Analytics v1 ✅
* Jobs CSV export (owner/manager, completed jobs only) ✅
* Location lifecycle (archive / inactive) ✅
* Multi-company roles ⛔
* Mobile UX safety states ⛔

---

## 🧪 QA & Regression

* `QA_CHECKLIST.md` — ручной regression checklist  
  (smoke + happy-path + SLA + reports) ✅

---

## Known limitations

* Нет биллинга
* Trial ограничен jobs / cleaners
* Mobile camera UX требует полировки
* Locations без enterprise-level features (bulk actions, import/export, hierarchy)
* Email delivery зависит от SMTP

---

## Итог

* Core execution — DONE ✅
* SLA + Performance — DONE ✅
* Reports v2 — DONE ✅
* Analytics — DONE ✅
* Settings v1.1 (Account & Billing MVP) — DONE ✅
* Product = **операционный SaaS с базовыми настройками и billing-инфраструктурой**
  с реальной управленческой ценностью и audit trail.

**Статусы слоёв:**
* Слой 0 — DONE ✅
* Слой 1 — MVP 🟡
* Слой 2 — DONE ✅
* Слой 3 — готов к интеграции платёжного провайдера (Settings v1.1 готова)
* Слои 4–5 — заделы

---

## Context Isolation Fix (2026-03-06)

- Fixed: 11 Job.objects.filter() calls missing context=Job.CONTEXT_CLEANING
- Affected: views_reports.py (3 views), analytics_views.py (8 functions)
- Impact: Cleaning reports/analytics no longer include Maintenance jobs
- Phase 5: Added pagination to History/Locations, retry buttons to Dashboard/Analytics
