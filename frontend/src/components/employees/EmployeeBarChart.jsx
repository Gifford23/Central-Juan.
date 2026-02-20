import React, { useEffect, useCallback, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  Clock,
  Sun,
  Sunset,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  BarChart3,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const TOKEN = {
  early: {
    solid: "#22c55e",
    bar: "rgba(34,197,94,0.80)",
    bg: "bg-emerald-30",
    text: "text-emerald-700",
    border: "border-emerald-200",
    glow: "rgba(34,197,94,0.15)",
  },
  ontime: {
    solid: "#3b82f6",
    bar: "rgba(59,130,246,0.80)",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    glow: "rgba(59,130,246,0.15)",
  },
  late: {
    solid: "#f43f5e",
    bar: "rgba(244,63,94,0.80)",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    glow: "rgba(244,63,94,0.15)",
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const localYYYYMMDD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseYYYYMMDDToDate = (s) => new Date(`${s}T00:00`);

const displayDate = (d) =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

const toMinutes = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return isNaN(h) ? null : h * 60 + (m || 0);
};

const fmt12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  if (isNaN(h)) return "—";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const esc = (s = "") =>
  String(s).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] || c,
  );

// ─────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-pulse">
      <div className="relative px-5 py-4 border-b border-slate-100">
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-200 via-blue-200 to-rose-200 rounded-t-2xl" />
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-200 rounded-xl" />
            <div className="space-y-1.5">
              <div className="h-3.5 w-36 bg-slate-200 rounded-md" />
              <div className="h-2.5 w-24 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="h-9 w-44 bg-slate-100 rounded-xl" />
        </div>
      </div>
      <div className="px-5 pt-4 pb-3 space-y-3">
        <div className="h-20 bg-slate-100 rounded-2xl" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 bg-slate-50 rounded-xl border border-slate-100"
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-14 bg-slate-50 rounded-xl border border-slate-100"
            />
          ))}
        </div>
        <div className="h-44 bg-slate-50 rounded-xl border border-slate-100" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MINI STAT CARD
// ─────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, tokenKey }) {
  const t = TOKEN[tokenKey];
  return (
    <div
      className={`flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 rounded-xl border ${t.bg} ${t.border} hover:shadow-sm transition-shadow duration-200`}
    >
      <div className={`flex items-center gap-1 ${t.text} mb-0.5`}>
        <Icon size={10} strokeWidth={2.5} />
        <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
          {label}
        </span>
      </div>
      <span
        className={`text-xl font-black leading-none tracking-tight ${t.text}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// SESSION ROW
// ─────────────────────────────────────────────
function SessionRow({ icon: Icon, iconColor, label, early, ontime, late }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} className={iconColor} />
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
          {label}
        </span>
        <div className="flex-1 h-px bg-slate-100 ml-1" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MiniStat icon={Clock} label="Early" value={early} tokenKey="early" />
        <MiniStat
          icon={CheckCircle2}
          label="On-Time"
          value={ontime}
          tokenKey="ontime"
        />
        <MiniStat
          icon={AlertTriangle}
          label="Late"
          value={late}
          tokenKey="late"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const AttendanceDashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // ← NEW: forces re-render after refresh
  const [currentDate, setCurrentDate] = useState(new Date());
  const [onDutyCount, setOnDutyCount] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(null); // ← NEW: shows "last updated" time

  // ─────────────────────────────────────────
  // FETCH
  // FIX: useCallback so the function identity is stable.
  // FIX: after a refresh, bump `refreshKey` to guarantee downstream
  //      derived values (filteredAttendance, summary) are recomputed.
  // ─────────────────────────────────────────
  const fetchAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await res.json();

      if (data.success && Array.isArray(data.data)) {
        setAttendanceData(data.data);
        setLastRefreshed(new Date()); // ← record the time of successful refresh
        if (isRefresh) {
          // Bump the key so React re-renders even if the data reference
          // appears identical (same length, same values).
          setRefreshKey((k) => k + 1);
        }
      } else {
        throw new Error(data.message || "Failed to fetch");
      }
    } catch (err) {
      console.error("AttendanceDashboard fetch error:", err);
      // Keep existing data on a failed refresh — don't wipe the screen
      if (!isRefresh) setAttendanceData([]);
    } finally {
      // FIX: always clear both flags so the UI never gets stuck
      setRefreshing(false);
      setLoading(false);
    }
  }, []); // stable — no deps that change

  // Initial load
  useEffect(() => {
    fetchAttendance(false);
  }, [fetchAttendance]);

  // ─────────────────────────────────────────
  // DERIVED DATA
  // `refreshKey` is read here so this block re-runs after every refresh
  // even when attendanceData happens to be the same reference.
  // ─────────────────────────────────────────
  const selectedStr = localYYYYMMDD(currentDate);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filteredAttendance = React.useMemo(() => {
    return attendanceData.filter(
      (a) => String(a.attendance_date || "").slice(0, 10) === selectedStr,
    );
  }, [attendanceData, selectedStr, refreshKey]); // ← refreshKey forces recompute

  // On-duty count
  useEffect(() => {
    const ids = new Set();
    filteredAttendance.forEach((a) => {
      if (a.time_in_morning || a.time_in_afternoon) ids.add(a.employee_id);
    });
    setOnDutyCount(ids.size);
  }, [filteredAttendance]);

  // Summary counts
  const summary = React.useMemo(() => {
    let eM = 0,
      oM = 0,
      lM = 0,
      eA = 0,
      oA = 0,
      lA = 0;
    filteredAttendance.forEach(
      ({ time_in_morning: am, time_in_afternoon: pm }) => {
        const a = toMinutes(am),
          p = toMinutes(pm);
        if (a !== null) {
          if (a < 540) eM++;
          else if (a === 540) oM++;
          else lM++;
        }
        if (p !== null) {
          if (p < 780) eA++;
          else if (p === 780) oA++;
          else lA++;
        }
      },
    );
    return { eM, oM, lM, eA, oA, lA };
  }, [filteredAttendance]);

  const totalMorning = summary.eM + summary.oM + summary.lM;
  const totalAfternoon = summary.eA + summary.oA + summary.lA;

  // ─────────────────────────────────────────
  // CHART
  // ─────────────────────────────────────────
  const chartData = React.useMemo(
    () => ({
      labels: ["Morning", "Afternoon"],
      datasets: [
        {
          label: "Early",
          data: [summary.eM, summary.eA],
          backgroundColor: TOKEN.early.bar,
          borderColor: TOKEN.early.solid,
          borderWidth: 1.5,
          borderRadius: {
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.85,
        },
        {
          label: "On-Time",
          data: [summary.oM, summary.oA],
          backgroundColor: TOKEN.ontime.bar,
          borderColor: TOKEN.ontime.solid,
          borderWidth: 1.5,
          borderRadius: {
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.85,
        },
        {
          label: "Late",
          data: [summary.lM, summary.lA],
          backgroundColor: TOKEN.late.bar,
          borderColor: TOKEN.late.solid,
          borderWidth: 1.5,
          borderRadius: {
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0,
          },
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.85,
        },
      ],
    }),
    [summary],
  );

  const maxVal = Math.max(
    summary.eM,
    summary.oM,
    summary.lM,
    summary.eA,
    summary.oA,
    summary.lA,
    1,
  );

  const chartOptions = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      onClick: (_, els) => {
        if (!els?.length) return;
        const datasetIndex = els[0].datasetIndex; // 0=Early 1=OnTime 2=Late
        const dataIndex = els[0].index; // 0=Morning 1=Afternoon
        const sessionPrefix = dataIndex === 0 ? "Morning" : "Afternoon";
        const typeLabel = ["Early", "On Time", "Late"][datasetIndex];
        showEmployeesModal(`${typeLabel} ${sessionPrefix}`);
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          ticks: {
            color: "#64748b",
            font: { size: 11, weight: "700", family: "'Inter',system-ui" },
          },
          grid: { display: false },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          suggestedMax: maxVal + 2,
          ticks: {
            color: "#94a3b8",
            font: { size: 10, family: "'Inter',system-ui" },
            stepSize: 1,
            callback: (v) => (Number.isInteger(v) ? v : ""),
            padding: 6,
          },
          grid: { color: "rgba(148,163,184,0.10)", drawBorder: false },
          border: { display: false },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "rgba(15,23,42,0.96)",
          titleColor: "#f1f5f9",
          bodyColor: "#94a3b8",
          borderColor: "rgba(255,255,255,0.07)",
          borderWidth: 1,
          cornerRadius: 12,
          padding: 14,
          displayColors: true,
          boxWidth: 9,
          boxHeight: 9,
          boxPadding: 4,
          callbacks: {
            title: (items) => {
              const s =
                items[0]?.label === "Morning" ? "🌅  Morning" : "🌇  Afternoon";
              return `${s} Session`;
            },
            label: (ctx) => {
              const icons = ["", "", ""];
              return `  ${icons[ctx.datasetIndex]}  ${ctx.dataset.label}:  ${ctx.raw} employee${ctx.raw !== 1 ? "s" : ""}`;
            },
            afterBody: (items) => {
              const total = items.reduce((s, i) => s + (i.raw || 0), 0);
              return [
                ``,
                `  Total: ${total} employee${total !== 1 ? "s" : ""}`,
              ];
            },
          },
        },
      },
      // showEmployeesModal is defined below but stable in scope
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }),
    [maxVal],
  );

  // ─────────────────────────────────────────
  // MODAL (unchanged logic)
  // ─────────────────────────────────────��───
  const recordMatchesCategory = (r, cat) => {
    const am = toMinutes(r.time_in_morning);
    const pm = toMinutes(r.time_in_afternoon);
    switch (cat) {
      case "Early Morning":
        return am !== null && am < 540;
      case "On Time Morning":
        return am !== null && am === 540;
      case "Late Morning":
        return am !== null && am > 540;
      case "Early Afternoon":
        return pm !== null && pm < 780;
      case "On Time Afternoon":
        return pm !== null && pm === 780;
      case "Late Afternoon":
        return pm !== null && pm > 780;
      default:
        return false;
    }
  };

  const showEmployeesModal = (category) => {
    const matched = filteredAttendance.filter((r) =>
      recordMatchesCategory(r, category),
    );
    const accentColor = category.includes("Early")
      ? TOKEN.early.solid
      : category.includes("On Time")
        ? TOKEN.ontime.solid
        : TOKEN.late.solid;

    const buildRows = (list) =>
      list.length
        ? list
            .map(
              (r) => `
            <tr style="border-bottom:1px solid #f1f5f9;transition:background .12s;"
                onmouseover="this.style.background='#f8fafc'"
                onmouseout="this.style.background='transparent'">
              <td style="padding:10px 14px;white-space:nowrap;">
                <div style="display:flex;align-items:center;gap:9px;">
                  <div style="width:28px;height:28px;border-radius:50%;
                    background:linear-gradient(135deg,${accentColor},${accentColor}99);
                    display:flex;align-items:center;justify-content:center;
                    font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">
                    ${esc((r.employee_name || r.employee_id || "?")[0]).toUpperCase()}
                  </div>
                  <span style="font-size:13px;font-weight:600;color:#1e293b;">
                    ${esc(r.employee_name || r.employee_id)}
                  </span>
                </div>
              </td>
              <td style="padding:10px 14px;text-align:center;">
                <span style="font-family:monospace;font-size:12px;padding:3px 8px;
                  background:#f1f5f9;border-radius:6px;color:#475569;font-weight:600;">
                  ${esc(fmt12(r.time_in_morning))}
                </span>
              </td>
              <td style="padding:10px 14px;text-align:center;">
                <span style="font-family:monospace;font-size:12px;padding:3px 8px;
                  background:#f1f5f9;border-radius:6px;color:#475569;font-weight:600;">
                  ${esc(fmt12(r.time_in_afternoon))}
                </span>
              </td>
            </tr>`,
            )
            .join("")
        : `<tr><td colspan="3" style="padding:32px;text-align:center;color:#94a3b8;font-size:13px;">No records found</td></tr>`;

    Swal.fire({
      title: `
        <div style="display:flex;align-items:center;gap:10px;justify-content:center;">
          <span style="width:10px;height:10px;border-radius:50%;background:${accentColor};
            box-shadow:0 0 10px ${accentColor}66;display:inline-block;flex-shrink:0;"></span>
          <span style="color:#0f172a;font-size:17px;font-weight:800;font-family:'Inter',system-ui;">
            ${esc(category)}
          </span>
        </div>`,
      html: `
        <div style="font-family:'Inter',system-ui;display:flex;flex-direction:column;gap:14px;text-align:left;">
          <div style="display:flex;align-items:center;gap:10px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:9px 14px;">
            <svg width="13" height="13" fill="none" stroke="#94a3b8" stroke-width="2.2" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input id="swal-search" placeholder="Search employee…"
              style="flex:1;background:transparent;border:none;outline:none;font-size:13px;color:#334155;font-family:inherit;"
              autocomplete="off"/>
            <span style="font-size:10px;font-weight:800;background:${accentColor}18;color:${accentColor};
              padding:3px 9px;border-radius:20px;border:1px solid ${accentColor}35;">
              ${matched.length}
            </span>
          </div>
          <div style="border:1.5px solid #e2e8f0;border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.05);">
            <div style="max-height:46vh;overflow:auto;">
              <table style="width:100%;border-collapse:collapse;">
                <thead style="position:sticky;top:0;background:#f8fafc;z-index:10;">
                  <tr>
                    ${["Employee", "Morning", "Afternoon"]
                      .map(
                        (h, i) => `
                      <th style="padding:10px 14px;text-align:${i === 0 ? "left" : "center"};color:#64748b;
                        font-size:10px;font-weight:700;text-transform:uppercase;
                        letter-spacing:.07em;border-bottom:1.5px solid #e2e8f0;">${h}</th>`,
                      )
                      .join("")}
                  </tr>
                </thead>
                <tbody id="swal-rows">${buildRows(matched)}</tbody>
              </table>
            </div>
          </div>
          <p style="text-align:center;font-size:11px;color:#94a3b8;margin:0;">
            Press <kbd style="padding:1px 6px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;font-family:monospace;font-size:10px;color:#475569;">ESC</kbd> to close
          </p>
        </div>`,
      width: 700,
      showConfirmButton: false,
      showCloseButton: true,
      background: "#ffffff",
      customClass: {
        popup:
          "!rounded-2xl !border !border-slate-200 !shadow-2xl !shadow-slate-900/10",
        closeButton: "!text-slate-400 hover:!text-slate-700",
        title: "!pb-2 !pt-6",
        htmlContainer: "!px-6 !pb-5 !pt-0",
      },
      didOpen: () => {
        const input = document.getElementById("swal-search");
        const tbody = document.getElementById("swal-rows");
        input?.addEventListener("input", (e) => {
          tbody.innerHTML = buildRows(
            matched.filter((r) =>
              (r.employee_name || r.employee_id || "")
                .toLowerCase()
                .includes(e.target.value.toLowerCase()),
            ),
          );
        });
        input?.focus();
      },
    });
  };

  // ─────────────────────────────────────────
  // DATE NAVIGATION
  // ─────────────────────────────────────────
  const navDate = (delta) =>
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  const handleDateChange = (e) =>
    setCurrentDate(parseYYYYMMDDToDate(e.target.value));

  // ─────────────────────────────────────────
  // RENDER GUARDS
  // ─────────────────────────────────────────
  if (loading) return <Skeleton />;

  const hasData = filteredAttendance.length > 0;

  // "Last refreshed" label — e.g. "12:34 PM"
  const lastRefreshedLabel = lastRefreshed
    ? lastRefreshed.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="flex flex-col w-full bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* ══════════════════════════════════════
          HEADER
      ══════════════════════════════════════ */}
      <div className="relative px-5 sm:px-6 py-4 border-b border-slate-100 bg-white">
        <div
          className="absolute top-0 inset-x-0 h-[3px] rounded-t-2xl"
          style={{
            background: "linear-gradient(90deg,#22c55e,#3b82f6,#f43f5e)",
          }}
        />
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-blue-50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mt-0.5">
          {/* Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-md shadow-blue-200/50 shrink-0">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
                Employee Activity
              </h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                {displayDate(currentDate)}
              </p>
            </div>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1 shrink-0">
            <button
              onClick={() => navDate(-1)}
              aria-label="Previous day"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all duration-150 shrink-0"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="date"
              value={localYYYYMMDD(currentDate)}
              onChange={handleDateChange}
              className="px-2 py-1 bg-transparent border-none text-[11px] font-semibold text-slate-700 focus:ring-0 outline-none cursor-pointer text-center"
              style={{ colorScheme: "light", minWidth: "110px" }}
            />
            <button
              onClick={() => navDate(1)}
              aria-label="Next day"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition-all duration-150 shrink-0"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════ */}
      <div className="px-5 sm:px-6 pt-4">
        <div
          className="relative rounded-2xl overflow-hidden px-6 py-5"
          style={{
            background:
              "linear-gradient(135deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)",
          }}
        >
          <div
            className="absolute -top-6 -left-6 w-28 h-28 rounded-full blur-2xl pointer-events-none"
            style={{ background: TOKEN.ontime.glow }}
          />
          <div
            className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full blur-2xl pointer-events-none"
            style={{ background: TOKEN.early.glow }}
          />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  Live · On Duty
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-3">
                Employees checked in
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                  style={{
                    background: TOKEN.ontime.glow,
                    borderColor: `${TOKEN.ontime.solid}30`,
                  }}
                >
                  <Sun size={10} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-slate-300">
                    {totalMorning}
                    <span className="font-normal text-slate-500 ml-1">AM</span>
                  </span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border"
                  style={{
                    background: TOKEN.early.glow,
                    borderColor: `${TOKEN.early.solid}30`,
                  }}
                >
                  <Sunset size={10} className="text-orange-400" />
                  <span className="text-[10px] font-bold text-slate-300">
                    {totalAfternoon}
                    <span className="font-normal text-slate-500 ml-1">PM</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black text-white tracking-tighter leading-none tabular-nums">
                {String(onDutyCount).padStart(2, "0")}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <Users size={10} className="text-slate-500" />
                <span className="text-[10px] text-slate-500 font-medium">
                  {filteredAttendance.length} record
                  {filteredAttendance.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SESSION STAT ROWS
      ══════════════════════════════════════ */}
      <div className="px-5 sm:px-6 pt-4 space-y-3">
        <SessionRow
          icon={Sun}
          iconColor="text-amber-500"
          label="Morning"
          early={summary.eM}
          ontime={summary.oM}
          late={summary.lM}
        />
        <SessionRow
          icon={Sunset}
          iconColor="text-orange-500"
          label="Afternoon"
          early={summary.eA}
          ontime={summary.oA}
          late={summary.lA}
        />
      </div>

      {/* ══════════════════════════════════════
          BAR CHART
      ══════════════════════════════════════ */}
      <div className="px-5 sm:px-6 pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={11} className="text-slate-400" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Distribution
            </p>
          </div>
          <div className="flex items-center gap-3">
            {[
              { label: "Early", key: "early" },
              { label: "On-Time", key: "ontime" },
              { label: "Late", key: "late" },
            ].map(({ label, key }) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: TOKEN[key].solid, opacity: 0.85 }}
                />
                <span className="text-[9px] font-semibold text-slate-400">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative bg-white border border-slate-200/80 rounded-xl overflow-hidden"
          style={{
            height: "220px",
            boxShadow: "inset 0 -2px 6px rgba(148,163,184,0.10)",
          }}
        >
          {/* Faint reference bands */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            {[0.25, 0.5, 0.75].map((f) => (
              <div
                key={f}
                className="absolute left-0 right-0 border-t border-slate-100"
                style={{ top: `${f * 100}%` }}
              />
            ))}
          </div>
          <div className="absolute inset-0 p-3">
            <Bar data={chartData} options={chartOptions} />
          </div>
          {hasData && (
            <p className="absolute bottom-1.5 right-3 text-[9px] text-slate-400 pointer-events-none select-none"></p>
          )}
          {!hasData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-xl">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mb-2 shadow-inner">
                <BarChart3 className="w-5 h-5 text-slate-300" />
              </div>
              <p className="text-xs font-semibold text-slate-500">
                No attendance data
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                No records found for this date.
              </p>
            </div>
          )}
        </div>

        {hasData && (
          <div className="flex items-center justify-center gap-4 mt-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Sun size={10} className="text-amber-400" />
              <span>Morning: {totalMorning} total</span>
            </div>
            <div className="w-px h-3 bg-slate-200" />
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <Sunset size={10} className="text-orange-400" />
              <span>Afternoon: {totalAfternoon} total</span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          FOOTER — refresh button + last updated
      ══════════════════════════════════════ */}
      <div className="px-5 sm:px-6 pb-4 flex items-center justify-between">
        {/* Last refreshed timestamp */}
        <p className="text-[10px] text-slate-400 font-medium truncate">
          {lastRefreshedLabel ? (
            <span>
              Updated{" "}
              <span className="text-slate-500 font-semibold">
                {lastRefreshedLabel}
              </span>
            </span>
          ) : (
            <span>{displayDate(currentDate)}</span>
          )}
        </p>

        {/* Refresh button — disabled while in-flight, spins icon */}
        <button
          onClick={() => fetchAttendance(true)}
          disabled={refreshing}
          className={`
            flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg
            border transition-all duration-200 shrink-0
            ${
              refreshing
                ? "text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed"
                : "text-blue-600 border-blue-100 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 hover:text-blue-700"
            }
          `}
        >
          <RefreshCw
            size={11}
            className={
              refreshing ? "animate-spin text-slate-400" : "text-blue-500"
            }
          />
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
