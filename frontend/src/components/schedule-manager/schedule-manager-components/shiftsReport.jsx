// shiftsReport.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";
import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI"; // adjust path if needed

// Utility: format display date (e.g. "Oct. 17, 2025")
const MONTHS_SHORT_DOT = ["Jan.", "Feb.", "Mar.", "Apr.", "May.", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
const fmtDisplayDate = (isoDate) => {
  if (!isoDate) return "";
  const d = new Date(String(isoDate).includes("T") ? isoDate : `${isoDate}T00:00:00`);
  if (isNaN(d)) return isoDate;
  const mon = MONTHS_SHORT_DOT[d.getMonth()] || "";
  return `${mon} ${d.getDate()}, ${d.getFullYear()}`;
};

// Time formatting helpers (human readable like "9:00 am - 5:30 pm")
const _isHumanTime = (s) => typeof s === "string" && /[ap]m/i.test(s);
const parseTimeToDate = (timeStr) => {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  if (_isHumanTime(s)) return s;
  const parts = s.split(":").map((p) => p.replace(/\D/g, ""));
  if (!parts.length) return null;
  const hh = parseInt(parts[0] || "0", 10);
  const mm = parseInt(parts[1] || "0", 10);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};
const formatTimeShort = (timeStr) => {
  if (timeStr === null || timeStr === undefined || timeStr === "") return "";
  if (_isHumanTime(String(timeStr))) return String(timeStr).replace(/\s+/g, " ").toLowerCase();
  const d = parseTimeToDate(timeStr);
  if (!d) return String(timeStr);
  try {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
  } catch {
    const hh = d.getHours() % 12 || 12;
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ampm = d.getHours() >= 12 ? "pm" : "am";
    return `${hh}:${mm} ${ampm}`;
  }
};
const formatTimeRange = (start, end) => {
  const s = formatTimeShort(start);
  const e = formatTimeShort(end);
  if (s && e) return `${s} - ${e}`;
  if (s) return s;
  return e || "";
};

// Build date array between start and end inclusive (expects YYYY-MM-DD)
const buildDateArray = (startIso, endIso) => {
  const arr = [];
  const s = new Date(`${startIso}T00:00:00`);
  const e = new Date(`${endIso}T00:00:00`);
  if (isNaN(s) || isNaN(e) || s > e) return arr;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
};

export default function ShiftsReport({ startDate, endDate, branchId = "", workTimes: initialWorkTimes = null }) {
  const [loading, setLoading] = useState(false);
  const [workTimes, setWorkTimes] = useState(initialWorkTimes || []);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);

  // default statuses to show (user requested pending, lvl1_approved, applied)
  const STATUS_OPTIONS = [
    { key: "applied", label: "Applied" },

    { key: "pending", label: "Pending" },

    { key: "lvl1_approved", label: "Lvl1 Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "lvl2_approved", label: "Lvl2 Approved" },
  ];
  const [selectedStatuses, setSelectedStatuses] = useState(() => ["applied"]);

  // load workTimes if not passed in
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (initialWorkTimes && Array.isArray(initialWorkTimes) && initialWorkTimes.length) {
        setWorkTimes(initialWorkTimes);
        return;
      }
      try {
        if (ScheduleManagerAPI && typeof ScheduleManagerAPI.readWorkTimes === "function") {
          const res = await ScheduleManagerAPI.readWorkTimes();
          const arr = Array.isArray(res) ? res : (res?.data || res?.data?.data || []);
          if (!mounted) return;
          setWorkTimes(arr || []);
          return;
        }
        // fallback: try a couple endpoints (graceful)
        const tryPaths = [
          `${BASE_URL}/schedule-manager/read_work_times.php`,
          `${BASE_URL}/schedule-manager/approvals/read_work_times.php`,
          `${BASE_URL}/schedule-manager/work_times.php`,
        ];
        for (const p of tryPaths) {
          try {
            const r = await axios.get(p, { timeout: 5000 });
            const arr = Array.isArray(r.data) ? r.data : (Array.isArray(r.data?.data) ? r.data.data : []);
            if (arr && arr.length) { if (!mounted) return; setWorkTimes(arr); return; }
          } catch (e) { /* next */ }
        }
        if (!mounted) return;
        setWorkTimes([]);
      } catch (err) {
        if (mounted) setWorkTimes([]);
      }
    };
    load();
    return () => { mounted = false; };
  }, [initialWorkTimes]);

  // close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (!statusMenuRef.current) return;
      if (!statusMenuRef.current.contains(e.target)) setStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const toggleStatus = (key) => {
    setSelectedStatuses((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return Array.from(s);
    });
  };

  const findWorkTimeById = (id) => {
    if (id === null || id === undefined || id === "") return null;
    return (workTimes || []).find((w) => String(w.id ?? w.work_time_id) === String(id)) || null;
  };

  // Main export handler
  // Main export handler (updated: cache-bust + retry + branch-aware schedules fetch)
  const exportCsv = async () => {
    if (!startDate || !endDate) {
      alert("Start and End date are required");
      return;
    }

    setLoading(true);
    try {
      // helper to attempt schedule fetch; try with branchId param first, then fallback
      const fetchSchedulesOnce = async () => {
        // Attempt 1: call with branchId when supported
        try {
          if (typeof ScheduleManagerAPI?.readSchedulesRange === "function") {
            // try calling with branchId (many implementations accept an options/branch param)
            const maybe = await ScheduleManagerAPI.readSchedulesRange(startDate, endDate, branchId || undefined);
            if (maybe?.success && maybe?.data) return maybe;
            // if returned something array-ish (some versions return raw array), accept that too
            if (maybe && maybe.data) return maybe;
          }
        } catch (err) {
          // ignore and try fallback
          console.debug("readSchedulesRange(with branch) failed, falling back:", err);
        }

        // Fallback: call without branchId
        try {
          const fallback = await ScheduleManagerAPI.readSchedulesRange(startDate, endDate);
          return fallback;
        } catch (err) {
          console.debug("readSchedulesRange(fallback) failed:", err);
          return null;
        }
      };

      // fetch schedules with one immediate retry if first attempt returns nothing useful
      let schedRes = await fetchSchedulesOnce();
      if (!schedRes || !schedRes.success || !schedRes.data) {
        console.debug("Schedules fetch returned empty — retrying once");
        schedRes = await fetchSchedulesOnce();
      }

      if (!schedRes || !schedRes.success || !schedRes.data) {
        throw new Error("Failed to load schedules range from server after retry");
      }

      const groups = schedRes.data.groups || [];
      const datesArray = schedRes.data.dates && schedRes.data.dates.length ? schedRes.data.dates : buildDateArray(startDate, endDate);

      // Fetch submissions with cache-buster param and one retry if empty
      const fetchSubsOnce = async () => {
        try {
          const subsRes = await axios.get(`${BASE_URL}/schedule-manager/approvals/list_submissions.php`, {
            params: { start_date: startDate, end_date: endDate, branch_id: branchId || undefined, cache_bust: Date.now() },
            timeout: 30000,
          });
          const subsRaw = (subsRes?.data?.success && Array.isArray(subsRes.data.data)) ? subsRes.data.data : (Array.isArray(subsRes?.data) ? subsRes.data : []);
          return subsRaw;
        } catch (err) {
          console.debug("list_submissions fetch failed:", err);
          return [];
        }
      };

      let subsRaw = await fetchSubsOnce();
      if ((!subsRaw || subsRaw.length === 0) && !branchId) {
        // if branchId not set and subs came back empty, retry once (sometimes backend propagation lag)
        console.debug("Submissions empty — retrying once");
        subsRaw = await fetchSubsOnce();
      } else if ((!subsRaw || subsRaw.length === 0) && branchId) {
        // if branch was provided, still retry once — sometimes the first request gets filtered unexpectedly
        console.debug("Submissions empty for branch — retrying once");
        subsRaw = await fetchSubsOnce();
      }

      // Build submissions map keyed by `${employee_id}|${effective_date}` keeping latest submission_id if multiple
      const subsMap = new Map();
      (subsRaw || []).forEach((s) => {
        const k = `${String(s.employee_id)}|${String(s.effective_date)}`;
        const existing = subsMap.get(k);
        if (!existing || (s.submission_id && existing.submission_id < s.submission_id)) subsMap.set(k, s);
      });

      // Prepare CSV header: Employee Name, Employee ID, Position, then date columns
      const dateHeaders = datesArray.map((d) => fmtDisplayDate(d));
      const header = ["Employee Name", "Employee ID", "Position", ...dateHeaders];

      const rows = [];
      for (const g of groups) {
        for (const emp of (g.employees || [])) {
          // If branch filter is set and this employee not in branch, skip
          if (branchId) {
            const bid = emp.branch_id ?? "";
            if (String(bid) !== String(branchId)) continue;
          }

          const empName = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || `Emp ${emp.employee_id}`;
          const empId = emp.employee_id || "";
          const position = g.position_name || "";

          const row = [empName, empId, position];

          for (const d of datesArray) {
            const key = `${String(emp.employee_id)}|${String(d)}`;
            const sub = subsMap.get(key);
            const includeSet = new Set((selectedStatuses || []).map((s) => String(s).toLowerCase()));

            let cell = "-";

            if (sub && includeSet.has(String(sub.status || "").toLowerCase())) {
              if (sub.work_time_id === null || sub.work_time_id === "") {
                cell = `— Clear — [${sub.status || "pending"}]`;
              } else {
                const wt = findWorkTimeById(sub.work_time_id);
                const name = wt?.shift_name || sub.shift_name || (`Shift ${sub.work_time_id}`);
                const times = wt ? ` (${formatTimeRange(wt.start_time, wt.end_time)})` : "";
                cell = `${name}${times} [${sub.status || ""}]`;
              }
            } else {
              const sched = emp?.schedules?.[d] ?? null;
              if (sched) {
                const name = sched.shift_name || "";
                const times = sched.start_time || sched.end_time ? ` (${formatTimeRange(sched.start_time, sched.end_time)})` : "";
                cell = `${name}${times}`;
              } else {
                cell = "-";
              }
            }

            row.push(cell);
          }

          rows.push(row);
        }
      }

      // Build CSV and trigger download
      const bom = "\uFEFF";
      const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
      const filename = `shifts_grid_${startDate}_to_${endDate}.csv`;

      if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
      } else {
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Export failed — see console for details");
    } finally {
      setLoading(false);
      setStatusMenuOpen(false);
    }
  };


  // UI: compact export button + dropdown for statuses
  return (
    <div className="inline-flex items-center gap-3">
      <div className="flex items-center gap-2">
        <button onClick={exportCsv} disabled={loading} className="px-3 py-2 bg-slate-600 text-white rounded-md">
          {loading ? "Exporting..." : "Export Grid CSV"}
        </button>
      </div>

      <div className="relative" ref={statusMenuRef}>
        <button
          type="button"
          onClick={() => setStatusMenuOpen((s) => !s)}
          className="px-3 py-2 bg-white border rounded-md text-sm flex items-center gap-2"
          aria-haspopup="true"
          aria-expanded={statusMenuOpen}
          title="Choose statuses to include in export"
        >
          <span className="font-medium">Include statuses </span>
          <span className="text-xs text-gray-500">
            {selectedStatuses.length === 0 ? " (0)" : selectedStatuses.length === STATUS_OPTIONS.length ? " (5)" : ` (${selectedStatuses.length})`}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transform ${statusMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none">
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {statusMenuOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white border rounded-md shadow-lg z-50 p-3" role="menu" aria-label="Status options">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Include statuses</div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setSelectedStatuses(STATUS_OPTIONS.map(o => o.key))} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">Select all</button>
                <button type="button" onClick={() => setSelectedStatuses([])} className="text-xs px-2 py-1 ml-1 bg-white border rounded hover:bg-gray-50">Clear</button>
              </div>
            </div>

            <div style={{ maxHeight: 220, overflow: "auto" }} className="space-y-1">
              {STATUS_OPTIONS.map((o) => {
                const checked = selectedStatuses.includes(o.key);
                return (
                <label
                key={o.key}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer select-none"
                role="menuitemcheckbox"
                aria-checked={checked}
                tabIndex={0}
                onKeyDown={(e) => {
                    // allow keyboard toggling via Enter / Space
                    if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleStatus(o.key);
                    }
                }}
                >
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                    // prevent bubbling to outer click handlers but perform toggle
                    e.stopPropagation();
                    toggleStatus(o.key);
                    }}
                    className="cursor-pointer"
                />
                <span className="text-sm">{o.label}</span>
                </label>

                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setStatusMenuOpen(false)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
