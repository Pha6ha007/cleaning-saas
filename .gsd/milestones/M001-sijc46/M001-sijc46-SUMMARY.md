---
milestone: M001-sijc46
slices_completed: [S01]
slices_remaining: [S02, S03, S04, S05, S06]
---

# M001-sijc46: Launch-Ready Billing & Auth — Summary

## Completed

### S01: JWT Auth Backend
JWT authentication fully operational on the Django backend. simplejwt 5.5.1 configured with 30-day access / 90-day refresh tokens, automatic rotation, and blacklisting. Three endpoints: login (manager roles only, custom claims), refresh (rotates tokens), logout (blacklists refresh). 19 tests passing. Token auth for mobile unaffected.

**Key finding:** All existing views explicitly override `authentication_classes = [TokenAuthentication]`, so S02 must update per-view auth classes — global settings alone are insufficient.

## Outstanding
- S02: Manager Portal JWT Migration (frontend + per-view auth update)
- S03: Paddle Billing Backend (webhooks, subscription sync)
- S04: Checkout & Billing Dashboard (Paddle.js, billing UI)
- S05: Trial Enforcement & Upgrade Flow (soft degradation)
- S06: Launch Polish & Deployment Docs
