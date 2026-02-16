// dubai-control/src/pages/maintenance/Calendar.tsx
// Stage 11: Calendar View - Visual scheduling interface for service visits

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  List,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  listVisits,
  listAssets,
  listTechnicians,
  listCategories,
  rescheduleVisit,
  maintenanceKeys,
  type ServiceVisit,
} from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import { CalendarGrid } from "./components/CalendarGrid";
import { type CalendarVisit, type VisitStatus, type VisitPriority } from "./components/CalendarVisitCard";

// ============================================================================
// RBAC
// ============================================================================

function canAccessCalendar(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

function canCreateVisits(role: UserRole): boolean {
  return role === "owner" || role === "manager";
}

// ============================================================================
// Types
// ============================================================================

type ViewMode = "month" | "week";

// ============================================================================
// Data Mapping
// ============================================================================

function mapVisitToCalendar(visit: ServiceVisit): CalendarVisit {
  return {
    id: visit.id,
    status: (visit.status as VisitStatus) || "scheduled",
    assetName: visit.asset?.name,
    technicianName: visit.cleaner?.full_name,
    priority: visit.priority as VisitPriority | undefined,
    slaStatus: visit.sla_status as "ok" | "violated" | undefined,
    scheduledDate: visit.scheduled_date,
  };
}

// ============================================================================
// Main Component
// ============================================================================

export default function Calendar() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useUserRole();

  const hasAccess = canAccessCalendar(user.role);
  const canCreate = canCreateVisits(user.role);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filter state (read from URL)
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [technicianFilter, setTechnicianFilter] = useState(searchParams.get("technician_id") || "all");
  const [assetFilter, setAssetFilter] = useState(searchParams.get("asset_id") || "all");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category_id") || "all");

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    if (viewMode === "month") {
      return {
        date_from: format(startOfMonth(currentDate), "yyyy-MM-dd"),
        date_to: format(endOfMonth(currentDate), "yyyy-MM-dd"),
      };
    } else {
      // Week view
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return {
        date_from: format(weekStart, "yyyy-MM-dd"),
        date_to: format(weekEnd, "yyyy-MM-dd"),
      };
    }
  }, [currentDate, viewMode]);

  // Build API filters
  const apiFilters = useMemo(() => {
    const filters: Record<string, any> = {
      ...dateRange,
    };
    if (statusFilter !== "all") filters.status = statusFilter;
    if (technicianFilter !== "all") filters.cleaner_id = Number(technicianFilter);
    if (assetFilter !== "all") filters.asset_id = Number(assetFilter);
    if (categoryFilter !== "all") filters.category_id = Number(categoryFilter);
    return filters;
  }, [dateRange, statusFilter, technicianFilter, assetFilter, categoryFilter]);

  // Fetch visits
  const {
    data: visits = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: maintenanceKeys.visits.list(apiFilters),
    queryFn: () => listVisits(apiFilters),
    enabled: hasAccess,
  });

  // Fetch filter options
  const { data: technicians = [] } = useQuery({
    queryKey: maintenanceKeys.technicians,
    queryFn: listTechnicians,
    enabled: hasAccess,
  });

  const { data: assets = [] } = useQuery({
    queryKey: maintenanceKeys.assets.list({ is_active: true }),
    queryFn: () => listAssets({ is_active: true }),
    enabled: hasAccess,
  });

  const { data: categories = [] } = useQuery({
    queryKey: maintenanceKeys.categories.list(),
    queryFn: listCategories,
    enabled: hasAccess,
  });

  // Toast for notifications
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reschedule mutation (Stage 11.1: D&D)
  const rescheduleMutation = useMutation({
    mutationFn: ({ visitId, newDate }: { visitId: number; newDate: string }) =>
      rescheduleVisit(visitId, newDate),
    onSuccess: () => {
      toast({
        title: "Visit rescheduled",
        description: "The visit has been moved to the new date.",
      });
      queryClient.invalidateQueries({ queryKey: maintenanceKeys.visits.all });
    },
    onError: (error: any) => {
      toast({
        title: "Reschedule failed",
        description: error?.message || "Failed to reschedule the visit.",
        variant: "destructive",
      });
    },
  });

  // Map visits to calendar format
  const calendarVisits = useMemo(() => visits.map(mapVisitToCalendar), [visits]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (viewMode === "month") {
      setCurrentDate((d) => subMonths(d, 1));
    } else {
      setCurrentDate((d) => subWeeks(d, 1));
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    if (viewMode === "month") {
      setCurrentDate((d) => addMonths(d, 1));
    } else {
      setCurrentDate((d) => addWeeks(d, 1));
    }
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Visit click handler
  const handleVisitClick = useCallback(
    (visitId: number) => {
      navigate(`/maintenance/visits/${visitId}`);
    },
    [navigate]
  );

  // Day click handler (quick create)
  const handleDayClick = useCallback(
    (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      navigate(`/maintenance/visits/new?scheduled_date=${dateStr}`);
    },
    [navigate]
  );

  // Reschedule handler (Stage 11.1: D&D)
  const handleReschedule = useCallback(
    (visitId: number, newDate: string) => {
      if (canCreate) {
        rescheduleMutation.mutate({ visitId, newDate });
      }
    },
    [canCreate, rescheduleMutation]
  );

  // Update URL when filters change
  const updateFilter = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(searchParams);
      if (value === "all") {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Header title
  const headerTitle = useMemo(() => {
    if (viewMode === "month") {
      return format(currentDate, "MMMM yyyy");
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;
    }
  }, [currentDate, viewMode]);

  // Access check
  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-12 text-center">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view the calendar.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  return (
    <MaintenanceLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">Visual scheduling for service visits</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-[6px] border border-border p-1">
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs rounded-[4px]"
                onClick={() => setViewMode("week")}
              >
                Week
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3 text-xs rounded-[4px]"
                onClick={() => setViewMode("month")}
              >
                Month
              </Button>
            </div>
            {/* List view link */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-[6px]"
              onClick={() => navigate("/maintenance/visits")}
            >
              <List className="mr-2 h-4 w-4" />
              List View
            </Button>
            {/* New visit */}
            {canCreate && (
              <Button
                size="sm"
                className="h-8 rounded-[6px] bg-[hsl(188,45%,24%)] hover:bg-[hsl(188,45%,20%)]"
                onClick={() => navigate("/maintenance/visits/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Visit
              </Button>
            )}
          </div>
        </div>

        {/* Navigation and Filters */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Month/Week navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-[6px]"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 rounded-[6px]"
              onClick={handleToday}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-[6px]"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground ml-2">{headerTitle}</span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status filter */}
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                updateFilter("status", v);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] rounded-[6px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Technician filter */}
            <Select
              value={technicianFilter}
              onValueChange={(v) => {
                setTechnicianFilter(v);
                updateFilter("technician_id", v);
              }}
            >
              <SelectTrigger className="h-8 w-[140px] rounded-[6px] text-xs">
                <SelectValue placeholder="Technician" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Technicians</SelectItem>
                {technicians.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Asset filter */}
            <Select
              value={assetFilter}
              onValueChange={(v) => {
                setAssetFilter(v);
                updateFilter("asset_id", v);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] rounded-[6px] text-xs">
                <SelectValue placeholder="Asset" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select
              value={categoryFilter}
              onValueChange={(v) => {
                setCategoryFilter(v);
                updateFilter("category_id", v);
              }}
            >
              <SelectTrigger className="h-8 w-[130px] rounded-[6px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive">Failed to load visits</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Calendar Grid */}
        {!isLoading && !isError && (
          <CalendarGrid
            currentMonth={currentDate}
            visits={calendarVisits}
            onVisitClick={handleVisitClick}
            onDayClick={canCreate ? handleDayClick : undefined}
            onReschedule={canCreate ? handleReschedule : undefined}
            canCreate={canCreate}
          />
        )}

        {/* Visit count */}
        {!isLoading && !isError && (
          <p className="text-xs text-muted-foreground text-center">
            {visits.length} visit{visits.length !== 1 ? "s" : ""} in this period
          </p>
        )}
      </div>
    </MaintenanceLayout>
  );
}
