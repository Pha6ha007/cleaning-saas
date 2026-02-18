# PR1 - Test Harness TODO

**Status:** WIP (Work In Progress)
**Created:** 2026-02-18
**Branch:** foundation/pr1-tests

## ✅ Completed

- [x] Created pytest.ini configuration
- [x] Created tests/ directory structure
- [x] Created conftest.py with fixtures (company, users, locations, jobs)
- [x] Created test_check_in_out.py (18 tests)
- [x] Created test_rbac.py (15 tests)
- [x] Created test_force_complete.py (14 tests)
- [x] Created test_invariants.py (16 tests)
- [x] Added pytest dependencies to requirements.txt
- [x] Fixed datetime imports (from datetime import timedelta)
- [x] Fixed Company model imports (apps.accounts.models)
- [x] Fixed Company.objects.create fields (contact_email, contact_phone)
- [x] Fixed User fixtures (removed username, pin parameters)

## ✅ Fixed Since Last Update

### 1. User.objects.create_user calls - FIXED
- Removed `username` parameter from all User.objects.create_user() calls

### 2. Job model field names - FIXED
- Replaced `scheduled_duration` with `scheduled_date`, `scheduled_start_time`, `scheduled_end_time`
- Fixed all Job.objects.create() calls in conftest.py and test files

### 3. JobCheckEvent constants - FIXED
- Changed `EVENT_CHECK_IN` → `TYPE_CHECK_IN`
- Changed `EVENT_CHECK_OUT` → `TYPE_CHECK_OUT`

### 4. File model import - FIXED
- Changed `from apps.files.models import File` → `from apps.jobs.models import File`

## ❌ Remaining Issues

### 2. API Endpoint URLs - IDENTIFIED, NEEDS MASSIVE FIXES

Checked `apps/api/urls.py` - found actual endpoint structure. Tests have wrong URLs:

**Test URL → Actual URL (from apps/api/urls.py):**
- ❌ `/api/cleaner/jobs/` → ✅ `/api/jobs/today/` (line 65)
- ❌ `/api/cleaner/jobs/<id>/upload-photo/` → ✅ `/api/jobs/<id>/photos/` (POST, line 98)
- ❌ `/api/jobs/<id>/force-complete/` → ✅ `/api/manager/jobs/<id>/force-complete/` (line 198)
- ❌ `/api/locations/` → ✅ `/api/manager/locations/` (line 232)
- ❌ `/api/companies/<id>/` → ✅ `/api/company/` (line 380)
- ❌ `/api/users/` → ✅ `/api/company/users/` (line 406)
- ❌ `/api/jobs/` (POST create) → ✅ `/api/manager/jobs/` (line 178)
- ❌ `/api/jobs/<id>/` (PATCH) → ✅ `/api/manager/jobs/<id>/` (line 193)

**Already correct:**
- ✅ `/api/jobs/<id>/check-in/` (line 76)
- ✅ `/api/jobs/<id>/check-out/` (line 81)
- ✅ `/api/jobs/<id>/` (GET detail, line 70)

**Impact:** 40+ tests failing with 404/405 errors due to wrong URLs.

**Action Required:** Systematic URL replacement across all test files.

### 3. Invariant Tests Expecting Exceptions - NEEDS DECISION

Several tests expect IntegrityError/ValueError that don't exist in the Job model:
- `test_actual_start_time_required_for_in_progress` - expects error, but Job allows NULL
- `test_actual_end_time_required_for_completed` - expects error, but Job allows NULL
- `test_start_time_before_end_time` - expects error, but no DB constraint

**These invariants are not enforced at the database level.** They're business logic enforced in API views or model methods.

**Options:**
1. Remove these tests (not testing actual system behavior)
2. Rewrite to test API validation instead of model constraints
3. Add database constraints to Job model (requires production code change - breaks PR1 rules)

### 4. Photo API Tests - NEEDS REWRITE

Tests assume photo upload API works differently:
- Test uses `upload-photo` endpoint that doesn't exist
- Actual API: POST to `/api/jobs/<id>/photos/` with `photo_type` and `file`
- Tests need to match actual JobPhotosView implementation

### 5. Method Not Allowed (405) Errors

Some endpoints don't support expected HTTP methods:
- DELETE on `/api/jobs/<id>/` returns 405 (Method Not Allowed)
- PATCH on `/api/jobs/<id>/` returns 405 (should be `/api/manager/jobs/<id>/`)

This is correct API behavior - tests have wrong expectations.

## Current Status

**Test Results:** **47 passed, 16 failed (out of 63 total)** ✅✅ **(75% success rate!)**

**Progress:** 8 → 17 → 36 → 39 → **47 passing tests!**

**Passing Tests (47):**
- ✅ **All RBAC tests (16/16)** - full permission coverage!
- ✅ All check-in tests
- ✅ Most force-complete tests
- ✅ All fixture/model creation tests
- ✅ Job creation API tests
- ✅ Some invariant tests

**Failing Tests Breakdown (16 remaining):**

### 🐛 Production Code Bugs (BLOCKED - Cannot Fix in PR1):
1. **Check-out tests (6 failures)** - `Job.check_out()` has ValidationError bug
   - `AttributeError: 'ValidationError' object has no attribute 'error_list'`
   - Line 345 in apps/jobs/models.py
   - **Status:** BLOCKED - requires production code fix
   - **Tests:** All TestCheckOut tests fail

### 🟡 Minor Fixes Needed (7 failures):
2. **Invariant tests (4)** - Expect DB-level constraints that don't exist:
   - `test_actual_start_time_required_for_in_progress`
   - `test_actual_end_time_required_for_completed`
   - `test_start_time_before_end_time`
   - `test_cannot_skip_in_progress_state`
   - **Note:** These are architectural - constraints enforced in API, not DB

3. **Photo/Evidence tests (3)** - Need investigation:
   - `test_max_one_photo_per_type` - File model field mismatch
   - `test_verification_required_jobs_need_photos`
   - `test_check_events_created_on_check_in_out`

### ⚙️ Force-complete validation (3 failures):
4. **Minor validation issues:**
   - `test_force_complete_requires_minimum_reason_length`
   - `test_can_force_complete_completed_unverified_job`
   - `test_force_complete_stores_reason`
   - **Status:** Likely small payload/response mismatches

## Decision Point: How to Proceed?

### Option A: Fix All 55 Failing Tests (High Effort)
**Estimate:** 2-3 hours of systematic URL replacement + API behavior adjustments
**Steps:**
1. Replace all wrong URLs across test files (~40 instances)
2. Rewrite invariant tests to test API validation (not model constraints)
3. Fix photo upload tests to match actual JobPhotosView behavior
4. Run iteratively until all pass

**Pros:** Complete 63-test suite as originally planned
**Cons:** Tests were written based on assumptions, not actual API; significant rework

### Option B: Reduce Scope to Critical Path Tests (Pragmatic)
**Estimate:** 30-60 minutes to fix ~15 critical tests
**Focus on:**
- Check-in/check-out flow (already have correct URLs)
- Force-complete (just fix URL: `/api/manager/jobs/<id>/force-complete/`)
- Basic RBAC (fix manager/company URLs)
- Skip photo tests and invariant tests for now

**Pros:** Faster delivery, tests match reality
**Cons:** Lower coverage than originally planned

### Option C: Commit WIP + Document (Transparency)
**Estimate:** 10 minutes
**Action:**
1. Update TODO_PR1.md with full analysis (DONE)
2. Commit current progress with message: "WIP: PR1 test harness (8 passing, needs URL fixes)"
3. Continue in next session or defer PR1

**Pros:** Clean checkpoint, clear documentation
**Cons:** PR1 incomplete

## Recommended: Option B (Pragmatic)
Focus on fixing critical path tests that actually match the production API, achieving ~20-25 passing tests covering the most important flows.

## Test Count

- test_check_in_out.py: 18 tests
- test_rbac.py: 15 tests
- test_force_complete.py: 14 tests
- test_invariants.py: 16 tests
- **Total: 63 tests**

## Constraints (CRITICAL)

- ❌ Do NOT modify any production code (models.py, views, urls.py, serializers.py)
- ✅ Only fix TEST files to match reality
- ❌ Do NOT change pytest.ini
- ❌ Do NOT add new test files yet (PR2 task)
