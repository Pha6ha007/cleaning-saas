---
id: S04
milestone: M001-sijc46
provides:
  - "@paddle/paddle-js 1.6.2 installed"
  - "usePaddle hook — lazy singleton init, openCheckout(priceId, companyId)"
  - "getSubscription() API function → GET /api/billing/subscription/"
  - "Billing dashboard reads real subscription data (parallel fetch)"
  - "Upgrade CTA buttons on billing page open Paddle checkout overlay"
  - "Active subscriber sees 'Manage subscription' link to paddle_update_url"
  - "checkout=success query param shows success toast, then cleans URL"
  - "Backend: custom_data.company_id fallback for new subscription linking"
  - "4 new custom_data tests (60 total backend tests, all passing)"
  - "npm run build clean"
requires:
  - slice: S02
    provides: JWT-aware API client
  - slice: S03
    provides: PaddleSubscription model, GET /api/billing/subscription/, webhook handler
affects: [S05]
key_files:
  - dubai-control/src/hooks/usePaddle.ts (new)
  - dubai-control/src/api/client.ts (SubscriptionData interface + getSubscription())
  - dubai-control/src/pages/settings/Billing.tsx (parallel fetch, checkout CTAs)
  - dubai-control/.env.local (VITE_PADDLE_* vars added as placeholders)
  - backend/apps/api/views_paddle.py (custom_data fallback in _handle_subscription_activated)
  - backend/tests/test_s03_paddle_webhook.py (4 new custom_data tests)
key_decisions:
  - "Module-level Paddle singleton in usePaddle.ts — survives component remounts, avoids reinit"
  - "getSubscription() is non-fatal (catch → null) — billing page works even if S03 endpoint not deployed"
  - "company_id passed via custom_data during checkout open — matches Paddle's custom_data pattern"
  - "checkout=success URL param: toast + URL cleanup on mount (not on reload)"
  - "PRICE_ID env vars read from import.meta.env at render time — if not set, fallback to contact link"
known_gaps:
  - "company_id in checkout: currently uses window.__COMPANY_ID__ placeholder — S05 should wire this from JWT claims or user context"
  - "Paddle sandbox UAT not verified (requires real Paddle account with price IDs configured)"
patterns_established:
  - "Parallel billing data fetch: Promise.all([getBillingSummary(), getSubscription().catch(() => null)])"
  - "Paddle checkout buttons gated on paddleReady + price ID env var presence"
duration: ~45min
verification_result: pass
completed_at: 2026-03-17T02:00:00Z
---

# S04: Checkout & Billing Dashboard

**Paddle.js checkout wired to billing page. 60/60 tests. Build clean.**

## What Was Built

**`usePaddle` hook** (`src/hooks/usePaddle.ts`):
- Module-level singleton `_paddleInstance` — initialized once, survives remounts
- `initializePaddle()` called lazily on first mount; if `VITE_PADDLE_CLIENT_TOKEN` is placeholder, emits console warning and returns null
- `openCheckout(priceId, companyId)` injects `custom_data: { company_id }` so the backend webhook can link the new subscription to the company

**`getSubscription()` in `client.ts`**:
- `SubscriptionData` interface matching S03 response shape
- Non-fatal: wrapped in `catch(() => null)` at call site — billing page degrades gracefully

**Billing page (`settings/Billing.tsx`)**:
- Parallel fetch via `Promise.all([getBillingSummary(), getSubscription()])` — single loading state
- `has_subscription=true` → shows "Manage subscription" button → `paddle_update_url`
- `has_subscription=false` + trial/blocked + owner → "Upgrade to Standard" / "Upgrade to Pro" buttons open Paddle overlay
- Buttons disabled while Paddle is initializing (`paddleReady=false`) or checkout is in-flight
- `?checkout=success` → success toast on mount, param removed from URL

**Backend `custom_data` linking** (`views_paddle.py`):
- `_handle_subscription_activated`: if `_find_company_for_subscription` returns None, tries `event_data["custom_data"]["company_id"]`
- Finds `Company.objects.get(id=company_id)`, creates `PaddleSubscription`, activates plan
- Invalid company_id or non-existent company → `STATUS_SKIPPED` (no crash)

## Known Gap: company_id Source

The `openCheckout(priceId, companyId)` call reads `window.__COMPANY_ID__` as a placeholder. For production, `companyId` should come from the JWT custom claims (which include `company_id` per S01). S05 should wire this from the user context or a `useCurrentUser` hook.

## Verification

| # | Condition | Status |
|---|-----------|--------|
| 1 | New sub via custom_data.company_id → activated | ✓ PASS (test) |
| 2 | Invalid company_id → skipped | ✓ PASS (test) |
| 3 | Missing custom_data → skipped | ✓ PASS (test) |
| 4 | custom_data tier mapping (pro) | ✓ PASS (test) |
| 5 | All 56 prior tests still pass | ✓ PASS (60/60) |
| 6 | npm run build | ✓ PASS (clean) |
| 7 | Billing page parallel fetch | ✓ CODE |
| 8 | Checkout buttons gated on paddleReady | ✓ CODE |
