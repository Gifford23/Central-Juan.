import React, { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

/**
 * schedules: [
 *   {
 *     schedule_id,
 *     employee_id,
 *     first_name,
 *     last_name,
 *     effective_date,
 *     end_date,
 *     days_of_week,  // "Mon,Tue" etc.
 *     start_time,
 *     end_time,
 *     shift_name,
 *     priority
 *   }
 * ]
 */
export default function CalendarViewSchedule({ schedules }) {
  // 🔄 Transform schedules → FullCalendar events
  const events = useMemo(() => {
    if (!Array.isArray(schedules)) return [];

    return schedules.flatMap((s) => {
      // handle recurring days_of_week
      const days = s.days_of_week ? s.days_of_week.split(",") : [];

      // map days into numeric codes for FullCalendar (0=Sun, 1=Mon...)
      const dayMap = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      };

      const daysOfWeek = days.map((d) => dayMap[d.trim()]).filter((d) => d !== undefined);

      return {
        id: s.schedule_id,
        title: `${s.shift_name || "Shift"} (${s.first_name || ""} ${s.last_name || ""})`,
        startTime: s.start_time,
        endTime: s.end_time,
        startRecur: s.effective_date,
        endRecur: s.end_date || undefined,
        daysOfWeek: daysOfWeek, // recurrence
        color: s.priority > 1 ? "#ef4444" : "#3b82f6", // red if priority > 1
      };
    });
  }, [schedules]);

  return (
    <div className="w-full h-[600px]">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={events}
        height="100%"
        nowIndicator
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
}
