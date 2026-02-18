// dubai-control/src/components/maintenance/PhotoCapture.tsx
/**
 * Photo capture component with offline support
 * V3 PWA Enhancement - Phase 1: Offline Photo Capture
 */

import { useState, useRef, useCallback } from "react";
import { Camera, Upload, X, Loader2, CheckCircle2, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflinePhotos } from "@/hooks/useOfflinePhotos";
import type { OfflinePhoto } from "@/lib/indexedDB";

interface PhotoCaptureProps {
  visitId: number;
  photoType: "before" | "after";
  existingPhoto?: { url: string } | null;
  offlinePhoto?: OfflinePhoto | null;
  onPhotoCaptured?: (file: File) => void;
  disabled?: boolean;
}

export function PhotoCapture({
  visitId,
  photoType,
  existingPhoto,
  offlinePhoto: offlinePhotoProp,
  onPhotoCaptured,
  disabled = false,
}: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isOnline = useOnlineStatus();

  // Use offline hooks directly
  const { capturePhoto: capturePhotoOffline, getPhotoByType } = useOfflinePhotos(visitId);

  // Use local hook data, fallback to prop for backwards compatibility
  const offlinePhoto = getPhotoByType(photoType) || offlinePhotoProp;

  // Determine current photo URL - PRIORITY: offline first, then server
  const offlinePhotoUrl = offlinePhoto ? URL.createObjectURL(offlinePhoto.blob) : null;
  const serverPhotoUrl = existingPhoto?.url || null;
  const currentPhotoUrl = offlinePhotoUrl || serverPhotoUrl;

  // Debug logging
  console.log(`[PhotoCapture ${photoType}] Display priority:`, {
    visitId,
    hasOffline: !!offlinePhoto,
    hasServer: !!existingPhoto,
    showing: currentPhotoUrl ? (offlinePhotoUrl ? 'OFFLINE' : 'SERVER') : 'NONE',
    offlineStatus: offlinePhoto?.status,
    useHook: !!getPhotoByType(photoType),
    useProp: !!offlinePhotoProp,
  });

  // Handle file selection
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Image must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      // Generate preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // ALWAYS save to IndexedDB (online or offline)
      // Background sync will handle upload automatically
      (async () => {
        try {
          console.log(`[PhotoCapture ${photoType}] Saving to IndexedDB...`);

          // Use offline hook directly
          await capturePhotoOffline(file, photoType);

          console.log(`[PhotoCapture ${photoType}] Saved to IndexedDB successfully`);

          toast({
            title: "Photo saved",
            description: isOnline ? "Photo will be uploaded automatically" : "Photo saved offline, will upload when online",
          });

          // Call legacy callback if provided (backwards compatibility)
          if (onPhotoCaptured) {
            onPhotoCaptured(file);
          }
        } catch (error) {
          console.error(`[PhotoCapture ${photoType}] Failed to save:`, error);
          toast({
            title: "Error saving photo",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        }
      })();
    },
    [toast, isOnline, onPhotoCaptured, capturePhotoOffline, photoType]
  );

  // No manual upload - background sync handles it automatically

  // Cancel preview
  const handleCancel = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  // Trigger file input
  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Render sync status badge
  const renderSyncStatus = () => {
    if (!offlinePhoto) return null;

    const statusConfig = {
      pending: { icon: Upload, color: "text-amber-600", label: "Pending upload" },
      uploading: { icon: Loader2, color: "text-blue-600", label: "Uploading...", spin: true },
      uploaded: { icon: CheckCircle2, color: "text-green-600", label: "Uploaded" },
      failed: { icon: AlertCircle, color: "text-red-600", label: "Upload failed" },
    };

    const config = statusConfig[offlinePhoto.status];
    const Icon = config.icon;

    return (
      <div className={`flex items-center gap-1 text-xs ${config.color}`}>
        <Icon className={`h-3 w-3 ${"spin" in config && config.spin ? "animate-spin" : ""}`} />
        <span>{config.label}</span>
      </div>
    );
  };

  return (
    <div>
      <div className="text-[10px] font-medium text-muted-foreground mb-1 uppercase flex items-center justify-between">
        <span>{photoType}</span>
        {!isOnline && (
          <div className="flex items-center gap-1 text-amber-600">
            <WifiOff className="h-3 w-3" />
            <span>Offline</span>
          </div>
        )}
      </div>

      {/* Photo Preview */}
      <div className="relative">
        {currentPhotoUrl || preview ? (
          <a
            href={currentPhotoUrl || preview || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src={currentPhotoUrl || preview || ""}
              alt={`${photoType} photo`}
              className="w-full h-32 object-cover rounded border border-border hover:opacity-90 transition-opacity"
            />
          </a>
        ) : (
          <div className="w-full h-32 rounded border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2">
            <Camera className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">No photo</span>
          </div>
        )}

        {/* Sync Status Badge */}
        {offlinePhoto && (
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-2 py-1">
            {renderSyncStatus()}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleButtonClick}
          disabled={disabled}
          className="flex-1"
        >
          <Camera className="h-3 w-3 mr-1" />
          {currentPhotoUrl ? "Replace" : "Capture"}
        </Button>
        {preview && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
