// dubai-control/src/components/layout/PageTransition.tsx
// Wraps page content with a subtle fade-in + slide-up animation

import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to ensure the initial state renders before animation
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        mounted
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2",
        className
      )}
    >
      {children}
    </div>
  );
}
