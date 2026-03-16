# S05: Trial Enforcement & Upgrade Flow — Plan

## Goal

Add `ActivePlanPermission` DRF class, wire Paddle checkout to maintenance upgrade flow, fix S04 `companyId` gap, add `UpgradeDialog` for maintenance `CreateVisit`.

## Tasks

- [x] **T01: `ActivePlanPermission` in `permissions.py`** `est:20m`
  - Add `ActivePlanPermission(BasePermission)` — blocks write methods (POST/PUT/PATCH/DELETE) for `company.is_blocked()`, allows all safe methods (GET/HEAD/OPTIONS)
  - Response: `{"code": "trial_expired"|"company_blocked", "detail": "..."}` with 403
  - Add to `views_maintenance.py` write-heavy views (supplement existing inline checks)

- [x] **T02: Fix S04 `companyId` gap in `Billing.tsx`** `est:10m`
  - Import `useUserRole` in `Billing.tsx`
  - Replace `window.__COMPANY_ID__` placeholder with `user.companyId`
  - Remove unused `(window as any).__COMPANY_ID__` reference

- [x] **T03: `UpgradeDialog` component** `est:30m`
  - Create `dubai-control/src/components/maintenance/UpgradeDialog.tsx`
  - Props: `open`, `onClose`, `reason: "trial_expired" | "company_blocked"`
  - Owner: shows Paddle checkout buttons (Standard + Pro)
  - Non-owner: shows message + link to `/settings/billing`
  - Uses `usePaddle` hook + `useUserRole` for `companyId` and role check

- [x] **T04: Wire `UpgradeDialog` to `CreateVisit.tsx`** `est:20m`
  - Edit `dubai-control/src/pages/maintenance/CreateVisit.tsx`
  - In `onError`: detect `code === "trial_expired"` or `code === "company_blocked"` in response
  - Set `upgradeDialogOpen` state, pass `reason` to `UpgradeDialog`
  - Render `<UpgradeDialog>` at end of component

- [x] **T05: Backend tests + build verification** `est:25m`
  - Write `backend/tests/test_s05_plan_enforcement.py`
  - 5 tests: active allows write, trial-active allows write, trial-expired blocks write, blocked blocks write, GET always allowed
  - `npm run build` clean

- [x] **T06: Final verification** `est:10m`
  - All 60 + 5 = 65 tests pass
  - Build clean
  - Update STATE.md, roadmap, write S05-SUMMARY.md

## Files

### New
- `dubai-control/src/components/maintenance/UpgradeDialog.tsx`
- `backend/tests/test_s05_plan_enforcement.py`

### Modified — Backend (allowed)
- `backend/apps/api/permissions.py` (add `ActivePlanPermission`)
- `backend/apps/api/views_maintenance.py` (add `ActivePlanPermission` to write views)

### Modified — Frontend (allowed)
- `dubai-control/src/pages/settings/Billing.tsx` (companyId fix)
- `dubai-control/src/pages/maintenance/CreateVisit.tsx` (upgrade dialog)

### NOT touched (LOCKED)
- `src/pages/Dashboard.tsx`
- `src/pages/JobPlanning.tsx`
- `src/components/planning/CreateJobDrawer.tsx`
- `src/components/access/TrialExpiredBanner.tsx`
- `src/index.css`, `tailwind.config.ts`
- `backend/apps/api/views_manager_jobs.py`
- `backend/apps/api/views_manager_company.py`
- `backend/apps/api/views_reports.py`

## Verification Spec

| # | Condition | Expected |
|---|-----------|----------|
| 1 | Active company POST → maintenance view | 200 |
| 2 | Trial-expired company POST → maintenance view | 403 `trial_expired` |
| 3 | Blocked company POST → maintenance view | 403 `company_blocked` |
| 4 | Any company GET → maintenance view | 200 |
| 5 | Active trial company POST | 200 (trial not yet expired) |
| 6 | Billing.tsx uses user.companyId | TypeScript clean |
| 7 | npm run build | Clean |
| 8 | All 65 backend tests pass | Pass |
