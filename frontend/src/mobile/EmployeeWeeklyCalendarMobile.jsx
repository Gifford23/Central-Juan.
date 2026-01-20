import React, { useEffect, useMemo, useState } from "react";
import ScheduleManagerAPI from "../components/schedule-manager/schedule-manager-API/ScheduleManagerAPI";

// helper: get Monday of a week containing `date`
const getMonday = (date = new Date()) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // convert so Monday=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

// format YYYY-MM-DD
const fmtYMD = (d) => d.toISOString().slice(0, 10);

// readable date formatter (e.g. October 6, 2025)
const fmtLongDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

// short header formatter e.g. Mon 14
const headerLabel = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
};

// format time "13:00:00" or "13:00" -> "1pm" or "1:30pm"
const formatTime = (t) => {
  if (!t) return null;
  const parts = String(t).split(":");
  const hour = parseInt(parts[0] || "0", 10);
  const min = parseInt(parts[1] || "0", 10);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return min === 0 ? `${h12}${ampm}` : `${h12}:${String(min).padStart(2, "0")}${ampm}`;
};

// normalize various backend shapes into a map: { 'YYYY-MM-DD': scheduleObject }
const normalizeSchedules = (raw, employeeId) => {
  if (!raw) return {};

  const normalizeItem = (v) => ({
    ...v,
    shift_name: v.shift_name || v.shift || v.label,
    start_time: formatTime(v.start_time),
    end_time: formatTime(v.end_time),
    work_time_id: v.work_time_id ?? v.work_timeid ?? v.work_time ?? v.worktime,
  });

  // handle multiple response shapes
  if (raw.schedules && typeof raw.schedules === "object") {
    const out = {};
    Object.entries(raw.schedules).forEach(([k, v]) => (out[k] = normalizeItem(v)));
    return out;
  }

  const keys = Object.keys(raw || {});
  if (keys.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(keys[0])) {
    const out = {};
    keys.forEach((k) => (out[k] = normalizeItem(raw[k])));
    return out;
  }

  if (Array.isArray(raw)) {
    const map = {};
    raw.forEach((r) => {
      const date =
        r.date ||
        r.schedule_date ||
        r.scheduleDate ||
        r.effective_date ||
        r.effectiveDate ||
        r.start_date;
      if (!date) return;
      map[date] = normalizeItem(r);
    });
    return map;
  }

  if (raw.groups && Array.isArray(raw.groups)) {
    for (const g of raw.groups) {
      if (!g.employees) continue;
      for (const emp of g.employees) {
        if (String(emp.employee_id) === String(employeeId) && emp.schedules) {
          const out = {};
          Object.entries(emp.schedules).forEach(([k, v]) => (out[k] = normalizeItem(v)));
          return out;
        }
      }
    }
  }

  if (raw.data) return normalizeSchedules(raw.data, employeeId);

  return {};
};

export default function EmployeeWeeklyCalendarMobile({ employeeId, weekOffset = 0 }) {
  const baseMonday = useMemo(() => {
    const monday = getMonday(new Date());
    monday.setDate(monday.getDate() + weekOffset * 7);
    return monday;
  }, [weekOffset]);

  // Monday..Sunday (7 days)
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseMonday);
      d.setDate(d.getDate() + i);
      arr.push(fmtYMD(d));
    }
    return arr;
  }, [baseMonday]);

  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [viewMode, setViewMode] = useState("week");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (!employeeId) return;
    let mounted = true;

    const fetchSchedules = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await ScheduleManagerAPI.readSchedules(employeeId);
        const payload = res?.data ?? res;
        const fullMap = normalizeSchedules(payload, employeeId);

        let filtered = {};
        if (viewMode === "week") {
          days.forEach((d) => {
            if (fullMap[d]) filtered[d] = fullMap[d];
          });
        } else {
          Object.keys(fullMap).forEach((k) => {
            if (k.startsWith(selectedMonth)) filtered[k] = fullMap[k];
          });
        }

        if (mounted) setSchedules(filtered);
      } catch (err) {
        console.error("Error fetching schedule:", err);
        if (mounted) {
          setError("Unable to load schedule.");
          setSchedules({});
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSchedules();
    return () => {
      mounted = false;
    };
  }, [employeeId, days, viewMode, selectedMonth]);

  const colorFor = (id) => {
    if (!id) return "linear-gradient(90deg,#e5e7eb,#f3f4f6)";
    const n = parseInt(String(id).replace(/\D/g, "") || "0", 10);
    const hue = (n * 137) % 360;
    return `linear-gradient(90deg, hsl(${hue} 70% 45%), hsl(${(hue + 20) % 360} 70% 50%))`;
  };

  const todayYMD = new Date().toISOString().slice(0, 10);

  const DayCellEmpty = ({ keyName }) => (
    <div key={keyName} className="h-12 rounded-md" />
  );

  const MonthDayCell = ({ dateStr, dayNum, shift }) => {
    const filled = !!shift;
    return (
      <button
        key={dateStr}
        onClick={() => filled && setSelected({ date: dateStr, shift })}
        className={`h-12 rounded-md flex flex-col items-center justify-center px-1 ${
          filled
            ? "text-white shadow-sm"
            : "text-gray-400 border border-gray-100 bg-gray-50"
        }`}
        style={filled ? { background: colorFor(shift.work_time_id) } : {}}
      >
        <div className="font-medium text-sm leading-none">{dayNum}</div>
        {filled && (
          <div className="text-[9px] truncate max-w-[70px]" title={shift.shift_name}>
            {shift.shift_name}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="text-sm font-semibold text-gray-700">
          {viewMode === "week" ? "This week" : ` Month of  `}
          {/* {viewMode === "week" ? "This week" : `Monthly — ${selectedMonth}`} */}

        </div>

      <div className="flex gap-2 items-center ">
          {viewMode === "month" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-[140px] sm:w-[110px] md:w-[200px] border border-gray-300 rounded-md 
              text-xs px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          )}

          <button
            onClick={() => setViewMode((p) => (p === "week" ? "month" : "week"))}
            className="px-2 py-1 text-xs text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            {viewMode === "week" ? "View Month" : "View Week"}
          </button>
        </div>
      </div>

      <div className="p-3 bg-white shadow-sm rounded-2xl">
        {/* Weekly View (hidden when month is active) */}
        {viewMode === "week" && (
          <>
            <div className="grid grid-cols-7 gap-2">
              {days.map((d) => {
                const isToday = todayYMD === d;
                return (
                  <div
                    key={d}
                    className={`text-center text-xs font-medium pb-1 ${
                      isToday ? "text-blue-600" : "text-gray-600"
                    }`}
                  >
                    {headerLabel(d)}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 gap-2 mt-2">
              {days.map((d) => {
                const s = schedules[d];
                if (!s) {
                  return (
                    <div
                      key={d}
                      className="flex items-center justify-center h-12 text-xs text-gray-400 border border-gray-100 rounded-lg bg-gray-50"
                    >
                      —
                    </div>
                  );
                }
                const bgStyle = { background: colorFor(s.work_time_id), borderRadius: 10, color: "#fff" };
                return (
                  <button
                    key={d}
                    onClick={() => setSelected({ date: d, shift: s })}
                    className="flex flex-col items-center justify-center h-12 p-2 truncate shadow-sm"
                    style={bgStyle}
                    title={`${s.shift_name || s.label || "Shift"} ${s.start_time || ""}-${s.end_time || ""}`}
                  >
                    <div className="text-xs font-semibold truncate max-w-[80px]">
                      {s.shift_name || s.label || "Shift"}
                    </div>
                    {(s.start_time || s.end_time) && (
                      <div className="text-[11px] truncate max-w-[80px]">
                        {(s.start_time || "") + (s.end_time ? ` - ${s.end_time}` : "")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-xs text-gray-500">Tap a shift for details.</div>
          </>
        )}

        {/* Monthly View */}
        {viewMode === "month" && (
          <>
            <div className="grid grid-cols-7 gap-1 text-[11px] text-center font-semibold text-gray-500 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
              {(() => {
                const [yearStr, monthStr] = (selectedMonth || "").split("-");
                const year = Number(yearStr);
                const month = Number(monthStr);
                if (!year || !month) {
                  return Array.from({ length: 35 }, (_, i) => <DayCellEmpty keyName={`m-empty-${i}`} />);
                }

                const firstDay = new Date(year, month - 1, 1);
                const daysInMonth = new Date(year, month, 0).getDate();
                const startDay = firstDay.getDay();

                const blanks = Array.from({ length: startDay }, (_, i) => (
                  <DayCellEmpty keyName={`blank-${i}`} />
                ));

                const dayCells = Array.from({ length: daysInMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, "0")}`;
                  const s = schedules[dateStr];
                  return <MonthDayCell key={dateStr} dateStr={dateStr} dayNum={dayNum} shift={s} />;
                });

                const totalCells = blanks.length + dayCells.length;
                const padCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                const pads = Array.from({ length: padCount }, (_, i) => <DayCellEmpty keyName={`pad-${i}`} />);

                return [...blanks, ...dayCells, ...pads];
              })()}
            </div>

            <div className="mt-3 text-xs text-gray-500">Tap a day to view shift details.</div>
          </>
        )}
      </div>

      {/* Centered Modal */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-fadeIn"
            onClick={() => setSelected(null)}
          />

          {/* modal */}
          <div className="relative w-11/12 max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform animate-scaleIn">
            {/* Gradient header */}
            <div
              className="text-white px-5 py-4 flex justify-between items-center"
              style={{
                background: colorFor(selected.shift.work_time_id),
              }}
            >
              <div>
                <div className="text-lg font-semibold">
                  {selected.shift.shift_name || selected.shift.label}
                </div>
                <div className="text-xs opacity-90">{fmtLongDate(selected.date)}</div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-white text-lg hover:opacity-80 transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 text-sm text-gray-700 space-y-4">
                <div className="flex flex-col items-center justify-center mt-4 mb-4">
                  <div className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <span>Shift Schedule</span>
                  </div>
                <div
                  className="text-2xl font-bold tracking-wide"
                  style={{
                    color: `hsl(${(parseInt(String(selected.shift.work_time_id || 0).replace(/\D/g, "")) * 137) % 360} 70% 45%)`,
                  }}
                >
                    {selected.shift.start_time || "—"}
                    {selected.shift.end_time ? ` - ${selected.shift.end_time}` : ""}
                  </div>
                </div>


              {selected.shift.description && (
                <div>
                  <div className="font-medium text-gray-800 mb-1">📝 Notes:</div>
                  <div className="text-gray-600 leading-snug">
                    {selected.shift.description}
                  </div>
                </div>
              )}

              {/* <div className="border-t border-gray-100 pt-3 text-xs text-gray-400">
                Tap outside or use “Close” to dismiss
              </div> */}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex justify-end">
              {/* <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition"
              >
                Close
              </button> */}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
