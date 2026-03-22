---
id: M010
title: Customer Portal — Backend Test Coverage
status: complete
started: 2026-03-17
completed: 2026-03-17
tests_at_start: 746
tests_at_end: 821
---

# M010 Roadmap: Customer Portal — Backend Test Coverage

## Goal
Test all 12 view classes in `views_customer_portal.py`. Confirm RBAC (customer-only),
location scoping, management endpoints (owner), and edge cases.

## Slices

- [x] **S01: Customer Read Endpoints** `risk:medium` `depends:[]`
- [x] **S02: Customer Management (Owner)** `risk:low` `depends:[S01]`

## Constraints
- `views_customer_portal.py` is LOCKED — tests only, no edits unless bugs found
- Test files: `tests/test_s01_m010_customer_portal.py`, `tests/test_s02_m010_customer_management.py`
