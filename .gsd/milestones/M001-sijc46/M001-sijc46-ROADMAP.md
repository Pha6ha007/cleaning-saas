# M001-sijc46: Launch-Ready Billing & Auth

**Vision:** Make Proof Platform launch-ready by adding JWT authentication, Paddle billing integration, and trial enforcement — enabling the full self-serve signup → trial → pay → use flow.

## Success Criteria

- A new company can sign up, start a 7-day trial, and use the platform without providing payment info
- When trial expires, the company enters read-only mode — can view data but cannot create new jobs/visits
- An expired-trial or blocked company can upgrade by clicking an upgrade CTA that opens Paddle checkout
- After successful Paddle payment, the company plan activates automatically via webhook
- Manager portal uses JWT for all authenticated requests with automatic token refresh
- Billing dashboard shows real subscription data (plan, cycle, next payment date)
- Webhook processing is idempotent, handles out-of-order delivery, and persists raw payloads
- All Paddle configuration is via environment variables (no hardcoded IDs)
- Deployment docs enable VPS go-live without further engineering help

## Key Risks / Unknowns

- **JWT alongside Token auth** — Must support both simultaneously since mobile stays on Token. Risk of auth pipeline conflicts or middleware ordering issues.
- **Paddle webhook reliability** — Out-of-order delivery, duplicates, signature verification. Billing state must never corrupt.
- **CleanProof boundary** — Auth changes touch settings.py and views_auth.py which serve CleanProof too. Changes must be strictly additive.

## Proof Strategy

- JWT alongside Token auth → retire in S01 by proving both auth methods work on the same endpoint simultaneously
- Paddle webhook reliability → retire in S03 by proving idempotent processing with simulated duplicate and out-of-order events
- CleanProof boundary → retire in S02 by proving existing Token-auth mobile flows still work after JWT is added

## Verification Classes

- Contract verification: Django tests for JWT endpoints, webhook handler tests with simulated Paddle payloads, permission class tests for soft degradation
- Integration verification: Paddle.js checkout opens in browser, webhook signature verification passes, plan state updates end-to-end
- Operational verification: deployment docs reviewed for completeness
- UAT / human verification: full signup → trial → checkout → paid flow in browser against Paddle sandbox

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 6 slices are complete with passing verification
- JWT auth works end-to-end for manager portal (login, auto-refresh, logout)
- Token auth continues working for mobile cleaner app
- Paddle webhook processing is proven idempotent and order-safe
- Full trial → paid flow works against Paddle sandbox
- Soft degradation (read-only) is enforced for expired/blocked companies
- Billing dashboard shows real subscription data from local records
- Deployment docs cover JWT settings, Paddle webhook URL, env var checklist
- CleanProof functionality is unaffected (no regression)

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014
- Partially covers: none
- Leaves for later: R020, R021, R022, R023, R024
- Orphan risks: none

## Slices

- [x] **S01: JWT Auth Backend** `risk:high` `depends:[]`
  > After this: Login endpoint returns JWT access+refresh token pair; refresh endpoint rotates tokens; blacklisted tokens are rejected; existing Token auth still works for mobile.

- [x] **S02: Manager Portal JWT Migration** `risk:medium` `depends:[S01]`
  > After this: Manager portal authenticates with JWT Bearer tokens, auto-refreshes expired access tokens, handles 401 gracefully with refresh retry, login/logout flow uses JWT.

- [x] **S03: Paddle Billing Backend** `risk:high` `depends:[S01]`
  > After this: Webhook endpoint receives Paddle events with signature verification; subscription state syncs to Company model; raw payloads persisted; idempotent and order-safe processing proven with test fixtures.

- [x] **S04: Checkout & Billing Dashboard** `risk:medium` `depends:[S02,S03]`
  > After this: Pricing page opens Paddle.js overlay checkout; after simulated payment, company plan updates to active; billing page shows real subscription data from local records.

- [x] **S05: Trial Enforcement & Upgrade Flow** `risk:medium` `depends:[S03,S04]`
  > After this: Expired trial company sees read-only mode in manager portal; blocked actions show upgrade CTA; clicking upgrade opens Paddle checkout; after payment, full access restores.

- [x] **S06: Launch Polish & Deployment Docs** `risk:low` `depends:[S05]`
  > After this: Landing pages reviewed for launch readiness; Paddle sandbox setup guide complete; VPS deployment checklist covers JWT config, Paddle webhook URL, env vars, Nginx settings.

## Boundary Map

### S01 → S02

Produces:
- `backend/apps/api/views_jwt.py` → JWTLoginView (POST, returns access+refresh), JWTRefreshView (POST, rotates tokens), JWTLogoutView (POST, blacklists refresh token)
- `backend/config/settings.py` → SIMPLE_JWT config, JWTAuthentication added to DEFAULT_AUTHENTICATION_CLASSES alongside TokenAuthentication
- JWT access token contains custom claims: user_id, email, role, company_id

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- JWT-authenticated endpoints (S03 webhook endpoint is unauthenticated but S03 depends on S01's auth pipeline being stable)
- Company model remains unchanged in S01

Consumes:
- nothing (first slice)

### S02 → S04

Produces:
- `dubai-control/src/api/client.ts` → JWT-aware API client with Bearer token, auto-refresh interceptor
- `dubai-control/src/pages/Login.tsx` → Login flow returns and stores JWT pair
- Token storage pattern: access_token + refresh_token in localStorage

Consumes from S01:
- JWTLoginView → POST /api/manager/auth/jwt/login/ returns {access, refresh, user_id, email, role}
- JWTRefreshView → POST /api/manager/auth/jwt/refresh/ returns {access}

### S03 → S04

Produces:
- `backend/apps/accounts/models.py` → PaddleSubscription model (paddle_subscription_id, paddle_customer_id, status, plan_tier, current_period_start, current_period_end, paddle_update_url)
- `backend/apps/accounts/models.py` → PaddleWebhookEvent model (event_id, event_type, payload, occurred_at, processed_at, status)
- `backend/apps/api/views_paddle.py` → PaddleWebhookView (POST, signature verification, event dispatch)
- Webhook handlers update Company.plan and Company.plan_tier based on subscription state
- API endpoint: GET /api/billing/subscription/ → returns current subscription data for the authenticated user's company

Consumes from S01:
- Stable auth pipeline (webhook endpoint is unauthenticated; billing API endpoint uses JWT)

### S03 → S05

Produces:
- Company.plan accurately reflects Paddle subscription state (trial, active, blocked)
- Company.is_trial_expired property
- PaddleSubscription.status field

Consumes from S01:
- Auth pipeline

### S04 → S05

Produces:
- Paddle.js initialized in frontend with client token from env
- Checkout overlay opening pattern (Paddle.Checkout.open with priceId)
- Billing page component showing subscription data

Consumes from S02:
- JWT-authenticated API client
- Login flow with JWT

Consumes from S03:
- GET /api/billing/subscription/ endpoint
- PaddleSubscription model with current plan data

### S05 → S06

Produces:
- `backend/apps/api/permissions.py` → ActivePlanPermission (DRF permission class, blocks writes for expired/blocked)
- Frontend upgrade dialog/banner component
- Backend 403 response format: {code: "PLAN_EXPIRED", message: "...", upgrade_url: "..."}
- Complete trial → paid → active flow working end-to-end

Consumes from S03:
- Company.plan state (trial/active/blocked)
- PaddleSubscription status

Consumes from S04:
- Paddle.js checkout overlay pattern
- Billing dashboard component
