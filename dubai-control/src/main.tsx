import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
// Initialize i18n before app renders
import "./i18n";
import { API_BASE_URL } from "@/lib/env";

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const SENTRY_ENVIRONMENT = (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) || "development";
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string) || "unknown";

// Initialize Sentry only when DSN is provided.
// In dev without a DSN this is a no-op — no network calls, no overhead.
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: APP_VERSION,
    integrations: [
      // Performance tracing for React components and navigation
      Sentry.browserTracingIntegration(),
      // Session replay — captures 10% of sessions, 100% on error
      Sentry.replayIntegration({
        maskAllText: true,       // GDPR: mask all text in replays
        blockAllMedia: true,     // GDPR: block media in replays
      }),
    ],
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0.0,
    // Capture 10% of sessions, 100% on error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Don't send PII
    sendDefaultPii: false,
    // Only trace requests to our own backend
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/app\.cleanproof\.com/,
    ],
  });
}

createRoot(document.getElementById("root")!).render(<App />);
