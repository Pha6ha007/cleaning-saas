// Customer Portal Visits Page (Stage 16)
// List of service visits with filtering

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  Loader2,
  Calendar,
  User,
  Package,
  Image,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCustomerVisits,
  getCustomerLocations,
  customerKeys,
} from "@/api/customer";

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function CustomerVisits() {
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";

  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { data: locations = [] } = useQuery({
    queryKey: customerKeys.locations,
    queryFn: getCustomerLocations,
  });

  const { data: visits = [], isLoading } = useQuery({
    queryKey: customerKeys.visits.list({
      status: statusFilter !== "all" ? statusFilter : undefined,
      location_id: locationFilter !== "all" ? parseInt(locationFilter) : undefined,
    }),
    queryFn: () =>
      getCustomerVisits({
        status: statusFilter !== "all" ? statusFilter : undefined,
        location_id: locationFilter !== "all" ? parseInt(locationFilter) : undefined,
      }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600">
            <Calendar className="h-3 w-3" />
            Scheduled
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600">
            <Clock className="h-3 w-3" />
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-gray-500">
            <XCircle className="h-3 w-3" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-gray-500/10 px-2.5 py-1 text-xs font-medium text-gray-500">
            {status}
          </span>
        );
    }
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Service Visits</h1>
          <p className="text-sm text-muted-foreground">
            {visits.length} visit{visits.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {locations.length > 1 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={String(loc.id)}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Visits List */}
      {visits.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-foreground">No visits found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter !== "all"
              ? `No ${statusFilter.replace("_", " ")} visits`
              : "No service visits for your assets"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visits.map((visit) => (
            <Link
              key={visit.id}
              to={`/customer/visits/${visit.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-4">
                <div className="hidden h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 sm:flex">
                  <ClipboardCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground">
                    {visit.asset?.name || visit.location.name}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {visit.scheduled_date
                        ? new Date(visit.scheduled_date).toLocaleDateString()
                        : "Date TBD"}
                    </span>
                    {visit.technician && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {visit.technician.name}
                      </span>
                    )}
                    {visit.asset && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {visit.asset.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {visit.has_photos && (
                  <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Image className="h-3.5 w-3.5" />
                    Photos
                  </span>
                )}
                {getStatusBadge(visit.status)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
