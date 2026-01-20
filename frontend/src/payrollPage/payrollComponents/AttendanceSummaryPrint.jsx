import React, { useRef, useState, useEffect, useMemo } from "react";
import BASE_URL from "../../../backend/server/config";
// AttendanceSummaryPrint.jsx
// - Polished professional UI layout (Tailwind + accessible structure)
// - Header alignment matches cell content: text left for Employee/Position, center for dates, right for numeric totals
// - Table footer shows computed totals (visible and in printed output)
// - Print preserves the table and totalsasd

const API_URL = `${BASE_URL}/payroll/payroll.php`;

const pad = (n) => String(n).padStart(2, "0");
const ymd = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const parseYYYYMMDDToDate = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (![y, m, d].every(Number.isFinite)) return null;
  return new Date(y, m - 1, d);
};

const AttendanceSummaryPrint = () => {
  const printRef = useRef(null);
  const [allPayrolls, setAllPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [rawApiFrom, setRawApiFrom] = useState("");
  const [rawApiUntil, setRawApiUntil] = useState("");

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    const fetchPayroll = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
         const json = await res.json();
            if (!cancelled) {
            const arr = Array.isArray(json.data) ? json.data : [];
            
            // Filter only active employees
            const activeEmployees = arr.filter(p => p.status?.toLowerCase() === "active");

            setAllPayrolls(activeEmployees);
            setRawApiFrom(json.date_from ?? json.data?.[0]?.date_from ?? "");
            setRawApiUntil(json.date_until ?? json.data?.[0]?.date_until ?? "");
            }
      } catch (e) {
        if (!cancelled) setError(`Failed to fetch payroll: ${e.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPayroll();
    return () => { cancelled = true; };
  }, []);

  const allDates = useMemo(() => {
    const start = parseYYYYMMDDToDate(rawApiFrom);
    const end = parseYYYYMMDDToDate(rawApiUntil);
    if (!start || !end || start > end) return [];
    const dates = [];
    let cur = new Date(start);
    while (cur <= end) {
      dates.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [rawApiFrom, rawApiUntil]);

  const humanRangeLabel = useMemo(() => {
    if (!rawApiFrom || !rawApiUntil) return "";
    const start = parseYYYYMMDDToDate(rawApiFrom);
    const end = parseYYYYMMDDToDate(rawApiUntil);
    if (!start || !end) return `${rawApiFrom} — ${rawApiUntil}`;
    return `${start.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })} — ${end.toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}`;
  }, [rawApiFrom, rawApiUntil]);

  const displayRecords = useMemo(() => {
    return (allPayrolls || []).map((p) => {
      const dateMap = {};
      (p.attendance_records || []).forEach((a) => {
        const startTime = a?.schedule?.start_time ?? a.start_time ?? "";
        const totalMinutesFromSchedule = Number(a?.schedule?.total_minutes ?? a.total_minutes ?? 0);
        const totalRenderedHours = Number(a.total_rendered_hours ?? 0);
        const actualMinutes = Number(a.actual_rendered_minutes ?? 0);
        const netMinutes = Number(a.net_work_minutes ?? 0);
        const overtimeReq = Number(a.overtime_request ?? a.overtime_hours ?? 0);

        const computedLateHours = actualMinutes === 0
          ? (netMinutes > 0 ? netMinutes / 60 : 0)
          : Math.max(0, (netMinutes - actualMinutes) / 60);

// normalize schedule object
const schedule = a?.schedule ?? {};
const validInStart = schedule.valid_in_start ?? schedule.validInStart ?? "";
const validInEnd = schedule.valid_in_end ?? schedule.validInEnd ?? "";

// Primary rule: API explicitly marks valid_in_start & valid_in_end as midnight => Rest Day
const explicitRestDay = (validInStart === "00:00:00" && validInEnd === "00:00:00");

// Fallback heuristics for older / inconsistent payloads:
// - total_minutes can be 0 or 1 for rest-day-like schedules
// - start_time at midnight + tiny end_time (00:00:01 or 00:01:00) is a rest-day marker in some exports
const fallbackRestDay = (
  (totalMinutesFromSchedule === 0 || totalMinutesFromSchedule === 1) &&
  (startTime === "00:00:00" || startTime === "00:00") &&
  (
    schedule.end_time === "00:00:01" ||
    schedule.end_time === "00:01:00" ||
    schedule.end_time === "00:00:00"
  )
);

const isRestDay = explicitRestDay || fallbackRestDay;

        dateMap[a.attendance_date] = {
          isRestDay,
          rendered: isRestDay ? 0 : totalRenderedHours,
          overtime: isRestDay ? 0 : overtimeReq,
          late: isRestDay ? 0 : computedLateHours,
          raw: a
        };
      });

      const apiLateRaw = p.total_late_hours ?? p.totalLateHours ?? p.total_late_minutes ?? null;
      const apiLateHours = apiLateRaw === null || apiLateRaw === undefined || apiLateRaw === ""
        ? (p.total_late_minutes ? Number(p.total_late_minutes) / 60 : null)
        : Number(apiLateRaw);

      return {
        rawPayroll: p,
        employee_name: (p.name || "").trim(),
        position_name: p.position_name || "",
        department_name: p.department_name || "",
        dateMap,
        total_late_hours_api: Number.isFinite(apiLateHours) ? apiLateHours : null,
      };
    });
  }, [allPayrolls]);

  const uniqueDepartments = useMemo(() => {
    const set = new Set(displayRecords.map(r => r.department_name).filter(Boolean));
    return ["", ...Array.from(set).sort()];
  }, [displayRecords]);

    const uniquePositions = useMemo(() => {
    // Only consider records within the selected department
    const filteredByDept = selectedDepartment
        ? displayRecords.filter(r => r.department_name === selectedDepartment)
        : displayRecords;

    const set = new Set(filteredByDept.map(r => r.position_name).filter(Boolean));
    return ["", ...Array.from(set).sort()];
    }, [displayRecords, selectedDepartment]);


  const filteredRecords = useMemo(() => {
    let recs = displayRecords.slice();
    if (selectedDepartment) recs = recs.filter(r => r.department_name === selectedDepartment);
    if (selectedPosition) recs = recs.filter(r => r.position_name === selectedPosition);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      recs = recs.filter(r =>
        (r.employee_name || "").toLowerCase().includes(s) ||
        (r.position_name || "").toLowerCase().includes(s) ||
        (r.department_name || "").toLowerCase().includes(s)
      );
    }
    return recs;
  }, [displayRecords, selectedDepartment, selectedPosition, searchTerm]);

  // compute overall totals (for visible table and print)
  const overallTotals = useMemo(() => {
    return filteredRecords.reduce((acc, emp) => {
      const empTotalHours = allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.rendered || 0), 0);
      const empOvertime = allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.overtime || 0), 0);
      const empLate = (emp.total_late_hours_api ?? allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.late || 0), 0)) || 0;
      acc.totalHours += empTotalHours;
      acc.totalOvertime += empOvertime;
      acc.totalLate += empLate;
      return acc;
    }, { totalHours: 0, totalOvertime: 0, totalLate: 0 });
  }, [filteredRecords, allDates]);

  const getCellClass = (rec) => {
    if (!rec) return "bg-gray-50 text-gray-400 text-right";
    if (rec.isRestDay) return "bg-yellow-200 text-gray-600 text-center";
    if (rec.late >= 8) return "bg-red-200 text-red-600 font-semibold text-center";
    if (rec.late > 0) return "bg-yellow-600 text-black-600 text-right";
    return "bg-green-100 text-green-800 text-right";
  };
  const getCellText = (rec) => {
    if (!rec) return "-";
    if (rec.isRestDay) return "RD";
    if (rec.late >= 8) return "A";
    return (Number(rec.rendered) || 0).toFixed(1);
  };

  const handlePrint = () => {
    const html = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>Attendance Summary</title><style>
      body{font-family:Inter, Roboto, Arial, sans-serif;padding:18px;color:#111}
      .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .title{font-size:18px;font-weight:700;color:#1f2937}
      table{border-collapse:collapse;width:100%;font-size:11px;margin-top:8px}
      th,td{border:1px solid #222;padding:6px}
      th{background:#111827;color:#fff;font-weight:600}
      th.left{text-align:left}
      th.center{text-align:center}
      th.right{text-align:right}
      td.left{text-align:left}
      td.center{text-align:center}
      td.right{text-align:right}
      .totals{font-weight:700;background:#f3f4f6}
      .bg-green{background:#dcfce7}
      .bg-yellow{background:#fef08a}
      .bg-red{background:#fecaca}
      .bg-gray{background:#e5e7eb}
      @media print{ .no-print{display:none} }
    </style></head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  if (loading) return <div className="p-6 text-center text-lg font-semibold text-indigo-600">Loading payroll summary...</div>;
  if (error) return <div className="p-6 text-center text-lg text-red-700 bg-red-50 rounded border border-red-200">{error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
<div className="w-full px-6 lg:px-10 xl:px-16">
        {/* Top card */}
            <div className="flex items-center justify-between mb-6">
            {/* Left: Go Back */}
            <div className="flex items-center gap-3">
                <button
                onClick={() => window.history.back()}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded flex items-center gap-2"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Go Back
                </button>
            </div>

            {/* Center: Title */}
            <div className="text-center flex-1">
                <h1 className="text-5xl font-extrabold text-gray-900">Attendance Summary</h1>
                <p className="mt-2 text-lg text-gray-600">
                Period: <span className="font-medium text-indigo-600">{humanRangeLabel || `${rawApiFrom} — ${rawApiUntil}`}</span>
                </p>
            </div>

            {/* Right: Generated + Print */}
            <div className="flex items-center gap-3">
                <div className="text-right">
                <div className="text-sm text-gray-500">Generated</div>
                <div className="text-sm font-medium text-gray-700">{new Date().toLocaleString()}</div>
                </div>
                <button onClick={handlePrint} className="no-print inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 2a2 2 0 00-2 2v3h12V4a2 2 0 00-2-2H6z"/>
                    <path fillRule="evenodd" d="M4 9h12v5a2 2 0 01-2 2H6a2 2 0 01-2-2V9zm6 3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
                Print
                </button>
            </div>
            </div>


        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6 flex flex-wrap items-center gap-3">
          <select className="px-3 py-2 border rounded w-full sm:w-64" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
            {uniqueDepartments.map(d => <option key={d} value={d}>{d || "All Departments"}</option>)}
          </select>

          <select className="px-3 py-2 border rounded w-full sm:w-64" value={selectedPosition} onChange={e => setSelectedPosition(e.target.value)}>
            {uniquePositions.map(p => <option key={p} value={p}>{p || "All Positions"}</option>)}
          </select>

          <div className="flex items-center flex-1 min-w-[200px]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l4.387 4.386a1 1 0 01-1.414 1.415l-4.387-4.386zM8 14a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd"/></svg>
            <input className="w-full px-3 py-2 border rounded" placeholder="Search employee, position, or department..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="ml-auto flex gap-2">
            <button className="px-3 py-2 bg-gray-100 rounded" onClick={() => { setSelectedDepartment(""); setSelectedPosition(""); setSearchTerm(""); }}>Reset</button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 items-center mb-4 text-sm text-gray-700">
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-green-100 border" /> Present (hrs)</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-yellow-600 border" /> Late</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-red-200 border" /> A = Absent</div>
          <div className="flex items-center gap-2"><span className="w-5 h-5 rounded bg-yellow-200 border" /> RD = Rest Day</div>
        </div>

        {/* Table */}
<div className="overflow-x-auto bg-white rounded-lg shadow-md border border-indigo-200 w-full">
<table className="table-auto min-w-[1300px] border-collapse text-sm">
<thead>
  <tr className="bg-indigo-700 text-white text-xs uppercase tracking-wide">
    <th className="px-9 py-3 text-left w-[220px]">Employee</th>
    <th className="px-4 py-3 text-left w-[180px]"></th> {/* blank column for spacing */}
    {allDates.map(d => (
      <th
        key={d.toISOString()}
        className="px-5 py-3 text-center whitespace-nowrap w-[60px]"
      >
        {d.toLocaleDateString(undefined, { month: "short", day: "2-digit" })}
      </th>
    ))}
    <th className="px-4 py-3 text-right w-[100px]">Total Hours</th>
    <th className="px-4 py-3 text-right w-[90px]">Overtime</th>
    <th className="px-4 py-3 text-right w-[90px]">Late (hrs)</th>
  </tr>
</thead>

<tbody className="divide-y divide-gray-200">
  {filteredRecords.map((emp, idx) => {
    const totalHours = allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.rendered || 0), 0);
    const totalOvertime = allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.overtime || 0), 0);
    const apiLate = emp.total_late_hours_api ?? allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.late || 0), 0);

    return (
      <tr key={idx} className="hover:bg-indigo-50/40 transition">
<td className="px-4 py-2 text-left font-medium text-gray-800 truncate">
  {(emp.employee_name || "").split(" ")[0]}
</td>
        <td className="px-4 py-2 text-left text-gray-600 truncate"></td> {/* blank column */}

        {allDates.map(d => {
          const rec = emp.dateMap[ymd(d)];
          const text = rec ? (rec.isRestDay ? "RD" : (rec.late >= 8 ? "A" : Number(rec.rendered || 0).toFixed(1))) : "-";
          const cellClass = getCellClass(rec);
          const alignClass = rec?.isRestDay ? "text-center" : "text-right";
          return (
            <td
              key={ymd(d)}
              className={`px-2 py-2 ${cellClass} ${alignClass} text-xs whitespace-nowrap`}
              title={rec?.late > 0 ? `Late: ${rec.late.toFixed(2)}h` : undefined}
            >
              {text}
            </td>
          );
        })}

        <td className="px-4 py-2 text-right font-semibold text-indigo-800">{totalHours.toFixed(2)}</td>
        <td className="px-4 py-2 text-right font-semibold text-green-700">{totalOvertime.toFixed(2)}</td>
        <td className="px-4 py-2 text-right font-semibold text-red-600">{Number(apiLate).toFixed(2)}</td>
      </tr>
    );
  })}
</tbody>


    <tfoot>
      <tr className="text-sm font-semibold bg-indigo-50 border-t border-indigo-200">
        <td className="px-4 py-3 text-left">Total</td>
        <td className="px-4 py-3 text-left"></td>
        {allDates.map(d => (
          <td key={d.toISOString()} className="px-2 py-3 text-center">—</td>
        ))}
        <td className="px-4 py-3 text-right">{overallTotals.totalHours.toFixed(2)}</td>
        <td className="px-4 py-3 text-right">{overallTotals.totalOvertime.toFixed(2)}</td>
        <td className="px-4 py-3 text-right">{overallTotals.totalLate.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>
</div>




        {/* Hidden printable DOM */}
        <div ref={printRef} style={{ display: 'none' }}>
          <div className="header">
            <div className="title">Attendance Summary</div>
            <div>
              <div style={{ fontSize: 12, color: '#374151' }}>{humanRangeLabel || `${rawApiFrom} — ${rawApiUntil}`}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Generated: {new Date().toLocaleString()}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th className="left">Employee</th>
                <th className="left">Position</th>
                {allDates.map(d => <th key={d.toISOString()} className="center">{d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}</th>)}
                <th className="right">Total Hours</th>
                <th className="right">Overtime</th>
                <th className="right">Late (hrs)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((emp, idx) => {
                const totalHours = allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.rendered || 0), 0);
                const totalOvertime = allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.overtime || 0), 0);
                const apiLate = emp.total_late_hours_api ?? allDates.reduce((s, d) => s + (emp.dateMap[ymd(d)]?.late || 0), 0);
                return (
                  <tr key={idx}>
                    <td className="left">{emp.employee_name}</td>
                    <td className="left">{emp.position_name}</td>
                    {allDates.map(d => {
                      const rec = emp.dateMap[ymd(d)];
                      const text = rec ? (rec.isRestDay ? 'RD' : (rec.late >= 7.9 ? 'A' : (Number(rec.rendered||0).toFixed(1)))) : '-';
                      return <td key={ymd(d)} className={rec?.isRestDay ? 'center' : 'right'}>{text}</td>;
                    })}
                    <td className="right">{totalHours.toFixed(2)}</td>
                    <td className="right">{totalOvertime.toFixed(2)}</td>
                    <td className="right">{Number(apiLate).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="left"><strong>Total</strong></td>
                <td className="left"></td>
                {allDates.map(d => <td key={d.toISOString()} className="center">—</td>)}
                <td className="right"><strong>{overallTotals.totalHours.toFixed(2)}</strong></td>
                <td className="right"><strong>{overallTotals.totalOvertime.toFixed(2)}</strong></td>
                <td className="right"><strong>{overallTotals.totalLate.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceSummaryPrint;
