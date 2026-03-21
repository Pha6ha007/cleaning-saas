// dubai-control/src/components/a11y/OfflineBanner.tsx
// Shows a non-dismissible banner when the user goes offline
// Auto-hides when connection is restored

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Hide "back online" message after 3 seconds
      setTimeout(() => setWasOffline(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`sticky top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors duration-300 ${
        isOnline
          ? "bg-green-500 text-white"
          : "bg-gray-800 text-white"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          Back online
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          You're offline. Some features may not work.
        </>
      )}
    </div>
  );
}
