# M005: Multi-Branch, Recurring Jobs, Advanced SLA & Audit Log Viewer

## Goal

Four production-ready features that scale CleanProof for enterprise customers:

1. **Multi-branch hierarchy** — Company → Branch → Location structure; branch-level managers with
   scoped access; branch analytics rollup. Enterprise tier gate.
2. **Recurring job scheduling** — CleanProof recurring templates (daily/weekly/monthly); Celery Beat
   auto-generation; manager pause/resume. New `/scheduling` page in frontend.
3. **Advanced SLA configuration** — `SLAPolicy` model on Location; custom GPS radius, time windows,
   required proof elements; per-job-type override.
4. **Audit log viewer** — searchable/filterable `JobCheckEvent` history API; CSV export endpoint;
   new frontend page with cleaner/location/date filters.

## Scope Decisions

### S01 — Multi-Branch (Enterprise)
- **In scope**:
  - New `Branch` model: `company` FK, `name`, `manager` FK (nullable User), `is_active`
  - `Branch` migration in `apps/accounts` (or new `apps/branches` app)
  - `Location.branch` optional FK (nullable — locations without a branch are company-wide)
  - `User.branch` optional FK — branch managers are scoped by this field
  - New view files only: `views_branches.py` (CRUD + analytics rollup)
  - Branch analytics: job counts, completion rate, SLA breach rate per branch
  - Enterprise gate: creating >1 branch requires `plan_tier == enterprise`
  - New API routes: `/api/branches/`, `/api/branches/<id>/`, `/api/branches/<id>/analytics/`
  - New frontend page: `src/pages/company/Branches.tsx` (new file, not locked)
- **Out of scope**: Modifying locked `views_manager_jobs.py` or `views_manager_company.py`;
  branch scoping in existing job queries (advisory filter via `branch_id` param in new endpoints)

### S02 — Recurring CleanProof Job Scheduling
- **In scope**:
  - New `RecurringJobTemplate` model in `apps/jobs/`: company, location, cleaner (optional),
    checklist_template (optional), frequency (daily/weekly/monthly), day_of_week (for weekly),
    day_of_month (for monthly), scheduled_start_time, scheduled_end_time, is_active, last_generated_at
  - Celery Beat task `generate_recurring_jobs`: runs daily, generates jobs for next day based on templates
  - Pause/resume: PATCH `is_active` field
  - New API: `GET/POST /api/jobs/recurring/`, `GET/PATCH/DELETE /api/jobs/recurring/<id>/`
  - New frontend page: `src/pages/Scheduling.tsx` — list templates, create/edit/pause/resume
  - No touch to locked `Jobs.tsx`, `JobPlanning.tsx`
- **Out of scope**: Maintenance recurring (already exists); conflict detection; calendar view

### S03 — Advanced SLA Configuration
- **In scope**:
  - New `SLAPolicy` model: company FK, name, `gps_radius_m` (default 100m), `check_in_window_minutes`,
    `check_out_window_minutes`, `required_proof_photo` (bool), `required_proof_checklist` (bool),
    `required_proof_signature` (bool), `is_default` (one per company)
  - `Location.sla_policy` optional FK (null = use company default)
  - `Job.sla_policy_override` optional FK (null = inherit from location)
  - SLA evaluation helper: `get_effective_sla_policy(job)` — job override → location policy → company default
  - `gps_radius_m` wired into existing check-in distance validation (currently hardcoded in views_cleaner)
    via new helper, **without modifying views_cleaner.py** (add to `Location` or `Job` model methods)
  - New API: `GET/POST /api/sla-policies/`, `GET/PATCH/DELETE /api/sla-policies/<id>/`
  - New frontend page: `src/pages/settings/SLAPolicies.tsx` (new file)
- **Out of scope**: SLA breach alerting changes (existing logic untouched); retroactive SLA recalc

### S04 — Audit Log Viewer
- **In scope**:
  - New API: `GET /api/jobs/audit-log/` — paginated `JobCheckEvent` list, filters:
    `cleaner_id`, `location_id`, `date_from`, `date_to`, `event_type`
  - `GET /api/jobs/audit-log/export/` — StreamingHttpResponse CSV download
  - New frontend page: `src/pages/AuditLog.tsx` — table with filter bar + "Export CSV" button
  - No modification to `JobCheckEvent` model (already immutable, already has all needed fields)
- **Out of scope**: Write access; log deletion; GDPR export (separate concern)

## Slices

- [x] **S01: Multi-Branch Hierarchy** `risk:medium` `depends:[]` — 34 tests ✅
- [x] **S02: Recurring CleanProof Job Scheduling** `risk:medium` `depends:[]` — 30 tests ✅
- [x] **S03: Advanced SLA Configuration** `risk:medium` `depends:[S01]` — 32 tests ✅
- [x] **S04: Audit Log Viewer** `risk:low` `depends:[]` — 20 tests ✅

## Result

**421 total tests passing (305 baseline + 116 new). Frontend build clean.**

## Key Decisions
- Branch views in new `views_branches.py` — never touch locked views
- `Branch` model lives in `apps/accounts` (same migration chain as Company/User)
- `SLAPolicy` lives in `apps/jobs` (closest to where it's evaluated)
- `RecurringJobTemplate` lives in `apps/jobs` (keeps cleaning domain together)
- Enterprise gate on branch count enforced in view layer, not model layer
- GPS radius from `SLAPolicy` exposed via `Location.effective_gps_radius_m` property
  (no locked file modification required)
