---
id: M008
title: MaintainProof — Test Coverage & Frontend Hardening
status: in_progress
started: 2026-03-17
tests_at_start: 477
---

# M008 Roadmap: MaintainProof Test Coverage & Frontend Hardening

## Goal
Make MaintainProof production-ready:
1. Test coverage for the entire maintenance backend (49 views, 12 models, 0 current tests)
2. Fix two RBAC TODOs in frontend (VisitDetail, CreateVisit — currently allow all roles)
3. Close any functional gaps found during testing

## Slices

- [ ] **S01: Core Models & Permissions Tests** `risk:medium` `depends:[]`
  - AssetType, Asset, MaintenanceCategory CRUD
  - MaintenancePermissionMixin — role gates, plan gates
  - ~40 tests

- [ ] **S02: Service Visits & Contracts Tests** `risk:medium` `depends:[S01]`
  - ServiceVisitsListView, ServiceContract CRUD
  - RecurringVisitTemplate — generate logic
  - GeneratedVisitLog idempotency
  - ~35 tests

- [ ] **S03: Analytics & Reports Tests** `risk:low` `depends:[S01]`
  - MaintenanceAnalyticsSummaryView, trends, SLA
  - Weekly/Monthly report generation (PDF)
  - ~30 tests

- [ ] **S04: Parts & Documents Tests** `risk:low` `depends:[S01]`
  - Parts CRUD, StockAdjustment, VisitPart
  - AssetDocument upload/list
  - ~20 tests

- [ ] **S05: Frontend RBAC Fix + Smoke Tests** `risk:low` `depends:[S01,S02]`
  - Restore staff-only RBAC in VisitDetail.tsx and CreateVisit.tsx
  - Verify UI builds and no regressions
  - ~5 tests

## Constraints
- LOCKED files untouched (views_manager_jobs, analytics_views, views_reports, views_cleaner)
- Maintenance code in apps/maintenance/ and apps/api/views_maintenance.py — OK to modify
- Frontend maintenance pages OK to modify
- Test files: tests/test_s*_m008_*.py
