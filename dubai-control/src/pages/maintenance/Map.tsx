// dubai-control/src/pages/maintenance/Map.tsx
// Stage 13: Map View - Geographic visualization of assets and visits

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  GoogleMap,
  useLoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import {
  MapPin,
  Loader2,
  AlertTriangle,
  Wrench,
  Calendar,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";
import { MaintenanceLayout } from "@/contexts/maintenance/ui/MaintenanceLayout";
import {
  listLocations,
  listAssets,
  listVisits,
  listTechnicians,
  maintenanceKeys,
  type ServiceVisit,
} from "@/api/maintenance";
import type { Location, Asset, Cleaner } from "@/api/client";

// =============================================================================
// Types
// =============================================================================

interface LocationWithData extends Location {
  assets: Asset[];
  visits: ServiceVisit[];
}

type MapFilter = {
  showAssets: boolean;
  showVisits: boolean;
  visitStatus: string;
  technicianId: number | null;
};

// =============================================================================
// Constants
// =============================================================================

const GOOGLE_MAPS_LIBRARIES: ("places")[] = ["places"];

const DEFAULT_CENTER = { lat: 25.2048, lng: 55.2708 }; // Dubai
const DEFAULT_ZOOM = 11;
const MARKER_ZOOM = 15;

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

// Status colors for markers
const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6", // blue
  in_progress: "#f59e0b", // amber
  completed: "#10b981", // green
  cancelled: "#6b7280", // gray
};

// =============================================================================
// RBAC
// =============================================================================

function canAccessMap(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

// =============================================================================
// Helper Components
// =============================================================================

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-gray-100 text-gray-500",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[status] || variants.scheduled}`}>
      {status.replace("_", " ")}
    </span>
  );
}

// =============================================================================
// Info Window Content
// =============================================================================

interface InfoWindowContentProps {
  location: LocationWithData;
  filter: MapFilter;
  onViewAsset: (id: number) => void;
  onViewVisit: (id: number) => void;
  onClose: () => void;
}

function InfoWindowContent({
  location,
  filter,
  onViewAsset,
  onViewVisit,
  onClose,
}: InfoWindowContentProps) {
  const filteredVisits = location.visits.filter((v) => {
    if (filter.visitStatus && filter.visitStatus !== "all" && v.status !== filter.visitStatus) return false;
    if (filter.technicianId && v.cleaner?.id !== filter.technicianId) return false;
    return true;
  });

  return (
    <div className="min-w-[280px] max-w-[320px] p-1">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm text-gray-900">{location.name}</h3>
          {location.address && (
            <p className="text-xs text-gray-500 mt-0.5">{location.address}</p>
          )}
        </div>
      </div>

      {/* Assets */}
      {filter.showAssets && location.assets.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
            <Wrench className="h-3.5 w-3.5" />
            Assets ({location.assets.length})
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {location.assets.slice(0, 5).map((asset) => (
              <button
                key={asset.id}
                onClick={() => onViewAsset(asset.id)}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-gray-100 transition-colors text-left"
              >
                <div>
                  <p className="text-xs font-medium text-gray-900">{asset.name}</p>
                  <p className="text-[10px] text-gray-500">{asset.asset_type?.name}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
              </button>
            ))}
            {location.assets.length > 5 && (
              <p className="text-[10px] text-gray-500 pl-1.5">
                +{location.assets.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Visits */}
      {filter.showVisits && filteredVisits.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Visits ({filteredVisits.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {filteredVisits.slice(0, 5).map((visit) => (
              <button
                key={visit.id}
                onClick={() => onViewVisit(visit.id)}
                className="w-full flex items-center justify-between p-1.5 rounded hover:bg-gray-100 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {visit.asset?.name || "No asset"}
                    </p>
                    <StatusBadge status={visit.status} />
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {visit.scheduled_date} • {visit.cleaner?.full_name || "Unassigned"}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              </button>
            ))}
            {filteredVisits.length > 5 && (
              <p className="text-[10px] text-gray-500 pl-1.5">
                +{filteredVisits.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!filter.showAssets || location.assets.length === 0) &&
        (!filter.showVisits || filteredVisits.length === 0) && (
          <p className="text-xs text-gray-500 text-center py-2">
            No items to display
          </p>
        )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function MaintenanceMap() {
  const navigate = useNavigate();
  const user = useUserRole();
  const hasAccess = canAccessMap(user.role);
  const mapRef = useRef<google.maps.Map | null>(null);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [selectedLocation, setSelectedLocation] = useState<LocationWithData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filter, setFilter] = useState<MapFilter>({
    showAssets: true,
    showVisits: true,
    visitStatus: "all",
    technicianId: null,
  });

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["maintenance", "locations"],
    queryFn: listLocations,
    enabled: hasAccess,
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: maintenanceKeys.assets.all,
    queryFn: () => listAssets(),
    enabled: hasAccess,
  });

  const { data: visits = [], isLoading: visitsLoading } = useQuery({
    queryKey: maintenanceKeys.visits.list({}),
    queryFn: () => listVisits({}),
    enabled: hasAccess,
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["maintenance", "technicians"],
    queryFn: listTechnicians,
    enabled: hasAccess,
  });

  const isLoading = locationsLoading || assetsLoading || visitsLoading;

  // -------------------------------------------------------------------------
  // Process Data - Group by Location
  // -------------------------------------------------------------------------

  const locationsWithData = useMemo(() => {
    const result: LocationWithData[] = [];

    for (const loc of locations) {
      if (loc.latitude == null || loc.longitude == null) continue;

      const locationAssets = assets.filter((a) => a.location?.id === loc.id);
      const locationVisits = visits.filter((v) => v.location?.id === loc.id);

      // Apply filters
      const hasAssets = filter.showAssets && locationAssets.length > 0;
      const hasVisits = filter.showVisits && locationVisits.some((v) => {
        if (filter.visitStatus && filter.visitStatus !== "all" && v.status !== filter.visitStatus) return false;
        if (filter.technicianId && v.cleaner?.id !== filter.technicianId) return false;
        return true;
      });

      if (hasAssets || hasVisits) {
        result.push({
          ...loc,
          assets: locationAssets,
          visits: locationVisits,
        });
      }
    }

    return result;
  }, [locations, assets, visits, filter]);

  // -------------------------------------------------------------------------
  // Map Handlers
  // -------------------------------------------------------------------------

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleMarkerClick = useCallback((location: LocationWithData) => {
    setSelectedLocation(location);
    if (mapRef.current && location.latitude && location.longitude) {
      mapRef.current.panTo({ lat: location.latitude, lng: location.longitude });
    }
  }, []);

  const handleViewAsset = useCallback((id: number) => {
    navigate(`/maintenance/assets/${id}`);
  }, [navigate]);

  const handleViewVisit = useCallback((id: number) => {
    navigate(`/maintenance/visits/${id}`);
  }, [navigate]);

  // -------------------------------------------------------------------------
  // Fit Bounds when data changes
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!mapRef.current || locationsWithData.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    let hasValidBounds = false;

    for (const loc of locationsWithData) {
      if (loc.latitude != null && loc.longitude != null) {
        bounds.extend({ lat: loc.latitude, lng: loc.longitude });
        hasValidBounds = true;
      }
    }

    if (hasValidBounds) {
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, [locationsWithData]);

  // -------------------------------------------------------------------------
  // Get marker icon based on content
  // -------------------------------------------------------------------------

  const getMarkerIcon = useCallback((location: LocationWithData): string => {
    // Priority: active visits > assets
    const activeVisit = location.visits.find(
      (v) => v.status === "in_progress" || v.status === "scheduled"
    );

    if (activeVisit) {
      return STATUS_COLORS[activeVisit.status] || STATUS_COLORS.scheduled;
    }

    return "#2d5a5a"; // Maintenance teal for assets only
  }, []);

  // -------------------------------------------------------------------------
  // Access & Error States
  // -------------------------------------------------------------------------

  if (!hasAccess) {
    return (
      <MaintenanceLayout>
        <div className="py-12 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Restricted</h2>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to view the map.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  if (!apiKey) {
    return (
      <MaintenanceLayout>
        <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 text-destructive">
          <MapPin className="mb-2 h-8 w-8" />
          <p className="text-lg font-medium">Map is not configured</p>
          <p className="mt-2 px-4 text-center text-sm opacity-80">
            Google Maps API key is missing. Please set VITE_GOOGLE_MAPS_API_KEY.
          </p>
        </div>
      </MaintenanceLayout>
    );
  }

  if (loadError) {
    return (
      <MaintenanceLayout>
        <div className="flex h-[calc(100vh-200px)] flex-col items-center justify-center rounded-xl border border-destructive/30 bg-destructive/5 text-destructive">
          <AlertTriangle className="mb-2 h-8 w-8" />
          <p className="text-lg font-medium">Failed to load map</p>
          <p className="mt-2 px-4 text-center text-sm opacity-80">
            Please check your internet connection and try again.
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
      <div className="space-y-4">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Map</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {locationsWithData.length} locations with assets or visits
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-[6px]"
          >
            <Filter className="mr-1.5 h-4 w-4" />
            Filters
            {(filter.visitStatus !== "all" || filter.technicianId) && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                {[filter.visitStatus !== "all", filter.technicianId].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <label htmlFor="map-show-filter" className="text-xs font-medium text-muted-foreground">Show:</label>
              <Button
                variant={filter.showAssets ? "default" : "outline"}
                size="sm"
                className="h-7 rounded-[6px]"
                onClick={() => setFilter((f) => ({ ...f, showAssets: !f.showAssets }))}
              >
                <Wrench className="mr-1 h-3 w-3" />
                Assets
              </Button>
              <Button
                variant={filter.showVisits ? "default" : "outline"}
                size="sm"
                className="h-7 rounded-[6px]"
                onClick={() => setFilter((f) => ({ ...f, showVisits: !f.showVisits }))}
              >
                <Calendar className="mr-1 h-3 w-3" />
                Visits
              </Button>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <label htmlFor="map-status-filter" className="text-xs font-medium text-muted-foreground">Status:</label>
              <Select
                value={filter.visitStatus}
                onValueChange={(v) => setFilter((f) => ({ ...f, visitStatus: v }))}
              >
                <SelectTrigger className="h-7 w-[120px] rounded-[6px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="map-tech-filter" className="text-xs font-medium text-muted-foreground">Technician:</label>
              <Select
                value={filter.technicianId?.toString() || "all"}
                onValueChange={(v) =>
                  setFilter((f) => ({
                    ...f,
                    technicianId: v === "all" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger className="h-7 w-[140px] rounded-[6px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id.toString()}>
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(filter.visitStatus !== "all" || filter.technicianId) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() =>
                  setFilter((f) => ({ ...f, visitStatus: "all", technicianId: null }))
                }
              >
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Map Container */}
        <div className="relative h-[calc(100vh-280px)] min-h-[400px] rounded-xl border border-border overflow-hidden">
          {(!isLoaded || isLoading) && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading map...</span>
              </div>
            </div>
          )}

          {isLoaded && (
            <GoogleMap
              mapContainerStyle={MAP_CONTAINER_STYLE}
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              options={MAP_OPTIONS}
              onLoad={onMapLoad}
            >
              {locationsWithData.map((location) => (
                <Marker
                  key={location.id}
                  position={{
                    lat: location.latitude!,
                    lng: location.longitude!,
                  }}
                  onClick={() => handleMarkerClick(location)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: getMarkerIcon(location),
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                  }}
                  label={{
                    text: String(location.assets.length + location.visits.length),
                    color: "#ffffff",
                    fontSize: "10px",
                    fontWeight: "bold",
                  }}
                />
              ))}

              {selectedLocation && (
                <InfoWindow
                  position={{
                    lat: selectedLocation.latitude!,
                    lng: selectedLocation.longitude!,
                  }}
                  onCloseClick={() => setSelectedLocation(null)}
                >
                  <InfoWindowContent
                    location={selectedLocation}
                    filter={filter}
                    onViewAsset={handleViewAsset}
                    onViewVisit={handleViewVisit}
                    onClose={() => setSelectedLocation(null)}
                  />
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-amber-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "#2d5a5a" }} />
            <span>Assets Only</span>
          </div>
        </div>
      </div>
    </MaintenanceLayout>
  );
}
