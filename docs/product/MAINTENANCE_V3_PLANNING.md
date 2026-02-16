# MAINTENANCE CONTEXT — V3 PLANNING

**Status:** COMPLETED
**Version:** 0.3
**Created:** 2026-02-16
**Updated:** 2026-02-16
**Authority:** Platform Strategy

---

## 1. Context

MaintainProof V2 is complete. The product now has:
- ✅ Technician management
- ✅ Analytics & Reports
- ✅ Recurring scheduling
- ✅ SLA & Priority tracking
- ✅ Contracts & Warranty
- ✅ Email notifications
- ✅ Parts tracking (Lite)
- ✅ QR codes for assets
- ✅ Checklist management
- ✅ Bulk operations
- ✅ Calendar View (V2 Stage 11)
- ✅ Calendar D&D (V2 Stage 11.1)
- ✅ Mobile PWA (V2 Stage 12)
- ✅ Asset History Timeline (V2 Stage 13)
- ✅ Automated Visit Generation (V2 Stage 14)
- ✅ Asset Documents (V2 Stage 15)
- ✅ Import/Export (V2 Stage 16)
- ✅ Dashboard Widgets (V2 Stage 17)
- ✅ Map View (V2 Stage 18)
- ✅ Full Inventory Management (V3 Stage 14)

V3 focuses on **operational efficiency** and **mobile-first experience**.

---

## 2. V3 Candidate Stages

### STAGE 11 — Calendar View ✅ COMPLETED (V2)

**Goal:** Visual scheduling interface for planning visits.

**Features:**
- ✅ Monthly/Weekly calendar view
- ✅ Drag-and-drop visit rescheduling (V2 Stage 11.1)
- ✅ Color-coded by status/priority
- ✅ Quick visit creation from calendar
- ⏸️ Technician workload visualization (deferred)

**Value:** Managers can visually plan and balance workloads.

**Implementation:** See V2 Strategy Stage 11 & 11.1

---

### STAGE 12 — Mobile PWA for Technicians ✅ COMPLETED (V2)

**Goal:** Offline-capable mobile app for field technicians.

**Features:**
- ✅ Progressive Web App (installable)
- ✅ Service Worker with Workbox
- ✅ Asset caching (JS, CSS, images)
- ✅ Install banner with cooldown
- ⏸️ Offline photo capture (deferred)
- ⏸️ GPS check-in/out (deferred)
- ⏸️ Push notifications (deferred)
- ⏸️ Offline data persistence (deferred)

**Value:** Technicians work efficiently in the field without network dependency.

**Implementation:** See V2 Strategy Stage 12

---

### STAGE 13 — Map View ✅ COMPLETED (V2 Stage 18)

**Goal:** Geographic visualization of assets and visits.

**Features:**
- ✅ Map showing asset locations
- ✅ Cluster markers for dense areas
- ✅ Filter by status/technician/date
- ✅ Click to view asset/visit details
- ✅ Color-coded markers by status
- ✅ InfoWindow with asset/visit info
- ⏸️ Route planning for technicians (deferred)

**Value:** Optimize technician routes, visualize coverage.

**Implementation:** See V2 Strategy Stage 18

---

### STAGE 14 — Full Inventory Management ✅ COMPLETED

**Goal:** Complete parts inventory with stock levels.

**Features:**
- Stock quantity tracking per part ✅
- Low stock alerts ✅
- Reorder point configuration ✅
- Stock adjustments (add/remove) ✅
- Stock adjustment history ✅
- Part usage history (via stock adjustments)

**Value:** Prevent stockouts, track inventory costs.

**Implementation:**
- Backend: Part model extended with stock_quantity, reorder_point, reorder_quantity
- Backend: StockAdjustment model for tracking all changes
- Backend: API endpoints for adjust-stock, stock-history, low-stock
- Frontend: Parts.tsx updated with stock columns, adjustment modal, history modal
- Frontend: Low stock alert banner

---

### STAGE 15 — Automated Notifications ✅ COMPLETED (V2 Stage 14)

**Goal:** Background job system for scheduled notifications.

**Features:**
- ✅ Celery/cron integration (Celery + Redis)
- ✅ Automated visit generation (daily at 6:00 AM)
- ✅ SLA warning alerts (hourly check)
- ⏸️ Daily visit reminders (morning) — deferred
- ⏸️ Weekly summary emails — deferred
- ⏸️ Notification preferences per user — deferred

**Constraints:**
- ✅ Requires background task infrastructure — implemented
- ✅ Must not spam users — max once per 12h per visit

**Value:** Proactive communication without manual triggers.

**Implementation:** See V2 Strategy Stage 14 (Automated Visit Generation)

---

### STAGE 16 — Customer Portal ✅ COMPLETED

**Goal:** Client-facing view for asset owners.

**Features:**
- ✅ Read-only asset list (scoped to customer locations)
- ✅ Visit history per asset (with filtering)
- ✅ Proof photos viewing (before/after)
- ✅ Contract status view
- ✅ Location overview with stats
- ✅ Customer dashboard with metrics
- ⏸️ Service request submission (deferred)

**Implementation:**
- Backend: `ROLE_CUSTOMER` role with `customer_locations` M2M field
- Backend: Location-scoped API endpoints (`views_customer_portal.py`)
- Backend: Customer management API for owners
- Frontend: Separate CustomerLayout with dedicated navigation
- Frontend: CustomerDashboard, CustomerAssets, CustomerVisits, CustomerContracts, CustomerLocations

**Constraints:**
- ✅ New user role implemented (ROLE_CUSTOMER)
- ✅ Scoped access via customer_locations M2M
- ✅ Read-only access enforced at API level

**Value:** Transparency for clients, reduces support requests.

**Complexity:** High (new role, security) — **COMPLETED**

---

### STAGE 17 — Billing Integration ⏸️ DEFERRED (V4)

**Goal:** Connect contracts to invoicing.

**Features:**
- Contract pricing fields
- Visit cost calculation
- Invoice generation
- Payment tracking
- Revenue reports

**Constraints:**
- Requires financial module
- Tax/currency considerations

**Value:** Complete business workflow in one platform.

**Complexity:** High

---

### STAGE 18 — Work Orders ⏸️ DEFERRED (V4)

**Goal:** Multi-visit jobs with dependencies.

**Features:**
- Work order grouping multiple visits
- Visit sequence/dependencies
- Work order status tracking
- Approval workflows

**Constraints:**
- Significant complexity
- May require workflow engine

**Value:** Handle complex maintenance projects.

**Complexity:** Very High

---

## 3. V3 Roadmap Status

| Priority | Stage | Status | Notes |
|----------|-------|--------|-------|
| 1 | **Calendar View** | ✅ Done | V2 Stage 11 & 11.1 |
| 2 | **Mobile PWA** | ✅ Done | V2 Stage 12 (basic PWA) |
| 3 | **Map View** | ✅ Done | V2 Stage 18 |
| 4 | **Full Inventory** | ✅ Done | V3 Stage 14 |
| 5 | **Automated Notifications** | ✅ Done | V2 Stage 14 (Celery) |
| 6 | **Customer Portal** | ✅ Done | V3 Stage 16 |

### Remaining V3 Work (Partial)

| Feature | Status | Notes |
|---------|--------|-------|
| PWA: Offline photo capture | ⏸️ Deferred | Requires IndexedDB |
| PWA: Push notifications | ⏸️ Deferred | Requires VAPID setup |
| PWA: GPS check-in/out | ⏸️ Deferred | |
| Map: Route planning | ⏸️ Deferred | Requires routing API |
| Calendar: Technician workload view | ⏸️ Deferred | |

### Deferred to V4

- Billing Integration (financial module)
- Work Orders (workflow engine)
- Service Request Submission (part of Customer Portal)

---

## 4. Technical Prerequisites

### For Mobile PWA:
- ✅ Service worker setup (Workbox)
- ⏸️ IndexedDB for offline storage — deferred
- ⏸️ Background sync API — deferred
- ⏸️ Push notification server (FCM/VAPID) — deferred

### For Automated Notifications:
- ✅ Celery + Redis/RabbitMQ
- ✅ Celery Beat for scheduling
- ✅ Email queue management

### For Map View:
- ✅ Google Maps API (@react-google-maps/api)
- ✅ Marker clustering (@googlemaps/markerclusterer)
- ✅ Asset location fields (via Location model lat/lng)

---

## 5. Architectural Guardrails (V3)

Same as V2:
- Preserve Platform Layer invariants
- Preserve Proof Engine integrity
- No alternative execution workflows
- Context isolation maintained

Additional for V3:
- PWA must gracefully degrade without network
- Background jobs must be idempotent
- Map features optional (work without location data)

---

## 6. Next Steps

**V3 Core stages are complete.** Remaining options:

| Option | Stage | Status | Notes |
|--------|-------|--------|-------|
| A | PWA Enhancements | ⏸️ Deferred | Offline photo, push, GPS |
| B | Map Route Planning | ⏸️ Deferred | Requires routing API |
| C | Calendar Workload | ⏸️ Deferred | Technician load visualization |
| D | Customer Portal | ✅ Done | Read-only client access |
| E | Billing Integration | ⏸️ V4 | Financial module |
| F | Work Orders | ⏸️ V4 | Workflow engine |

**V3 is now feature-complete.** Consider V4 planning for remaining items.

---

## Changelog

| Version | Date | Change |
|---------|------|--------|
| 0.1 | 2026-02-16 | Initial V3 planning document |
| 0.2 | 2026-02-16 | Marked completed stages with ✅, updated status |
| 0.3 | 2026-02-16 | Stage 16 Customer Portal completed |
