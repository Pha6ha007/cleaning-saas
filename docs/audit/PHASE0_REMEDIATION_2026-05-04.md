# Phase 0 Remediation Summary — 2026-05-04

**Source audit:** `docs/audit/AUDIT_REPORT_AND_LAUNCH_PLAN.md`  
**Ticket set:** `docs/tickets/TICKET-001-bandit-config-and-security-ci.md` and siblings from `docs/tickets/README.md`  
**Purpose:** Durable record of what was fixed, what was verified, and what still remains so future agents do not need to re-audit Phase 0 from scratch.

---

## Verdict

Phase 0 is functionally complete, and the post-remediation CI stabilization work is complete.

Closed in this remediation pass:
- ✅ TICKET-001 — username enumeration in legacy login
- ✅ TICKET-002 — login rate limiting
- ✅ TICKET-003 — global upload size limits
- ✅ TICKET-004 — security CI wiring + `.bandit`
- ✅ TICKET-005 — frontend production env / unsafe fallback cleanup

Remaining non-blocking follow-up:
- ⚠️ Local Bandit execution under **Python 3.14** is unreliable due to Bandit 1.8.0 internal AST errors (`ast.Num`). GitHub Actions uses **Python 3.11**, so CI-path remains valid. Treat this as a tooling/runtime follow-up, not an unresolved Phase 0 product/security issue.

---

## What changed

### TICKET-001 — Username enumeration

**Problem**  
Different responses allowed an attacker to distinguish unknown users from known users with wrong passwords.

**Files changed**
- `backend/apps/api/views_auth.py`
- `backend/tests/test_legacy_login_security.py`

**Fix applied**
- Unified failure responses in remaining legacy auth flows:
  - `ManagerLoginView`
  - `CleanerPinLoginView`
- Added security marker coverage for the new regression tests.

**Expected behavior now**
- Unknown user and wrong password/PIN return indistinguishable failure responses within each login flow.

---

### TICKET-002 — Login rate limiting

**Problem**  
Login endpoints needed to enforce the `auth_login` throttle scope rather than depending on looser/default anonymous throttling.

**Files involved / confirmed**
- `backend/apps/api/views_auth.py`
- `backend/tests/test_login_rate_limiting.py`

**Status found during remediation**
- `ScopedRateThrottle` + `throttle_scope = "auth_login"` was already present on the legacy login views.
- Security marker was added so the regression tests are included in security CI.

**Expected behavior now**
- Login endpoints throttle at the intended `auth_login` rate.

---

### TICKET-003 — Global upload size limits

**Problem**  
The backend needed global request/file ceilings to avoid oversized upload abuse and to align Django with nginx.

**Files involved / confirmed**
- `backend/config/settings.py`
- `backend/tests/test_upload_limits.py`

**Status found during remediation**
- Settings were already present:
  - `FILE_UPLOAD_MAX_MEMORY_SIZE`
  - `DATA_UPLOAD_MAX_MEMORY_SIZE`
  - `DATA_UPLOAD_MAX_NUMBER_FIELDS`
  - `DATA_UPLOAD_MAX_NUMBER_FILES`
- Security marker was added so the tests are included in security CI.

**Expected behavior now**
- Django enforces the configured body/file ceilings consistently.

---

### TICKET-004 — Security CI and Bandit wiring

**Problem**  
Security CI was effectively a placeholder: missing `.bandit`, placeholder-only test path, and no security marker flow.

**Files changed**
- `backend/.bandit`
- `.github/workflows/security-checks.yml`
- `backend/tests/test_jwt_auth.py`
- `backend/tests/test_s01_m003_cleaner_jwt.py`
- `backend/tests/test_s02_jwt_migration.py`
- `backend/tests/test_s03_paddle_webhook.py`
- `backend/tests/test_s04_m006_api_keys.py`
- `backend/tests/test_legacy_login_security.py`
- `backend/tests/test_login_rate_limiting.py`
- `backend/tests/test_upload_limits.py`
- `backend/tests/security/test_placeholder.py` (deleted)

**Fix applied**
- Added `backend/.bandit` config.
- Switched security workflow from `pytest tests/security/` to `pytest tests/ -m security`.
- Added `DEBUG: "True"` to the security workflow env.
- Added `pytestmark = pytest.mark.security` to the relevant modules.
- Removed placeholder test file.

**Expected behavior now**
- Security CI runs the real marked security subset instead of a placeholder directory.
- Bandit config path exists and is wired.

**Important note**
- Local Bandit on Python 3.14 reports internal exceptions and skips files.
- CI runner definition in `.github/workflows/security-checks.yml` pins Python 3.11, which avoids this local-runtime mismatch.

---

### TICKET-005 — Frontend production env / unsafe fallback cleanup

**Problem**  
Frontend code used dangerous silent fallbacks:
- hardcoded dev credentials
- direct production fallback to localhost API URLs

**Files changed**
- `dubai-control/src/lib/env.ts` (new)
- `dubai-control/src/api/client.ts`
- `dubai-control/src/api/core.ts`
- `dubai-control/src/api/support.ts`
- `dubai-control/src/hooks/usePageTracking.ts`
- `dubai-control/src/main.tsx`
- `dubai-control/src/pages/Login.tsx`
- `dubai-control/src/pages/ResetPassword.tsx`
- `dubai-control/src/pages/VerifyEmail.tsx`
- `dubai-control/src/components/demo/DemoLoginButton.tsx`
- `dubai-control/src/pages/platform/Contact.tsx`
- `dubai-control/src/pages/Settings.tsx`
- `dubai-control/src/pages/Reports.tsx`
- `dubai-control/src/marketing/cleanproof/CleanProofDemoRequest.tsx`
- `dubai-control/src/marketing/cleanproof/CleanProofContact.tsx`

**Fix applied**
- Added a single env helper: `src/lib/env.ts`.
- `API_BASE_URL` now:
  - uses `VITE_API_BASE_URL` when set
  - falls back to localhost only in `DEV`
  - throws in production builds if missing
- Removed hardcoded fallback credentials (`manager@test.com`, `Test1234!`).
- Dev auto-login now works only when explicit dev env vars are provided.
- Replaced scattered direct localhost fallbacks with the shared helper.

**Expected behavior now**
- Production builds do not silently point to localhost.
- Production bundles do not ship fallback test credentials.
- Local dev still works when env is intentionally configured.

---

## Verification evidence

### Security marker subset

Command:
```bash
cd backend
DEBUG=True PYTHONPATH=. venv/bin/python -m pytest tests/ -m security -q --tb=line
```

Observed result:
- `103 passed, 770 deselected`

Meaning:
- Marker-based security CI selection is working.
- Real security tests are being exercised instead of placeholder coverage.

---

### TICKET-001/002/003 focused verification

Command:
```bash
cd backend
DEBUG=True PYTHONPATH=. venv/bin/python -m pytest \
  tests/test_legacy_login_security.py \
  tests/test_login_rate_limiting.py \
  tests/test_upload_limits.py \
  -q --tb=line
```

Observed result:
- `13 passed`

Meaning:
- Username enumeration regression tests pass.
- Login throttling regression tests pass.
- Upload limit regression tests pass.

---

### Frontend production build

Command:
```bash
cd dubai-control
npm run build
```

Observed result:
- `vite build` completed successfully
- production bundle emitted successfully

Meaning:
- Env helper refactor and fallback cleanup did not break the manager portal build.

---

### Bandit local note

Command used locally:
```bash
cd backend
venv/bin/python -m pip install bandit==1.8.0
venv/bin/python -m bandit -c .bandit -r apps/ --severity-level medium
```

Observed result:
- Bandit starts and reads `.bandit`
- but on Python 3.14 it throws internal `ast.Num` errors and skips many files

Meaning:
- `.bandit` wiring is in place
- local Bandit results on Python 3.14 are not trustworthy
- GitHub Actions Python 3.11 remains the canonical verification path for this tool

---

## Files modified in this remediation pass

### Backend / CI
- `.github/workflows/security-checks.yml`
- `backend/.bandit`
- `backend/apps/api/views_auth.py`
- `backend/tests/test_jwt_auth.py`
- `backend/tests/test_legacy_login_security.py`
- `backend/tests/test_login_rate_limiting.py`
- `backend/tests/test_s01_m003_cleaner_jwt.py`
- `backend/tests/test_s02_jwt_migration.py`
- `backend/tests/test_s03_paddle_webhook.py`
- `backend/tests/test_s04_m006_api_keys.py`
- `backend/tests/test_upload_limits.py`
- `backend/tests/security/test_placeholder.py` (removed)

### Frontend
- `dubai-control/src/lib/env.ts`
- `dubai-control/src/api/client.ts`
- `dubai-control/src/api/core.ts`
- `dubai-control/src/api/support.ts`
- `dubai-control/src/components/demo/DemoLoginButton.tsx`
- `dubai-control/src/hooks/usePageTracking.ts`
- `dubai-control/src/main.tsx`
- `dubai-control/src/marketing/cleanproof/CleanProofContact.tsx`
- `dubai-control/src/marketing/cleanproof/CleanProofDemoRequest.tsx`
- `dubai-control/src/pages/Login.tsx`
- `dubai-control/src/pages/Reports.tsx`
- `dubai-control/src/pages/ResetPassword.tsx`
- `dubai-control/src/pages/Settings.tsx`
- `dubai-control/src/pages/VerifyEmail.tsx`
- `dubai-control/src/pages/platform/Contact.tsx`

---

## CI stabilization follow-up — 2026-05-06

After the Phase 0 remediation changes were pushed, the main `CI` workflow still exposed follow-up failures. Those failures are now fixed and should be treated as part of the completed remediation trail rather than as open audit work.

### Follow-up failures that were closed

**Backend CI contract issues**
- `manage.py migrate --check` was invalid for a fresh CI sqlite database and caused false failures.
- The backend workflow depended on `pytest-cov` and `pytest-django` behavior without pinning both plugins in `backend/requirements.txt`.
- Backend pytest invocation was missing an explicit module path, which caused `ImportError: No module named 'config'` on GitHub Actions.

**Frontend runtime/build issues**
- `dubai-control/src/api/client.ts` consumed `API_BASE_URL` from `src/api/core.ts` without a matching re-export.
- `dubai-control/src/main.tsx` had lost the `App` bootstrap import.
- API base URL validation occurred at import time, which could blank public pages before request-time code ran.

**Frontend bundle gate issue**
- Maintenance code was being forced into a single mega-chunk.
- `xlsx` was imported eagerly from shared utility files, so spreadsheet code inflated maintenance bundles even when users were not importing/exporting Excel data.

### Additional files changed in the stabilization pass

**Workflow / backend contract**
- `.github/workflows/ci.yml`
- `backend/requirements.txt`

**Frontend runtime / env contract**
- `dubai-control/src/lib/env.ts`
- `dubai-control/src/api/client.ts`
- `dubai-control/src/api/core.ts`
- `dubai-control/src/api/support.ts`
- `dubai-control/src/hooks/usePageTracking.ts`
- `dubai-control/src/main.tsx`

**Frontend bundle split / spreadsheet loading**
- `dubai-control/src/lib/csv.ts`
- `dubai-control/src/lib/excel-export.ts`
- `dubai-control/vite.config.ts`

### Stabilization fixes applied

**Backend CI**
- Replaced `manage.py migrate --check` with the correct CI sequence:
  - `manage.py makemigrations --check --dry-run`
  - `manage.py migrate --noinput`
- Added missing backend test dependencies:
  - `pytest-cov`
  - `pytest-django`
- Switched backend test steps to `python -m pytest`
- Added `PYTHONPATH: .` to backend pytest steps so the `config` package resolves reliably in Actions.

**Frontend runtime**
- Restored the missing `App` import in `src/main.tsx`
- Re-exported `API_BASE_URL` from `src/api/core.ts` to match consumers
- Moved API base URL validation to request time instead of module-import time
- Kept analytics fire-and-forget so analytics failures cannot blank the app shell

**Frontend bundle/root-cause fix**
- Removed eager `xlsx` imports from:
  - `src/lib/csv.ts`
  - `src/lib/excel-export.ts`
- Replaced them with cached lazy `import("xlsx")`
- Reworked Vite manual chunking so maintenance pages split by route/page instead of one mega maintenance bundle
- Kept shared maintenance code in a smaller shared chunk and spreadsheet code in a dedicated vendor chunk

### Verification evidence for the stabilization pass

**Backend JWT regression after pytest wiring**
```bash
cd backend
DJANGO_SETTINGS_MODULE=config.settings SECRET_KEY=ci REDIS_URL=redis://localhost:6379/0 DEBUG=True CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 venv/bin/python -m pytest tests/test_jwt_auth.py -q --tb=short
```
Observed result:
- `19 passed`

**Coverage/plugin path verification**
```bash
cd backend
DEBUG=True PYTHONPATH=. venv/bin/python -m pytest tests/test_legacy_login_security.py --cov=apps --cov-report=term -q
```
Observed result:
- test passes
- `--cov` options are recognized

**Frontend bundle verification after lazy spreadsheet loading + chunk split**
```bash
cd dubai-control
npm run build
```
Observed result:
- build passes
- maintenance no longer emits a 1.6 MB mega-chunk
- maintenance pages are split into route-level chunks
- maintenance chunks fall below the CI fail threshold

**GitHub Actions final result**
- `Backend Tests (Python 3.12)` ✅
- `Frontend Build` ✅
- `Frontend E2E (Playwright)` ✅
- `Mobile Jest Tests` ✅
- `All Checks Passed` ✅

### Durable conclusion

Future agents should treat both Phase 0 remediation and the post-remediation CI stabilization as complete. If the same failures reappear, check for workflow drift or dependency/plugin removal first; do **not** restart the original Phase 0 audit from scratch.

---

## What remains after Phase 0

These are **not** unresolved Phase 0 items, but the next likely follow-ups:
- Decide whether to document or fix the local Bandit/Python 3.14 incompatibility as a tooling ticket.
- Move to the next audit phase from `docs/tickets/README.md`:
  - README security claims cleanup / truth alignment
  - Sentry coverage follow-ups
  - magic-bytes MIME validation
  - ClamAV decision / implementation if still desired

---

## Re-check policy for future agents

If a future agent needs to know whether Phase 0 was done, use this file as the default source of truth.

Only re-run checks if:
- one of the files listed above changed again,
- CI behavior regressed,
- or Python / dependency upgrades changed the tool/runtime assumptions.

Otherwise, do **not** repeat the original Phase 0 audit from scratch.
