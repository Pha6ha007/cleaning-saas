// dubai-control/src/pages/maintenance/components/CalendarVisitCard.tsx
// Stage 11.1: Calendar View - Draggable visit card

import { AlertTriangle, GripVertical } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export type VisitStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type VisitPriority = "low" | "medium" | "high";

export interface CalendarVisit {
  id: number;
  status: VisitStatus;
  assetName?: string;
  technicianName?: string;
  priority?: VisitPriority;
  slaStatus?: "ok" | "violated";
  scheduledDate: string;
}

interface CalendarVisitCardProps {
  visit: CalendarVisit;
  onClick?: (visitId: number) => void;
  compact?: boolean;
  draggable?: boolean;
}

const statusConfig: Record<VisitStatus, { dot: string; bg: string }> = {
  scheduled: { dot: "bg-blue-500", bg: "bg-blue-50 hover:bg-blue-100" },
  in_progress: { dot: "bg-amber-500", bg: "bg-amber-50 hover:bg-amber-100" },
  completed: { dot: "bg-emerald-500", bg: "bg-emerald-50 hover:bg-emerald-100" },
  cancelled: { dot: "bg-gray-400", bg: "bg-gray-50 hover:bg-gray-100" },
};

const priorityBorder: Record<VisitPriority, string> = {
  low: "",
  medium: "border-l-2 border-l-orange-400",
  high: "border-l-2 border-l-red-500",
};

export function CalendarVisitCard({
  visit,
  onClick,
  compact = false,
  draggable = true,
}: CalendarVisitCardProps) {
  const config = statusConfig[visit.status] || statusConfig.scheduled;
  const border = visit.priority ? priorityBorder[visit.priority] : "";

  // Only allow drag for non-completed/cancelled visits
  const canDrag = draggable && visit.status !== "completed" && visit.status !== "cancelled";

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `visit-${visit.id}`,
    data: { visit },
    disabled: !canDrag,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : undefined,
      }
    : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onClick?.(visit.id);
    }
  };

  if (compact) {
    // Ultra-compact view for small cells (just a dot)
    return (
      <button
        ref={setNodeRef}
        style={style}
        onClick={handleClick}
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          config.dot,
          isDragging && "opacity-50"
        )}
        title={visit.assetName || `Visit #${visit.id}`}
        {...(canDrag ? { ...listeners, ...attributes } : {})}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "w-full text-left rounded-[4px] px-1.5 py-1 text-xs transition-colors group",
        config.bg,
        border,
        isDragging && "opacity-50 shadow-lg ring-2 ring-[hsl(188,45%,24%)]",
        canDrag && "cursor-grab active:cursor-grabbing"
      )}
      onClick={handleClick}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
    >
      <div className="flex items-start gap-1">
        {canDrag && (
          <GripVertical className="w-3 h-3 text-muted-foreground/50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
        <span className={cn("w-1.5 h-1.5 rounded-full mt-1 shrink-0", config.dot)} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate text-[11px] leading-tight">
            {visit.assetName || `Visit #${visit.id}`}
          </p>
          {visit.technicianName && (
            <p className="text-muted-foreground truncate text-[10px] leading-tight">
              {visit.technicianName}
            </p>
          )}
        </div>
        {visit.slaStatus === "violated" && (
          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
        )}
        {visit.priority === "high" && (
          <span className="text-red-500 font-bold text-[10px]">!</span>
        )}
      </div>
    </div>
  );
}

export default CalendarVisitCard;
