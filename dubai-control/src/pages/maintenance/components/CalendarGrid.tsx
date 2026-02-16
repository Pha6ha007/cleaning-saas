// dubai-control/src/pages/maintenance/components/CalendarGrid.tsx
// Stage 11.1: Calendar View - Month grid with drag-and-drop

import { useMemo, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { CalendarDayCell } from "./CalendarDayCell";
import { CalendarVisitCard, type CalendarVisit } from "./CalendarVisitCard";

interface CalendarGridProps {
  currentMonth: Date;
  visits: CalendarVisit[];
  onVisitClick: (visitId: number) => void;
  onDayClick?: (date: Date) => void;
  onReschedule?: (visitId: number, newDate: string) => void;
  canCreate?: boolean;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarGrid({
  currentMonth,
  visits,
  onVisitClick,
  onDayClick,
  onReschedule,
  canCreate = false,
}: CalendarGridProps) {
  // Sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    })
  );

  // Generate all days to display (including prev/next month padding)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Start week on Monday (weekStartsOn: 1)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group visits by date (YYYY-MM-DD key)
  const visitsByDate = useMemo(() => {
    const map = new Map<string, CalendarVisit[]>();
    visits.forEach((visit) => {
      const dateKey = visit.scheduledDate; // YYYY-MM-DD
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(visit);
    });
    return map;
  }, [visits]);

  const today = new Date();

  // Handle drag end - reschedule visit
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !onReschedule) return;

      // Extract visit ID from draggable ID (format: "visit-123")
      const visitId = Number(String(active.id).replace("visit-", ""));
      // Extract date from droppable ID (format: "day-2026-02-15")
      const newDate = String(over.id).replace("day-", "");

      // Get current visit date
      const visit = active.data.current?.visit as CalendarVisit | undefined;
      if (!visit) return;

      // Only reschedule if date changed
      if (visit.scheduledDate !== newDate) {
        onReschedule(visitId, newDate);
      }
    },
    [onReschedule]
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="border border-border rounded-[6px] overflow-hidden bg-card">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2 border-r border-b border-border last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date) => {
            const dateKey = format(date, "yyyy-MM-dd");
            const dayVisits = visitsByDate.get(dateKey) || [];

            return (
              <CalendarDayCell
                key={dateKey}
                date={date}
                visits={dayVisits}
                isCurrentMonth={isSameMonth(date, currentMonth)}
                isToday={isSameDay(date, today)}
                onVisitClick={onVisitClick}
                onDayClick={onDayClick}
                canCreate={canCreate}
              />
            );
          })}
        </div>
      </div>
    </DndContext>
  );
}

export default CalendarGrid;
