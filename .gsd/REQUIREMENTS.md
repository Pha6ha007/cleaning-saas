# Requirements

This file is the explicit capability and coverage contract for the project.

Use it to track what is actively in scope, what has been validated by completed work, what is intentionally deferred, and what is explicitly out of scope.

Guidelines:
- Keep requirements capability-oriented, not a giant feature wishlist.
- Requirements should be atomic, testable, and stated in plain language.
- Every **Active** requirement should be mapped to a slice, deferred, blocked with reason, or moved out of scope.
- Each requirement should have one accountable primary owner and may have supporting slices.
- Research may suggest requirements, but research does not silently make them binding.
- Validation means the requirement was actually proven by completed work and verification, not just discussed.

## Active

### R001 — JWT authentication backend
- Class: core-capability
- Status: active
- Description: Django backend serves JWT access (30-day) and refresh (90-day) tokens with rotation and blacklisting. Custom claims include user role and company ID. Runs alongside Token auth during transition.
- Why it matters: Token auth has no expiry, no rotation, no revocation. JWT is required for secure session management before accepting payments.
- Source: user
- Primary owning slice: M001-sijc46/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Using djangorestframework-simplejwt. Must not break existing Token-authenticated endpoints during transition.

### R002 — JWT frontend migration — manager portal
- Class: primary-user-loop
- Status: active
- Description: Manager portal (`dubai-control/`) authenticates with JWT instead of Token. Stores access+refresh tokens, auto-refreshes on expiry, handles 401 with refresh retry before logout.
- Why it matters: Completes the JWT migration for the primary user-facing application. Without this, the JWT backend has no consumer.
- Source: user
- Primary owning slice: M001-sijc46/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Clean cutover acceptable — no real customers yet. Login flow returns JWT pair instead of Token.

### R003 — Paddle webhook receiver with signature verification
- Class: core-capability
- Status: active
- Description: Backend endpoint receives Paddle webhooks, verifies signatures using official paddle-python-sdk, and dispatches to event handlers.
- Why it matters: Webhooks are the source of truth for subscription state. Without signature verification, billing state is insecure.
- Source: user
- Primary owning slice: M001-sijc46/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Configuration-driven — webhook secret from env var.

### R004 — Paddle subscription state sync to Company model
- Class: core-capability
- Status: active
- Description: Webhook handlers for subscription.created, subscription.updated, subscription.canceled, and transaction.completed/payment_failed update Company model plan status and tier.
- Why it matters: Company.plan and Company.plan_tier must reflect the real Paddle subscription state at all times.
- Source: user
- Primary owning slice: M001-sijc46/S03
- Supporting slices: M001-sijc46/S05
- Validation: unmapped
- Notes: Must handle edge cases: failed payments, subscription pauses, reactivation.

### R005 — Paddle checkout overlay on upgrade/pricing pages
- Class: primary-user-loop
- Status: active
- Description: Pricing page and upgrade prompts open Paddle.js overlay checkout with the correct price ID for the selected tier. Company/user context passed to Paddle for customer matching.
- Why it matters: This is the payment entry point. Without it, no revenue.
- Source: user
- Primary owning slice: M001-sijc46/S04
- Supporting slices: none
- Validation: unmapped
- Notes: Uses Paddle.js CDN. Client token from env var.

### R006 — Self-serve trial → paid conversion flow
- Class: primary-user-loop
- Status: active
- Description: Complete flow: signup → 7-day trial → see pricing → complete Paddle checkout → plan activates automatically. No human in the loop.
- Why it matters: This is the revenue flow. The product cannot monetize without it.
- Source: user
- Primary owning slice: M001-sijc46/S04
- Supporting slices: M001-sijc46/S03, M001-sijc46/S05
- Validation: unmapped
- Notes: Trial start already implemented. Need to wire trial expiry → upgrade prompt → Paddle checkout → webhook → plan activation.

### R007 — Soft degradation enforcement (read-only on expired trial)
- Class: continuity
- Status: active
- Description: When a company's trial expires or plan is blocked, create/update operations are blocked but read operations continue. Users can still view their data.
- Why it matters: Soft degradation preserves user trust and data access while motivating upgrade. Hard block loses users.
- Source: user
- Primary owning slice: M001-sijc46/S05
- Supporting slices: none
- Validation: unmapped
- Notes: DRF permission class checks Company.plan status. Write endpoints return 403 with upgrade message.

### R008 — Upgrade CTA on blocked actions
- Class: primary-user-loop
- Status: active
- Description: When a user attempts a blocked action (create job, add cleaner, etc.) in read-only mode, they see a clear upgrade prompt that leads to Paddle checkout.
- Why it matters: Blocked actions without guidance frustrate users. The CTA converts frustration into revenue.
- Source: user
- Primary owning slice: M001-sijc46/S05
- Supporting slices: M001-sijc46/S04
- Validation: unmapped
- Notes: Frontend shows upgrade dialog/banner. Backend returns structured 403 response with upgrade URL.

### R009 — Webhook idempotency (dedup by event_id)
- Class: failure-visibility
- Status: active
- Description: Paddle webhook handlers are idempotent — processing the same event_id twice produces the same result. Duplicate events are detected and skipped.
- Why it matters: Paddle may deliver the same webhook multiple times. Without dedup, subscription state can corrupt.
- Source: research
- Primary owning slice: M001-sijc46/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Store processed event_ids. Check before processing.

### R010 — Raw webhook payload persistence (audit trail)
- Class: failure-visibility
- Status: active
- Description: Every incoming Paddle webhook is persisted as a raw JSON payload before processing, creating an immutable audit trail of billing events.
- Why it matters: When billing state diverges from Paddle, raw payloads are the diagnostic lifeline. Also needed for compliance.
- Source: research
- Primary owning slice: M001-sijc46/S03
- Supporting slices: none
- Validation: unmapped
- Notes: PaddleWebhookEvent model with event_id, event_type, payload (JSONField), processed_at, status.

### R011 — Webhook out-of-order handling (occurred_at ordering)
- Class: failure-visibility
- Status: active
- Description: Webhook handlers use Paddle's occurred_at timestamp for logical ordering. A stale event (occurred_at older than the last processed event for that subscription) is acknowledged but not applied.
- Why it matters: Paddle does not guarantee delivery order. Without this, a late-arriving subscription.created could overwrite a more recent subscription.updated.
- Source: research
- Primary owning slice: M001-sijc46/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Store last_webhook_at on subscription record. Compare before applying state changes.

### R012 — Billing dashboard shows real Paddle data
- Class: primary-user-loop
- Status: active
- Description: Billing settings page displays real subscription data: current plan, billing cycle, next payment date, payment method summary. Sourced from local subscription record synced via webhooks.
- Why it matters: Users need to see their billing status. Fake/placeholder data erodes trust.
- Source: user
- Primary owning slice: M001-sijc46/S04
- Supporting slices: M001-sijc46/S03
- Validation: unmapped
- Notes: Data comes from local PaddleSubscription model, not live API calls. Webhook keeps it fresh.

### R013 — Configuration-driven Paddle setup (env vars, no hardcoded IDs)
- Class: operability
- Status: active
- Description: All Paddle identifiers (API key, webhook secret, client token, price IDs per tier) are loaded from environment variables. No hardcoded Paddle IDs in source code.
- Why it matters: Enables sandbox → production switch without code changes. Prevents credential leaks.
- Source: user
- Primary owning slice: M001-sijc46/S03
- Supporting slices: M001-sijc46/S04
- Validation: unmapped
- Notes: .env.example documents all required Paddle env vars.

### R014 — Deployment documentation for JWT + Paddle on VPS
- Class: operability
- Status: active
- Description: Clear documentation covering: JWT settings for production, Paddle webhook URL configuration, env var checklist, Nginx config for webhook endpoint, Paddle sandbox setup guide.
- Why it matters: The user deploys to the VPS themselves. Without docs, the deployment will fail or be insecure.
- Source: user
- Primary owning slice: M001-sijc46/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Includes Paddle dashboard setup guide (products, prices, webhook URL, notification settings).

## Deferred

### R020 — JWT migration — mobile cleaner app
- Class: primary-user-loop
- Status: deferred
- Description: Mobile cleaner app (React Native) switches from Token auth to JWT with auto-refresh and 401 handling.
- Why it matters: Completes JWT migration across all clients.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred per user decision. Mobile stays on Token auth for now. Backend supports both auth methods.

### R021 — Mobile auto-refresh + 401 handling for JWT
- Class: continuity
- Status: deferred
- Description: Mobile app automatically refreshes expired JWT access tokens and gracefully handles unrecoverable 401s with logout.
- Why it matters: Without this, mobile users get randomly logged out when tokens expire.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Depends on R020. Deferred together.

### R022 — Paddle customer portal (self-manage subscription)
- Class: primary-user-loop
- Status: deferred
- Description: Users can manage their own subscription (update payment method, view invoices, cancel) via Paddle's hosted customer portal.
- Why it matters: Self-service billing reduces support burden.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Paddle provides hosted portal. Needs a redirect URL from billing settings page.

### R023 — Failed payment retry flow with email notifications
- Class: continuity
- Status: deferred
- Description: When a payment fails, the system retries per Paddle's dunning schedule and notifies the user via email.
- Why it matters: Payment failures without notification lead to involuntary churn.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Paddle handles retry logic. Email notification is the missing piece.

### R024 — Plan upgrade/downgrade mid-cycle proration
- Class: primary-user-loop
- Status: deferred
- Description: Users can change their plan tier mid-billing-cycle with correct proration.
- Why it matters: Prevents users from being locked to a tier until the end of the billing cycle.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Paddle supports proration natively. Needs frontend UI and backend handling.

## Out of Scope

### R030 — Credit card required for trial signup
- Class: anti-feature
- Status: out-of-scope
- Description: Requiring a credit card at signup. Trials are free with no payment info needed.
- Why it matters: Prevents scope confusion — trials must be frictionless.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Explicit decision to keep trials frictionless.

### R031 — Email onboarding drip campaigns during trial
- Class: constraint
- Status: out-of-scope
- Description: Automated email sequences during the trial period to drive activation and conversion.
- Why it matters: Valuable for conversion but not launch-blocking and requires email infrastructure.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Can be added post-launch with minimal coupling.

### R032 — In-app usage analytics/activation tracking
- Class: constraint
- Status: out-of-scope
- Description: Tracking user activation milestones (first job created, first report generated, etc.) for conversion optimization.
- Why it matters: Useful for understanding trial conversion but not a launch requirement.
- Source: research
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Can be layered in post-launch.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | active | M001-sijc46/S01 | none | unmapped |
| R002 | primary-user-loop | active | M001-sijc46/S02 | none | unmapped |
| R003 | core-capability | active | M001-sijc46/S03 | none | unmapped |
| R004 | core-capability | active | M001-sijc46/S03 | M001-sijc46/S05 | unmapped |
| R005 | primary-user-loop | active | M001-sijc46/S04 | none | unmapped |
| R006 | primary-user-loop | active | M001-sijc46/S04 | M001-sijc46/S03, M001-sijc46/S05 | unmapped |
| R007 | continuity | active | M001-sijc46/S05 | none | unmapped |
| R008 | primary-user-loop | active | M001-sijc46/S05 | M001-sijc46/S04 | unmapped |
| R009 | failure-visibility | active | M001-sijc46/S03 | none | unmapped |
| R010 | failure-visibility | active | M001-sijc46/S03 | none | unmapped |
| R011 | failure-visibility | active | M001-sijc46/S03 | none | unmapped |
| R012 | primary-user-loop | active | M001-sijc46/S04 | M001-sijc46/S03 | unmapped |
| R013 | operability | active | M001-sijc46/S03 | M001-sijc46/S04 | unmapped |
| R014 | operability | active | M001-sijc46/S06 | none | unmapped |
| R020 | primary-user-loop | deferred | none | none | unmapped |
| R021 | continuity | deferred | none | none | unmapped |
| R022 | primary-user-loop | deferred | none | none | unmapped |
| R023 | continuity | deferred | none | none | unmapped |
| R024 | primary-user-loop | deferred | none | none | unmapped |
| R030 | anti-feature | out-of-scope | none | none | n/a |
| R031 | constraint | out-of-scope | none | none | n/a |
| R032 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 14
- Mapped to slices: 14
- Validated: 0
- Unmapped active requirements: 0
