# S04: Checkout & Billing Dashboard — Research

## Scope

S04 delivers two things:
1. **Paddle.js checkout overlay** — clicking "Upgrade" opens Paddle's hosted checkout in an overlay; after payment, webhook fires (S03) and updates company plan
2. **Billing dashboard update** — `settings/billing` page shows real subscription data from `GET /api/billing/subscription/` (S03 endpoint) alongside the existing `BillingSummary` from `GET /api/settings/billing/`

## What Already Exists

### Frontend
- `src/pages/settings/Billing.tsx` — Full billing page, loads `getBillingSummary()` from `/api/settings/billing/`, shows plan, trial status, usage, payment method, invoices. CTA buttons currently point to `/cleanproof/contact` (manual upgrade).
- `src/pages/PricingPage.tsx` — Marketing pricing page with static prices, CTA links to `/login?trial=*`
- `src/components/pricing/PricingPlansSection.tsx` — Pricing cards component with `PricingMode` prop (`anonymous` | `trial_active` | `trial_expired` | `other`), has `handleUpgrade()` that calls `upgradeToActive(tier)` API directly — **this is the old non-Paddle upgrade path**
- `src/api/client.ts` — `getBillingSummary()` exists; `upgradeToActive()` exists (calls `/api/cleanproof/upgrade-to-active/`); **no Paddle subscription fetch yet**
- No Paddle.js in `package.json` or `index.html` — not installed at all
- No `VITE_PADDLE_*` env vars anywhere

### Backend
- `GET /api/billing/subscription/` — new S03 endpoint, returns `has_subscription`, `plan`, `plan_tier`, `status`, `current_period_end`, `paddle_update_url`
- `GET /api/settings/billing/` — existing endpoint, returns `BillingSummary` with usage, invoices, payment_method
- `PaddleSubscription` model has `paddle_customer_id` and `paddle_update_url`
- `Company` model has no `paddle_customer_id` field directly (only via `PaddleSubscription`)

### The Company-Linking Gap (flagged in S03 summary)
When a brand-new customer completes Paddle checkout, Paddle fires `subscription.activated`. The S03 webhook handler calls `_find_company_for_subscription(paddle_subscription_id)` — but there's no existing `PaddleSubscription` to look up yet. We need to link the company to the new subscription.

**Solution:** Use Paddle's `custom_data` field during checkout. The backend creates a **checkout session** that embeds `company_id` in `custom_data`. When the webhook fires, the handler reads `event_data["custom_data"]["company_id"]` to find the company.

## Paddle.js Integration Pattern

### Package
`@paddle/paddle-js` — official npm package (not CDN). Install in `dubai-control`.

### Initialization
```ts
import { initializePaddle } from "@paddle/paddle-js";
// Called once at app mount with client token
const paddle = await initializePaddle({ 
  environment: "sandbox" | "production",
  token: VITE_PADDLE_CLIENT_TOKEN 
});
```

### Checkout Open
```ts
paddle.Checkout.open({
  items: [{ priceId: VITE_PADDLE_PRICE_ID_STANDARD, quantity: 1 }],
  customData: { company_id: companyId },
  settings: { successUrl: "/settings/billing?checkout=success" }
});
```

### `custom_data` in webhook
```json
{ "event_type": "subscription.activated", "data": { "custom_data": { "company_id": "123" } } }
```
S03 handler needs a fallback: if `_find_company_for_subscription` returns None, try `custom_data.company_id`.

## Architecture

### New files (S04 scope)
- `dubai-control/src/hooks/usePaddle.ts` — init Paddle.js, expose `openCheckout(priceId, companyId)`
- `dubai-control/src/components/billing/CheckoutButton.tsx` — button that calls `usePaddle` to open overlay
- `backend/apps/api/views_paddle.py` — add `custom_data` fallback in `_handle_subscription_activated`

### Modified files
- `dubai-control/src/api/client.ts` — add `getSubscription()` → `GET /api/billing/subscription/`
- `dubai-control/src/pages/settings/Billing.tsx` — add "Upgrade" button with Paddle checkout; show real subscription data when available (supplement `BillingSummary`)
- `dubai-control/index.html` — no change (using npm package, not CDN script)
- `dubai-control/.env` (or `.env.local`) — add `VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_ENVIRONMENT`, `VITE_PADDLE_PRICE_ID_STANDARD`, `VITE_PADDLE_PRICE_ID_PRO`
- `backend/apps/api/views_paddle.py` — `custom_data` company lookup in `_handle_subscription_activated`

### NOT modified
- `src/pages/PricingPage.tsx` — marketing page, stays as static CTAs → `/login?trial=*` (LOCKED)
- `src/components/pricing/PricingPlansSection.tsx` — stays (Cleaning boundary)
- `src/api/planning.ts`, `src/api/analytics.ts` — not touched

## Data Flow

### Checkout Flow
1. User on `/settings/billing` (trial or blocked) clicks "Upgrade to [tier]"  
2. `CheckoutButton` calls `openCheckout(priceId, companyId)` via `usePaddle`
3. Paddle overlay opens in browser
4. User enters card details, completes payment
5. Paddle fires `subscription.activated` webhook to `POST /api/paddle/webhook/`
6. Webhook handler finds company via `custom_data.company_id`, creates `PaddleSubscription`, sets `company.plan = PLAN_ACTIVE`
7. Frontend: success URL redirects to `/settings/billing?checkout=success`, page re-fetches and shows active plan

### Billing Dashboard
- Page loads both `getBillingSummary()` and `getSubscription()` in parallel
- `getSubscription()` data takes precedence for subscription state display (real Paddle data)
- `BillingSummary` still provides usage metrics and invoices
- If `has_subscription=true`: hide "Upgrade" CTA, show "Manage subscription" → `paddle_update_url`
- If `has_subscription=false` and company is trial/blocked: show "Upgrade" CTA with CheckoutButton

## Env Vars Needed

### Frontend (`dubai-control/.env.local`)
```
VITE_PADDLE_CLIENT_TOKEN=test_...
VITE_PADDLE_ENVIRONMENT=sandbox
VITE_PADDLE_PRICE_ID_STANDARD=pri_standard_test
VITE_PADDLE_PRICE_ID_PRO=pri_pro_test
```

### Backend (already in `backend/.env` as placeholders from T01)
```
PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=...
PADDLE_CLIENT_TOKEN=...
PADDLE_WEBHOOK_SECRET=...
PADDLE_PRICE_ID_STANDARD=pri_...
PADDLE_PRICE_ID_PRO=pri_...
```

## Key Decisions

1. **npm package over CDN** — `@paddle/paddle-js` provides TypeScript types; no script tag in `index.html`
2. **`usePaddle` hook** — lazy-initializes once, cached in module-level ref; avoids reinit on re-renders
3. **`custom_data.company_id`** — company linking strategy; requires backend fallback in webhook handler
4. **Parallel data fetch** — `Promise.all([getBillingSummary(), getSubscription()])` in Billing.tsx to keep single loading state
5. **`paddle_update_url` for existing subscribers** — instead of reopening checkout, link to Paddle's manage URL
6. **No separate `/checkout` route** — overlay opens inline on billing page, no route change needed
7. **Success URL** — `/settings/billing?checkout=success` shows toast + refreshes data; avoids blank redirect page

## Risk

- **Paddle.js sandbox environment** — checkout works against sandbox; real Paddle account not required for tests but for manual UAT yes
- **`custom_data` not available in test fixtures** — S03 tests don't use `custom_data` — S04 tests must add coverage for the fallback path
- **`usePaddle` init timing** — Paddle.js CDN/network fetch on init; must handle case where init hasn't completed when user clicks upgrade
