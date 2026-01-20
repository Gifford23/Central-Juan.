import React, { useMemo } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeSlots = [
  { key: "morning", label: "Morning (6AM–12PM)", start: 6, end: 12 },
  { key: "afternoon", label: "Afternoon (12PM–6PM)", start: 12, end: 18 },
  { key: "night", label: "Night (6PM–12AM)", start: 18, end: 24 },
];

export default function HeatMapViewSM({ schedules = [] }) {
  // Pre-process schedules into day-slot map
  const heatmapData = useMemo(() => {
    const map = {};
    days.forEach((d) => {
      map[d] = {};
      timeSlots.forEach((slot) => {
        map[d][slot.key] = [];
      });
    });

    schedules.forEach((sch) => {
      const shiftDays = sch.days_of_week ? sch.days_of_week.split(",") : [];
      const startHour = parseInt(sch.start_time?.split(":")[0] || 0, 10);
      const endHour = parseInt(sch.end_time?.split(":")[0] || 0, 10);

      shiftDays.forEach((day) => {
        timeSlots.forEach((slot) => {
          if (startHour < slot.end && endHour > slot.start) {
            map[day][slot.key].push(sch);
          }
        });
      });
    });

    return map;
  }, [schedules]);

  return (
    <div className="flex flex-col w-full">
      {/* Header row (days of week) */}
      <div className="grid grid-cols-8 gap-2 mb-2">
        <div className="font-semibold text-gray-600">Time Slot</div>
        {days.map((d) => (
          <div key={d} className="text-center font-semibold text-gray-700">
            {d}
          </div>
        ))}
      </div>

      {/* Heatmap rows */}
      {timeSlots.map((slot) => (
        <div key={slot.key} className="grid grid-cols-8 gap-2 mb-2">
          {/* Time slot label */}
          <div className="text-sm font-medium text-gray-600">{slot.label}</div>

          {/* Cells */}
          {days.map((d) => {
            const shifts = heatmapData[d][slot.key];
            const conflict = shifts.length > 1;

            return (
              <div
                key={d}
                className={`h-12 flex items-center justify-center rounded-md text-xs font-medium cursor-pointer transition-colors
                  ${
                    shifts.length === 0
                      ? "bg-gray-100 text-gray-400"
                      : conflict
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }
                `}
                title={
                  shifts.length > 0
                    ? shifts
                        .map(
                          (s) =>
                            `${s.shift_name} (${s.start_time}–${s.end_time})`
                        )
                        .join("\n")
                    : "No shift"
                }
              >
                {shifts.length === 0
                  ? "-"
                  : conflict
                  ? `${shifts.length} Overlaps`
                  : shifts.length}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
