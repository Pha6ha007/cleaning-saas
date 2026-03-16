---
id: S05
milestone: M001-sijc46
provides:
  - "ActivePlanPermission DRF class — blocks writes for trial-expired/blocked companies, allows safe methods"
  - "MaintenancePermissionMixin._check_write_access — now enforces plan state (one edit covers all 48 maintenance views)"
  - "UpgradeDialog component (src/components/maintenance/UpgradeDialog.tsx)"
  - "CreateVisit.tsx — detects trial_expired/company_blocked 403, shows UpgradeDialog"
  - "Billing.tsx — companyId gap fixed (window.__COMPANY_ID__ → user.companyId from useUserRole)"
  - "10 new S05 tests (70 total, all passing)"
  - "npm run build clean"
requires:
  - slice: S03
    provides: Company.plan state, is_blocked(), is_trial_expired()
  - slice: S04
    provides: Paddle.js checkout overlay, usePaddle hook
affects: [S06]
key_files:
  - backend/apps/api/permissions.py (ActivePlanPermission added)
  - backend/apps/api/views_maintenance.py (_check_write_access updated)
  - dubai-control/src/components/maintenance/UpgradeDialog.tsx (new)
  - dubai-control/src/pages/maintenance/CreateVisit.tsx (upgrade dialog wired)
  - dubai-control/src/pages/settings/Billing.tsx (companyId fix)
  - backend/tests/test_s05_plan_enforcement.py (10 tests)
key_decisions:
  - "Modified _check_write_access in MaintenancePermissionMixin — one edit covers all 48 maintenance views instead of adding permission_classes to each"
  - "ActivePlanPermission class is additive/redundant safety net; _check_write_access is the actual enforcement for maintenance"
  - "Read-only always allowed — SAFE_METHODS pass even for blocked companies (product spec)"
  - "UpgradeDialog is Maintenance-zone only — Cleaning locked pages keep their existing contact CTA"
  - "Test URL: manager-asset-types (not maintenance-asset-types — the AssetTypeListCreateView uses the manager prefix)"
patterns_established:
  - "Plan enforcement error shape: {code: 'trial_expired'|'company_blocked', detail: '...'}"
  - "onError in maintenance mutations: check errorCode first, then show UpgradeDialog"
  - "UpgradeDialog: owner sees checkout buttons, non-owner sees link to /settings/billing"
duration: ~40min
verification_result: pass
completed_at: 2026-03-17T03:00:00Z
---

# S05: Trial Enforcement & Upgrade Flow

**70/70 tests. Build clean. Trial enforcement and upgrade flow operational.**

## What Was Built

**`ActivePlanPermission`** (`permissions.py`):
- Blocks POST/PUT/PATCH/DELETE for `company.is_blocked()` companies
- GET/HEAD/OPTIONS always pass — read-only preserved
- Sets `self.message` as dict `{"code": "trial_expired"|"company_blocked", "detail": "..."}` before returning False
- DRF wraps in `{"detail": {...}}` — frontend checks both `error.code` and `error.detail.code`

**`_check_write_access` update** (`views_maintenance.py`):
- Added plan enforcement inside the mixin method — one edit covers all 48 maintenance write views
- Returns `{"code": "trial_expired"|"company_blocked", "detail": "..."}` with 403
- `_check_write_access` is called first in every write handler, so inline `is_blocked()` checks are now never reached for blocked companies (defense in depth, not replaced)

**`UpgradeDialog`** (`src/components/maintenance/UpgradeDialog.tsx`):
- Props: `open`, `onClose`, `reason: "trial_expired" | "company_blocked"`
- Owner: two plan cards (Standard, Pro) with Paddle checkout buttons; "Maybe later" + "View plans" footer
- Non-owner: message + link to `/settings/billing`
- Gated on `paddleReady` and `VITE_PADDLE_PRICE_ID_*` env vars

**`CreateVisit` upgrade flow**:
- `onError` now detects `errorCode === "trial_expired"|"company_blocked"` before generic error handling
- Sets `upgradeDialogOpen=true` + `upgradeReason` state
- Renders `<UpgradeDialog>` at end of component

**S04 `companyId` fix** (`Billing.tsx`):
- Replaced `(window as any).__COMPANY_ID__` with `user.companyId` from `useUserRole()`
- `useUserRole` already calls `getCurrentUser()` which returns `company_id` from the JWT custom claims set in S01

## Verification

| # | Condition | Status |
|---|-----------|--------|
| 1 | Active company write | ✓ PASS |
| 2 | Active trial write | ✓ PASS |
| 3 | Expired trial write → 403 trial_expired | ✓ PASS |
| 4 | Blocked company write → 403 company_blocked | ✓ PASS |
| 5 | Expired trial GET → 200 | ✓ PASS |
| 6 | Blocked company GET → 200 | ✓ PASS |
| 7 | ActivePlanPermission unit: message dict | ✓ PASS |
| 8 | ActivePlanPermission unit: GET returns True | ✓ PASS |
| 9 | All 60 prior tests still pass | ✓ PASS (70/70) |
| 10 | npm run build | ✓ PASS (clean) |
