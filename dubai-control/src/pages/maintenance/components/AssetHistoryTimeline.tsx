// src/pages/maintenance/components/AssetHistoryTimeline.tsx
// Stage 13: Visual timeline for asset service history

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import {
  Calendar,
  Clock,
  User,
  Tag,
  FileText,
  CheckCircle2,
  Circle,
  XCircle,
  PlayCircle,
  AlertTriangle,
  Filter,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Types
interface TimelineVisit {
  id: number;
  scheduled_date: string;
  scheduled_start_time: string | null;
  actual_start_time?: string | null;
  actual_end_time?: string | null;
  status: string;
  technician: {
    id: number;
    name: string;
  } | null;
  category: {
    id: number;
    name: string;
  } | null;
  manager_notes?: string;
  cleaner_notes?: string;
}

interface AssetHistoryTimelineProps {
  visits: TimelineVisit[];
  assetId: number;
}

// Status configuration
const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  scheduled: {
    icon: Circle,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Scheduled",
  },
  in_progress: {
    icon: PlayCircle,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    label: "Completed",
  },
  completed_unverified: {
    icon: AlertTriangle,
    color: "text-gray-600",
    bg: "bg-gray-100",
    label: "Unverified",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-100",
    label: "Cancelled",
  },
};

// Format helpers
function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  try {
    if (timeStr.includes("T")) {
      return format(parseISO(timeStr), "h:mm a");
    }
    const [hours, minutes] = timeStr.split(":");
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return format(date, "h:mm a");
  } catch {
    return timeStr;
  }
}

// Group visits by month
function groupByMonth(visits: TimelineVisit[]): Map<string, TimelineVisit[]> {
  const groups = new Map<string, TimelineVisit[]>();

  visits.forEach((visit) => {
    const monthKey = format(parseISO(visit.scheduled_date), "yyyy-MM");
    if (!groups.has(monthKey)) {
      groups.set(monthKey, []);
    }
    groups.get(monthKey)!.push(visit);
  });

  return groups;
}

export function AssetHistoryTimeline({ visits, assetId }: AssetHistoryTimelineProps) {
  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Map<number, string>();
    visits.forEach((v) => {
      if (v.category) {
        cats.set(v.category.id, v.category.name);
      }
    });
    return Array.from(cats.entries()).map(([id, name]) => ({ id, name }));
  }, [visits]);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter visits
  const filteredVisits = useMemo(() => {
    return visits.filter((visit) => {
      // Status filter
      if (statusFilter !== "all" && visit.status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== "all" && visit.category?.id !== Number(categoryFilter)) {
        return false;
      }

      // Date range filter
      const visitDate = startOfDay(parseISO(visit.scheduled_date));
      if (dateFrom && isBefore(visitDate, startOfDay(dateFrom))) {
        return false;
      }
      if (dateTo && isAfter(visitDate, startOfDay(dateTo))) {
        return false;
      }

      return true;
    });
  }, [visits, statusFilter, categoryFilter, dateFrom, dateTo]);

  // Group by month
  const groupedVisits = useMemo(() => groupByMonth(filteredVisits), [filteredVisits]);

  // Clear filters
  const clearFilters = () => {
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = statusFilter !== "all" || categoryFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-[6px]"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 h-5 w-5 rounded-full bg-[hsl(188,45%,24%)] text-white text-xs flex items-center justify-center">
              !
            </span>
          )}
          <ChevronDown className={cn("ml-2 h-3.5 w-3.5 transition-transform", showFilters && "rotate-180")} />
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}

        <span className="text-xs text-muted-foreground">
          {filteredVisits.length} of {visits.length} visits
        </span>
      </div>

      {/* Filter controls */}
      {showFilters && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-lg bg-muted/30 border border-border">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

          {/* Category filter */}
          {categories.length > 0 && (
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-8 w-[140px] rounded-[6px] text-xs">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date from */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-[120px] justify-start text-left font-normal rounded-[6px] text-xs",
                  !dateFrom && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, "MMM d, yy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Date to */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-[120px] justify-start text-left font-normal rounded-[6px] text-xs",
                  !dateTo && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-3.5 w-3.5" />
                {dateTo ? format(dateTo, "MMM d, yy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Timeline */}
      {filteredVisits.length === 0 ? (
        <div className="py-8 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            {visits.length === 0 ? "No service visits recorded" : "No visits match the filters"}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

          {/* Grouped by month */}
          {Array.from(groupedVisits.entries()).map(([monthKey, monthVisits]) => (
            <div key={monthKey} className="relative">
              {/* Month header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 py-2 bg-background">
                <div className="w-10 h-10 rounded-full bg-[hsl(188,45%,24%)] text-white flex items-center justify-center text-xs font-medium">
                  {format(parseISO(`${monthKey}-01`), "MMM")}
                </div>
                <span className="text-sm font-medium text-foreground">
                  {format(parseISO(`${monthKey}-01`), "MMMM yyyy")}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({monthVisits.length} visit{monthVisits.length !== 1 ? "s" : ""})
                </span>
              </div>

              {/* Visits in this month */}
              <div className="ml-5 pl-8 border-l-2 border-border space-y-4 pb-6">
                {monthVisits.map((visit, index) => {
                  const config = statusConfig[visit.status] || statusConfig.scheduled;
                  const StatusIcon = config.icon;

                  return (
                    <Link
                      key={visit.id}
                      to={`/maintenance/visits/${visit.id}`}
                      className="block relative group"
                    >
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          "absolute -left-[25px] top-2 w-4 h-4 rounded-full border-2 border-background",
                          config.bg
                        )}
                      >
                        <StatusIcon className={cn("w-full h-full p-0.5", config.color)} />
                      </div>

                      {/* Visit card */}
                      <div className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md hover:border-[hsl(188,45%,24%)/30] group-hover:translate-x-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Date and status */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">
                                {formatDate(visit.scheduled_date)}
                              </span>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                                  config.bg,
                                  config.color
                                )}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {config.label}
                              </span>
                            </div>

                            {/* Time */}
                            {visit.scheduled_start_time && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatTime(visit.scheduled_start_time)}
                                {visit.status === "completed" && visit.actual_end_time && (
                                  <span className="text-emerald-600">
                                    {" "}→ {formatTime(visit.actual_end_time)}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Technician */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {visit.technician?.name || "Unassigned"}
                            </div>

                            {/* Category */}
                            {visit.category && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Tag className="h-3 w-3" />
                                {visit.category.name}
                              </div>
                            )}

                            {/* Notes preview */}
                            {(visit.manager_notes || visit.cleaner_notes) && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-2">
                                  {visit.manager_notes || visit.cleaner_notes}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Arrow indicator */}
                          <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssetHistoryTimeline;
