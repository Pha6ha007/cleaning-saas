# Context Isolation Audit Report

**Date:** 2026-03-06
**Auditor:** Claude Code
**Scope:** CleanProof (Cleaning) vs MaintainProof (Maintenance) context separation

---

## Executive Summary

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Backend Queries (Cleaning Jobs) | ✅ ISOLATED | 0 |
| Backend Queries (Reports/Analytics) | ⚠️ LEAK | 11 views missing context filter |
| Frontend Routing | ✅ ISOLATED | 0 |
| Shared Models | ⚠️ PARTIAL | SLA uses same logic |
| RBAC Cross-Context | ✅ ISOLATED | 0 |
| PDF Generation | ✅ ISOLATED | Separate templates |

**Overall Risk Level: MEDIUM** - Reports and Analytics for Cleaning context may include Maintenance jobs.

---

## 1. Backend Queries Audit

### 1.1 views_manager_jobs.py (Cleaning Endpoints)

| View | Line | Filter | Status | Evidence |
|------|------|--------|--------|----------|
| `ManagerJobsTodayView` | 375 | `context=Job.CONTEXT_CLEANING` | ✅ ISOLATED | `.filter(..., context=Job.CONTEXT_CLEANING)` |
| `ManagerJobsActiveView` | 442 | `context=Job.CONTEXT_CLEANING` | ✅ ISOLATED | `.filter(company=company, context=Job.CONTEXT_CLEANING)` |
| `ManagerPlanningJobsView` | 974 | `context=Job.CONTEXT_CLEANING` | ✅ ISOLATED | `.filter(..., context=Job.CONTEXT_CLEANING)` |
| `ManagerJobsHistoryView` | 1029 | `context=Job.CONTEXT_CLEANING` | ✅ ISOLATED | `.filter(..., context=Job.CONTEXT_CLEANING)` |
| `ManagerJobsExportView` | 1120 | `context=Job.CONTEXT_CLEANING` | ✅ ISOLATED | `.filter(..., context=Job.CONTEXT_CLEANING)` |
| `ManagerJobDetailView` | 586 | company only | ⚠️ PARTIAL | No context filter - returns any job by ID |
| `ManagerJobForceCompleteView` | 844 | company only | ⚠️ PARTIAL | No context filter - can force-complete any job |
| `JobPdfReportView` | 86 | company only | ⚠️ PARTIAL | No context filter |
| `ManagerJobPdfEmailView` | 129 | company only | ⚠️ PARTIAL | No context filter |

**Finding:** List endpoints properly filter by context. Detail/action endpoints filter by company only.

### 1.2 views_reports.py (Cleaning Reports)

| View | Line | Filter | Status | Evidence |
|------|------|--------|--------|----------|
| `_get_company_report` | 48-57 | **NO CONTEXT FILTER** | ❌ LEAK | `Job.objects.filter(company=company, status=STATUS_COMPLETED)` |
| `OwnerOverviewView` | 268 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |
| `ManagerPerformanceView` | 327-335 | **NO CONTEXT FILTER** | ❌ LEAK | `Job.objects.filter(company=company, status="completed")` |
| `ManagerViolationJobsView` | 553-562 | **NO CONTEXT FILTER** | ❌ LEAK | `Job.objects.filter(company=company, status="completed")` |
| `ManagerWeeklyReportView` | 842 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |
| `ManagerMonthlyReportView` | 866 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |
| `ManagerWeeklyReportPdfView` | 894 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |
| `ManagerMonthlyReportPdfView` | 931 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |
| `WeeklyReportEmailView` | 1103 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |
| `MonthlyReportEmailView` | 1020 | Uses `_get_company_report` | ❌ LEAK | Inherits leak from helper |

**Critical Finding:** All reports include maintenance jobs in cleaning reports. The `_get_company_report` helper function at line 48 needs `context=Job.CONTEXT_CLEANING` filter.

### 1.3 analytics_views.py (Cleaning Analytics)

| View | Line | Filter | Status | Evidence |
|------|------|--------|--------|----------|
| `_calculate_summary_for_range` | 47-57 | **NO CONTEXT FILTER** | ❌ LEAK | `Job.objects.filter(company=company, status=STATUS_COMPLETED)` |
| `analytics_summary` | 208 | Uses `_calculate_summary_for_range` | ❌ LEAK | Inherits leak |
| `analytics_jobs_completed` | 306-312 | **NO CONTEXT FILTER** | ❌ LEAK | `Job.objects.filter(company=company, status=STATUS_COMPLETED)` |
| `analytics_violations_trend` | 394-403 | **NO CONTEXT FILTER** | ❌ LEAK | No context filter |
| `analytics_job_duration` | 500-510 | **NO CONTEXT FILTER** | ❌ LEAK | No context filter |
| `analytics_proof_completion` | 604-613 | **NO CONTEXT FILTER** | ❌ LEAK | No context filter |
| `analytics_sla_breakdown` | 766-775 | **NO CONTEXT FILTER** | ❌ LEAK | No context filter |
| `analytics_locations_performance` | 962-972 | **NO CONTEXT FILTER** | ❌ LEAK | No context filter |
| `analytics_cleaners_performance` | 1140-1150 | **NO CONTEXT FILTER** | ❌ LEAK | No context filter |

**Critical Finding:** All cleaning analytics endpoints include maintenance jobs. Every function needs `context=Job.CONTEXT_CLEANING` filter.

### 1.4 views_maintenance.py (Maintenance Endpoints)

| View | Line | Filter | Status | Evidence |
|------|------|--------|--------|----------|
| `ServiceVisitsListView` | 856 | `context=Job.CONTEXT_MAINTENANCE` | ✅ ISOLATED | Explicit filter |
| `_calculate_maintenance_summary` | 1336 | `context=Job.CONTEXT_MAINTENANCE` | ✅ ISOLATED | Explicit filter |
| `MaintenanceAnalyticsSummaryView` | 1407 | Uses `_calculate_maintenance_summary` | ✅ ISOLATED | Inherits filter |
| `MaintenanceAnalyticsVisitsTrendView` | 1456 | `context=Job.CONTEXT_MAINTENANCE` | ✅ ISOLATED | Explicit filter |
| `MaintenanceAnalyticsSlaTrendView` | 1513 | `context=Job.CONTEXT_MAINTENANCE` | ✅ ISOLATED | Explicit filter |
| All other maintenance views | Various | `context=Job.CONTEXT_MAINTENANCE` | ✅ ISOLATED | Consistent filtering |

**Finding:** Maintenance views are properly isolated.

---

## 2. Frontend Routing Audit

### 2.1 Route Separation

| Route Pattern | Context | Status | Evidence |
|---------------|---------|--------|----------|
| `/dashboard`, `/jobs`, `/planning`, `/history`, `/performance`, `/analytics`, `/reports`, `/locations` | Cleaning | ✅ ISOLATED | No `/maintenance` prefix |
| `/maintenance/*` | Maintenance | ✅ ISOLATED | All under `/maintenance/` namespace |

**Location:** `dubai-control/src/App.tsx` lines 140-198

### 2.2 Sidebar Navigation

| Check | Status | Evidence |
|-------|--------|----------|
| Cleaning nav items use root paths | ✅ ISOLATED | `cleaning.ts:25-38` - all paths without `/maintenance` |
| Maintenance nav items use `/maintenance/*` | ✅ ISOLATED | `maintenance.ts:36-67` - all paths with `/maintenance/` prefix |
| Sidebar renders based on `currentContext` | ✅ ISOLATED | `AppSidebar.tsx:28` - `getNavItems(currentContext, ...)` |
| Context detected from URL | ✅ ISOLATED | `index.ts:90-103` - `detectContextFromPath()` |

### 2.3 Cross-Navigation Check

| Check | Status | Evidence |
|-------|--------|----------|
| Cleaning sidebar links to `/maintenance/*` | ✅ ISOLATED | No maintenance paths in `cleaningNavItems` |
| Maintenance sidebar links to cleaning paths | ✅ ISOLATED | No root paths in `maintenanceNavItems` |
| Direct URL navigation enforced by context detection | ✅ ISOLATED | `detectContextFromPath()` switches context |

---

## 3. Shared Job Model Audit

### 3.1 Context Field

| Check | Status | Evidence |
|-------|--------|----------|
| `context` field exists | ✅ | `models.py:62-68` |
| `context` has choices | ✅ | `CONTEXT_CLEANING`, `CONTEXT_MAINTENANCE` |
| `context` has db_index | ✅ | `db_index=True` for query performance |
| Default is `CONTEXT_CLEANING` | ✅ | Backwards compatible |

### 3.2 force_complete Behavior

| Check | Status | Evidence |
|-------|--------|----------|
| Same logic for both contexts | ⚠️ SAME | `ManagerJobForceCompleteView` has no context-specific logic |
| Maintenance has separate force-complete | ✅ | `views_maintenance.py` has `MaintenanceVisitForceCompleteView` |

**Finding:** Both contexts use the same force-complete logic, but maintenance has its own endpoint.

### 3.3 SLA Calculation

| Check | Status | Evidence |
|-------|--------|----------|
| Same `compute_sla_status_and_reasons_for_job()` | ⚠️ SAME | Used by both contexts |
| Same SLA reasons | ⚠️ SAME | `missing_before_photo`, `missing_after_photo`, `checklist_not_completed` |
| Maintenance has separate analytics | ✅ | Uses same helper but isolated queries |

---

## 4. RBAC Cross-Context Audit

### 4.1 verify_roles.sh Coverage

| Test Area | Status | Evidence |
|-----------|--------|----------|
| Auth/Me endpoint | ✅ | Tests role verification |
| Settings/Billing | ✅ | Tests owner/manager/staff/cleaner access |
| Company/Team | ✅ | Tests role-based access |
| Trial enforcement | ✅ | Tests job creation blocking |
| **Cross-context access** | ❌ NOT TESTED | Script doesn't test context isolation |

### 4.2 tests.py Coverage

| Test | Status | Evidence |
|------|--------|----------|
| `CrossContextGuardrailTests` | ✅ | Explicit context isolation tests |
| Cleaning doesn't show maintenance | ✅ | `test_cleaning_does_not_show_maintenance_jobs` |
| Maintenance doesn't show cleaning | ✅ | `test_maintenance_does_not_show_cleaning_jobs` |
| Reports context isolation | ❌ NOT TESTED | No tests for reports/analytics |

### 4.3 Multi-Context Company Access

| Scenario | Status | Risk |
|----------|--------|------|
| Manager sees both contexts' data in Reports | ⚠️ LEAK | Reports mix cleaning + maintenance |
| Manager sees both contexts' data in Analytics | ⚠️ LEAK | Analytics mix cleaning + maintenance |
| Manager sees correct data in Jobs list | ✅ ISOLATED | Properly filtered |

---

## 5. PDF Generation Audit

| Report Type | Template | Status | Evidence |
|-------------|----------|--------|----------|
| Cleaning Job Report | `generate_job_report_pdf()` | ✅ ISOLATED | Used by `JobPdfReportView` |
| Maintenance Visit Report | `generate_maintenance_visit_report_pdf()` | ✅ ISOLATED | `views_maintenance.py:1097` |
| Asset History Report | `generate_asset_history_report_pdf()` | ✅ ISOLATED | Maintenance-only |
| Company SLA Report | `generate_company_sla_report_pdf()` | ⚠️ LEAK | Uses `_get_company_report` without context |

---

## 6. Critical Issues Summary

### HIGH PRIORITY (Data Leak)

| # | Issue | Location | Fix Required |
|---|-------|----------|--------------|
| 1 | `_get_company_report` missing context filter | `views_reports.py:48` | Add `context=Job.CONTEXT_CLEANING` |
| 2 | `_calculate_summary_for_range` missing context filter | `analytics_views.py:47` | Add `context=Job.CONTEXT_CLEANING` |
| 3 | `ManagerPerformanceView` missing context filter | `views_reports.py:327` | Add `context=Job.CONTEXT_CLEANING` |
| 4 | `ManagerViolationJobsView` missing context filter | `views_reports.py:553` | Add `context=Job.CONTEXT_CLEANING` |
| 5 | `analytics_jobs_completed` missing context filter | `analytics_views.py:306` | Add `context=Job.CONTEXT_CLEANING` |
| 6 | `analytics_violations_trend` missing context filter | `analytics_views.py:394` | Add `context=Job.CONTEXT_CLEANING` |
| 7 | `analytics_job_duration` missing context filter | `analytics_views.py:500` | Add `context=Job.CONTEXT_CLEANING` |
| 8 | `analytics_proof_completion` missing context filter | `analytics_views.py:604` | Add `context=Job.CONTEXT_CLEANING` |
| 9 | `analytics_sla_breakdown` missing context filter | `analytics_views.py:766` | Add `context=Job.CONTEXT_CLEANING` |
| 10 | `analytics_locations_performance` missing context filter | `analytics_views.py:962` | Add `context=Job.CONTEXT_CLEANING` |
| 11 | `analytics_cleaners_performance` missing context filter | `analytics_views.py:1140` | Add `context=Job.CONTEXT_CLEANING` |

### MEDIUM PRIORITY (Testing Gap)

| # | Issue | Location | Fix Required |
|---|-------|----------|--------------|
| 12 | `verify_roles.sh` doesn't test cross-context | `backend/verify_roles.sh` | Add context isolation tests |
| 13 | No automated tests for Reports context isolation | `backend/apps/api/tests.py` | Add report isolation tests |

---

## 7. Recommended Fixes

### Fix 1: `_get_company_report` (views_reports.py:48)

```python
# BEFORE
qs = (
    Job.objects.filter(
        company=company,
        status=Job.STATUS_COMPLETED,
        actual_end_time__date__gte=date_from,
        actual_end_time__date__lte=date_to,
    )
    ...
)

# AFTER
qs = (
    Job.objects.filter(
        company=company,
        status=Job.STATUS_COMPLETED,
        context=Job.CONTEXT_CLEANING,  # ADD THIS
        actual_end_time__date__gte=date_from,
        actual_end_time__date__lte=date_to,
    )
    ...
)
```

### Fix 2: `_calculate_summary_for_range` (analytics_views.py:47)

```python
# BEFORE
qs = (
    Job.objects.filter(
        company=company,
        status=Job.STATUS_COMPLETED,
        actual_end_time__isnull=False,
        actual_end_time__date__gte=date_from,
        actual_end_time__date__lte=date_to,
    )
    ...
)

# AFTER
qs = (
    Job.objects.filter(
        company=company,
        status=Job.STATUS_COMPLETED,
        context=Job.CONTEXT_CLEANING,  # ADD THIS
        actual_end_time__isnull=False,
        actual_end_time__date__gte=date_from,
        actual_end_time__date__lte=date_to,
    )
    ...
)
```

### Fix Pattern for All Analytics Views

Add `context=Job.CONTEXT_CLEANING` to every `Job.objects.filter()` call in `analytics_views.py`.

---

## 8. Verification Checklist

After implementing fixes, verify:

- [ ] Cleaning Reports show only cleaning jobs
- [ ] Cleaning Analytics show only cleaning metrics
- [ ] Maintenance Reports show only maintenance visits
- [ ] Maintenance Analytics show only maintenance metrics
- [ ] PDF exports reflect correct context data
- [ ] Existing unit tests pass
- [ ] Add new tests for context isolation in Reports/Analytics

---

## Appendix: Files Requiring Changes

| File | Lines to Modify | Priority |
|------|-----------------|----------|
| `backend/apps/api/views_reports.py` | 48, 327, 553 | HIGH |
| `backend/apps/api/analytics_views.py` | 47, 306, 394, 500, 604, 766, 962, 1140 | HIGH |
| `backend/apps/api/tests.py` | Add new test class | MEDIUM |
| `backend/verify_roles.sh` | Add context tests | MEDIUM |
