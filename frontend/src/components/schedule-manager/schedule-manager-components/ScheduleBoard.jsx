import React, { useEffect, useMemo, useState } from "react";
import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI";
import EmployeeListGrouped from "./EmployeeListGrouped"; // adjust path if needed
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Utility to produce inclusive date array between start and end (YYYY-MM-DD)
 */
function generateDatesArray(startYMD, endYMD) {
  const start = new Date(startYMD + "T00:00:00");
  const end = new Date(endYMD + "T00:00:00");
  const arr = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    arr.push(`${yyyy}-${mm}-${dd}`);
  }
  return arr;
}

export default function ScheduleBoard() {
  // default two-week range (today -> +13)
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setHours(0,0,0,0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setDate(defaultStart.getDate() + 13);

  function toYMD(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const [start, setStart] = useState(toYMD(defaultStart));
  const [end, setEnd] = useState(toYMD(defaultEnd));
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]); // groups structure from backend
  const [dates, setDates] = useState([]); // array of YYYY-MM-DD
  const [workTimes, setWorkTimes] = useState([]); // shifts
  const [refreshKey, setRefreshKey] = useState(0); // quick re-fetch trigger

  useEffect(() => {
    // load work times once
    let mounted = true;
    (async () => {
      try {
        const res = await ScheduleManagerAPI.readWorkTimes();
        if (!mounted) return;
        // depending on your API res shape: earlier code returns res.data or []
        const wt = Array.isArray(res) ? res : (res.data || []);
        setWorkTimes(wt);
      } catch (e) {
        setWorkTimes([]);
      }
    })();
    return () => mounted = false;
  }, []);

  useEffect(() => {
    // whenever start/end or refreshKey changes -> fetch schedules
    let mounted = true;
    async function load() {
      if (!start || !end) return;
      setLoading(true);
      try {
        const res = await ScheduleManagerAPI.readSchedulesRange(start, end);
        if (!mounted) return;
        if (res && res.success && res.data) {
          setGroups(res.data.groups || []);
          setDates(res.data.dates || generateDatesArray(start, end));
        } else {
          // fallback: generate dates and empty groups
          setGroups([]);
          setDates(generateDatesArray(start, end));
        }
      } catch (err) {
        setGroups([]);
        setDates(generateDatesArray(start, end));
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => (mounted = false);
  }, [start, end, refreshKey]);

  // helper to find schedule for employee on a date (employeeObj.schedules is date keyed)
  function getSchedule(employee, date) {
    if (!employee || !employee.schedules) return null;
    return employee.schedules[date] || null;
  }

  // when admin changes dropdown for a particular cell
  async function handleShiftChange(employee_id, date, work_time_id) {
    // optimistic UI update: update groups state locally then call API
    const newGroups = groups.map((g) => {
      return {
        ...g,
        employees: (g.employees || []).map((e) => {
          if (e.employee_id !== employee_id) return e;
          const newSchedules = { ...(e.schedules || {}) };
          if (work_time_id) {
            newSchedules[date] = {
              schedule_id: null,
              work_time_id: Number(work_time_id),
              shift_name: workTimes.find(w => String(w.id) === String(work_time_id))?.shift_name || "",
            };
          } else {
            // clear override
            delete newSchedules[date];
          }
          return { ...e, schedules: newSchedules };
        })
      };
    });
    setGroups(newGroups);

    // call backend
    const payload = { employee_id, schedule_date: date, work_time_id: work_time_id || null };
    const resp = await ScheduleManagerAPI.upsertEmployeeShift(payload);
    if (!resp || !resp.success) {
      // failure -> re-fetch from backend for correctness
      setRefreshKey(k => k + 1);
      // show a simple alert (replace with your toast)
      alert(resp?.message || "Failed to update shift, refreshed data");
    } else {
      // success -> optionally re-fetch or keep optimistic change
      // I will re-fetch to ensure recurrence/priority resolved correctly
      setRefreshKey(k => k + 1);
    }
  }

  // UI rendering helpers: small date header cell
  function renderDateHeader(date) {
    const dt = new Date(date + "T00:00:00");
    const short = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const weekday = dt.toLocaleDateString(undefined, { weekday: "short" }); // Mon, Tue
    return (
      <div className="flex flex-col items-center justify-center px-3 py-2 border-b whitespace-nowrap">
        <div className="text-xs font-medium">{short}</div>
        <div className="text-[11px] text-slate-400">{weekday}</div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full gap-4 p-4">
      {/* Left: employee grouped list */}
      <div className="flex-shrink-0">
        <EmployeeListGrouped groups={groups} />
      </div>

      {/* Right: schedule table */}
      <div className="flex-1 overflow-auto bg-white border rounded-lg">
        {/* top controls: date pickers */}
        <div className="flex items-center gap-3 p-3 border-b">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Start</label>
            <input className="px-2 py-1 border rounded" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">End</label>
            <input className="px-2 py-1 border rounded" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>

          <div className="ml-auto text-sm text-slate-500">{loading ? "Loading..." : `${dates.length} day(s)`}</div>
        </div>

        {/* Dates header (horizontal) */}
        <div className="overflow-x-auto">
          <div className="flex items-stretch">
            <div className="w-48 shrink-0" /> {/* spacer under employee list */}
            <div className="flex">
              {dates.map((d) => (
                <div key={d} className="min-w-[96px] border-l last:border-r">
                  {renderDateHeader(d)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid rows */}
        <div className="max-h-[60vh] overflow-auto">
          {groups.map((g) => (
            <div key={g.position_id ?? g.position_name} className="border-t">
              {/* position header row */}
              <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50">
                <div className="w-48 text-sm font-semibold">{g.position_name || "Unassigned"}</div>
                <div className="flex gap-0">
                  {dates.map((d) => <div key={d} className="min-w-[96px] border-l" />)}
                </div>
              </div>

              {/* employees */}
              {(g.employees || []).map((emp) => (
                <div key={emp.employee_id} className="flex items-center gap-2 px-4 py-2 hover:bg-white">
                  {/* employee column */}
                  <div className="flex items-center w-48 gap-3">
                    <div className="flex items-center justify-center text-xs font-medium rounded-full w-9 h-9 bg-slate-100 text-slate-700">
                      {emp.first_name?.[0] || emp.last_name?.[0] || "U"}
                    </div>
                    <div>
                      <div className="text-sm">{emp.first_name} {emp.last_name}</div>
                      <div className="text-xs text-slate-500">{g.position_name}</div>
                    </div>
                  </div>

                  {/* date cells */}
                  <div className="flex">
                    {dates.map((d) => {
                      const sched = getSchedule(emp, d);
                      return (
                        <div key={d} className="min-w-[96px] h-14 border-l flex items-center justify-center">
                          <div className="w-full px-1">
                            <select
                              value={sched ? String(sched.work_time_id) : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleShiftChange(emp.employee_id, d, val || null);
                              }}
                              className="w-full p-1 text-sm border rounded"
                            >
                              <option value="">--</option>
                              {(workTimes || []).map((w) => (
                                <option key={w.id} value={w.id}>{w.shift_name}</option>
                              ))}
                            </select>
                            {sched && (
                              <div className="text-[11px] text-slate-400 mt-1">
                                {sched.shift_name ? `${sched.shift_name}` : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
