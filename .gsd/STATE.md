# GSD State

**Active Milestone:** Launch Readiness Plan
**Status:** in-progress

---

## Launch Readiness Plan

### CleanProof — Launch Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| C1 | **Email verification page** — `/verify-email` route | Must | ✅ |
| C2 | **Signup → "Check your email" screen** | Must | ✅ |
| C3 | **Onboarding checklist** — add location → add cleaner → create job | Must | ✅ |
| C4 | **Empty states** — Dashboard, Assets with CTAs | Must | ✅ |
| C5 | **Demo account** — "Try without signup" | Nice | ⬜ |
| C6 | Paddle billing integration | Must | ⏸️ Waiting for Paddle |

### MaintainProof — Launch Checklist

| # | Task | Priority | Status |
|---|------|----------|--------|
| M1 | **Email verification** — shared `/verify-email` route | Must | ✅ |
| M2 | **Signup flow for Maintenance** — context selector | Must | ⬜ |
| M3 | **Onboarding checklist** — location → asset → technician → visit | Must | ✅ |
| M4 | **Empty states** — Dashboard, Visits, Assets with CTAs | Must | ✅ |
| M5 | **Demo account** — pre-filled maintenance data | Nice | ⬜ |
| M6 | Paddle billing integration | Must | ⏸️ Waiting for Paddle |

### Shared Infrastructure

| # | Task | Priority | Status |
|---|------|----------|--------|
| S1 | **Resend verification email** — backend + frontend button | Must | ✅ |
| S2 | **Password reset flow** — forgot password + reset with token | Must | ✅ |
| S3 | **Analytics tracking** — page views + signup funnel | Nice | ⬜ |

### What Was Built

#### Email Verification (`23c4667`)
- `/verify-email` page — 4 states: loading/success/expired/error
- Resend button for expired tokens
- Backend: `ResendVerificationView` (always 200, prevents enumeration)

#### Password Reset (`23c4667`)
- `/reset-password` page — dual mode: request email / set new password
- Backend: `PasswordResetRequestView`, `PasswordResetConfirmView`
- `PasswordResetToken` model (1-hour TTL, single-use)
- "Forgot password?" link on Login page now works

#### Signup Flow (`23c4667`)
- After signup → "Check your email" screen with email address
- Tabs hidden, clear message about 7-day trial
- "Back to sign in" with pre-filled email

#### Empty States (`2c70e1a`)
- `EmptyState` reusable component (icon + title + description + CTA)
- Cleaning Dashboard: "No jobs" → CTA to /planning
- Maintenance Dashboard: improved empty text
- Maintenance Assets: rich empty state with "Add asset" CTA
- Maintenance VisitList: enhanced with "Create visit" CTA

#### Onboarding Checklists (`eaa3cac`)
- `OnboardingChecklist` component with progress tracking
- CleanProof: 3 steps (location → cleaner → job)
- MaintainProof: 4 steps (location → asset → technician → visit)
- Dismissible, auto-dismisses after completion, persists in localStorage

---

## Previous Work (earlier in session)

### Improvement Plan Phases 1–4
- Phase 1: Contact form, ProtectedRoute, e2e CI, console.log cleanup
- Phase 2: Error boundaries (46 routes), 61 unit tests, a11y, eslint audit
- Phase 3: Dynamic xlsx imports, dashboard skeleton
- Phase 4: Type safety (186→107 any), bundle optimization (-23KB gzip)

### Test Totals
- Backend: 845 | Frontend E2E: 62 | Frontend Unit: 61 | Mobile: 37
- **Total: 1005 tests** — TSC: 0 errors — Build: clean

### Session Commits
1. `552892f` — fix: 8 bugs
2. `44b72a0` — test: 62 e2e tests
3. `a5e3201` — docs: project audit & plan
4. `015cc60` — feat: Phase 1–2
5. `116cbfd` — perf: Phase 3
6. `f37bd35` — refactor: catch any → unknown
7. `1911aae` — refactor: 45× any in maintenance
8. `336b2a8` — refactor: more any → typed
9. `c96a0ca` — refactor: 20 more any
10. `9ba08c8` — fix: SuspenseFallback (Vercel)
11. `303e8c9` — perf: vendor chunk splitting
12. `23c4667` — feat: email verification + password reset + signup flow
13. `2c70e1a` — feat: empty states with CTAs
14. `eaa3cac` — feat: onboarding checklists
