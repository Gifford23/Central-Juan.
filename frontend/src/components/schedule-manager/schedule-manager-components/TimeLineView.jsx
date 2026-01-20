import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  LabelList,
  Cell,
} from "recharts";

/**
 * TimelineView Component
 *
 * Props:
 * - schedules: array of schedules with fields:
 *   {
 *     employee_id,
 *     first_name,
 *     last_name,
 *     days_of_week,     // e.g., "Mon,Tue"
 *     start_time,       // e.g., "09:00:00"
 *     end_time,         // e.g., "17:00:00"
 *     shift_name
 *   }
 *
 * Features:
 * - Shows employee on Y axis.
 * - X axis = 0-24 hours.
 * - Each shift = block from start_time → end_time.
 * - Overlaps marked red.
 */
export default function TimelineView({ schedules = [] }) {
  // convert HH:MM:SS → numeric hour
  const toHour = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return h + m / 60;
  };

  // Build chart data per employee
  const data = useMemo(() => {
    const grouped = {};

    schedules.forEach((s) => {
      const empName = `${s.first_name || ""} ${s.last_name || ""}`.trim();
      if (!grouped[empName]) grouped[empName] = [];

      grouped[empName].push({
        ...s,
        start: toHour(s.start_time),
        end: toHour(s.end_time),
      });
    });

    // Detect overlaps and mark them
    Object.keys(grouped).forEach((emp) => {
      const shifts = grouped[emp];
      shifts.forEach((shift, i) => {
        shift.color = "#60a5fa"; // blue default
        shifts.forEach((other, j) => {
          if (i !== j) {
            const overlap =
              shift.start < other.end && shift.end > other.start;
            if (overlap) {
              shift.color = "#ef4444"; // red on conflict
            }
          }
        });
      });
    });

    return Object.entries(grouped).map(([emp, shifts]) => ({
      employee: emp,
      shifts,
    }));
  }, [schedules]);

  // Flatten into chart-friendly data
  const flatData = data.flatMap((emp) =>
    emp.shifts.map((s, idx) => ({
      employee: emp.employee,
      start: s.start,
      duration: s.end - s.start,
      shift_name: s.shift_name,
      days_of_week: s.days_of_week,
      color: s.color,
      key: `${emp.employee}-${idx}`,
    }))
  );

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={flatData}
          margin={{ top: 20, right: 20, left: 60, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {/* X = time in hours */}
          <XAxis
            type="number"
            domain={[0, 24]}
            tickFormatter={(h) => `${h}:00`}
          />
          {/* Y = employees */}
          <YAxis type="category" dataKey="employee" width={120} />
          <Tooltip
            formatter={(val, name, props) => {
              if (name === "duration") {
                return `${props.payload.start}:00 - ${
                  props.payload.start + val
                }:00`;
              }
              return val;
            }}
            labelFormatter={(label) => `Employee: ${label}`}
          />
          <Bar
            dataKey="duration"
            stackId="a"
            barSize={20}
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="shift_name"
              position="insideRight"
              style={{ fill: "white", fontSize: "10px" }}
            />
            {flatData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                stroke="#1e293b"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
