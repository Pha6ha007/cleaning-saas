# GSD State

**Active Milestone:** Launch Readiness Plan
**Status:** in-progress

---

## Launch Readiness Plan

### CleanProof — Launch Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| C1 | **Email verification page** — `/verify-email` route to handle backend verification links | Must | ⬜ |
| C2 | **Signup → "Check your email" screen** — after signup show verification message instead of silently switching to login | Must | ⬜ |
| C3 | **Onboarding wizard** — after first login: create location → add cleaner → create first job | Must | ⬜ |
| C4 | **Empty states** — Dashboard, Jobs, Locations show helpful CTAs when no data exists | Must | ⬜ |
| C5 | **Demo account** — "Try without signup" button on landing → pre-filled read-only demo | Nice | ⬜ |
| C6 | Paddle billing integration | Must | ⏸️ Waiting for Paddle verification |

### MaintainProof — Launch Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| M1 | **Email verification** — shared with CleanProof (same route) | Must | ⬜ |
| M2 | **Signup flow for Maintenance** — separate entry point or context selector after signup | Must | ⬜ |
| M3 | **Onboarding wizard** — after first login: add location → add asset → create first visit | Must | ⬜ |
| M4 | **Empty states** — Dashboard, Visits, Assets show helpful CTAs | Must | ⬜ |
| M5 | **Demo account** — pre-filled maintenance data for "try without signup" | Nice | ⬜ |
| M6 | Paddle billing integration | Must | ⏸️ Waiting for Paddle verification |

### Shared Infrastructure

| # | Task | Priority | Status |
|---|------|----------|--------|
| S1 | **Resend verification email** — button if user didn't receive it | Must | ⬜ |
| S2 | **Password reset flow** — "Forgot password?" on login page | Must | ⬜ |
| S3 | **Analytics tracking** — basic page views + signup funnel events | Nice | ⬜ |

### Execution Order
1. **C1 + M1 + S1** — Email verification (shared page + resend)
2. **C2** — Signup shows "check email" message
3. **S2** — Password reset flow
4. **C4 + M4** — Empty states with CTAs
5. **C3 + M3** — Onboarding wizards
6. **C5 + M5** — Demo accounts (if time)
7. **Billing** — when Paddle is verified

---

## Previous Work (2026-03-21 session)

### Phases 1–4 Complete
- Phase 1: Contact form, ProtectedRoute, e2e CI, console.log cleanup
- Phase 2: Error boundaries (46 routes), 61 unit tests, a11y, eslint audit
- Phase 3: Dynamic xlsx imports, dashboard skeleton
- Phase 4: Type safety (186→107 any), bundle optimization (-23KB gzip)

### Test Totals
- Backend: 845 | Frontend E2E: 62 | Frontend Unit: 61 | Mobile: 37
- **Total: 1005 tests** — TSC: 0 errors — Build: clean
