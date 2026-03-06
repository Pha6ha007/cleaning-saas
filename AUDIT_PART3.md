# AUDIT Part 3 — MaintainProof + Mobile + API
Дата: 2026-03-05

## H. MaintainProof V1 — Proof Parity

### Models (backend/apps/maintenance/models.py)
| Model | Status | Key Lines |
|-------|--------|-----------|
| AssetType | ✅ Done | models.py:45-82 |
| Asset | ✅ Done | models.py:85-166 |
| MaintenanceCategory | ✅ Done | models.py:16-42 |
| Job.context field | ✅ Done | apps/jobs/models.py:21-66 |
| Job.asset FK | ✅ Done | apps/jobs/models.py:91-98 |

### Proof Parity Features (6/6 Complete)
| Feature | Status | Key File |
|---------|--------|----------|
| P1: Checklist Parity | ✅ Done | dubai-control/src/pages/maintenance/CreateVisit.tsx, VisitDetail.tsx:823-916 |
| P2: Photos (Evidence) | ✅ Done | dubai-control/src/components/maintenance/PhotoCapture.tsx, backend/apps/api/views_maintenance.py:5053-5343 |
| P3: Completion Enforcement | ✅ Done | dubai-control/src/contexts/maintenance/utils/completionErrors.ts |
| P4: SLA UI Display | ✅ Done | dubai-control/src/pages/maintenance/VisitDetail.tsx:159-245 (SLABadge, SLADeadlineTimer) |
| P5: Visit PDF Report | ✅ Done | backend/apps/api/views_maintenance.py:1027-1102 (ServiceVisitReportView) |
| P6: Asset History PDF | ✅ Done | backend/apps/api/views_maintenance.py:1109-1186 (AssetHistoryReportView) |

### Context Isolation
| Check | Status | Note |
|-------|--------|------|
| Job.context field explicit | ✅ Pass | CONTEXT_MAINTENANCE / CONTEXT_CLEANING |
| No new lifecycle states | ✅ Pass | Uses scheduled → in_progress → completed |
| No new roles | ✅ Pass | Reuses owner/manager/staff/cleaner |
| Platform Layer unchanged | ✅ Pass | All additive changes only |

---

## I. MaintainProof V2 — Stages

| Stage | Feature | Status | Key File |
|-------|---------|--------|----------|
| 2 | Technician Layer | ✅ Done | views_maintenance.py:1193 (MaintenanceTechniciansListView) |
| 3 | Recurring Execution | ✅ Done | models.py:325 (RecurringVisitTemplate), views_maintenance.py:2129 |
| 4 | SLA & Priority | ✅ Done | Job model fields, VisitDetail.tsx (badges & timers) |
| 5-Lite | Contracts & Warranty | ✅ Done | models.py:172 (ServiceContract), Contracts.tsx |
| 6 | Notifications Layer | ✅ Done | models.py:511 (MaintenanceNotificationLog), notifications.py |
| 7 | Parts & Inventory Lite | ✅ Done | models.py:600 (Part), models.py:761 (VisitPart), Parts.tsx |
| 8 | QR Codes for Assets | ✅ Done | AssetQRModal.tsx, AssetQRPrint.tsx, AssetQuickAccess.tsx |
| 9 | Checklist Management | ✅ Done | models.py:65 (default_checklist_template), Checklists.tsx |
| 10 | Bulk Operations | ✅ Done | views_maintenance.py:4121 (BulkAssignTechnicianView) |
| 11 | Calendar View | ✅ Done | Calendar.tsx, CalendarGrid.tsx, CalendarDayCell.tsx |
| 11.1 | Calendar Drag & Drop | ✅ Done | views_maintenance.py:4319 (RescheduleVisitView) |
| 12 | Mobile PWA | ✅ Done | PWA manifest, PhotoCapture.tsx (offline photo capture) |
| 13 | Asset History Timeline | ✅ Done | AssetHistoryTimeline.tsx, AssetDetail.tsx |
| 14 | Automated Visit Generation | ✅ Done | tasks.py (Celery: generate_recurring_visits, check_sla_warnings) |
| 14 | Full Inventory Management | ✅ Done | models.py:693 (StockAdjustment), Parts.tsx (stock tracking) |
| 15 | Asset Documents | ✅ Done | models.py:821 (AssetDocument), AssetDocuments.tsx |
| 16 | Import/Export | ✅ Done | views_maintenance.py:4675 (AssetExportView, AssetImportView) |
| 17 | Dashboard Widgets | ✅ Done | views_maintenance.py:1382 (MaintenanceAnalyticsSummaryView), Dashboard.tsx |
| 18 | Map View | ✅ Done | Map.tsx (Google Maps integration, marker clustering) |

**Summary:** 18/18 stages complete (100%)

---

## J. MaintainProof V3

| Stage | Feature | Status | Key File |
|-------|---------|--------|----------|
| 11 | Calendar View | ✅ Done (V2) | Calendar.tsx |
| 12 | Mobile PWA | ✅ Done (V2) | PWA manifest, service worker |
| 12.1 | Offline Photo Capture | ✅ Done | PhotoCapture.tsx, indexedDB.ts |
| 13 | Map View | ✅ Done (V2 S18) | Map.tsx |
| 14 | Full Inventory | ✅ Done | StockAdjustment model, stock history |
| 15 | Automated Notifications | ✅ Done (V2 S14) | Celery tasks (daily 6 AM, hourly SLA check) |
| 16 | Customer Portal | ✅ Done | CustomerDashboard, CustomerAssets, CustomerVisits, CustomerContracts |

**Note:** V3 core stages complete. Remaining enhancements (push notifications, GPS check-in/out, route planning) deferred to V4.

---

## K. Mobile Cleaner App

| Feature | Status | Key File |
|---------|--------|----------|
| LoginScreen | ✅ Works | mobile-cleaner/src/screens/LoginScreen.tsx |
| Token storage & auto-login | ✅ Works | mobile-cleaner/src/api/client.ts (AsyncStorage) |
| JobsScreen (Today) | ✅ Works | mobile-cleaner/src/screens/JobsScreen.tsx |
| Pull-to-refresh | ✅ Works | JobsScreen.tsx (RefreshControl) |
| JobDetailsScreen | ✅ Works | mobile-cleaner/src/screens/JobDetailsScreen.tsx |
| Check-in with GPS | ✅ Works | gps.ts, JobDetailsScreen.tsx |
| Check-out with GPS | ✅ Works | gps.ts, JobDetailsScreen.tsx |
| GPS enforcement | ✅ Works | Online-only, blocked offline |
| Before photo capture | ✅ Works | JobPhotosBlock.tsx, expo-image-picker |
| After photo capture | ✅ Works | Order enforced (after before) |
| Photo upload & retry | ✅ Works | POST /api/jobs/{id}/photos/, retry Alert on failure |
| Checklist display | ✅ Works | ChecklistSection.tsx |
| Checklist toggle | ✅ Works | POST /api/jobs/{id}/checklist/{itemId}/toggle/ |
| Checklist retry | ✅ Works | Inline "Tap to retry" (Phase C) |
| Timeline (check events) | ✅ Works | JobTimelineSection.tsx |
| PDF generation | ✅ Works | POST /api/jobs/{id}/report/pdf/, Sharing.shareAsync |
| PDF download/share | ✅ Works | FileSystem cache + share sheet |
| Network detection | ⚠️ Partial | Only JobDetailsScreen, not JobsScreen |
| Offline banners | ✅ Works | "You are offline" banner in JobDetails |
| Offline job cache | ❌ Missing | No cached data shown offline |
| Outbox (checklist) | ❌ Missing | Stub only, no AsyncStorage implementation |
| Outbox (photos) | ❌ Missing | Stub only, no persistence |
| Error handling | ✅ Works | Network errors clear, API errors generic |
| GPS errors | ✅ Works | Alert shown for GPS unavailable |
| Logout button | ❌ Missing | No way to sign out from app |

**Summary:** Core execution flow works. Offline resilience requires real outbox implementation.

**Critical Production Gaps:**
- ❌ Token expiry (401) not auto-redirecting to Login
- ❌ Hardcoded dev credentials in production state
- ⚠️ Dev GPS bypass active in Expo Go builds
- ❌ No offline job cache (blank screen when offline)
- ❌ JobsScreen shows misleading "Session expired" for network errors

---

## L. API Contracts vs Code

Сравнение docs/api/API_CONTRACTS.md с backend/apps/api/urls.py и backend/config/urls.py:

### Расхождения отсутствуют — все endpoints документированы

| Endpoint Group | Docs | Code | Note |
|----------------|------|------|------|
| Auth endpoints | ✅ | ✅ | /api/auth/login/, /api/auth/signup/, /api/auth/cleaner-login/ |
| Cleaner jobs | ✅ | ✅ | /api/jobs/today/, /api/jobs/{id}/, check-in/out, photos, checklist |
| Manager jobs | ✅ | ✅ | /api/manager/jobs/, planning, history, export |
| Locations | ✅ | ✅ | /api/manager/locations/ |
| Company | ✅ | ✅ | /api/company/, /api/company/cleaners/ |
| Settings | ✅ | ✅ | /api/me/, /api/settings/billing/ |
| Analytics | ✅ | ✅ | /api/manager/analytics/summary/, trends, performance |
| Reports | ✅ | ✅ | /api/manager/reports/weekly/, monthly, PDF, email |
| **Maintenance** | ✅ | ✅ | /api/manager/asset-types/, assets/, service-visits/ |
| **Maintenance Analytics** | ✅ | ✅ | /api/maintenance/analytics/summary/, visits-trend/ |
| **Maintenance Reports** | ✅ | ✅ | /api/maintenance/reports/weekly/, monthly/ |
| **Maintenance Recurring** | ✅ | ✅ | /api/maintenance/recurring-templates/, generate |
| **Maintenance Contracts** | ✅ | ✅ | /api/maintenance/contracts/ |
| **Maintenance Notifications** | ✅ | ✅ | /api/maintenance/visits/{id}/notify/ |
| **Maintenance Parts** | ✅ | ✅ | /api/maintenance/parts/, stock-history, adjust-stock |
| **Maintenance Checklists** | ✅ | ✅ | /api/maintenance/checklists/ |
| **Maintenance Bulk Ops** | ✅ | ✅ | /api/maintenance/visits/bulk-assign/, bulk-cancel/ |
| **Maintenance Documents** | ✅ | ✅ | /api/maintenance/assets/{id}/documents/ |
| **Maintenance Import/Export** | ✅ | ✅ | /api/maintenance/assets/export/, import/ |
| **Customer Portal** | ✅ | ✅ | /api/customer/dashboard/, assets/, visits/, contracts/ |
| **Customer Management** | ✅ | ✅ | /api/company/customers/ |
| Support Chat | ✅ | ✅ | /api/support/ (AI documentation assistant) |

**Итог:** API Contracts полностью соответствует коду. Новые endpoints (Stage 14-18, Customer Portal) присутствуют как в docs, так и в urls.py.

---

## Заключение

### MaintainProof
- **V1 Proof Parity:** 6/6 features complete ✅
- **V2 Stages:** 18/18 complete ✅
- **V3 Core:** Complete ✅
- **Models:** 15+ models, 10 migrations ✅
- **API Endpoints:** 40+ views ✅
- **Frontend Pages:** 27+ pages ✅

### Mobile App
- **Core Flow:** Login → Jobs → Details → Check-in → Photos → Checklist → Check-out → PDF ✅
- **Offline Support:** Partial (detection works, cache missing) ⚠️
- **Production Gaps:** 7 issues identified (token expiry, dev creds, offline cache, outbox stub)

### API Contracts
- **Compliance:** 100% — all endpoints documented and implemented ✅
- **Maintenance APIs:** Fully documented with 40+ new endpoints ✅

### Regression Safety
- **Platform Layer:** Unchanged ✅
- **Cleaning Context:** Isolated and unaffected ✅
- **RBAC Matrix:** Preserved ✅
- **Lifecycle:** No new states ✅
