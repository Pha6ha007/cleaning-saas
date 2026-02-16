// Customer Portal Visit Detail Page (Stage 16)
// View visit details including proof photos

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  User,
  MapPin,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Image,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCustomerVisit, customerKeys } from "@/api/customer";

export default function CustomerVisitDetail() {
  const { id } = useParams<{ id: string }>();
  const visitId = parseInt(id || "0");

  const { data: visit, isLoading, isError } = useQuery({
    queryKey: customerKeys.visits.detail(visitId),
    queryFn: () => getCustomerVisit(visitId),
    enabled: visitId > 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !visit) {
    return (
      <div className="py-12 text-center">
        <XCircle className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-3 font-medium text-foreground">Visit not found</p>
        <Link to="/customer/visits">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Visits
          </Button>
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-600">
            <Calendar className="h-4 w-4" />
            Scheduled
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-600">
            <Clock className="h-4 w-4" />
            In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/10 px-3 py-1.5 text-sm font-medium text-gray-500">
            <XCircle className="h-4 w-4" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/customer/visits">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-foreground">
            Visit Details
          </h1>
        </div>
        {getStatusBadge(visit.status)}
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Scheduled Date</span>
          </div>
          <div className="mt-2 font-semibold text-foreground">
            {visit.scheduled_date
              ? new Date(visit.scheduled_date).toLocaleDateString()
              : "Not set"}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">Location</span>
          </div>
          <div className="mt-2 font-semibold text-foreground">
            {visit.location.name}
          </div>
          {visit.location.address && (
            <div className="mt-1 text-sm text-muted-foreground">
              {visit.location.address}
            </div>
          )}
        </div>

        {visit.asset && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span className="text-sm">Asset</span>
            </div>
            <div className="mt-2 font-semibold text-foreground">
              {visit.asset.name}
            </div>
            {visit.asset.serial_number && (
              <div className="mt-1 text-sm text-muted-foreground">
                SN: {visit.asset.serial_number}
              </div>
            )}
          </div>
        )}

        {visit.technician && (
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm">Technician</span>
            </div>
            <div className="mt-2 font-semibold text-foreground">
              {visit.technician.name}
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      {(visit.check_in_time || visit.check_out_time || visit.completed_at) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Clock className="h-5 w-5" />
            Timeline
          </h2>
          <div className="mt-4 space-y-3">
            {visit.check_in_time && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-sm text-muted-foreground">Check-in:</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(visit.check_in_time).toLocaleString()}
                </span>
              </div>
            )}
            {visit.check_out_time && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-amber-600" />
                <span className="text-sm text-muted-foreground">Check-out:</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(visit.check_out_time).toLocaleString()}
                </span>
              </div>
            )}
            {visit.completed_at && (
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-600" />
                <span className="text-sm text-muted-foreground">Completed:</span>
                <span className="text-sm font-medium text-foreground">
                  {new Date(visit.completed_at).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof Photos */}
      {(visit.photo_before || visit.photo_after) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Image className="h-5 w-5" />
            Proof Photos
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {visit.photo_before && (
              <div>
                <div className="mb-2 text-sm font-medium text-muted-foreground">
                  Before
                </div>
                <a href={visit.photo_before} target="_blank" rel="noopener noreferrer">
                  <img
                    src={visit.photo_before}
                    alt="Before"
                    className="w-full rounded-lg border border-border object-cover"
                    style={{ maxHeight: 300 }}
                  />
                </a>
              </div>
            )}
            {visit.photo_after && (
              <div>
                <div className="mb-2 text-sm font-medium text-muted-foreground">
                  After
                </div>
                <a href={visit.photo_after} target="_blank" rel="noopener noreferrer">
                  <img
                    src={visit.photo_after}
                    alt="After"
                    className="w-full rounded-lg border border-border object-cover"
                    style={{ maxHeight: 300 }}
                  />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checklist */}
      {visit.checklist.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-foreground">
              <ListChecks className="h-5 w-5" />
              Checklist
            </h2>
            <span className="text-sm text-muted-foreground">
              {visit.checklist_progress.completed}/{visit.checklist_progress.total} completed
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {visit.checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                {item.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                )}
                <span
                  className={
                    item.is_completed
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {item.text}
                </span>
                {item.is_required && !item.is_completed && (
                  <span className="ml-auto text-xs text-amber-600">Required</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
