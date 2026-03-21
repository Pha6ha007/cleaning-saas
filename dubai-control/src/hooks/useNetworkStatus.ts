// dubai-control/src/hooks/useNetworkStatus.ts
// Tracks online/offline status and provides retry capability
// Use in pages that make API calls to show appropriate states

import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  /** Whether the browser reports being online */
  isOnline: boolean;
  /** True when the user was offline and just came back */
  justReconnected: boolean;
  /** Number of seconds since last status change */
  secondsSinceChange: number;
  /** Force retry of pending operations */
  retry: () => void;
  /** Retry counter — increments on each retry() call */
  retryCount: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastChange, setLastChange] = useState(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setJustReconnected(true);
      setLastChange(Date.now());
      setTimeout(() => setJustReconnected(false), 5000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setJustReconnected(false);
      setLastChange(Date.now());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return {
    isOnline,
    justReconnected,
    secondsSinceChange: Math.floor((Date.now() - lastChange) / 1000),
    retry,
    retryCount,
  };
}
