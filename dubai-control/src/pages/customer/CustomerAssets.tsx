// Customer Portal Assets Page (Stage 16)
// List of customer's assets with filtering

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package,
  Loader2,
  MapPin,
  Shield,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCustomerAssets,
  getCustomerLocations,
  customerKeys,
} from "@/api/customer";

export default function CustomerAssets() {
  const [locationFilter, setLocationFilter] = useState<string>("all");

  const { data: locations = [] } = useQuery({
    queryKey: customerKeys.locations,
    queryFn: getCustomerLocations,
  });

  const { data: assets = [], isLoading } = useQuery({
    queryKey: customerKeys.assets.list(
      locationFilter !== "all" ? { location_id: parseInt(locationFilter) } : undefined
    ),
    queryFn: () =>
      getCustomerAssets(
        locationFilter !== "all" ? { location_id: parseInt(locationFilter) } : undefined
      ),
  });

  const getWarrantyBadge = (status: string, endDate: string | null) => {
    if (status === "active") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600">
          <Shield className="h-3 w-3" />
          Active
        </span>
      );
    }
    if (status === "expiring") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
          <AlertTriangle className="h-3 w-3" />
          Expiring
        </span>
      );
    }
    if (status === "expired") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600">
          Expired
        </span>
      );
    }
    return (
      <span className="text-xs text-muted-foreground">No warranty</span>
    );
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
          <h1 className="text-2xl font-semibold text-foreground">Assets</h1>
          <p className="text-sm text-muted-foreground">
            {assets.length} asset{assets.length !== 1 ? "s" : ""} at your locations
          </p>
        </div>

        {/* Location Filter */}
        {locations.length > 1 && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Locations" />
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

      {/* Assets Grid */}
      {assets.length === 0 ? (
        <div className="rounded-xl border border-border bg-card py-12 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 font-medium text-foreground">No assets found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {locationFilter !== "all"
              ? "No assets at this location"
              : "No assets at your locations yet"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <Link
              key={asset.id}
              to={`/customer/assets/${asset.id}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                {getWarrantyBadge(asset.warranty_status, asset.warranty_end_date)}
              </div>

              <div className="mt-4">
                <h3 className="font-semibold text-foreground group-hover:text-blue-600">
                  {asset.name}
                </h3>
                {asset.serial_number && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    SN: {asset.serial_number}
                  </p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {asset.location.name}
                </div>
                {asset.asset_type && (
                  <div>{asset.asset_type.name}</div>
                )}
              </div>

              {asset.warranty_end_date && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Warranty until: {new Date(asset.warranty_end_date).toLocaleDateString()}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
