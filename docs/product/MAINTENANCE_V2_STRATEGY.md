# MAINTENANCE CONTEXT — V2 STRATEGY

**Status:** IMPLEMENTED
**Version:** 3.6
**Created:** 2026-02-15
**Updated:** 2026-02-16
**Authority:** Platform Strategy

---

## Progress Summary

### V2 Stages

| Stage | Feature | Status |
|-------|---------|--------|
| 2 | Operational Expansion (Technicians, Analytics, Reports) | ✅ Done |
| 3 | Recurring Execution | ✅ Done |
| 4 | SLA & Priority Layer | ✅ Done |
| 5 | Contracts & Warranty (Lite) | ✅ Done |
| 6 | Notifications Layer | ✅ Done |
| 7 | Parts & Inventory (Lite) | ✅ Done |
| 8 | QR Codes for Assets | ✅ Done |
| 9 | Checklists Management | ✅ Done |
| 10 | Bulk Operations | ✅ Done |
| 11 | Calendar View | ✅ Done |
| 11.1 | Calendar Drag-and-Drop | ✅ Done |
| 12 | Mobile PWA | ✅ Done |
| 13 | Asset History Timeline | ✅ Done |
| 14 | Automated Visit Generation | ✅ Done |
| 15 | Asset Documents | ✅ Done |
| 16 | Import/Export | ✅ Done |
| 17 | Dashboard Widgets | ✅ Done |
| 18 | Map View | ✅ Done |

### V3 Stages

| Stage | Feature | Status |
|-------|---------|--------|
| V3-14 | Full Inventory Management (Stock Levels, Alerts) | ✅ Done |
| V3-16 | Customer Portal (Read-only Client Access) | ✅ Done |

**Total: 20 stages completed (V2: 18, V3: 2)**

### Already Included in Previous Stages

The following features were implemented as part of earlier stages:

| Feature | Included In | Notes |
|---------|-------------|-------|
| Weekly/Monthly Reports PDF | Stage 2 (Reports Expansion) | Download + Email |
| Visit PDF Report | Proof Parity (P5) | VisitDetail "Download PDF" |
| Asset History PDF | Proof Parity (P6) | AssetDetail "Export PDF" |
| Analytics Charts | Stage 2 (Analytics Parity) | Recharts: AreaChart, ComposedChart |

---

# STAGE 18 — Map View ✅ COMPLETED

**Commit:** `pending`

**Goal:** Geographic visualization of assets and visits on Google Maps.

Add:

- Map page (`/maintenance/map`)
- Location markers with lat/lng from Location model
- Click marker → InfoWindow with assets/visits
- Filter by show assets/visits
- Filter by visit status (scheduled/in_progress/completed)
- Filter by technician
- Color-coded markers (blue=scheduled, amber=in_progress, green=completed, teal=assets only)
- Auto-fit bounds to all markers
- Click-through to Asset/Visit detail pages
- Legend with status colors

Technology:

- `@react-google-maps/api` (existing)
- `@googlemaps/markerclusterer` (new)
- Uses existing `VITE_GOOGLE_MAPS_API_KEY`

Constraints:

- Requires locations with latitude/longitude set
- No route optimization (future feature)
- No real-time technician tracking

---

# STAGE V3-14 — Full Inventory Management ✅ COMPLETED

**Goal:** Extend Parts Lite (Stage 7) with complete stock management.

Add:

- Part model: stock_quantity, reorder_point, reorder_quantity fields
- Part properties: is_low_stock, stock_status (in_stock/low_stock/out_of_stock)
- StockAdjustment model: tracks all stock changes with audit trail
- API endpoints:
  - POST /api/maintenance/parts/{id}/adjust-stock/
  - GET /api/maintenance/parts/{id}/stock-history/
  - GET /api/maintenance/parts/low-stock/
- Parts.tsx UI updates:
  - Stock columns in table (Stock, Reorder Pt., Stock Status)
  - Stock status badges (green=In Stock, amber=Low Stock, red=Out of Stock)
  - Stock adjustment modal (Stock In/Out/Correction)
  - Stock history modal with audit trail
  - Low stock alert banner at top of page
  - Stock fields in create/edit form (Current Stock, Reorder Point, Reorder Qty)

Migration:
- 0010_stock_management.py

RBAC:
- Stock adjustments: owner/manager only
- View stock: owner/manager/staff

---

# STAGE V3-16 — Customer Portal ✅ COMPLETED

**Goal:** Read-only client-facing view for asset owners to track service activity.

Add:

- New user role: ROLE_CUSTOMER
- User model: customer_locations M2M field for location scoping
- Backend API (views_customer_portal.py):
  - GET /api/customer/dashboard/ — metrics
  - GET /api/customer/profile/ — user info
  - GET /api/customer/locations/ — assigned locations
  - GET /api/customer/assets/ — scoped assets list
  - GET /api/customer/assets/{id}/ — asset detail
  - GET /api/customer/visits/ — scoped visits list
  - GET /api/customer/visits/{id}/ — visit detail with proof photos
  - GET /api/customer/contracts/ — scoped contracts
  - GET /api/customer/contracts/{id}/ — contract detail
- Customer management API (for owners):
  - GET/POST /api/company/customers/ — list/create
  - GET/PATCH/DELETE /api/company/customers/{id}/ — detail/update/delete
  - POST /api/company/customers/{id}/reset-password/
- Frontend pages:
  - CustomerLayout.tsx — dedicated layout with sidebar
  - CustomerDashboard.tsx — overview with stats
  - CustomerAssets.tsx — asset grid with warranty badges
  - CustomerVisits.tsx — visit list with filters
  - CustomerVisitDetail.tsx — proof photos, checklist, timeline
  - CustomerContracts.tsx — contract list
  - CustomerLocations.tsx — location overview

Routes:
- /customer — customer portal root
- /customer/dashboard
- /customer/assets
- /customer/visits
- /customer/visits/:id
- /customer/contracts
- /customer/locations

Migration:
- 0008_customer_portal.py

RBAC:
- All customer APIs: ROLE_CUSTOMER only
- Data scoped by customer_locations M2M field
- Customer management: owner/manager only
- Customers cannot modify data (read-only access)

---

## 1. Purpose

This document defines the strategic evolution of Maintenance Context after V1 Release Lock.

Maintenance V1 is an execution verification layer.
V2 defines how Maintenance becomes a standalone operational product without breaking Platform invariants.

---

## 2. What Maintenance Is (Strategic Positioning)

Maintenance Context is:

- Asset-based service verification
- Technician-driven execution
- Proof-of-work enforcement
- Operational control tool for small-to-mid service companies

Maintenance is NOT:

- A reactive ticketing system
- A helpdesk platform
- A CMMS replacement
- A contract management suite
- An ERP system

---

## 3. Stage-Based Evolution

Maintenance evolves only through additive stages.

Each stage must:
- Preserve Platform Layer invariants
- Preserve Proof Engine integrity
- Pass full regression suite
- Update PROJECT_STATE and Release Lock documents

---

# STAGE 2 — Operational Expansion ✅ COMPLETED

**Goal:** Make Maintenance usable as daily operational tool.

### 2.1 Technician Layer

Add:

- Technician management page
- Technician performance metrics (basic counts only)
- Technician assignment view

Constraints:
- No new roles
- Technicians still use `role=cleaner`
- No workflow engine

---

### 2.2 Analytics Parity

Add:

- Maintenance-specific dashboard KPIs
- Visits completed
- Overdue visits
- SLA compliance rate
- Asset service frequency

Must reuse existing Analytics infrastructure.

No new analytics engine allowed.

---

### 2.3 Reports Expansion

Add:

- Visit summary report page
- Asset activity summary report
- Technician workload summary

PDF remains proof-based.

No financial analytics.

---

# STAGE 3 — Recurring Execution ✅ COMPLETED

**Commit:** `e39ca0c`

**Goal:** Introduce predictable maintenance cycles.

Add:

- RecurringVisitTemplate model
- Frequency rules (monthly, quarterly, yearly, custom interval)
- Batch generation via "Generate Visits" button
- GeneratedVisitLog for tracking

Constraints:

- No SLA timers yet
- No escalation workflows
- No reactive ticket creation
- No celery/cron (batch generation only)

Recurring engine generates normal Visits (Jobs with context=CONTEXT_MAINTENANCE).

---

# STAGE 4 — SLA & Priority Layer ✅ COMPLETED

**Commit:** `983649e`

Add:

- SLA deadline field on Job model
- Priority classification (Low / Medium / High)
- SLA badge system in UI
- SLA deadline countdown timer
- Priority indicator in visit list

Constraints:

- No escalation automation
- No background job engine
- No notification storm

SLA remains verification-based.

---

# STAGE 5 Lite — Contracts & Warranty ✅ COMPLETED

**Commit:** `e90ca3d`

**Note:** Implemented as "Lite" version without billing integration.

Add:

- ServiceContract model (service agreements tracking)
- Warranty fields on Asset (start_date, end_date, provider, notes, status)
- Contract-linked recurring templates
- Contracts management page
- Warranty display in Asset detail

Constraints:

- No billing integration (deferred)
- No payment provider integration
- Informational tracking only

---

# STAGE 6 — Notifications Layer ✅ COMPLETED

**Commit:** `006812e`

**Goal:** Enable proactive communication with technicians.

Add:

- MaintenanceNotificationLog model (audit trail)
- Email notification service (notifications.py)
- Manual notification via "Notify" dropdown button
- Notification types:
  - `visit_reminder` — Remind technician about upcoming visit
  - `sla_warning` — Alert about approaching SLA deadline
  - `assignment` — Notify about visit assignment
  - `completion` — Notify manager about completed visit

Constraints:

- No celery/cron (synchronous sending)
- No push notifications (email only)
- No notification preferences UI (all enabled by default)
- Uses existing Django email backend

---

# STAGE 7 — Parts & Inventory (Lite) ✅ COMPLETED

**Commit:** `23639ca`

**Goal:** Track parts/consumables used on service visits.

Add:

- Part model (company-scoped catalog)
  - name, sku, description, unit (pcs/m/kg/L/set)
  - is_active flag for soft delete
- VisitPart model (parts used on visit)
  - Links Job to Part with quantity
  - notes field for usage details
  - added_by user tracking
- Parts CRUD API endpoints
- Visit Parts API (add/remove parts from visits)
- Parts catalog page (/maintenance/parts)
- "Parts Used" section in Visit Detail page

Constraints:

- **Lite version** — no inventory/stock levels tracking
- No pricing or cost tracking
- No asset type linkage (global catalog)
- No supplier management
- Quantity tracking only (no automated reordering)

---

# STAGE 8 — QR Codes for Assets ✅ COMPLETED

**Commit:** `1690401`

**Goal:** Enable quick asset access via QR code scanning.

Add:

- QR code generation (client-side, qrcode.react)
- "QR Code" button in Asset Detail page
- AssetQRModal component (display, print, download)
- AssetQRPrint page (/maintenance/assets/:id/qr) for label printing
- AssetQuickAccess page (/maintenance/qr/:id) for technicians
  - Mobile-first standalone design
  - Asset info display
  - "Start Visit" button

Flow:
1. Manager prints QR sticker from Asset Detail
2. Sticker attached to physical asset
3. Technician scans QR with phone
4. Quick Access page opens with "Start Visit" button

Constraints:

- Frontend-only (no backend changes)
- Client-side QR generation
- No QR tracking/analytics

---

# STAGE 9 — Checklists Management ✅ COMPLETED

**Commit:** `pending`

**Goal:** Enable CRUD management of checklist templates with asset type linkage.

Add:

- Checklist Templates CRUD API (`/api/maintenance/checklists/`)
- Checklists management page (`/maintenance/checklists`)
- Checklist items editor (text, is_required, order)
- Asset Type → Default Checklist linkage
- Auto-apply checklist when selecting asset in CreateVisit
- Usage tracking (prevent deletion of in-use templates)

Flow:
1. Manager creates checklist template with items
2. Manager assigns template as default for asset type
3. When creating visit and selecting asset, checklist auto-applies
4. Technician sees checklist items during visit execution

Constraints:

- Reuses existing `ChecklistTemplate` model (context=maintenance)
- No template versioning
- No conditional items (all items always shown)
- No item dependencies

---

# STAGE 10 — Bulk Operations ✅ COMPLETED

**Commit:** `pending`

**Goal:** Enable bulk actions on multiple visits for efficient workflow management.

Add:

- Bulk Assign Technician API (`POST /api/maintenance/visits/bulk-assign/`)
- Bulk Cancel Visits API (`POST /api/maintenance/visits/bulk-cancel/`)
- Checkbox selection in visits table
- BulkActionBar component (sticky footer)
- Bulk assign modal with technician dropdown
- Bulk cancel confirmation dialog
- Partial success handling with detailed feedback

Flow:
1. Manager selects multiple visits using checkboxes
2. Bulk action bar appears at bottom of screen
3. Manager clicks "Assign Technician" or "Cancel Visits"
4. Modal/dialog confirms action
5. API processes visits, returns success/failure counts
6. UI shows toast with results

Constraints:

- Only owner/manager can perform bulk operations
- Completed/cancelled visits cannot be modified (disabled checkboxes)
- No bulk status change to "completed" (requires proof)
- No bulk delete (too destructive)

---

# STAGE 11 — Calendar View ✅ COMPLETED

**Commit:** `pending`

**Goal:** Visual scheduling interface for service visits.

Add:

- Calendar page (`/maintenance/calendar`)
- Month view with visits displayed by day
- Week view toggle
- Color-coded visit cards (status, priority, SLA)
- Click to view visit details
- Click on day to quick-create visit
- Same filters as VisitList (status, technician, asset, category)
- Calendar link in sidebar navigation
- Calendar button in VisitList header

Constraints:

- Frontend-only (uses existing API)
- Reuses existing `listVisits()` API with date filters

---

# STAGE 11.1 — Calendar Drag-and-Drop ✅ COMPLETED

**Commit:** `pending`

**Goal:** Enable rescheduling visits via drag-and-drop in calendar.

Add:

- `@dnd-kit/core` library for drag-and-drop
- Draggable visit cards (CalendarVisitCard)
- Droppable day cells (CalendarDayCell)
- DndContext wrapper in CalendarGrid
- `PATCH /api/maintenance/visits/{id}/reschedule/` endpoint
- `rescheduleVisit()` API function
- Optimistic UI with toast notifications
- Visual feedback (drag preview, drop highlight)

Constraints:

- Only scheduled/in_progress visits can be rescheduled
- Completed/cancelled visits are not draggable
- Only owner/manager can reschedule

---

# STAGE 12 — Mobile PWA ✅ COMPLETED

**Commit:** `pending`

**Goal:** Enable app installation on mobile devices for offline-capable access.

Add:

- `vite-plugin-pwa` for PWA generation
- Web App Manifest (`manifest.webmanifest`)
- Service Worker with Workbox (precaching + runtime caching)
- PWA icon (SVG, teal theme)
- Apple mobile web app meta tags
- PWA Install Banner component
- `usePWAInstall` hook for install prompt handling
- Offline asset caching (JS, CSS, images)
- API response caching (NetworkFirst strategy)

Features:

- "Add to Home Screen" prompt
- Standalone app mode (no browser chrome)
- Theme color matching MaintainProof (#2d5a5a)
- Start URL: `/maintenance/visits`
- Dismissible install banner with 7-day cooldown

Constraints:

- No push notifications yet (requires backend + VAPID setup)
- No background sync (Phase 2)
- No offline data persistence (localStorage only)

---

# STAGE 13 — Asset History Timeline ✅ COMPLETED

**Commit:** `pending`

**Goal:** Visual timeline view for asset service history with filtering.

Add:

- `AssetHistoryTimeline` component
- Visual timeline with month grouping
- Status icons with color coding (scheduled/in_progress/completed/cancelled)
- Filters: status, category, date range
- View toggle (List / Timeline) in AssetDetail
- Sticky month headers
- Hover animations and transitions
- Click to navigate to visit detail

UI Features:

- Timeline line with status dots
- Month grouping with teal headers
- Collapsible filter panel
- Active filter indicator badge
- Responsive layout

Constraints:

- Frontend-only (uses existing API)
- Reuses existing `getAssetVisits()` endpoint
- No new backend changes

---

# STAGE 14 — Automated Visit Generation ✅ COMPLETED

**Commit:** `pending`

**Goal:** Automate recurring visit generation via Celery periodic tasks.

Add:

- Celery + Redis integration for task queue
- django-celery-beat for periodic task scheduling
- `generate_recurring_visits` task (runs daily at 6:00 AM)
- `check_sla_warnings` task (runs hourly)
- Management commands for manual trigger:
  - `python manage.py generate_visits [--lookahead N] [--dry-run]`
  - `python manage.py check_sla [--dry-run]`
- `send_sla_warning()` notification function

Architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Celery Beat   │────▶│   Redis Broker  │────▶│  Celery Worker  │
│  (Scheduler)    │     │                 │     │  (Task Runner)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                               ┌─────────────────┐
                                               │     Django      │
                                               │  (DB, Email)    │
                                               └─────────────────┘
```

Beat Schedule:
- `generate-recurring-visits-daily`: Every day at 6:00 AM
- `check-sla-warnings-hourly`: Every hour at :00

Constraints:

- Requires Redis server running
- Lookahead defaults to 30 days
- SLA warnings sent max once per 12 hours per visit
- No push notifications (email only)

---

# STAGE 15 — Asset Documents ✅ COMPLETED

**Commit:** `pending`

**Goal:** Attach documents (PDFs, images, manuals) to assets.

Add:

- `AssetDocument` model with file upload
- Document types: manual, warranty, certificate, inspection, photo, other
- API endpoints:
  - `GET/POST /api/maintenance/assets/{id}/documents/`
  - `GET/PATCH/DELETE /api/maintenance/documents/{id}/`
- `AssetDocuments` component with upload dialog
- Documents section in Asset Detail page
- File size limit: 10MB
- Automatic MIME type detection

Features:

- Upload with drag-and-drop support
- Document type categorization
- Description/notes field
- File size display
- Upload timestamp and user tracking
- Download and delete actions

Constraints:

- No versioning (one file per document)
- No preview for non-image files
- Max 10MB per file
- Local storage (no S3 in V1)

---

# STAGE 16 — Import/Export ✅ COMPLETED

**Commit:** `pending`

**Goal:** Bulk import/export assets via CSV or Excel files.

Add:

- Asset Export API (`GET /api/maintenance/assets/export/?format=csv|xlsx`)
- Asset Import API (`POST /api/maintenance/assets/import/`)
- Import Template API (`GET /api/maintenance/assets/import-template/`)
- `AssetImportExport` component with:
  - Export dropdown (CSV/Excel)
  - Import dialog with file upload
  - Template download buttons
  - Import result display with error details

Features:

- Export all assets to CSV or Excel
- Import from CSV/Excel with validation
- Auto-create missing asset types during import
- Update existing assets (matched by name + location)
- Downloadable import template with example data
- Error reporting per row

Import Fields:
- Name, Serial Number, Asset Type, Location
- Description, Is Active
- Warranty Start, Warranty End, Warranty Provider, Warranty Notes

Constraints:

- Location must exist (no auto-create)
- Asset Type auto-created if not found
- Duplicate detection by name + location

---

# STAGE 17 — Dashboard Widgets ✅ COMPLETED

**Commit:** `pending`

**Goal:** Enhanced dashboard with operational insights and analytics widgets.

Add:

- SLA Compliance widget with percentage display
- Average Visit Duration widget
- Completed Visits widget with delta vs previous period
- Top Technicians panel (top 3 by completed visits)
- Assets by Type panel with progress bars
- Recent Completions table (last 5)
- Color-coded status indicators
- Deep links to filtered views

Widgets:

| Widget | Data Source | Variant |
|--------|-------------|---------|
| SLA Compliance | `getMaintenanceAnalyticsSummary()` | success/warning based on % |
| Avg Duration | `getMaintenanceAnalyticsSummary()` | blue |
| Completed | `getMaintenanceAnalyticsSummary()` | purple |
| Top Technicians | `getMaintenanceTechniciansPerformance()` | panel |
| Assets by Type | Derived from `listAssets()` | panel with progress bars |
| Recent Completions | `listVisits({status: 'completed'})` | table |

Constraints:

- Frontend-only (uses existing APIs)
- No new backend endpoints
- Reuses existing analytics infrastructure

---

## 4. Architectural Guardrails

Maintenance must never:

- Modify Platform Layer invariants
- Introduce new lifecycle states
- Replace Proof Engine
- Introduce alternative execution workflows
- Convert into ticket-driven dispatch system

---

## 5. Regression Protection

Every stage requires:

- verify_roles.sh PASS
- Context isolation validation
- Cleaning context unaffected
- Proof parity preserved
- Documentation updated

---

## 6. Definition of "Standalone Product"

Maintenance becomes standalone when:

- ✅ Has technician management
- ✅ Has analytics layer
- ✅ Has recurring scheduling
- ✅ Has SLA visibility
- ✅ Has report suite
- ✅ Has release lock document
- ✅ Has notifications layer
- ✅ Has parts tracking
- ✅ Has QR codes for assets
- ✅ Has checklist management
- ✅ Has bulk operations
- ✅ Has calendar view with D&D
- ✅ Has mobile PWA support
- ✅ Has asset history timeline
- ✅ Has automated visit generation
- ✅ Has asset document management
- ✅ Has bulk import/export
- ✅ Has enhanced dashboard widgets
- ✅ Has map view with Google Maps
- ✅ Has full inventory management (stock levels, alerts)

**MaintainProof is now a standalone product tier.**

---

## 7. Change Policy

Any Stage implementation requires:

1. Stage-specific plan document
2. Scope update
3. PROJECT_STATE update
4. Regression verification
5. Release Lock update

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-02-15 | Initial V2 Strategy |
| 2.0 | 2026-02-16 | Stages 3-6 implemented, status IMPLEMENTED |
| 2.1 | 2026-02-16 | Stage 7 Parts & Inventory (Lite) implemented |
| 2.2 | 2026-02-16 | Stage 8 QR Codes for Assets implemented |
| 2.3 | 2026-02-16 | Stage 9 Checklists Management implemented |
| 2.4 | 2026-02-16 | Stage 10 Bulk Operations implemented |
| 2.5 | 2026-02-16 | Stage 11 Calendar View implemented |
| 2.6 | 2026-02-16 | Stage 11.1 Calendar D&D reschedule implemented |
| 2.7 | 2026-02-16 | Stage 12 Mobile PWA implemented |
| 2.8 | 2026-02-16 | Stage 13 Asset History Timeline implemented |
| 2.9 | 2026-02-16 | Stage 14 Automated Visit Generation implemented |
| 3.0 | 2026-02-16 | Stage 15 Asset Documents implemented |
| 3.1 | 2026-02-16 | Stage 16 Import/Export implemented |
| 3.2 | 2026-02-16 | Stage 17 Dashboard Widgets implemented |
| 3.3 | 2026-02-16 | Clarified PDF Reports & Charts already in Stage 2/Proof Parity |
| 3.4 | 2026-02-16 | Stage 18 Map View implemented |
| 3.5 | 2026-02-16 | V3-14 Full Inventory Management implemented |
