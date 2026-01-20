// src/schedule-components/ListView.jsx per employee    
import React, { useMemo } from "react";

// Utility: format time
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 || 12;
  return `${normalized}:${m} ${suffix}`;
};

// Days of week order
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ListViewSchedule({ schedules = [] }) {
  // Group by day_of_week
  const grouped = useMemo(() => {
    const result = {};
    DAYS.forEach((day) => (result[day] = []));
    schedules.forEach((s) => {
      if (!s.days_of_week) return;
      const days = s.days_of_week.split(",");
      days.forEach((d) => {
        if (!result[d]) result[d] = [];
        result[d].push(s);
      });
    });
    return result;
  }, [schedules]);

  // Conflict detection
  const checkConflicts = (dayShifts) => {
    let conflicts = new Set();
    for (let i = 0; i < dayShifts.length; i++) {
      for (let j = i + 1; j < dayShifts.length; j++) {
        const a = dayShifts[i];
        const b = dayShifts[j];
        const aStart = new Date(`1970-01-01T${a.start_time}`);
        const aEnd = new Date(`1970-01-01T${a.end_time}`);
        const bStart = new Date(`1970-01-01T${b.start_time}`);
        const bEnd = new Date(`1970-01-01T${b.end_time}`);

        // overlap check
        if (aStart < bEnd && aEnd > bStart) {
          conflicts.add(a.schedule_id);
          conflicts.add(b.schedule_id);
        }
      }
    }
    return conflicts;
  };

  return (
    <div className="flex flex-col gap-4">
      {DAYS.map((day) => {
        const shifts = grouped[day] || [];
        if (shifts.length === 0) return null;

        const conflicts = checkConflicts(shifts);

        return (
          <div key={day} className="flex flex-col">
            {/* Day header */}
            <h3 className="mb-1 text-sm font-semibold text-indigo-700">
              {day}
            </h3>

            <div className="flex flex-col gap-2">
              {shifts.map((shift) => {
                const isConflict = conflicts.has(shift.schedule_id);
                return (
                  <div
                    key={shift.schedule_id}
                    className={`p-3 rounded-lg shadow-sm border text-sm ${
                      isConflict
                        ? "bg-red-50 border-red-400"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">
                        {formatTime(shift.start_time)} –{" "}
                        {formatTime(shift.end_time)}
                      </span>
                      <span className="text-xs text-gray-500">
                        Priority {shift.priority || 1}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">
                      {shift.recurrence_type !== "none"
                        ? `${shift.recurrence_type} (interval ${shift.recurrence_interval})`
                        : "One-time"}
                    </div>
                    {isConflict && (
                      <div className="mt-1 text-xs font-semibold text-red-600">
                        ⚠ Conflict with another shift
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
