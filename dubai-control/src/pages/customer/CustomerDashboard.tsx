// Customer Portal Dashboard (Stage 16)
// Overview of customer's assets, visits, and contracts

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package,
  ClipboardCheck,
  FileText,
  MapPin,
  ArrowRight,
  Loader2,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCustomerDashboard,
  getCustomerVisits,
  customerKeys,
} from "@/api/customer";

export default function CustomerDashboard() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: customerKeys.dashboard,
    queryFn: getCustomerDashboard,
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: customerKeys.visits.list({ status: "completed" }),
    queryFn: () => getCustomerVisits({ status: "completed" }),
  });

  const { data: upcomingVisits = [] } = useQuery({
    queryKey: customerKeys.visits.list({ status: "scheduled" }),
    queryFn: () => getCustomerVisits({ status: "scheduled" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your assets and service activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/customer/assets"
          className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-foreground">
              {dashboard?.total_assets || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Assets</div>
          </div>
        </Link>

        <Link
          to="/customer/visits?status=scheduled"
          className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/10">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-foreground">
              {dashboard?.upcoming_visits || 0}
            </div>
            <div className="text-sm text-muted-foreground">Upcoming Visits</div>
          </div>
        </Link>

        <Link
          to="/customer/visits?status=completed"
          className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600/10">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-foreground">
              {dashboard?.recent_completions || 0}
            </div>
            <div className="text-sm text-muted-foreground">Completed (30 days)</div>
          </div>
        </Link>

        <Link
          to="/customer/contracts"
          className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-semibold text-foreground">
              {dashboard?.active_contracts || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Contracts</div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Visits */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Upcoming Visits</h2>
            <Link to="/customer/visits?status=scheduled">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="p-5">
            {upcomingVisits.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Calendar className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm">No upcoming visits scheduled</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingVisits.slice(0, 5).map((visit) => (
                  <Link
                    key={visit.id}
                    to={`/customer/visits/${visit.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {visit.asset?.name || visit.location.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {visit.scheduled_date
                          ? new Date(visit.scheduled_date).toLocaleDateString()
                          : "Date TBD"}
                      </div>
                    </div>
                    <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
                      Scheduled
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Completions */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold text-foreground">Recent Completions</h2>
            <Link to="/customer/visits?status=completed">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="p-5">
            {recentVisits.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <ClipboardCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm">No completed visits yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentVisits.slice(0, 5).map((visit) => (
                  <Link
                    key={visit.id}
                    to={`/customer/visits/${visit.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {visit.asset?.name || visit.location.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {visit.completed_at
                          ? new Date(visit.completed_at).toLocaleDateString()
                          : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {visit.has_photos && (
                        <span className="text-xs text-muted-foreground">Photos</span>
                      )}
                      <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
                        Completed
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
