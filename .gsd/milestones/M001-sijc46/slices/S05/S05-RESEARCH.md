# S05: Trial Enforcement & Upgrade Flow — Research

## Scope

S05 delivers:
1. **`ActivePlanPermission`** DRF permission class — centralized write-blocking for expired/blocked companies
2. **Fix S04 `companyId` gap** — wire `useUserRole().companyId` into `Billing.tsx` checkout buttons
3. **Maintenance `CreateVisit` upgrade flow** — handle `company_blocked`/`trial_expired` 403 with Paddle checkout CTA
4. **`UpgradeDialog` component** — reusable dialog for Maintenance context (Cleaning locked)
5. **Backend permission wiring** — add `ActivePlanPermission` to maintenance write views
6. **Tests** — backend permission tests, frontend build verification

## What Already Exists

### Backend Enforcement (already implemented)
- `is_blocked()` on `Company` model: returns True if `PLAN_BLOCKED` or trial expired
- Inline `if company.is_blocked()` checks in 15+ views: `views_manager_jobs.py` (2 places), `views_maintenance.py` (8+ places), `views_manager_company.py` (1 place), `views_company.py` (1 place)
- Response format: `{"code": "trial_expired"|"company_blocked", "detail": "...", "message": "..."}` with 403
- **No `ActivePlanPermission` class yet** — enforcement is duplicated inline

### Frontend Enforcement (partially exists, LOCKED)
- `TrialExpiredBanner` component — good UI, CTA defaults to `/cleanproof/contact` (link-based)
- Used in `Dashboard.tsx` (LOCKED) and `JobPlanning.tsx` (LOCKED) — CTA = "Contact to upgrade" → `/cleanproof/contact`
- Used in `CreateJobDrawer.tsx` (LOCKED) — same pattern
- **Maintenance has no trial enforcement frontend** — backend returns 403 but `CreateVisit.tsx` shows generic error toast

### S04 Gap
- `Billing.tsx` uses `window.__COMPANY_ID__` placeholder for `openCheckout(priceId, companyId)`
- Fix: `useUserRole` hook already exposes `.companyId` via `getCurrentUser()` → `company_id` field

## Architecture

### `ActivePlanPermission` (backend)
```python
class ActivePlanPermission(BasePermission):
    message = {"code": "trial_expired", "detail": "...", "upgrade_url": "/settings/billing"}
    
    def has_permission(self, request, view):
        # Allow safe methods (GET, HEAD, OPTIONS) — read-only is always allowed
        if request.method in SAFE_METHODS:
            return True
        company = getattr(request.user, "company", None)
        if company is None:
            return True  # no company = not our concern
        return not company.is_blocked()
```

Key design: **read-only allowed, writes blocked**. `SAFE_METHODS` = GET/HEAD/OPTIONS. This matches the product spec: "can view data but cannot create new jobs/visits."

DRF message when `has_permission` returns False: we need a dict not a string so the frontend can parse `code`. But DRF's `permission_denied` uses `detail` field — need `PermissionDenied` with custom detail. Override `check_permissions` or use `APIException`.

Better: override `message` as a dict and the view will return `{"detail": {...}}`. Actually DRF wraps it in `{"detail": "..."}` — not a dict. Clean approach: raise `PermissionDenied(detail={"code": "trial_expired", "detail": "..."})` from within `has_permission` — not possible since it must return bool.

**Correct approach:** Return False from `has_permission`, set `self.message` dynamically in `has_permission` before returning (message is instance-level), rely on DRF default `permission_denied` which calls `raise exceptions.PermissionDenied(detail=self.message)`. This works — `self.message` can be a dict.

### `UpgradeDialog` component (frontend)
New file: `src/components/maintenance/UpgradeDialog.tsx` (Maintenance zone, not locked)

```tsx
interface UpgradeDialogProps {
  open: boolean;
  onClose: () => void;
  reason: "trial_expired" | "company_blocked";
}
```

Shows trial-expired or company-blocked message. If owner: "Upgrade Now" buttons → `openCheckout`. If non-owner: "Ask owner to upgrade" message + link to billing page.

### Maintenance `CreateVisit` update
- Detect `company_blocked` or `trial_expired` in `onError` handler
- Set `showUpgradeDialog: true` state
- Render `<UpgradeDialog>` inline

### `Billing.tsx` fix
Replace `window.__COMPANY_ID__` with `user.companyId` from `useUserRole()`.

## Files

### New
- `dubai-control/src/components/maintenance/UpgradeDialog.tsx`

### Modified — Backend (allowed zone)
- `backend/apps/api/permissions.py` — add `ActivePlanPermission`
- `backend/apps/api/views_maintenance.py` — add `ActivePlanPermission` to write views (supplement existing inline checks, or rely solely on permission class)

### Modified — Frontend (allowed zone)
- `dubai-control/src/pages/settings/Billing.tsx` — fix `window.__COMPANY_ID__` → `user.companyId`
- `dubai-control/src/pages/maintenance/CreateVisit.tsx` — add upgrade dialog on 403

### NOT touched (LOCKED)
- `src/pages/Dashboard.tsx` — LOCKED
- `src/pages/JobPlanning.tsx` — LOCKED
- `src/components/planning/CreateJobDrawer.tsx` — LOCKED
- `src/components/access/TrialExpiredBanner.tsx` — LOCKED (shared UI)
- `src/index.css`, `tailwind.config.ts` — LOCKED

## Backend Permission Strategy

Two options:
1. **Add `ActivePlanPermission` to view `permission_classes`** — DRF enforces before `post()` runs; clean but requires adding to many views
2. **Keep inline `is_blocked()` checks** — already exists and works; `ActivePlanPermission` is additive safety net

Decision: Add `ActivePlanPermission` to `views_maintenance.py` write views as a `permission_classes` addition alongside existing inline checks. This proves the class works and provides defense-in-depth. The inline checks remain as they handle job-limit cases too.

For `views_manager_jobs.py`, `views_manager_company.py`, `views_reports.py` — **LOCKED**, can't add to `permission_classes`. The existing inline checks in those files are sufficient.

## `ActivePlanPermission` Response Format

DRF `has_permission` returning False triggers `permission_denied()` which raises `PermissionDenied(detail=self.message)`. If `self.message` is a dict, the response body is `{"detail": {...}}`. Frontend needs to handle either `error.detail.code` or `error.code`.

Current frontend parsing in `CreateJobDrawer.tsx` (LOCKED):
```ts
if (data?.code === "trial_expired") // top-level code
```

Current maintenance views return: `{"code": "...", "message": "..."}` — top-level code.

`ActivePlanPermission` with dict message returns: `{"detail": {"code": "...", "detail": "..."}}` — nested.

**Decision:** Keep `ActivePlanPermission.message` as a plain string for DRF compatibility. The inline `is_blocked()` checks in maintenance views already provide the right response format. The permission class provides early rejection (before view body runs) as a safety net, using a simple string message. Frontend for Maintenance context will check both `error?.code` and `error?.detail?.code`.

## Key Decision

S05 does NOT replace the inline `is_blocked()` checks — too risky to touch locked files. `ActivePlanPermission` is **additive** on maintenance write views only. Read-only is always allowed.

## Upgrade Dialog Behavior

- Trial expired + owner → "Your trial has ended. Upgrade now to continue." + "Upgrade to Standard" / "Upgrade to Pro" buttons (Paddle checkout)  
- Trial expired + non-owner → "Trial ended. Ask your account owner to upgrade." + link to `/settings/billing`
- Company blocked + owner → "Account suspended. Contact support or upgrade." + buttons
- Company blocked + non-owner → same message, no buttons

## Test Spec

| # | Test | Expected |
|---|------|----------|
| 1 | `ActivePlanPermission` — active company write | 200 |
| 2 | `ActivePlanPermission` — trial-expired company write | 403 |
| 3 | `ActivePlanPermission` — blocked company write | 403 |
| 4 | `ActivePlanPermission` — GET always allowed even when blocked | 200 |
| 5 | `ActivePlanPermission` — PLAN_ACTIVE write | 200 |
| 6 | Billing.tsx uses `user.companyId` (not window.__COMPANY_ID__) | build |
| 7 | `npm run build` clean | pass |
