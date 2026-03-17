# M003: Mobile JWT, Bulk Import, Photo Watermarking & Outgoing Webhooks

## Goal

Four independent feature tracks that increase enterprise readiness:
1. Mobile cleaner app upgrades to JWT (auto-refresh, auto-logout on 401)
2. Bulk CSV/XLSX import via Django Admin for enterprise onboarding
3. Photo watermarking (timestamp + GPS + company name overlay) for PDF proof
4. Outgoing webhooks on key events for Enterprise tier integrations

## Slices

- [x] **S01: Mobile Cleaner JWT Migration** `risk:medium` `depends:[]`
- [x] **S02: Bulk Import (django-import-export)** `risk:low` `depends:[]`
- [x] **S03: Photo Watermarking** `risk:medium` `depends:[]`
- [x] **S04: Outgoing Webhooks** `risk:medium` `depends:[]`

## Slice Briefs

### S01: Mobile Cleaner JWT Migration
- Add `/api/auth/cleaner/jwt/login/` endpoint returning `access` + `refresh` tokens for ROLE_CLEANER
- Add `JWTAuthentication` alongside existing `TokenAuthentication` on all `views_cleaner.py` views (additive, no removal)
- Mobile `client.ts`: store access + refresh in AsyncStorage; auto-refresh on 401 (interceptor pattern matching manager portal's `_refreshPromise` dedup); auto-logout if refresh fails
- Remove `placeholder="cleaner@test.com"` from `LoginScreen.tsx` (replace with generic `"you@example.com"`)
- Backward compatible: backend still accepts Token auth (old app versions)

### S02: Bulk Import (django-import-export)
- Install `django-import-export==4.x`
- Create `ImportExportModelAdmin` subclasses for: `Location`, `Asset` (maintenance), `ChecklistTemplate`
- Define `Resource` classes with field mapping, company-scoped import validation (imported rows must belong to the requesting company)
- Support CSV + XLSX; dry-run preview before commit
- Admin UI only (no API endpoint)

### S03: Photo Watermarking
- `apps/jobs/watermark.py`: `generate_watermarked_photo(photo: JobPhoto) -> bytes`
  - Overlay: company name (top-left), timestamp (bottom-left), GPS coords (bottom-right)
  - Semi-transparent dark bar; white text; Pillow only; never modifies original
- Integrate into `pdf.py`'s `_build_photo_cell()`: generate watermarked version in-memory, pass to ReportLab instead of raw file
- No new model fields, no new migrations

### S04: Outgoing Webhooks
- Install `django-webhook` or implement lightweight custom webhook model
- `WebhookEndpoint` model: `company`, `url`, `secret`, `events` (M2M or JSONField), `is_active`, `plan_tier` guard (enterprise only)
- Events: `job.completed`, `sla.violated`, `proof.missing`
- Delivery: async Celery task with HMAC-SHA256 signature header (`X-Webhook-Signature`)
- Admin: manage endpoints per company; view delivery logs
- Signal/hook wiring: `job_completed` → fire webhook task

## Test Targets
- S01: ~12 tests (JWT cleaner login, refresh, auto-logout, 401 handling)
- S02: ~10 tests (import validation, company scoping, dry-run)
- S03: ~8 tests (watermark generation, font rendering, GPS overlay, no-op when missing coords)
- S04: ~12 tests (endpoint model, HMAC signing, delivery task, enterprise gate)
- **Total M003 target: ~183 tests (141 existing + 42 new)**
