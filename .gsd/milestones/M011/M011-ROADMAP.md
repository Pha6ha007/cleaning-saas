---
id: M011
title: Webhook Reliability + DB Indexes + Admin Panel
status: complete
started: 2026-03-17
completed: 2026-03-17
tests_at_start: 821
tests_at_end: 845
---

# M011 Roadmap: Webhook Reliability + DB Indexes + Admin Panel

## Goal
Three production-readiness gaps:
1. Webhook delivery: currently fire-and-forget (max_retries=0). Add retry with backoff + dead-letter alert.
2. Missing DB indexes on maintenance models for production query patterns.
3. Django admin: 7 maintenance models not registered — blind to prod data.

## Slices

- [x] **S01: Webhook Retry + Dead-Letter Alert** `risk:medium` `depends:[]`
- [x] **S02: DB Indexes** `risk:low` `depends:[]`
- [x] **S03: Admin Panel** `risk:low` `depends:[]`

## Constraints
- LOCKED: jobs/models.py, apps/webhooks/models.py, views_*.py
- New migration files OK for indexes
- Admin changes to apps/maintenance/admin.py OK (not locked)
