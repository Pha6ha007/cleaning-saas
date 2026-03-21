// dubai-control/src/pages/maintenance/Dashboard.tsx
// Maintenance Dashboard with 4 summary widgets
// Uses ONLY existing endpoints - no new backend required

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { format, addDays, subDays, startOfMonth, subMonths } from "date-fns";
import {
  Calendar,
  CalendarClock,
  AlertTriangle,
  Wrench,
  ChevronRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Users,
  PieChart,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { EmptyState } from "@/components/empty/EmptyState";
import { useTranslation } from "react-i18next";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import {
  listVisits,
  listAssets,
  getMaintenanceAnalyticsSummary,
  getMaintenanceTechniciansPerformance,
  maintenanceKeys,
  type ServiceVisit,
} from "@/api/maintenance";

// ============================================================================
// Constants
// ============================================================================

// Only these statuses are displayed/counted per MAINTENANCE_CONTEXT_V1_SCOPE
const VALID_STATUSES = ["scheduled", "in_progress", "completed"] as const;

// Filter out cancelled visits (they should not be displayed or counted)
function filterValidVisits(visits: ServiceVisit[]): ServiceVisit[] {
  return visits.filter((v) => (VALID_STATUSES as readonly string[]).includes(v.status));
}

// ============================================================================
// RBAC
// ============================================================================

function canAccessDashboard(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// ============================================================================
// Widget Component
// ============================================================================

interface WidgetProps {
  title: string;
  icon: React.ReactNode;
  value: number | string;
  subtitle?: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  linkTo?: string;
  linkLabel?: string;
  variant?: "default" | "warning" | "success" | "blue" | "purple" | "teal";
}

function Widget({
  title,
  icon,
  value,
  subtitle,
  loading,
  error,
  onRetry,
  linkTo,
  linkLabel = "View all",
  variant = "default",
}: WidgetProps) {
  const variantClasses = {
    default: "border-border bg-card",
    warning: "border-amber-200 bg-amber-50/50",
    success: "border-emerald-200 bg-emerald-50/50",
    blue: "border-slate-200 bg-slate-50/50",
    purple: "border-violet-200 bg-violet-50/40",
    teal: "border-cyan-200 bg-cyan-50/40",
  };

  const iconBgClasses = {
    default: "bg-muted/50",
    warning: "bg-amber-100/80",
    success: "bg-emerald-100/80",
    blue: "bg-slate-100/80",
    purple: "bg-violet-100/70",
    teal: "bg-cyan-100/70",
  };

  const iconClasses = {
    default: "text-muted-foreground",
    warning: "text-amber-600/80",
    success: "text-emerald-600/80",
    blue: "text-slate-600",
    purple: "text-violet-500/80",
    teal: "text-cyan-600/80",
  };

  const valueClasses = {
    default: "text-foreground",
    warning: "text-amber-900/80",
    success: "text-emerald-900/80",
    blue: "text-slate-700",
    purple: "text-violet-900/80",
    teal: "text-cyan-900/80",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${variantClasses[variant]}`}
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${iconBgClasses[variant]} ${iconClasses[variant]}`}>
          {icon}
        </div>
        {linkTo && (
          <Link
            to={linkTo}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {linkLabel}
            <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">Failed to load</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onRetry}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : (
          <>
            <p className={`text-3xl font-semibold tracking-tight ${valueClasses[variant]}`}>
              {value}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {subtitle}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Dashboard Component
// ============================================================================

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const user = useUserRole();
  const hasAccess = canAccessDashboard(user.role);

  // Date calculations
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const sevenDaysAhead = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  // -------------------------------------------------------------------------
  // 1. Visits Today
  // -------------------------------------------------------------------------
  const {
    data: todayVisits = [],
    isLoading: todayLoading,
    isError: todayError,
    refetch: refetchToday,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({ date_from: today, date_to: today }),
    queryFn: () => listVisits({ date_from: today, date_to: today }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 2. Upcoming Visits (next 7 days, excluding today)
  // -------------------------------------------------------------------------
  const {
    data: upcomingVisits = [],
    isLoading: upcomingLoading,
    isError: upcomingError,
    refetch: refetchUpcoming,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({
      date_from: tomorrow,
      date_to: sevenDaysAhead,
    }),
    queryFn: () =>
      listVisits({ date_from: tomorrow, date_to: sevenDaysAhead }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 3. Overdue Visits (scheduled status + date before today)
  // -------------------------------------------------------------------------
  const {
    data: overdueVisits = [],
    isLoading: overdueLoading,
    isError: overdueError,
    refetch: refetchOverdue,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({
      status: "scheduled",
      date_to: yesterday,
    }),
    queryFn: () => listVisits({ status: "scheduled", date_to: yesterday }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 4. Asset Summary (distinct assets serviced this month)
  // -------------------------------------------------------------------------
  const {
    data: monthVisits = [],
    isLoading: monthLoading,
    isError: monthError,
    refetch: refetchMonth,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({
      date_from: monthStart,
      date_to: today,
    }),
    queryFn: () => listVisits({ date_from: monthStart, date_to: today }),
    enabled: hasAccess,
  });

  // Get total assets count for comparison
  const {
    data: allAssets = [],
    isLoading: assetsLoading,
    isError: assetsError,
    refetch: refetchAssets,
  } = useQuery({
    queryKey: maintenanceKeys.assets.list({ is_active: true }),
    queryFn: () => listAssets({ is_active: true }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 5. Analytics Summary (SLA Compliance)
  // -------------------------------------------------------------------------
  const thirtyDaysAgo = format(subMonths(new Date(), 1), "yyyy-MM-dd");
  const {
    data: analyticsSummary,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ["maintenance", "analytics", "summary", thirtyDaysAgo, today],
    queryFn: () => getMaintenanceAnalyticsSummary({ date_from: thirtyDaysAgo, date_to: today }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 6. Technician Performance
  // -------------------------------------------------------------------------
  const {
    data: technicianPerformance = [],
    isLoading: techLoading,
    isError: techError,
    refetch: refetchTech,
  } = useQuery({
    queryKey: ["maintenance", "analytics", "technicians", monthStart, today],
    queryFn: () => getMaintenanceTechniciansPerformance({ date_from: monthStart, date_to: today }),
    enabled: hasAccess,
  });

  // -------------------------------------------------------------------------
  // 7. Recent Completed Visits
  // -------------------------------------------------------------------------
  const {
    data: recentCompleted = [],
    isLoading: recentLoading,
    isError: recentError,
    refetch: refetchRecent,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list({ status: "completed", date_from: thirtyDaysAgo }),
    queryFn: () => listVisits({ status: "completed", date_from: thirtyDaysAgo, date_to: today }),
    enabled: hasAccess,
  });

  // Filter out cancelled visits from all counts
  const validTodayVisits = useMemo(() => filterValidVisits(todayVisits), [todayVisits]);
  const validUpcomingVisits = useMemo(() => filterValidVisits(upcomingVisits), [upcomingVisits]);
  const validMonthVisits = useMemo(() => filterValidVisits(monthVisits), [monthVisits]);
  // Note: overdueVisits already filtered by status=scheduled in query

  // Calculate distinct assets serviced this month (excluding cancelled)
  const assetsServiced = useMemo(() => {
    const assetIds = new Set<number>();
    validMonthVisits.forEach((visit) => {
      if (visit.asset?.id) {
        assetIds.add(visit.asset.id);
      }
    });
    return assetIds.size;
  }, [validMonthVisits]);

  // Calculate SLA compliance percentage
  const slaCompliancePercent = useMemo(() => {
    if (!analyticsSummary) return 0;
    return Math.round(analyticsSummary.sla_compliance_rate * 100);
  }, [analyticsSummary]);

  // Calculate assets by type
  const assetsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    allAssets.forEach((asset) => {
      const typeName = asset.asset_type?.name || "Uncategorized";
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  }, [allAssets]);

  // Get top technicians by workload
  const topTechnicians = useMemo(() => {
    return technicianPerformance.slice(0, 3);
  }, [technicianPerformance]);

  // Recent completed visits (last 5)
  const recentCompletedVisits = useMemo(() => {
    return recentCompleted
      .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
      .slice(0, 5);
  }, [recentCompleted]);

  // -------------------------------------------------------------------------
  // Deep link URLs with query params
  // -------------------------------------------------------------------------
  const todayLink = `/maintenance/visits?date_from=${today}&date_to=${today}`;
  const upcomingLink = `/maintenance/visits?date_from=${tomorrow}&date_to=${sevenDaysAhead}`;
  const overdueLink = `/maintenance/visits?status=scheduled&date_to=${yesterday}`;
  const assetsLink = `/maintenance/assets`;

  // -------------------------------------------------------------------------
  // Access restricted
  // -------------------------------------------------------------------------
  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view the maintenance dashboard.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <MaintenanceLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Maintenance Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Overview of service visits and asset maintenance
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            onClick={() => navigate("/maintenance/visits/new")}
          >
            Create Visit
          </Button>
        </div>

        {/* Widgets Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Visits Today */}
          <Widget
            title={t("maintenance.dashboard.visitsToday")}
            icon={<Calendar className="h-5 w-5" />}
            value={validTodayVisits.length}
            subtitle={validTodayVisits.length === 0 ? t("maintenance.dashboard.noVisitsScheduled") : undefined}
            loading={todayLoading}
            error={todayError}
            onRetry={() => refetchToday()}
            linkTo={todayLink}
            variant="blue"
          />

          {/* 2. Upcoming Visits */}
          <Widget
            title="Upcoming (7 days)"
            icon={<CalendarClock className="h-5 w-5" />}
            value={validUpcomingVisits.length}
            subtitle={validUpcomingVisits.length === 0 ? "Calendar clear" : undefined}
            loading={upcomingLoading}
            error={upcomingError}
            onRetry={() => refetchUpcoming()}
            linkTo={upcomingLink}
            variant="purple"
          />

          {/* 3. Overdue Visits */}
          <Widget
            title="Overdue Visits"
            icon={<AlertTriangle className="h-5 w-5" />}
            value={overdueVisits.length}
            subtitle={
              overdueVisits.length === 0
                ? "All visits on track"
                : "Require attention"
            }
            loading={overdueLoading}
            error={overdueError}
            onRetry={() => refetchOverdue()}
            linkTo={overdueLink}
            variant={overdueVisits.length > 0 ? "warning" : "success"}
          />

          {/* 4. Asset Summary */}
          <Widget
            title="Assets Serviced"
            icon={<Wrench className="h-5 w-5" />}
            value={`${assetsServiced}/${allAssets.length}`}
            subtitle="This month"
            loading={monthLoading || assetsLoading}
            error={monthError || assetsError}
            onRetry={() => {
              refetchMonth();
              refetchAssets();
            }}
            linkTo={assetsLink}
            linkLabel="View assets"
            variant={
              assetsServiced > 0 && assetsServiced === allAssets.length
                ? "success"
                : "teal"
            }
          />
        </div>

        {/* Stage 17: Additional Dashboard Widgets */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 5. SLA Compliance */}
          <Widget
            title="SLA Compliance"
            icon={<CheckCircle2 className="h-5 w-5" />}
            value={`${slaCompliancePercent}%`}
            subtitle="Last 30 days"
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={() => refetchAnalytics()}
            linkTo="/maintenance/analytics"
            linkLabel="Analytics"
            variant={slaCompliancePercent >= 90 ? "success" : slaCompliancePercent >= 70 ? "warning" : "default"}
          />

          {/* 6. Avg Visit Duration */}
          <Widget
            title="Avg Duration"
            icon={<Clock className="h-5 w-5" />}
            value={analyticsSummary ? `${analyticsSummary.avg_visit_duration_hours.toFixed(1)}h` : "—"}
            subtitle="Per visit (30 days)"
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={() => refetchAnalytics()}
            variant="blue"
          />

          {/* 7. Completed This Month */}
          <Widget
            title="Completed"
            icon={<TrendingUp className="h-5 w-5" />}
            value={analyticsSummary?.visits_completed || 0}
            subtitle={`${analyticsSummary?.visits_delta ? (analyticsSummary.visits_delta > 0 ? "+" : "") + analyticsSummary.visits_delta.toFixed(0) + "% vs prev" : "This month"}`}
            loading={analyticsLoading}
            error={analyticsError}
            onRetry={() => refetchAnalytics()}
            linkTo="/maintenance/visits?status=completed"
            variant="purple"
          />
        </div>

        {/* Detailed Widgets Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Technician Workload */}
          <div className="premium-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Top Technicians
              </h3>
              <Link
                to="/maintenance/analytics"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
            {techLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : techError ? (
              <div className="text-center py-6">
                <p className="text-sm text-destructive">Failed to load</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetchTech()}>
                  Retry
                </Button>
              </div>
            ) : topTechnicians.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("maintenance.dashboard.noTechnicianData")}</p>
            ) : (
              <div className="space-y-3">
                {topTechnicians.map((tech, idx) => (
                  <div key={tech.technician_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {tech.technician_name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{tech.visits_completed}</span>
                      <span className="text-xs text-muted-foreground ml-1">visits</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assets by Type */}
          <div className="premium-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                Assets by Type
              </h3>
              <Link
                to="/maintenance/assets"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View all →
              </Link>
            </div>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : assetsError ? (
              <div className="text-center py-6">
                <p className="text-sm text-destructive">Failed to load</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetchAssets()}>
                  Retry
                </Button>
              </div>
            ) : assetsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No assets found</p>
            ) : (
              <div className="space-y-2">
                {assetsByType.map((type) => {
                  const percentage = Math.round((type.count / allAssets.length) * 100);
                  return (
                    <div key={type.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[150px]">{type.name}</span>
                        <span className="text-muted-foreground">{type.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[hsl(188,45%,24%)] rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Completions */}
        <div className="premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Recent Completions
            </h3>
            <Link
              to="/maintenance/visits?status=completed"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </div>
          {recentLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : recentError ? (
            <div className="text-center py-6">
              <p className="text-sm text-destructive">Failed to load</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetchRecent()}>
                Retry
              </Button>
            </div>
          ) : recentCompletedVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("maintenance.dashboard.noCompletedVisits")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-muted-foreground">Asset</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-2 font-medium text-muted-foreground">Technician</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCompletedVisits.map((visit) => (
                    <tr
                      key={visit.id}
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => navigate(`/maintenance/visits/${visit.id}`)}
                    >
                      <td className="py-2">{visit.asset?.name || "—"}</td>
                      <td className="py-2 text-muted-foreground">{visit.location?.name || "—"}</td>
                      <td className="py-2">{format(new Date(visit.scheduled_date), "MMM d")}</td>
                      <td className="py-2 text-muted-foreground">{visit.cleaner?.full_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="premium-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/maintenance/visits/new")}
            >
              Schedule Visit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/maintenance/assets/new")}
            >
              Add Asset
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/maintenance/visits")}
            >
              View All Visits
            </Button>
          </div>
        </div>
      </div>
    </MaintenanceLayout>
  );
}
