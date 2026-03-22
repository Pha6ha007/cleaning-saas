---
id: M009
title: MaintainProof — Remaining 25 Views Test Coverage
status: complete
started: 2026-03-17
completed: 2026-03-17
tests_at_start: 607
tests_at_end: 746
---

# M009 Roadmap: MaintainProof — Remaining 25 Views

## Goal
Close the last coverage gap: 25 untested view classes in views_maintenance.py.
Fix production bugs discovered during testing.

## Slices

- [x] **S01: Recurring Templates & Generate** `risk:high` `depends:[]`
- [x] **S02: Bulk Operations & Reschedule** `risk:high` `depends:[S01]`
- [x] **S03: PDF Reports & Email** `risk:medium` `depends:[]`
- [x] **S04: Parts History, Visit Parts & Checklists** `risk:low` `depends:[]`
- [x] **S05: Asset Import/Export & Visit Photos** `risk:medium` `depends:[]`

## Constraints
- LOCKED files untouched
- Maintenance views OK to bugfix
- Test files: tests/test_s*_m009_*.py
