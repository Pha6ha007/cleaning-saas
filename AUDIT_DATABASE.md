# Database & Performance Audit

**Date:** 2026-03-06
**Auditor:** Claude Code
**Scope:** Indexes, N+1 queries, Large querysets, Migration safety, SQLite→PostgreSQL compatibility

---

## Executive Summary

| Category | Status | Critical Issues |
|----------|--------|-----------------|
| Indexes | ⚠️ RISK | 2 missing indexes on frequently filtered fields |
| N+1 Queries | ✅ OK | Proper use of select_related/prefetch_related |
| Large Querysets | ❌ PROBLEM | Analytics loads entire year into memory |
| Migration Safety | ✅ OK | No dangerous patterns found |
| SQLite → PostgreSQL | ⚠️ RISK | JSONField behavior differences |

---

## 1. INDEXES

### Job Model

| Field | db_index | Usage | Status |
|-------|----------|-------|--------|
| `context` | ✅ Yes | Filter by product context | ✅ OK |
| `scheduled_date` | ❌ No | Filter in jobs list, planning | ❌ PROBLEM |
| `company` | ✅ Auto (FK) | Filter in all queries | ✅ OK |
| `status` | ❌ No | Filter in EVERY analytics query | ❌ PROBLEM |
| `priority` | ✅ Yes | Filter by priority | ✅ OK |
| `sla_deadline` | ✅ Yes | SLA queries | ✅ OK |
| `location` | ✅ Auto (FK) | Join with location | ✅ OK |
| `cleaner` | ✅ Auto (FK) | Join with cleaner | ✅ OK |

**Critical Finding:**
```python
# analytics_views.py - status is filtered in EVERY query
Job.objects.filter(
    company=company,
    status=Job.STATUS_COMPLETED,  # ❌ NO INDEX
    actual_end_time__date__gte=date_from,
    actual_end_time__date__lte=date_to,
)
```

### JobPhoto Model

| Field | db_index | Status |
|-------|----------|--------|
| `job` | ✅ Auto (FK) | ✅ OK |
| `photo_type` | ❌ No | ⚠️ RISK (filtered in proof checks) |

### JobCheckEvent Model

| Field | db_index | Status |
|-------|----------|--------|
| `job` | ✅ Auto (FK) | ✅ OK |
| `created_at` | ❌ No (but ordering) | ⚠️ OK (small table) |

### Asset Model

| Field | db_index | Status |
|-------|----------|--------|
| `company` | ✅ Auto (FK) | ✅ OK |
| `location` | ✅ Auto (FK) | ✅ OK |
| `asset_type` | ✅ Auto (FK) | ✅ OK |
| `is_active` | ❌ No | ⚠️ RISK (filtered often) |

### ServiceContract Model

| Field | db_index | Status |
|-------|----------|--------|
| `company` | ✅ Auto (FK) | ✅ OK |
| `location` | ✅ Auto (FK) | ✅ OK |
| `status` | ❌ No | ⚠️ RISK (filtered in lists) |
| `start_date` | ❌ No | ⚠️ RISK (range queries) |
| `end_date` | ❌ No | ⚠️ RISK (expiry checks) |

### Recommendations

```python
# backend/apps/jobs/models.py - Job model
scheduled_date = models.DateField(db_index=True)  # ADD INDEX
status = models.CharField(..., db_index=True)      # ADD INDEX

# backend/apps/maintenance/models.py - Asset model
is_active = models.BooleanField(default=True, db_index=True)  # ADD INDEX

# backend/apps/maintenance/models.py - ServiceContract model
status = models.CharField(..., db_index=True)      # ADD INDEX
start_date = models.DateField(db_index=True)       # ADD INDEX
end_date = models.DateField(..., db_index=True)    # ADD INDEX
```

---

## 2. N+1 QUERIES

### Analysis

**Grep Results:** 80+ usages of `select_related` / `prefetch_related`

| View File | select_related | prefetch_related | Status |
|-----------|----------------|------------------|--------|
| views_manager_jobs.py | ✅ location, cleaner | ✅ photos | ✅ OK |
| views_cleaner.py | ✅ location | ✅ checklist_items | ✅ OK |
| views_maintenance.py | ✅ asset, location | ✅ photos, checklist_items | ✅ OK |
| analytics_views.py | ✅ cleaner, location | ✅ photos, checklist_items | ✅ OK |
| views_reports.py | ✅ cleaner, location | ✅ photos, checklist_items | ✅ OK |
| views_customer_portal.py | ✅ location, asset | ✅ checklist_items | ✅ OK |

### Example of Proper Usage

```python
# backend/apps/api/views_manager_jobs.py:86
base_qs = Job.objects.select_related("location", "cleaner").prefetch_related(
    "photos",
    "checklist_items",
)
```

### Conclusion

**✅ NO N+1 ISSUES FOUND** - Team consistently uses proper prefetching.

---

## 3. LARGE QUERYSETS

### Analytics Views - CRITICAL ISSUE

```python
# backend/apps/api/analytics_views.py

# Problem: ALL jobs loaded into memory for year-long queries
for job in qs:  # ❌ Iterates entire queryset
    day = job.actual_end_time.date()
    by_day[day] = by_day.get(day, 0) + 1
```

| Endpoint | Issue | Impact |
|----------|-------|--------|
| `/api/manager/analytics/summary/` | ❌ Full queryset iteration | HIGH |
| `/api/manager/analytics/jobs-completed/` | ❌ Full queryset iteration | HIGH |
| `/api/manager/analytics/violations-trend/` | ❌ Full queryset iteration | HIGH |
| `/api/manager/analytics/job-duration/` | ⚠️ Uses `.only()` but full iteration | MEDIUM |
| `/api/manager/analytics/proof-completion/` | ❌ Full queryset iteration | HIGH |
| `/api/manager/analytics/sla-breakdown/` | ❌ Full queryset iteration | HIGH |
| `/api/manager/analytics/cleaners-performance/` | ❌ Full queryset iteration | HIGH |
| `/api/manager/analytics/locations-performance/` | ❌ Full queryset iteration | HIGH |

### Scale Analysis

| Jobs/Year | Memory (est.) | Response Time (est.) |
|-----------|--------------|---------------------|
| 1,000 | ~10 MB | < 1s |
| 10,000 | ~100 MB | 3-5s |
| 100,000 | ~1 GB | 30s+ / OOM |

### Pagination Status

| View | Has Pagination | Status |
|------|----------------|--------|
| views_reports.py `/api/manager/reports/jobs-list/` | ✅ Yes (page_size=50, max=200) | ✅ OK |
| views_maintenance.py `/notification-logs/` | ⚠️ limit=100 | ⚠️ OK |
| views_customer_portal.py `/visits/` | ⚠️ limit=100 | ⚠️ OK |
| analytics_views.py (all endpoints) | ❌ None | ❌ PROBLEM |
| views_manager_jobs.py jobs list | ❌ None | ⚠️ RISK |

### .count() vs len() Analysis

```python
# ✅ GOOD - Uses .count()
jobs_completed = qs.count()

# ✅ GOOD - Proper counting
by_day[day] = by_day.get(day, 0) + 1
```

### Recommendations

```python
# Option 1: Database aggregation (preferred)
from django.db.models.functions import TruncDate
from django.db.models import Count

data = (
    Job.objects
    .filter(company=company, status=Job.STATUS_COMPLETED, ...)
    .annotate(date=TruncDate('actual_end_time'))
    .values('date')
    .annotate(jobs_completed=Count('id'))
    .order_by('date')
)

# Option 2: Iterator for large datasets
for job in qs.iterator(chunk_size=1000):
    ...
```

---

## 4. MIGRATION SAFETY

### RunPython Migrations

| Migration | Code | Status |
|-----------|------|--------|
| `0009_add_job_context.py` | `Job.objects.filter(...).update(context="...")` | ✅ SAFE |

**Analysis:**
```python
# Uses bulk .update() - safe for large tables
maintenance_count = Job.objects.filter(asset__isnull=False).update(context="maintenance")
cleaning_count = Job.objects.filter(asset__isnull=True).update(context="cleaning")
```

### ALTER TABLE with Defaults

| Migration | Field | Has Default | Status |
|-----------|-------|-------------|--------|
| AddField `context` | CharField | Yes (`"cleaning"`) | ✅ SAFE |
| AddField `priority` | CharField | Yes (`"low"`) | ✅ SAFE |
| AddField `sla_deadline` | DateTimeField | null=True | ✅ SAFE |

### Conclusion

**✅ NO DANGEROUS MIGRATIONS FOUND**

---

## 5. SQLite → PostgreSQL COMPATIBILITY

### SQLite Usage

```python
# backend/config/settings.py:142-146
if not DATABASE_URL:
    # Development: SQLite
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
```

**✅ SQLite only in development** - Production uses DATABASE_URL (PostgreSQL).

### JSONField Usage

| Model | Field | Location |
|-------|-------|----------|
| User | `notification_preferences` | accounts/models.py:348 |
| AccessAuditLog | `metadata` | api/models.py:63 |

**⚠️ RISK:** JSONField behavior differs:
- SQLite: Stored as TEXT, no native JSON operators
- PostgreSQL: Native JSONB, supports operators like `->`, `@>`, `->`

**Current Usage Analysis:**
```python
# accounts/models.py
notification_preferences = models.JSONField(
    blank=True,
    default=dict,
    help_text='User notification settings...'
)
```

**Impact:** Low risk - fields are read/written as whole objects, no JSON operators used.

### DateTime Timezone Handling

```python
# analytics_views.py - PROPER timezone handling
if timezone.is_naive(planned_end_naive):
    planned_end = timezone.make_aware(planned_end_naive, tz)
```

**✅ CORRECT** - Code uses `timezone.make_aware()` properly.

### Conclusion

| Check | Status |
|-------|--------|
| sqlite3 imports | ❌ None found |
| pragma statements | ❌ None found |
| JSONField | ⚠️ Used, but low risk |
| Timezone handling | ✅ Proper use of Django timezone utils |

---

## SUMMARY TABLE

| Check | Status | Detail |
|-------|--------|--------|
| **Job.scheduled_date index** | ❌ PROBLEM | Missing index on frequently filtered field |
| **Job.status index** | ❌ PROBLEM | Missing index, used in EVERY analytics query |
| **Asset.is_active index** | ⚠️ RISK | Missing index |
| **ServiceContract indexes** | ⚠️ RISK | Missing indexes on status, start_date, end_date |
| **N+1 queries** | ✅ OK | Proper select_related/prefetch_related usage |
| **Analytics full iteration** | ❌ PROBLEM | All 8 analytics endpoints load full year into memory |
| **Jobs list pagination** | ⚠️ RISK | No pagination on jobs list endpoint |
| **Reports pagination** | ✅ OK | Properly implemented with page_size |
| **RunPython migrations** | ✅ OK | Uses bulk .update(), safe patterns |
| **ALTER TABLE defaults** | ✅ OK | All use nullable or default values |
| **SQLite-specific code** | ✅ OK | None found |
| **JSONField** | ⚠️ RISK | Low risk, no JSON operators used |
| **Timezone handling** | ✅ OK | Proper use of timezone.make_aware() |

---

## PRIORITY FIXES

### P0 - Critical (Fix Before Scale)

1. **Add index on Job.status**
   ```python
   status = models.CharField(..., db_index=True)
   ```

2. **Add index on Job.scheduled_date**
   ```python
   scheduled_date = models.DateField(db_index=True)
   ```

3. **Refactor analytics to use database aggregation**
   - Replace Python iteration with Django ORM aggregation
   - Use `TruncDate`, `Count`, `Avg` etc.

### P1 - High (Fix in Next Sprint)

4. **Add pagination to jobs list API**

5. **Add indexes to ServiceContract**
   - status, start_date, end_date

### P2 - Medium (Backlog)

6. **Add index on Asset.is_active**

7. **Consider composite indexes for common query patterns**
   ```python
   class Meta:
       indexes = [
           models.Index(fields=['company', 'status', 'scheduled_date']),
       ]
   ```

---

## APPENDIX: Query Patterns Found

### Most Common Query Pattern
```python
Job.objects.filter(
    company=company,           # ✅ indexed (FK)
    status=STATUS_COMPLETED,   # ❌ NOT indexed
    actual_end_time__date__gte=date_from,
    actual_end_time__date__lte=date_to,
).select_related("cleaner", "location")
.prefetch_related("photos", "checklist_items")
```

### Recommended Composite Index
```python
class Meta:
    indexes = [
        models.Index(
            fields=['company', 'status', 'actual_end_time'],
            name='jobs_company_status_endtime_idx'
        ),
    ]
```
