# S04: Checkout & Billing Dashboard — Plan

## Goal

Wire Paddle.js checkout to the billing page and make the billing dashboard show real subscription data from S03's `GET /api/billing/subscription/` endpoint.

## Tasks

- [x] **T01: Install @paddle/paddle-js, add env vars** `est:10m`
  - `npm install @paddle/paddle-js` in `dubai-control`
  - Add `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENVIRONMENT`, `VITE_PADDLE_PRICE_ID_STANDARD`, `VITE_PADDLE_PRICE_ID_PRO` to `dubai-control/.env.local`

- [x] **T02: `usePaddle` hook + `getSubscription` API function** `est:20m`
  - Create `dubai-control/src/hooks/usePaddle.ts`
    - Module-level `paddleInstance` ref (avoid reinit)
    - `initPaddle()` — lazy init via `initializePaddle({ environment, token })`
    - `openCheckout(priceId, companyId)` — calls `paddle.Checkout.open(...)` with `custom_data: { company_id }`
    - Returns `{ openCheckout, isReady, error }`
  - Add to `dubai-control/src/api/client.ts`:
    - `SubscriptionData` interface (matches S03 response shape)
    - `getSubscription()` → `apiFetch<SubscriptionData>("/api/billing/subscription/")`

- [x] **T03: Backend — `custom_data` company linking in webhook handler** `est:20m`
  - Edit `backend/apps/api/views_paddle.py`
  - In `_handle_subscription_activated`: if `_find_company_for_subscription` returns None, try `event_data.get("custom_data", {}).get("company_id")` to find `Company.objects.get(id=company_id)`
  - Create `PaddleSubscription` for the newly linked company
  - Add test coverage: `test_new_subscription_linked_via_custom_data` in `test_s03_paddle_webhook.py`

- [x] **T04: Billing page update — real data + Upgrade CTA** `est:40m`
  - Edit `dubai-control/src/pages/settings/Billing.tsx`
  - Add `getSubscription()` call alongside existing `getBillingSummary()` (parallel fetch via `Promise.all`)
  - Add `CheckoutButton` inline (no separate component file — keep it simple)
  - Logic:
    - `has_subscription=true` → hide upgrade CTA, show "Manage subscription" button → `paddle_update_url`
    - `has_subscription=false` AND plan=trial/blocked → show "Upgrade to Standard" and "Upgrade to Pro" buttons that open Paddle checkout overlay
    - `current_period_end` shown in plan section if present
  - Handle `?checkout=success` query param: show success toast on mount, remove param from URL

- [x] **T05: Write S04 tests** `est:30m`
  - Backend: add `test_new_subscription_linked_via_custom_data` to `test_s03_paddle_webhook.py`
  - Frontend build: `npm run build` must pass clean

- [x] **T06: Full verification** `est:10m`
  - All 56 backend tests pass (+ new custom_data test → 57)
  - `npm run build` clean
  - Update STATE.md, roadmap, write S04-SUMMARY.md

## Files

### New
- `dubai-control/src/hooks/usePaddle.ts`
- `dubai-control/.env.local` (or append to existing)

### Modified — Frontend (S04 zone, not locked)
- `dubai-control/src/api/client.ts` (add `SubscriptionData` interface + `getSubscription()`)
- `dubai-control/src/pages/settings/Billing.tsx` (parallel fetch, upgrade CTA, checkout button)

### Modified — Backend (S04 zone)
- `backend/apps/api/views_paddle.py` (custom_data fallback in `_handle_subscription_activated`)
- `backend/tests/test_s03_paddle_webhook.py` (add `test_new_subscription_linked_via_custom_data`)

### Not touched
- `src/pages/PricingPage.tsx` — LOCKED (Cleaning boundary)
- `src/components/pricing/PricingPlansSection.tsx` — LOCKED
- `src/api/planning.ts`, `src/api/analytics.ts` — LOCKED
- `src/index.css`, `tailwind.config.ts` — LOCKED

## Verification Spec

| # | Condition | Expected |
|---|-----------|----------|
| 1 | Company has PaddleSubscription → billing page | "Manage subscription" button visible; no Upgrade CTA |
| 2 | Company no subscription (trial) → billing page | "Upgrade to Standard" and "Upgrade to Pro" buttons visible |
| 3 | `?checkout=success` on billing page | Toast shown, param removed from URL |
| 4 | Webhook: new subscription with `custom_data.company_id` | Company found, plan activated |
| 5 | Webhook: `custom_data` missing/invalid | Skipped gracefully (no crash) |
| 6 | `GET /api/billing/subscription/` unauthenticated | 401/403 |
| 7 | `npm run build` | No TypeScript errors |
| 8 | All 57 backend tests | Pass |
