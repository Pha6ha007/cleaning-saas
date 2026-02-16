// Customer Portal Locations Page (Stage 16)
// List of customer's assigned locations

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  MapPin,
  Loader2,
  Package,
  FileText,
  Building2,
} from "lucide-react";
import { getCustomerLocations, customerKeys } from "@/api/customer";

export default function CustomerLocations() {
  const { data: locations = [], isLoading } = useQuery({
    queryKey: customerKeys.locations,
    queryFn: getCustomerLocations,
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
        <h1 className="text-2xl font-semibold text-foreground">Locations</h1>
        <p className="text-sm text-muted-foreground">
          {locations.length} location{locations.length !== 1 ? "s" : ""} assigned to your account
        </p>
      </div>

      {/* Locations Grid */}
      {locations.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-foreground">No locations</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No locations have been assigned to your account
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <div
              key={location.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600/10">
                  <Building2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {location.name}
                  </h3>
                  {location.address && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {location.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <Link
                  to={`/customer/assets?location=${location.id}`}
                  className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <Package className="h-4 w-4" />
                  <span>{location.asset_count} assets</span>
                </Link>
                <Link
                  to={`/customer/contracts?location=${location.id}`}
                  className="flex items-center gap-1.5 transition-colors hover:text-foreground"
                >
                  <FileText className="h-4 w-4" />
                  <span>{location.contract_count} contracts</span>
                </Link>
              </div>

              {/* Contact Info */}
              {location.contact_name && (
                <div className="mt-4 border-t border-border pt-4">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Contact: </span>
                    <span className="font-medium text-foreground">
                      {location.contact_name}
                    </span>
                  </div>
                  {location.contact_phone && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {location.contact_phone}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
