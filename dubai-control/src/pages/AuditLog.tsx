// dubai-control/src/pages/AuditLog.tsx
// M005/S04: Audit Log Viewer with CSV export
// NEW FILE — does not touch any locked Cleaning page

import { useState, useEffect, useCallback } from "react";
import {
  ScrollText,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Zap,
  Loader2,
  AlertTriangle,
  MapPin,
  User,
  Clock,
} from "lucide-react";
import {
  getAuditLog,
  exportAuditLog,
  AuditLogEvent,
  AuditLogFilters,
} from "@/api/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EVENT_ICONS: Record<string, React.ReactNode> = {
  check_in: <LogIn className="h-3.5 w-3.5 text-emerald-600" />,
  check_out: <LogOut className="h-3.5 w-3.5 text-blue-600" />,
  force_complete: <Zap className="h-3.5 w-3.5 text-amber-500" />,
};

const EVENT_LABELS: Record<string, string> = {
  check_in: "Check In",
  check_out: "Check Out",
  force_complete: "Force Complete",
};

const EVENT_PILL: Record<string, string> = {
  check_in: "bg-emerald-50 text-emerald-700",
  check_out: "bg-blue-50 text-blue-700",
  force_complete: "bg-amber-50 text-amber-700",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AE", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

interface FilterBarProps {
  filters: AuditLogFilters;
  onChange: (f: AuditLogFilters) => void;
}

function FilterBar({ filters, onChange }: FilterBarProps) {
  function set<K extends keyof AuditLogFilters>(k: K, v: AuditLogFilters[K]) {
    onChange({ ...filters, [k]: v || undefined, page: 1 });
  }

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />Filters
      </div>

      <div className="flex flex-wrap gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Event Type</label>
          <select
            value={filters.event_type ?? ""}
            onChange={e => set("event_type", e.target.value as AuditLogFilters["event_type"] || undefined)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
          >
            <option value="">All Events</option>
            <option value="check_in">Check In</option>
            <option value="check_out">Check Out</option>
            <option value="force_complete">Force Complete</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <input
            type="date"
            value={filters.date_from ?? ""}
            onChange={e => set("date_from", e.target.value || undefined)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <input
            type="date"
            value={filters.date_to ?? ""}
            onChange={e => set("date_to", e.target.value || undefined)}
            className="rounded-lg border border-border px-2.5 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Cleaner ID</label>
          <input
            type="number"
            placeholder="Any"
            value={filters.cleaner_id ?? ""}
            onChange={e => set("cleaner_id", e.target.value ? Number(e.target.value) : undefined)}
            className="w-24 rounded-lg border border-border px-2.5 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Location ID</label>
          <input
            type="number"
            placeholder="Any"
            value={filters.location_id ?? ""}
            onChange={e => set("location_id", e.target.value ? Number(e.target.value) : undefined)}
            className="w-24 rounded-lg border border-border px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Event Row
// ---------------------------------------------------------------------------

function EventRow({ event }: { event: AuditLogEvent }) {
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 pl-4 pr-3 text-xs text-muted-foreground">{event.id}</td>
      <td className="py-3 px-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
          EVENT_PILL[event.event_type] ?? "bg-muted text-muted-foreground"
        }`}>
          {EVENT_ICONS[event.event_type]}
          {EVENT_LABELS[event.event_type] ?? event.event_type}
        </span>
      </td>
      <td className="py-3 px-3">
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-foreground">
          #{event.job_id}
        </span>
      </td>
      <td className="py-3 px-3">
        {event.cleaner ? (
          <div>
            <p className="text-sm font-medium text-foreground">{event.cleaner.full_name}</p>
            <p className="text-xs text-muted-foreground">{event.cleaner.email}</p>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-3 px-3">
        <span className="flex items-center gap-1 text-sm text-foreground">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          {event.location?.name ?? "—"}
        </span>
      </td>
      <td className="py-3 px-3 text-xs text-muted-foreground">
        {event.distance_m != null ? `${Math.round(event.distance_m)} m` : "—"}
      </td>
      <td className="py-3 pl-3 pr-4 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(event.created_at)}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, page_size: 50 });
  const [data, setData] = useState<{ count: number; total_pages: number; results: AuditLogEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLog(filters);
      setData(res);
    } catch {
      setError("Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function handleExport() {
    setExporting(true);
    try {
      const blob = await exportAuditLog(filters);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed");
    } finally {
      setExporting(false);
    }
  }

  const page = filters.page ?? 1;
  const totalPages = data?.total_pages ?? 1;

  function goPage(p: number) {
    setFilters(f => ({ ...f, page: Math.max(1, Math.min(totalPages, p)) }));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <ScrollText className="h-6 w-6 text-primary" />
            Audit Log
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Immutable record of all check-in, check-out, and completion events
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
        >
          {exporting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Download className="h-4 w-4" />}
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Stats row */}
      {data && (
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.count === 0
              ? "No events found"
              : `${data.count.toLocaleString()} event${data.count !== 1 ? "s" : ""}`}
          </span>
          {data.total_pages > 1 && (
            <span>Page {page} of {data.total_pages}</span>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.results.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-muted-foreground">No audit events match your filters</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-4 pr-3">ID</th>
                  <th className="py-3 px-3">Event</th>
                  <th className="py-3 px-3">Job</th>
                  <th className="py-3 px-3">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />Cleaner</span>
                  </th>
                  <th className="py-3 px-3">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />Location</span>
                  </th>
                  <th className="py-3 px-3">Distance</th>
                  <th className="py-3 pl-3 pr-4">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Timestamp</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.results.map(e => <EventRow key={e.id} event={e} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={() => goPage(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />Prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(7, data.total_pages) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => goPage(p)}
                  className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            {data.total_pages > 7 && <span className="text-muted-foreground">…</span>}
          </div>

          <button
            onClick={() => goPage(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted disabled:opacity-40"
          >
            Next<ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
