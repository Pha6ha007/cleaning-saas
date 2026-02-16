// dubai-control/src/pages/maintenance/AssetQuickAccess.tsx
// Quick access page for technicians after scanning QR code (Stage 8)
// Mobile-first standalone page (no AppLayout)

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Wrench,
  MapPin,
  Hash,
  Tag,
  Play,
  ExternalLink,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { getAsset, maintenanceKeys } from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// Check if user can start visits (any authenticated user in maintenance)
function canStartVisit(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff" || role === "cleaner";
}

// Check if user is authenticated
function isAuthenticated(role: UserRole): boolean {
  return role !== "unknown";
}

export default function AssetQuickAccess() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useUserRole();

  const assetId = Number(id);
  const authenticated = isAuthenticated(user.role);
  const canStart = canStartVisit(user.role);

  // Fetch asset data
  const {
    data: asset,
    isLoading,
    isError,
  } = useQuery({
    queryKey: maintenanceKeys.assets.detail(assetId),
    queryFn: () => getAsset(assetId),
    enabled: authenticated && !isNaN(assetId),
  });

  // Handle "Start Visit" click
  const handleStartVisit = () => {
    if (asset) {
      navigate(`/maintenance/visits/new?asset_id=${asset.id}&location_id=${asset.location?.id}`);
    }
  };

  // Handle login redirect
  const handleLogin = () => {
    // Store return URL and redirect to login
    const returnUrl = encodeURIComponent(window.location.pathname);
    navigate(`/?redirect=${returnUrl}`);
  };

  // Not authenticated - show login prompt
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sign In Required</h1>
          <p className="mt-3 text-muted-foreground">
            Please sign in to view asset details and start service visits.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={handleLogin}>
            <LogIn className="mr-2 h-5 w-5" />
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Error or not found
  if (isError || !asset) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Asset Not Found</h1>
          <p className="mt-3 text-muted-foreground">
            The scanned QR code doesn't match any asset in the system.
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => navigate("/maintenance/assets")}
          >
            View All Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-6 py-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm opacity-80">Asset</p>
              <h1 className="text-xl font-bold">{asset.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 py-6">
        {/* Asset Info Cards */}
        <div className="space-y-3">
          {/* Type */}
          {asset.asset_type?.name && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Tag className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="font-medium text-foreground">{asset.asset_type.name}</p>
              </div>
            </div>
          )}

          {/* Location */}
          {asset.location?.name && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="font-medium text-foreground">{asset.location.name}</p>
              </div>
            </div>
          )}

          {/* Serial Number */}
          {asset.serial_number && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Hash className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serial Number</p>
                <p className="font-medium font-mono text-foreground">{asset.serial_number}</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          {canStart && (
            <Button
              className="w-full h-14 text-lg"
              size="lg"
              onClick={handleStartVisit}
            >
              <Play className="mr-2 h-5 w-5" />
              Start Service Visit
            </Button>
          )}

          <Link to={`/maintenance/assets/${asset.id}`} className="block">
            <Button variant="outline" className="w-full" size="lg">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Full Details
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          MaintainProof
        </p>
      </div>
    </div>
  );
}
