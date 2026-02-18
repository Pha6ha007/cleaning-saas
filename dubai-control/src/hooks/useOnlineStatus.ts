// dubai-control/src/hooks/useOnlineStatus.ts
/**
 * Hook to track online/offline status
 * V3 PWA Enhancement - Phase 1: Offline Photo Capture
 */

import { useState, useEffect } from "react";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    console.log('[useOnlineStatus] Initial online status:', navigator.onLine);

    function handleOnline() {
      console.log('[useOnlineStatus] Event: online');
      setIsOnline(true);
    }

    function handleOffline() {
      console.log('[useOnlineStatus] Event: offline');
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
