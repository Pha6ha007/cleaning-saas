// dubai-control/src/pages/maintenance/AssetQRPrint.tsx
// Printable QR code page for assets (Stage 8)

import { useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAsset, maintenanceKeys } from "@/api/maintenance";
import { useUserRole, type UserRole } from "@/hooks/useUserRole";

// RBAC: Check if user can print QR (owner/manager/staff)
function canPrintQR(role: UserRole): boolean {
  return role === "owner" || role === "manager" || role === "staff";
}

export default function AssetQRPrint() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useUserRole();

  const hasAccess = canPrintQR(user.role);
  const assetId = Number(id);
  const autoPrint = searchParams.get("print") === "1";

  // Fetch asset data
  const {
    data: asset,
    isLoading,
    isError,
  } = useQuery({
    queryKey: maintenanceKeys.assets.detail(assetId),
    queryFn: () => getAsset(assetId),
    enabled: hasAccess && !isNaN(assetId),
  });

  // Auto-print when data is loaded and ?print=1 is in URL
  useEffect(() => {
    if (autoPrint && asset && !isLoading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, asset, isLoading]);

  // Generate the Quick Access URL
  const qrUrl = `${window.location.origin}/maintenance/qr/${assetId}`;

  // Access restricted
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Access Restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have permission to print QR codes.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/maintenance/assets")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error
  if (isError || !asset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground">Asset Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Could not load asset #{id}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => navigate("/maintenance/assets")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print-specific styles */}
      <style>
        {`
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .print-container {
              padding: 0 !important;
              margin: 0 auto !important;
            }
          }
        `}
      </style>

      {/* Back button (hidden when printing) */}
      <div className="no-print fixed top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/maintenance/assets/${assetId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Asset
        </Button>
      </div>

      {/* Print button (hidden when printing) */}
      <div className="no-print fixed top-4 right-4 z-10">
        <Button size="sm" onClick={() => window.print()}>
          Print QR Code
        </Button>
      </div>

      {/* Printable content */}
      <div className="print-container min-h-screen flex items-center justify-center bg-white p-8">
        <div className="text-center">
          {/* QR Code */}
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
            <QRCodeSVG
              value={qrUrl}
              size={300}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Asset Info */}
          <div className="mt-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {asset.name}
            </h1>
            {asset.serial_number && (
              <p className="mt-2 text-lg font-mono text-gray-600">
                {asset.serial_number}
              </p>
            )}
            {asset.asset_type?.name && (
              <p className="mt-1 text-sm text-gray-500">
                {asset.asset_type.name}
              </p>
            )}
            {asset.location?.name && (
              <p className="mt-1 text-sm text-gray-500">
                {asset.location.name}
              </p>
            )}
          </div>

          {/* Scan instruction */}
          <p className="mt-6 text-xs text-gray-400">
            Scan to access asset details
          </p>
        </div>
      </div>
    </>
  );
}
