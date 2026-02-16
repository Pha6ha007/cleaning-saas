// dubai-control/src/pages/maintenance/components/CalendarDayCell.tsx
// Stage 11.1: Calendar View - Droppable day cell

import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { CalendarVisitCard, type CalendarVisit } from "./CalendarVisitCard";

interface CalendarDayCellProps {
  date: Date;
  visits: CalendarVisit[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onVisitClick: (visitId: number) => void;
  onDayClick?: (date: Date) => void;
  canCreate?: boolean;
}

const MAX_VISIBLE_VISITS = 3;

export function CalendarDayCell({
  date,
  visits,
  isCurrentMonth,
  isToday,
  onVisitClick,
  onDayClick,
  canCreate = false,
}: CalendarDayCellProps) {
  const dayNumber = date.getDate();
  const dateStr = format(date, "yyyy-MM-dd");
  const hiddenCount = visits.length > MAX_VISIBLE_VISITS ? visits.length - MAX_VISIBLE_VISITS : 0;
  const visibleVisits = visits.slice(0, MAX_VISIBLE_VISITS);

  // Droppable for drag-and-drop rescheduling
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateStr}`,
    data: { date: dateStr },
  });

  const handleCellClick = () => {
    if (canCreate && onDayClick) {
      onDayClick(date);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] border-r border-b border-border p-1 transition-colors",
        !isCurrentMonth && "bg-muted/30",
        isCurrentMonth && "bg-background",
        canCreate && "cursor-pointer hover:bg-muted/50 group",
        isOver && "bg-[hsl(188,45%,90%)] ring-2 ring-inset ring-[hsl(188,45%,24%)]"
      )}
      onClick={handleCellClick}
    >
      {/* Day header */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
            isToday && "bg-[hsl(188,45%,24%)] text-white",
            !isToday && isCurrentMonth && "text-foreground",
            !isToday && !isCurrentMonth && "text-muted-foreground"
          )}
        >
          {dayNumber}
        </span>
        {canCreate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDayClick?.(date);
            }}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
            title="Create visit"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Visit cards */}
      <div className="space-y-0.5">
        {visibleVisits.map((visit) => (
          <CalendarVisitCard
            key={visit.id}
            visit={visit}
            onClick={onVisitClick}
          />
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Could open a popup with all visits for this day
            }}
            className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground py-0.5"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
    </div>
  );
}

export default CalendarDayCell;
