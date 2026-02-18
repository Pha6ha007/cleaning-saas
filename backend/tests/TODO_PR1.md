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

## ❌ Remaining Issues

### 1. User.objects.create_user calls in tests

Need to fix in these files:
- `tests/test_check_in_out.py:54` - other_cleaner creation
- `tests/test_check_in_out.py:253` - other_cleaner creation
- `tests/test_invariants.py:255` - test user creation
- `tests/test_rbac.py:201` - other_cleaner creation

**Fix pattern:**
```python
# Wrong:
User.objects.create_user(
    username="+971502222222",
    phone="+971502222222",
    password="testpass123!",
    role=User.ROLE_STAFF,
    company=company,
    full_name="Other Cleaner"
)

# Correct:
User.objects.create_user(
    phone="+971502222222",
    password="testpass123!",
    role=User.ROLE_STAFF,
    company=company,
    full_name="Other Cleaner"
)
```

### 2. API Endpoint URLs

Need to verify actual endpoint paths by checking `urls.py`:
- Check-in endpoint: `/api/cleaner/jobs/<id>/check-in/`
- Check-out endpoint: `/api/cleaner/jobs/<id>/check-out/`
- Force-complete endpoint: `/api/jobs/<id>/force-complete/`
- Photo upload endpoint: `/api/cleaner/jobs/<id>/upload-photo/`
- Jobs list endpoints: `/api/jobs/`, `/api/cleaner/jobs/`

**Action:** Grep urls.py files to find correct paths and update tests.

### 3. Model Field Names

Need to verify actual field names by checking models:
- Job model fields (verify verification_override, force_complete_reason fields exist)
- JobPhoto model fields
- JobCheckEvent model fields

### 4. Import Fixes

Some tests may need additional import fixes for:
- File model (for photo tests)
- JobCheckEvent model

### 5. Test Logic Adjustments

Some tests may need logic adjustments based on actual business rules:
- Photo upload constraints (before → after order)
- Force-complete validation (minimum reason length, allowed statuses)
- Check-in/check-out location validation (500m radius)
- RBAC permissions (actual endpoint access control)

## Next Steps

1. Run `pytest tests/ -v` to collect all errors
2. Fix User.objects.create_user calls (remove username parameter)
3. Verify API endpoint URLs from urls.py
4. Fix any field name mismatches
5. Adjust test assertions to match actual behavior
6. Run tests iteratively until all 63 pass
7. Verify no production code was modified: `git diff --name-only`
8. Update commit message and merge to main

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
