# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M001-sijc46 | library | JWT library for Django | djangorestframework-simplejwt | DRF-recommended, built-in blacklisting, token rotation, customizable claims. Avoids reinventing with raw PyJWT. | No |
| D002 | M001-sijc46 | library | Payment processor | Paddle (merchant of record) | Handles tax, invoices, compliance. Overlay checkout. UAE-friendly. Official Python SDK for webhooks. | No |
| D003 | M001-sijc46 | arch | JWT + Token coexistence | Both auth methods in DEFAULT_AUTHENTICATION_CLASSES | Mobile stays on Token, portal moves to JWT. Both must work simultaneously. Remove Token only after mobile migrates. | Yes — when mobile migrates to JWT |
| D004 | M001-sijc46 | arch | Trial expiry behavior | Soft degradation (read-only) | User keeps data access, read endpoints work, write endpoints return 403 with upgrade CTA. Preserves trust. | Yes — if churn data suggests hard block converts better |
| D005 | M001-sijc46 | arch | Paddle config approach | Environment variables for all Paddle IDs | API key, webhook secret, client token, price IDs per tier — all from env vars. No hardcoded Paddle identifiers. Enables sandbox→production switch. | No |
| D006 | M001-sijc46 | arch | Webhook reliability | Idempotent processing + occurred_at ordering + raw payload persistence | Paddle delivers webhooks at-least-once and out-of-order. Dedup by event_id, order by occurred_at, persist raw JSON for audit/debugging. | No |
| D007 | M001-sijc46 | scope | JWT migration scope | Manager portal only — mobile stays on Token | Reduces risk. Clean cutover OK since no real paying customers yet. Mobile migration deferred to future milestone. | Yes — next milestone |
| D008 | M001-sijc46 | scope | Deployment scope | Local dev + deployment docs, not actual production deploy | User deploys to VPS themselves. Milestone delivers working code + clear deployment checklist. | No |
