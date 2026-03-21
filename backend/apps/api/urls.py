# backend/apps/api/urls.py
from django.urls import path, include
from django.http import JsonResponse
from django.db import connection
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

from apps.marketing.views import DemoRequestCreateView, ContactMessageCreateView
from . import analytics_views
from .views_analytics_live import LiveAnalyticsView
from .views_user_prefs import NotificationPreferencesView
from .views_branches import BranchListCreateView, BranchDetailView, BranchAnalyticsView
from .views_recurring_jobs import RecurringJobListCreateView, RecurringJobDetailView
from .views_sla_policies import SLAPolicyListCreateView, SLAPolicyDetailView, EffectiveSLAPolicyView
from .views_audit_log import AuditLogView, AuditLogExportView
from .views_api_keys import ApiKeyListCreateView, ApiKeyDetailView, ApiKeyUsageView
from .views_analytics_tracking import PageViewTrackingView
from .views_demo import DemoLoginView
from . import views
from .views_jwt import JWTManagerLoginView, JWTCleanerLoginView, JWTRefreshView, JWTLogoutView

# NOTE:
# apps.api.views is a thin entry point that re-exports public API views
# from split modules:
# - views_auth.py
# - views_cleaner.py
# - views_manager_company.py
# - views_manager_jobs.py
# - views_reports.py
from apps.api import views as api_views

# 👉 ВАЖНО: импортируем из apps.locations.app.views, а НЕ из apps.locations.api.views
from apps.locations.app.views import (
    ManagerLocationsListCreateView,
    ManagerLocationDetailView,
)


def health_view(request):
    """
    Liveness probe — lightweight, no external deps.
    Used by Docker HEALTHCHECK and nginx upstream checks.
    Always returns 200 if the process is alive.
    """
    if request.method != "GET":
        from django.http import HttpResponseNotAllowed
        return HttpResponseNotAllowed(["GET"])
    return JsonResponse({"status": "ok"})


def readiness_view(request):
    """
    Readiness probe — checks DB and cache before accepting traffic.
    Returns 503 if any dependency is unhealthy.
    """
    import time
    checks = {}
    ok = True

    # Database check
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        ok = False

    # Cache check
    try:
        from django.core.cache import cache
        probe_key = "__health_probe__"
        cache.set(probe_key, "1", timeout=5)
        val = cache.get(probe_key)
        if val == "1":
            checks["cache"] = "ok"
        else:
            checks["cache"] = "error: read-back mismatch"
            ok = False
    except Exception as e:
        checks["cache"] = f"error: {e}"
        ok = False

    import django
    payload = {
        "status": "ok" if ok else "degraded",
        "checks": checks,
        "django_version": django.VERSION[:2],
    }
    status_code = 200 if ok else 503
    return JsonResponse(payload, status=status_code)


urlpatterns = [
    # =====================
    # OpenAPI Schema & Docs (M002: drf-spectacular)
    # /api/schema/         → raw OpenAPI 3.0 YAML/JSON
    # /api/docs/           → Swagger UI
    # /api/redoc/          → ReDoc UI
    # =====================
    path("schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path(
        "docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-docs-swagger",
    ),
    path(
        "redoc/",
        SpectacularRedocView.as_view(url_name="api-schema"),
        name="api-docs-redoc",
    ),

    # =====================
    # Health probes (no auth)
    # /api/health/        → liveness (process alive, no deps)
    # /api/health/ready/  → readiness (DB + cache healthy)
    # =====================
    path("health/", health_view, name="api-health"),
    path("health/ready/", readiness_view, name="api-health-ready"),

    # =====================
    # Auth
    # =====================
    path(
        "auth/login/",
        api_views.LoginView.as_view(),
        name="api-login",
    ),
    path(
        "auth/cleaner-login/",
        api_views.CleanerPinLoginView.as_view(),
        name="api-cleaner-login",
    ),
    # M003/S01: JWT login for mobile cleaner app
    path(
        "auth/cleaner/jwt/login/",
        JWTCleanerLoginView.as_view(),
        name="api-cleaner-jwt-login",
    ),
    path(
        "manager/auth/login/",
        api_views.ManagerLoginView.as_view(),
        name="api-manager-login",
    ),
    path(
        "auth/signup/",
        api_views.ManagerSignupView.as_view(),
        name="api-auth-signup",
    ),
    # M004/S02: Email verification
    path(
        "auth/verify-email/",
        api_views.EmailVerifyView.as_view(),
        name="api-auth-verify-email",
    ),

    # Resend verification email
    path(
        "auth/resend-verification/",
        api_views.ResendVerificationView.as_view(),
        name="api-auth-resend-verification",
    ),

    # Password reset
    path(
        "auth/password-reset/",
        api_views.PasswordResetRequestView.as_view(),
        name="api-auth-password-reset",
    ),
    path(
        "auth/password-reset/confirm/",
        api_views.PasswordResetConfirmView.as_view(),
        name="api-auth-password-reset-confirm",
    ),

    # Analytics tracking (no auth required)
    path(
        "analytics/page-view/",
        PageViewTrackingView.as_view(),
        name="api-analytics-page-view",
    ),

    # Demo login (no auth required)
    path(
        "auth/demo-login/",
        DemoLoginView.as_view(),
        name="api-auth-demo-login",
    ),

    # =====================
    # JWT Auth (M001-sijc46: manager portal)
    # =====================
    path(
        "manager/auth/jwt/login/",
        JWTManagerLoginView.as_view(),
        name="api-jwt-login",
    ),
    path(
        "manager/auth/jwt/refresh/",
        JWTRefreshView.as_view(),
        name="api-jwt-refresh",
    ),
    path(
        "manager/auth/jwt/logout/",
        JWTLogoutView.as_view(),
        name="api-jwt-logout",
    ),

    # =====================
    # Cleaner jobs
    # =====================
    path(
        "jobs/today/",
        api_views.TodayJobsView.as_view(),
        name="jobs-today",
    ),
    path(
        "jobs/<int:pk>/",
        api_views.JobDetailView.as_view(),
        name="job-detail",
    ),
    # Check-in / check-out
    path(
        "jobs/<int:pk>/check-in/",
        api_views.JobCheckInView.as_view(),
        name="job-check-in",
    ),
    path(
        "jobs/<int:pk>/check-out/",
        api_views.JobCheckOutView.as_view(),
        name="job-check-out",
    ),
    # Checklist
    path(
        "jobs/<int:job_id>/checklist/bulk-update/",
        api_views.ChecklistBulkUpdateView.as_view(),
        name="job-checklist-bulk-update",
    ),
    path(
        "jobs/<int:job_id>/checklist/<int:item_id>/toggle/",
        api_views.ChecklistItemToggleView.as_view(),
        name="job-checklist-toggle",
    ),
    # Photos
    path(
        "jobs/<int:pk>/photos/",
        api_views.JobPhotosView.as_view(),
        name="job-photos",
    ),
    path(
        "jobs/<int:pk>/photos/<str:photo_type>/",
        api_views.JobPhotoDeleteView.as_view(),
        name="job-photo-delete",
    ),
    # PDF report
    path(
        "jobs/<int:pk>/report/pdf/",
        api_views.JobPdfReportView.as_view(),
        name="job-pdf-report",
    ),
    # Manager: email PDF
    path(
        "manager/jobs/<int:pk>/report/email/",
        api_views.ManagerJobPdfEmailView.as_view(),
        name="manager-job-report-email",
    ),
    # Manager: email history for Job PDF
    path(
        "manager/jobs/<int:pk>/report/emails/",
        api_views.ManagerJobReportEmailLogListView.as_view(),
        name="manager-job-report-email-log-list",
    ),

    # =====================
    # Marketing
    # =====================
    path(
        "public/demo-requests/",
        DemoRequestCreateView.as_view(),
        name="public-demo-request-create",
    ),
    path(
        "public/contact-messages/",
        ContactMessageCreateView.as_view(),
        name="public-contact-message-create",
    ),

    # =====================
    # Manager
    # =====================
    # Company profile & logo
    path(
        "manager/company/",
        api_views.ManagerCompanyView.as_view(),
        name="manager-company",
    ),
    path(
        "manager/company/logo/",
        api_views.ManagerCompanyLogoUploadView.as_view(),
        name="manager-company-logo",
    ),
    # Team / Cleaners
    path(
        "manager/cleaners/",
        api_views.ManagerCleanersListCreateView.as_view(),
        name="manager-cleaners",
    ),
    path(
        "manager/cleaners/<int:pk>/",
        api_views.ManagerCleanerDetailView.as_view(),
        name="manager-cleaner-detail",
    ),
    path(
        "manager/cleaners/<int:pk>/reset-pin/",
        api_views.ManagerCleanerResetPinView.as_view(),
        name="manager-cleaner-reset-pin",
    ),
    # Meta for Create Job Drawer
    path(
        "manager/meta/",
        api_views.ManagerMetaView.as_view(),
        name="manager-meta",
    ),
    # Create job
    path(
        "manager/jobs/",
        api_views.ManagerJobsCreateView.as_view(),
        name="manager-jobs-create",
    ),
    path(
        "manager/jobs/today/",
        api_views.ManagerJobsTodayView.as_view(),
        name="manager-jobs-today",
    ),
    path(
        "manager/jobs/active/",
        api_views.ManagerJobsActiveView.as_view(),
        name="manager-jobs-active",
    ),
    path(
        "manager/jobs/<int:pk>/",
        api_views.ManagerJobDetailView.as_view(),
        name="manager-job-detail",
    ),
    path(
        "manager/jobs/<int:pk>/force-complete/",
        api_views.ManagerJobForceCompleteView.as_view(),
        name="manager-job-force-complete",
    ),
    # Jobs history
    path(
        "manager/jobs/history/",
        api_views.ManagerJobsHistoryView.as_view(),
        name="manager-jobs-history",
    ),
    # Manager performance
    path(
        "manager/performance/",
        api_views.ManagerPerformanceView.as_view(),
        name="manager-performance",
    ),
    # Jobs planning
    path(
        "manager/jobs/planning/",
        api_views.ManagerPlanningJobsView.as_view(),
        name="manager-jobs-planning",
    ),
    
    path(
        "manager/jobs/export/",
        views.ManagerJobsExportView.as_view(),
        name="manager-jobs-export",
    ),


    # =====================
    # Locations
    # =====================
    path(
        "manager/locations/",
        ManagerLocationsListCreateView.as_view(),
        name="manager-locations",
    ),
    path(
        "manager/locations/<int:pk>/",
        ManagerLocationDetailView.as_view(),
        name="manager-location-detail",
    ),

    # =====================
    # Reports
    # =====================
    path(
        "manager/reports/weekly/",
        api_views.ManagerWeeklyReportView.as_view(),
        name="manager-reports-weekly",
    ),
    path(
        "manager/reports/monthly/",
        api_views.ManagerMonthlyReportView.as_view(),
        name="manager-reports-monthly",
    ),
    path(
        "manager/reports/weekly/pdf/",
        api_views.ManagerWeeklyReportPdfView.as_view(),
        name="manager-reports-weekly-pdf",
    ),
    path(
        "manager/reports/monthly/pdf/",
        api_views.ManagerMonthlyReportPdfView.as_view(),
        name="manager-reports-monthly-pdf",
    ),
    path(
        "manager/reports/weekly/email/",
        api_views.WeeklyReportEmailView.as_view(),
        name="manager-reports-weekly-email",
    ),
    path(
        "manager/reports/monthly/email/",
        api_views.MonthlyReportEmailView.as_view(),
        name="manager-reports-monthly-email",
    ),
    path(
        "manager/reports/violations/jobs/",
        api_views.ManagerViolationJobsView.as_view(),
        name="manager-violations-jobs",
    ),
    path(
        "manager/report-emails/",
        api_views.ManagerReportEmailLogListView.as_view(),
        name="manager-report-email-logs",
    ),

    # =====================
    # Analytics
    # =====================
    path(
        "manager/analytics/summary/",
        analytics_views.analytics_summary,
        name="manager-analytics-summary",
    ),
    # M004/S03: Live KPI polling
    path(
        "analytics/live/",
        LiveAnalyticsView.as_view(),
        name="analytics-live",
    ),
    # M004/S04: User notification preferences
    path(
        "user/notification-preferences/",
        NotificationPreferencesView.as_view(),
        name="user-notification-preferences",
    ),
    # M005/S01: Branch management
    path(
        "branches/",
        BranchListCreateView.as_view(),
        name="branch-list-create",
    ),
    path(
        "branches/<int:pk>/",
        BranchDetailView.as_view(),
        name="branch-detail",
    ),
    path(
        "branches/<int:pk>/analytics/",
        BranchAnalyticsView.as_view(),
        name="branch-analytics",
    ),
    # M005/S02: Recurring job templates
    path(
        "jobs/recurring/",
        RecurringJobListCreateView.as_view(),
        name="recurring-job-list-create",
    ),
    path(
        "jobs/recurring/<int:pk>/",
        RecurringJobDetailView.as_view(),
        name="recurring-job-detail",
    ),
    # M005/S03: SLA Policies
    path(
        "sla-policies/",
        SLAPolicyListCreateView.as_view(),
        name="sla-policy-list-create",
    ),
    path(
        "sla-policies/<int:pk>/",
        SLAPolicyDetailView.as_view(),
        name="sla-policy-detail",
    ),
    path(
        "jobs/<int:job_pk>/effective-sla-policy/",
        EffectiveSLAPolicyView.as_view(),
        name="job-effective-sla-policy",
    ),
    # M005/S04: Audit Log
    path(
        "jobs/audit-log/",
        AuditLogView.as_view(),
        name="audit-log",
    ),
    path(
        "jobs/audit-log/export/",
        AuditLogExportView.as_view(),
        name="audit-log-export",
    ),
    # M006/S04: Enterprise API Keys
    path(
        "enterprise/api-keys/",
        ApiKeyListCreateView.as_view(),
        name="enterprise-api-keys",
    ),
    path(
        "enterprise/api-keys/usage/",
        ApiKeyUsageView.as_view(),
        name="enterprise-api-keys-usage",
    ),
    path(
        "enterprise/api-keys/<int:pk>/",
        ApiKeyDetailView.as_view(),
        name="enterprise-api-key-detail",
    ),
    path(  # без слэша в конце
        "manager/analytics/summary",
        analytics_views.analytics_summary,
        name="manager-analytics-summary-noslash",
    ),
    path(
        "manager/analytics/jobs-completed/",
        analytics_views.analytics_jobs_completed,
        name="manager-analytics-jobs-completed",
    ),
    path(
        "manager/analytics/jobs-completed",
        analytics_views.analytics_jobs_completed,
        name="manager-analytics-jobs-completed-noslash",
    ),
    path(
        "manager/analytics/job-duration/",
        analytics_views.analytics_job_duration,
        name="manager-analytics-job-duration",
    ),
    path(
        "manager/analytics/job-duration",
        analytics_views.analytics_job_duration,
        name="manager-analytics-job-duration-noslash",
    ),
    path(
        "manager/analytics/proof-completion/",
        analytics_views.analytics_proof_completion,
        name="manager-analytics-proof-completion",
    ),
    path(
        "manager/analytics/proof-completion",
        analytics_views.analytics_proof_completion,
        name="manager-analytics-proof-completion-noslash",
    ),
    path(
        "manager/analytics/cleaners-performance/",
        analytics_views.analytics_cleaners_performance,
        name="manager-analytics-cleaners-performance",
    ),
    path(
        "manager/analytics/cleaners-performance",
        analytics_views.analytics_cleaners_performance,
        name="manager-analytics-cleaners-performance-noslash",
    ),
    path(
        "manager/analytics/locations-performance/",
        analytics_views.analytics_locations_performance,
        name="manager-analytics-locations-performance",
    ),
    path(
        "manager/analytics/locations-performance",
        analytics_views.analytics_locations_performance,
        name="manager-analytics-locations-performance-noslash",
    ),
    path(
        "manager/analytics/sla-breakdown/",
        analytics_views.analytics_sla_breakdown,
        name="manager-analytics-sla-breakdown",
    ),
    path(
        "manager/analytics/sla-breakdown",
        analytics_views.analytics_sla_breakdown,
        name="manager-analytics-sla-breakdown-noslash",
    ),
    path(
        "manager/analytics/violations-trend/",
        analytics_views.analytics_violations_trend,
        name="manager-analytics-violations-trend",
    ),
    path(
        "manager/analytics/sla-violations-trend/",
        analytics_views.analytics_violations_trend,
        name="manager-analytics-sla-violations-trend",
    ),
    path(
        "manager/analytics/sla-violations-trend",
        analytics_views.analytics_violations_trend,
        name="manager-analytics-sla-violations-trend-noslash",
    ),


    # =====================
    # Company (Org-scope, Owner/Manager)
    # =====================
    path(
        "company/",
        api_views.CompanyView.as_view(),
        name="company-profile",
    ),
    path(
        "company/logo/",
        api_views.CompanyLogoUploadView.as_view(),
        name="company-logo",
    ),
    path(
        "company/cleaners/",
        api_views.CompanyCleanersView.as_view(),
        name="company-cleaners",
    ),
    path(
        "company/cleaners/<int:pk>/reset-access/",
        api_views.CompanyCleanerResetAccessView.as_view(),
        name="company-cleaner-reset-access",
    ),
    path(
        "company/cleaners/<int:pk>/audit-log/",
        api_views.CompanyCleanerAuditLogView.as_view(),
        name="company-cleaner-audit-log",
    ),
    # Console users (team members: owner, manager, staff)
    path(
        "company/users/",
        api_views.CompanyUsersView.as_view(),
        name="company-users",
    ),
    path(
        "company/users/<int:pk>/",
        api_views.CompanyUserDetailView.as_view(),
        name="company-user-detail",
    ),
    path(
        "company/users/<int:pk>/reset-password/",
        api_views.CompanyUserResetPasswordView.as_view(),
        name="company-user-reset-password",
    ),

    # =====================
    # Owner
    # =====================
    path(
        "owner/overview/",
        api_views.OwnerOverviewView.as_view(),
        name="owner-overview",
    ),

    # =====================
    # Maintenance Context (Assets)
    # See: docs/product/MAINTENANCE_CONTEXT_V1_SCOPE.md
    # =====================
    path(
        "manager/asset-types/",
        api_views.AssetTypeListCreateView.as_view(),
        name="manager-asset-types",
    ),
    path(
        "manager/asset-types/<int:pk>/",
        api_views.AssetTypeDetailView.as_view(),
        name="manager-asset-type-detail",
    ),
    path(
        "manager/assets/",
        api_views.AssetListCreateView.as_view(),
        name="manager-assets",
    ),
    path(
        "manager/assets/<int:pk>/",
        api_views.AssetDetailView.as_view(),
        name="manager-asset-detail",
    ),
    path(
        "manager/assets/<int:pk>/visits/",
        api_views.AssetServiceHistoryView.as_view(),
        name="manager-asset-visits",
    ),
    path(
        "manager/maintenance-categories/",
        api_views.MaintenanceCategoryListCreateView.as_view(),
        name="manager-maintenance-categories",
    ),
    path(
        "manager/maintenance-categories/<int:pk>/",
        api_views.MaintenanceCategoryDetailView.as_view(),
        name="manager-maintenance-category-detail",
    ),
    path(
        "manager/service-visits/",
        api_views.ServiceVisitsListView.as_view(),
        name="manager-service-visits",
    ),
    # Maintenance Visit PDF Report (P5)
    path(
        "maintenance/visits/<int:pk>/report/",
        api_views.ServiceVisitReportView.as_view(),
        name="maintenance-visit-report",
    ),
    # M004/S01: Bilingual Arabic/English Visit PDF Report
    path(
        "maintenance/visits/<int:pk>/report/bilingual/",
        api_views.ServiceVisitBilingualReportView.as_view(),
        name="maintenance-visit-bilingual-report",
    ),
    # Asset History PDF Report (P6)
    path(
        "maintenance/assets/<int:pk>/history/report/",
        api_views.AssetHistoryReportView.as_view(),
        name="maintenance-asset-history-report",
    ),
    # Maintenance Technicians (S2-P1)
    path(
        "maintenance/technicians/",
        api_views.MaintenanceTechniciansListView.as_view(),
        name="maintenance-technicians",
    ),

    # =====================
    # Maintenance Analytics (S2-P2)
    # =====================
    path(
        "maintenance/analytics/summary/",
        api_views.MaintenanceAnalyticsSummaryView.as_view(),
        name="maintenance-analytics-summary",
    ),
    path(
        "maintenance/analytics/visits-trend/",
        api_views.MaintenanceAnalyticsVisitsTrendView.as_view(),
        name="maintenance-analytics-visits-trend",
    ),
    path(
        "maintenance/analytics/sla-trend/",
        api_views.MaintenanceAnalyticsSlaTrendView.as_view(),
        name="maintenance-analytics-sla-trend",
    ),
    path(
        "maintenance/analytics/assets-performance/",
        api_views.MaintenanceAnalyticsAssetsPerformanceView.as_view(),
        name="maintenance-analytics-assets-performance",
    ),
    path(
        "maintenance/analytics/technicians-performance/",
        api_views.MaintenanceAnalyticsTechniciansPerformanceView.as_view(),
        name="maintenance-analytics-technicians-performance",
    ),

    # =====================
    # Maintenance Reports (S2-P3)
    # =====================
    path(
        "maintenance/reports/weekly/",
        api_views.MaintenanceWeeklyReportView.as_view(),
        name="maintenance-reports-weekly",
    ),
    path(
        "maintenance/reports/monthly/",
        api_views.MaintenanceMonthlyReportView.as_view(),
        name="maintenance-reports-monthly",
    ),
    path(
        "maintenance/reports/weekly/pdf/",
        api_views.MaintenanceWeeklyReportPdfView.as_view(),
        name="maintenance-reports-weekly-pdf",
    ),
    path(
        "maintenance/reports/monthly/pdf/",
        api_views.MaintenanceMonthlyReportPdfView.as_view(),
        name="maintenance-reports-monthly-pdf",
    ),
    path(
        "maintenance/reports/weekly/email/",
        api_views.MaintenanceWeeklyReportEmailView.as_view(),
        name="maintenance-reports-weekly-email",
    ),
    path(
        "maintenance/reports/monthly/email/",
        api_views.MaintenanceMonthlyReportEmailView.as_view(),
        name="maintenance-reports-monthly-email",
    ),

    # =====================
    # Maintenance Recurring Templates (Stage 3)
    # =====================
    path(
        "maintenance/recurring-templates/",
        api_views.RecurringTemplateListCreateView.as_view(),
        name="maintenance-recurring-templates",
    ),
    path(
        "maintenance/recurring-templates/<int:pk>/",
        api_views.RecurringTemplateDetailView.as_view(),
        name="maintenance-recurring-template-detail",
    ),
    path(
        "maintenance/recurring-templates/<int:pk>/generate/",
        api_views.RecurringTemplateGenerateView.as_view(),
        name="maintenance-recurring-template-generate",
    ),
    # Stage 5 Lite: Service Contracts
    path(
        "maintenance/contracts/",
        api_views.ServiceContractListCreateView.as_view(),
        name="maintenance-contracts",
    ),
    path(
        "maintenance/contracts/<int:pk>/",
        api_views.ServiceContractDetailView.as_view(),
        name="maintenance-contract-detail",
    ),

    # =====================
    # Stage 6: Notifications Layer
    # =====================
    path(
        "maintenance/visits/<int:pk>/notify/",
        api_views.ServiceVisitNotifyView.as_view(),
        name="maintenance-visit-notify",
    ),
    path(
        "maintenance/notifications/",
        api_views.MaintenanceNotificationLogListView.as_view(),
        name="maintenance-notifications",
    ),

    # =====================
    # Stage 7: Parts & Inventory (Lite)
    # Stage 14: Full Inventory Management
    # =====================
    path(
        "maintenance/parts/",
        api_views.PartListCreateView.as_view(),
        name="maintenance-parts",
    ),
    path(
        "maintenance/parts/low-stock/",
        api_views.PartsLowStockView.as_view(),
        name="maintenance-parts-low-stock",
    ),
    path(
        "maintenance/parts/<int:pk>/",
        api_views.PartDetailView.as_view(),
        name="maintenance-part-detail",
    ),
    path(
        "maintenance/parts/<int:pk>/adjust-stock/",
        api_views.PartStockAdjustView.as_view(),
        name="maintenance-part-adjust-stock",
    ),
    path(
        "maintenance/parts/<int:pk>/stock-history/",
        api_views.PartStockHistoryView.as_view(),
        name="maintenance-part-stock-history",
    ),
    path(
        "maintenance/visits/<int:pk>/parts/",
        api_views.VisitPartsListCreateView.as_view(),
        name="maintenance-visit-parts",
    ),
    path(
        "maintenance/visits/<int:visit_id>/parts/<int:part_id>/",
        api_views.VisitPartDeleteView.as_view(),
        name="maintenance-visit-part-delete",
    ),

    # =====================
    # Stage 9: Checklist Templates CRUD
    # =====================
    path(
        "maintenance/checklists/",
        api_views.MaintenanceChecklistTemplatesView.as_view(),
        name="maintenance-checklists",
    ),
    path(
        "maintenance/checklists/<int:pk>/",
        api_views.MaintenanceChecklistTemplateDetailView.as_view(),
        name="maintenance-checklist-detail",
    ),
    # =====================
    # Stage 10: Bulk Operations
    # =====================
    path(
        "maintenance/visits/bulk-assign/",
        api_views.BulkAssignTechnicianView.as_view(),
        name="maintenance-bulk-assign",
    ),
    path(
        "maintenance/visits/bulk-cancel/",
        api_views.BulkCancelVisitsView.as_view(),
        name="maintenance-bulk-cancel",
    ),
    # Stage 11.1: Calendar D&D Reschedule
    # ====================================
    path(
        "maintenance/visits/<int:pk>/reschedule/",
        api_views.RescheduleVisitView.as_view(),
        name="maintenance-visit-reschedule",
    ),
    # =====================
    # Stage 15: Asset Documents
    # =====================
    path(
        "maintenance/assets/<int:asset_id>/documents/",
        api_views.AssetDocumentListCreateView.as_view(),
        name="maintenance-asset-documents",
    ),
    path(
        "maintenance/documents/<int:pk>/",
        api_views.AssetDocumentDetailView.as_view(),
        name="maintenance-document-detail",
    ),
    # =====================
    # Stage 16: Import/Export
    # =====================
    path(
        "maintenance/assets/export/",
        api_views.AssetExportView.as_view(),
        name="maintenance-assets-export",
    ),
    path(
        "maintenance/assets/import/",
        api_views.AssetImportView.as_view(),
        name="maintenance-assets-import",
    ),
    path(
        "maintenance/assets/import-template/",
        api_views.AssetImportTemplateView.as_view(),
        name="maintenance-assets-import-template",
    ),

    # =====================
    # Stage 16: Customer Portal
    # =====================
    path(
        "customer/dashboard/",
        api_views.CustomerDashboardView.as_view(),
        name="customer-dashboard",
    ),
    path(
        "customer/profile/",
        api_views.CustomerProfileView.as_view(),
        name="customer-profile",
    ),
    path(
        "customer/locations/",
        api_views.CustomerLocationsView.as_view(),
        name="customer-locations",
    ),
    path(
        "customer/assets/",
        api_views.CustomerAssetsView.as_view(),
        name="customer-assets",
    ),
    path(
        "customer/assets/<int:pk>/",
        api_views.CustomerAssetDetailView.as_view(),
        name="customer-asset-detail",
    ),
    path(
        "customer/visits/",
        api_views.CustomerVisitsView.as_view(),
        name="customer-visits",
    ),
    path(
        "customer/visits/<int:pk>/",
        api_views.CustomerVisitDetailView.as_view(),
        name="customer-visit-detail",
    ),
    path(
        "customer/contracts/",
        api_views.CustomerContractsView.as_view(),
        name="customer-contracts",
    ),
    path(
        "customer/contracts/<int:pk>/",
        api_views.CustomerContractDetailView.as_view(),
        name="customer-contract-detail",
    ),

    # =====================
    # Customer Management (for Owners/Managers)
    # =====================
    path(
        "company/customers/",
        api_views.CustomerManagementListCreateView.as_view(),
        name="company-customers",
    ),
    path(
        "company/customers/<int:pk>/",
        api_views.CustomerManagementDetailView.as_view(),
        name="company-customer-detail",
    ),
    path(
        "company/customers/<int:pk>/reset-password/",
        api_views.CustomerResetPasswordView.as_view(),
        name="company-customer-reset-password",
    ),

    # =====================
    # V3 PWA Enhancement: Visit Photo Upload
    # =====================
    path(
        "maintenance/visits/<int:pk>/upload-photo/",
        api_views.VisitPhotoUploadView.as_view(),
        name="maintenance-visit-upload-photo",
    ),
    path(
        "maintenance/visits/<int:pk>/photos/<str:photo_type>/",
        api_views.VisitPhotoDeleteView.as_view(),
        name="maintenance-visit-delete-photo",
    ),

    # =====================
    # Support Chat (AI-powered documentation assistant)
    # =====================
    path("support/", include("apps.support.urls")),
]
