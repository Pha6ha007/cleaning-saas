// dubai-control/src/components/maintenance/OfflineIndicator.tsx
/**
 * Offline sync status indicator
 * V3 PWA Enhancement - Phase 1: Offline Photo Capture
 */

import { useEffect, useState } from "react";
import { Wifi, WifiOff, Upload, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getPendingPhotos, getPendingSyncItems } from "@/lib/indexedDB";

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Poll for pending items
  useEffect(() => {
    async function checkPending() {
      try {
        const [photos, syncItems] = await Promise.all([
          getPendingPhotos(),
          getPendingSyncItems(),
        ]);
        setPendingCount(photos.length + syncItems.length);
      } catch (error) {
        console.error("Failed to check pending items:", error);
      } finally {
        setLoading(false);
      }
    }

    checkPending();

    // Poll every 5 seconds
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Don't show if online and no pending items
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
        isOnline
          ? "bg-blue-100/90 text-blue-900 border border-blue-200"
          : "bg-amber-100/90 text-amber-900 border border-amber-200"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-medium">Checking...</span>
        </>
      ) : isOnline ? (
        <>
          {pendingCount > 0 ? (
            <>
              <Upload className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">
                Syncing {pendingCount} item{pendingCount > 1 ? "s" : ""}...
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">All synced</span>
            </>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            Offline
            {pendingCount > 0 && ` • ${pendingCount} pending`}
          </span>
        </>
      )}
    </div>
  );
}
