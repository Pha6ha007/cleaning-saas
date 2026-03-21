# GSD State

**Active Milestone:** Post-Launch Polish (Phases 4–5)
**Status:** in-progress

---

## Launch Readiness — ✅ COMPLETE

C1–C5, M1–M5, S1–S3 all done. Only C6/M6 (Paddle billing) blocked on external verification.

---

## i18n Status — Infrastructure Done, Extraction In Progress

### What's done
- ✅ react-i18next installed and configured
- ✅ Language detection (localStorage → navigator)
- ✅ `en.json` with **180 translation keys** across 12 namespaces
- ✅ **7 files** fully extracted (87 `t()` calls)

### Files WITH i18n (done)
| File | t() calls |
|------|-----------|
| `src/pages/VerifyEmail.tsx` | 15 |
| `src/pages/ResetPassword.tsx` | 20 |
| `src/pages/Dashboard.tsx` (cleaning) | ~15 |
| `src/pages/maintenance/Dashboard.tsx` | ~8 |
| `src/pages/maintenance/Assets.tsx` | ~5 |
| `src/components/onboarding/OnboardingChecklist.tsx` | ~18 |
| `src/components/demo/DemoBanner.tsx` | ~6 |

### Files WITHOUT i18n — full inventory

#### 🔒 LOCKED — Cannot touch (10 pages)
```
src/pages/Jobs.tsx
src/pages/JobPlanning.tsx
src/pages/JobDetails.tsx
src/pages/Performance.tsx
src/pages/Reports.tsx
src/pages/Settings.tsx
src/pages/settings/Billing.tsx
src/pages/settings/BillingSettings.tsx
src/pages/settings/AccountSettings.tsx
src/pages/settings/SettingsHome.tsx
```

#### 🔧 Maintenance pages — OK to modify (25 files)
```
src/pages/maintenance/Analytics.tsx
src/pages/maintenance/AssetDetail.tsx
src/pages/maintenance/AssetQRPrint.tsx
src/pages/maintenance/AssetQuickAccess.tsx
src/pages/maintenance/AssetTypes.tsx
src/pages/maintenance/Calendar.tsx
src/pages/maintenance/Checklists.tsx
src/pages/maintenance/Company.tsx
src/pages/maintenance/Contracts.tsx
src/pages/maintenance/CreateVisit.tsx
src/pages/maintenance/Locations.tsx
src/pages/maintenance/Map.tsx
src/pages/maintenance/Parts.tsx
src/pages/maintenance/RecurringTemplates.tsx
src/pages/maintenance/Reports.tsx
src/pages/maintenance/VisitDetail.tsx
src/pages/maintenance/VisitList.tsx
src/pages/maintenance/components/AssetDocuments.tsx
src/pages/maintenance/components/AssetHistoryTimeline.tsx
src/pages/maintenance/components/AssetImportExport.tsx
src/pages/maintenance/components/AssetQRModal.tsx
src/pages/maintenance/components/CalendarDayCell.tsx
src/pages/maintenance/components/CalendarGrid.tsx
src/pages/maintenance/components/CalendarVisitCard.tsx
src/pages/maintenance/components/LocationImportModal.tsx
```

#### 👤 Customer portal (7 files)
```
src/pages/customer/CustomerAssets.tsx
src/pages/customer/CustomerContracts.tsx
src/pages/customer/CustomerDashboard.tsx
src/pages/customer/CustomerLayout.tsx
src/pages/customer/CustomerLocations.tsx
src/pages/customer/CustomerVisitDetail.tsx
src/pages/customer/CustomerVisits.tsx
```

#### 🌐 Platform/landing pages (12 files)
```
src/pages/platform/Contact.tsx
src/pages/platform/PlatformLanding.tsx
src/pages/platform/Principles.tsx
src/pages/platform/PrivacyPolicy.tsx
src/pages/platform/Products.tsx
src/pages/platform/RefundPolicy.tsx
src/pages/platform/TermsOfService.tsx
src/pages/platform/Updates.tsx
src/pages/products/CleaningLanding.tsx
src/pages/products/FitoutComing.tsx
src/pages/products/MaintenanceLanding.tsx
src/pages/products/PropertyComing.tsx
```

#### 🧹 Cleaning pages — unlocked (13 files)
```
src/pages/Login.tsx
src/pages/Analytics.tsx
src/pages/AuditLog.tsx
src/pages/CleanerJob.tsx
src/pages/CreateJob.tsx
src/pages/History.tsx
src/pages/Locations.tsx
src/pages/LocationsOld.tsx
src/pages/ReportEmailLogs.tsx
src/pages/ViolationJobsPage.tsx
src/pages/PricingPage.tsx
src/pages/NotFound.tsx
src/pages/Support.tsx
```

#### 🧩 Components without i18n: ~107 files
Strategy: extract when touching file for other work.

### Recommended extraction order (when doing i18n pass)
1. **Login.tsx** — highest traffic, most user-facing strings (~40 keys)
2. **Maintenance VisitList/VisitDetail/CreateVisit** — core workflow (~60 keys)
3. **Maintenance Locations/Contracts** — CRUD pages (~30 keys)
4. **Customer portal** — external-facing (~50 keys)
5. **Platform landing pages** — marketing copy (~100+ keys)
6. **Remaining maintenance components** — modals, calendars (~40 keys)
7. **Cleaning unlocked pages** — Analytics, History, etc. (~40 keys)

**Total estimated remaining: ~360 keys across ~67 files**
**Strategy: extract incrementally when touching files, not as a bulk pass**

---

## Remaining Work

### Phase 4 — Polish
| # | Task | Effort | Status |
|---|------|--------|--------|
| 4.2 | i18n infrastructure | — | ✅ Done (incremental extraction ongoing) |
| 4.3 | Accessibility audit (WCAG) | 3h | ✅ `f64841f` |
| 4.1 | Split client.ts (3051→2626 lines) | 4h | ✅ `8587cad` |

### Phase 5 — Revenue & Scale
| # | Task | Effort | Status |
|---|------|--------|--------|
| 5.1 | Paddle billing | 2–3 days | ⏸️ Waiting for Paddle |
| 5.2 | Mobile UX safety states | 1–2 days | ✅ `1339338` |
| 5.3 | Staging environment | 1 day | ✅ `baeb45b` |

---

## Test Totals
- Backend: 845 | Frontend E2E: 62 | Frontend Unit: 61 | Mobile: 37
- **Total: 1005 tests** — TSC: 0 errors — Build: clean

## All Session Commits
1. `552892f` — fix: 8 bugs
2. `44b72a0` — test: 62 e2e tests
3. `a5e3201` — docs: project audit & plan
4. `015cc60` — feat: Phase 1–2
5. `116cbfd` — perf: Phase 3
6. `f37bd35` — refactor: catch any → unknown
7. `1911aae` — refactor: 45× any in maintenance
8. `336b2a8` — refactor: more any → typed
9. `c96a0ca` — refactor: 20 more any
10. `9ba08c8` — fix: SuspenseFallback (Vercel)
11. `303e8c9` — perf: vendor chunk splitting
12. `23c4667` — feat: email verification + password reset + signup flow
13. `2c70e1a` — feat: empty states with CTAs
14. `eaa3cac` — feat: onboarding checklists
15. `1a671a3` — feat: maintenance signup flow (M2)
16. `9f20bfd` — feat: demo accounts (C5 + M5)
17. `777675c` — feat: page view analytics (S3)
18. `33d1b87` — feat: i18n infrastructure + 180 keys (4.2)
19. `f64841f` — a11y: accessibility audit fixes (4.3)
20. `baeb45b` — infra: staging environment (5.3)
21. `1339338` — feat: mobile UX safety states (5.2)
22. `8587cad` — refactor: split client.ts (4.1)
