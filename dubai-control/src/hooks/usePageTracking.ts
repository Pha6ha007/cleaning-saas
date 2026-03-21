// dubai-control/src/hooks/usePageTracking.ts
// Lightweight page view tracking hook.
// Sends events to backend analytics endpoint.
// Respects DNT (Do Not Track) and demo sessions.

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

const ANALYTICS_ENDPOINT = `${API_BASE_URL}/api/analytics/page-view/`;

interface PageViewEvent {
  path: string;
  referrer: string;
  timestamp: string;
  session_id: string;
}

/** Get or create a session ID (anonymous, no PII) */
function getSessionId(): string {
  const key = "proof_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, id);
  }
  return id;
}

/** Check if tracking should be disabled */
function isTrackingDisabled(): boolean {
  // Respect DNT header
  if (navigator.doNotTrack === "1") return true;
  // Don't track demo sessions
  if (localStorage.getItem("is_demo") === "true") return true;
  // Don't track in development
  if (import.meta.env.DEV) return true;
  return false;
}

/**
 * Send page view event.
 * Fire-and-forget — analytics should never block the UI.
 */
function sendPageView(event: PageViewEvent): void {
  try {
    // Use sendBeacon for reliability on page unload
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(event)], {
        type: "application/json",
      });
      navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
    } else {
      fetch(ANALYTICS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silently fail — analytics must never crash the app
  }
}

/**
 * Hook to track page views on route changes.
 * Add to App.tsx or AppLayout.tsx.
 */
export function usePageTracking(): void {
  const location = useLocation();

  useEffect(() => {
    if (isTrackingDisabled()) return;

    // Small delay to batch rapid navigations (redirects)
    const timer = setTimeout(() => {
      sendPageView({
        path: location.pathname,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
        session_id: getSessionId(),
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [location.pathname]);
}
