// dubai-control/src/contexts/maintenance/ui/BulkActionBar.tsx
// Stage 10: Bulk Operations - Action Bar Component

import { Button } from "@/components/ui/button";
import { UserPlus, XCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  onAssign: () => void;
  onCancel: () => void;
  onClear: () => void;
  canWrite?: boolean;
}

/**
 * Sticky action bar that appears when visits are selected.
 * Shows selected count and bulk action buttons.
 */
export function BulkActionBar({
  selectedCount,
  onAssign,
  onCancel,
  onClear,
  canWrite = true,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card border-t border-border shadow-lg",
        "animate-in slide-in-from-bottom-4 duration-200"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Selection info */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            {selectedCount} visit{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>

        {/* Right: Action buttons */}
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAssign}
              className="gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Assign Technician
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="w-4 h-4" />
              Cancel Visits
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BulkActionBar;
