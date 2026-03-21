// dubai-control/src/components/maintenance/EmptyState.tsx
// Rich empty state component for maintenance pages with illustration + guidance

import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional quick-start guidance steps */
  steps?: { label: string; done?: boolean }[];
  className?: string;
  children?: ReactNode;
}

export function MaintenanceEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  steps,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-6",
        className
      )}
    >
      {/* Illustration circle */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Icon className="h-10 w-10 text-muted-foreground/40" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/20" />
        <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-primary/10" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {/* CTA Button */}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mb-6">
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}

      {/* Quick-start steps */}
      {steps && steps.length > 0 && (
        <div className="w-full max-w-xs border border-border rounded-xl p-4 bg-card">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Getting started
          </p>
          <ol className="space-y-2.5">
            {steps.map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done
                      ? "bg-green-100 text-green-700"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <span className={cn(step.done && "text-muted-foreground line-through")}>
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {children}
    </div>
  );
}
