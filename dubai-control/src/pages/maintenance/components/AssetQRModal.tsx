// dubai-control/src/pages/maintenance/components/AssetQRModal.tsx
// QR Code modal for assets (Stage 8)

import { useRef, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { X, Printer, Download } from "lucide-react";

interface AssetQRModalProps {
  asset: {
    id: number;
    name: string;
    serial_number?: string;
    location?: { name: string };
    asset_type?: { name: string };
  };
  open: boolean;
  onClose: () => void;
}

export function AssetQRModal({ asset, open, onClose }: AssetQRModalProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Generate the Quick Access URL
  const qrUrl = `${window.location.origin}/maintenance/qr/${asset.id}`;

  // Open print page in new tab
  const handlePrint = useCallback(() => {
    window.open(`/maintenance/assets/${asset.id}/qr?print=1`, "_blank");
  }, [asset.id]);

  // Download QR code as PNG
  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `asset-${asset.id}-qr.png`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [asset.id]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">QR Code</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan to access asset info
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col items-center">
          {/* QR Code SVG for display */}
          <div className="p-4 bg-white rounded-lg">
            <QRCodeSVG
              value={qrUrl}
              size={200}
              level="M"
              includeMargin={false}
            />
          </div>

          {/* Hidden canvas for download */}
          <div ref={canvasRef} className="hidden">
            <QRCodeCanvas
              value={qrUrl}
              size={400}
              level="M"
              includeMargin={true}
            />
          </div>

          {/* Asset Info */}
          <div className="mt-4 text-center">
            <p className="font-medium text-foreground">{asset.name}</p>
            {asset.serial_number && (
              <p className="text-sm text-muted-foreground font-mono">
                {asset.serial_number}
              </p>
            )}
            {asset.asset_type?.name && (
              <p className="text-xs text-muted-foreground mt-1">
                {asset.asset_type.name}
              </p>
            )}
          </div>

          {/* URL Preview */}
          <p className="mt-3 text-xs text-muted-foreground break-all max-w-full px-4 text-center">
            {qrUrl}
          </p>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-center gap-3 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
