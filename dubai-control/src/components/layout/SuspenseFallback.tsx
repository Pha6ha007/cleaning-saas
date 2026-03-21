// dubai-control/src/components/layout/SuspenseFallback.tsx
// Shared loading skeleton shown while lazy route chunks load.

import { Loader2 } from "lucide-react";

/**
 * Full-viewport loading state for route-level Suspense boundaries.
 * Intentionally minimal — avoid layout shift by matching the shell structure.
 */
export function SuspenseFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/50" />
    </div>
  );
}

/**
 * Inline page skeleton — use inside a page that has its own loading state.
 */
export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-72 rounded bg-muted" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
