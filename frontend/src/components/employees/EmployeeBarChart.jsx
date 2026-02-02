// src/components/dashboard/AttendanceDashboard.jsx
import React, { useEffect, useState } from "react";
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

// Register ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const AttendanceDashboard = () => {
  // --- State ---
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [onDutyCount, setOnDutyCount] = useState(0);

  // --- Helpers ---
  const localYYYYMMDD = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;

  const parseYYYYMMDDToDate = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00`);

  // Display date for the Header text
  const displayDateString = (date) =>
    date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return null;
    return h * 60 + (m || 0);
  };

  const formatTime12 = (timeStr) => {
    if (!timeStr) return "—";
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return "—";
    const ampm = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  // --- Data Fetching ---
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAttendanceData(data.data);
      } else {
        throw new Error(data.message || "Failed to fetch attendance data");
      }
    } catch (err) {
      console.error(err);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // --- Filtering ---
  const selectedDateStr = localYYYYMMDD(currentDate);
  const filteredAttendance = attendanceData.filter(
    (a) => String(a.attendance_date || "").slice(0, 10) === selectedDateStr,
  );

  useEffect(() => {
    const unique = new Set();
    filteredAttendance.forEach((a) => {
      if (a.time_in_morning || a.time_in_afternoon) unique.add(a.employee_id);
    });
    setOnDutyCount(unique.size);
  }, [filteredAttendance]);

  const summary = (() => {
    let earlyM = 0,
      onTimeM = 0,
      lateM = 0;
    let earlyA = 0,
      onTimeA = 0,
      lateA = 0;

    filteredAttendance.forEach((a) => {
      const am = parseTimeToMinutes(a.time_in_morning);
      const pm = parseTimeToMinutes(a.time_in_afternoon);
      if (am !== null) {
        if (am < 9 * 60) earlyM++;
        else if (am === 9 * 60) onTimeM++;
        else lateM++;
      }
      if (pm !== null) {
        if (pm < 13 * 60) earlyA++;
        else if (pm === 13 * 60) onTimeA++;
        else lateA++;
      }
    });
    return { earlyM, onTimeM, lateM, earlyA, onTimeA, lateA };
  })();

  // --- Chart Config ---
  const chartData = {
    labels: [
      "Early Morning",
      "On Time Morning",
      "Late Morning",
      "Early Afternoon",
      "On Time Afternoon",
      "Late Afternoon",
    ],
    datasets: [
      {
        label: "Attendance",
        data: [
          summary.earlyM,
          summary.onTimeM,
          summary.lateM,
          summary.earlyA,
          summary.onTimeA,
          summary.lateA,
        ],
        backgroundColor: [
          "rgba(37, 99, 235, 0.9)", // Blue (Tailwind: blue-600)
          "rgba(16, 185, 129, 0.9)", // Green / Emerald (Tailwind: emerald-500)
          "rgba(244, 63, 94, 0.9)", // Red / Rose (Tailwind: rose-500)
          "rgba(37, 99, 235, 0.9)", // Blue (Tailwind: blue-600)
          "rgba(16, 185, 129, 0.9)", // Green / Emerald (Tailwind: emerald-500)
          "rgba(244, 63, 94, 0.9)", // Red / Rose (Tailwind: rose-500)
        ],
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_, elements) => {
      if (elements?.length) {
        const categories = [
          "Early Morning",
          "On Time Morning",
          "Late Morning",
          "Early Afternoon",
          "On Time Afternoon",
          "Late Afternoon",
        ];
        showEmployeesForCategory(categories[elements[0].index]);
      }
    },
    scales: {
      x: {
        ticks: { color: "#9ca3af", font: { size: 10 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        // Suggested Max ensures graph lines show even if data is 0
        suggestedMax: 1,
        ticks: {
          color: "#fff",
          font: { size: 11 },
          stepSize: 1,
          callback: function (value) {
            return value.toFixed(1);
          },
        },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "center",
        labels: {
          color: "#fff",
          font: { size: 12, weight: "bold" },
          boxWidth: 15,
          usePointStyle: false,
        },
      },
      tooltip: {
        backgroundColor: "#1e293b",
        titleColor: "#fff",
        bodyColor: "#cbd5e1",
        borderColor: "#334155",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
      },
    },
  };

  // --- Modal Logic ---
  const escapeHtml = (str = "") =>
    String(str).replace(
      /[&<>]/g,
      (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[tag] || tag,
    );

  const recordMatchesCategory = (r, cat) => {
    const am = parseTimeToMinutes(r.time_in_morning);
    const pm = parseTimeToMinutes(r.time_in_afternoon);
    switch (cat) {
      case "Early Morning":
        return am !== null && am < 9 * 60;
      case "On Time Morning":
        return am !== null && am === 9 * 60;
      case "Late Morning":
        return am !== null && am > 9 * 60;
      case "Early Afternoon":
        return pm !== null && pm < 13 * 60;
      case "On Time Afternoon":
        return pm !== null && pm === 13 * 60;
      case "Late Afternoon":
        return pm !== null && pm > 13 * 60;
      default:
        return false;
    }
  };

  const showEmployeesForCategory = (category) => {
    const matched = filteredAttendance.filter((r) =>
      recordMatchesCategory(r, category),
    );

    const html = `
      <div style="display:flex;flex-direction:column;gap:15px; text-align:left;">
        <div style="display:flex;gap:10px;align-items:center; background:rgba(255,255,255,0.05); padding:10px; rounded:10px; border:1px solid rgba(255,255,255,0.1);">
          <input id="swal-search" placeholder="Search employee..." style="flex:1; background:transparent; border:none; color:#e2e8f0; outline:none; font-size:15px;" autocomplete="off"/>
          <span style="font-size:12px; color:#94a3b8; font-weight:bold; background:rgba(0,0,0,0.3); padding:3px 8px; rounded:6px;">${matched.length}</span>
        </div>
        
        <div style="max-height:50vh; overflow:auto; border-radius:10px; border:1px solid rgba(255,255,255,0.05); background:rgba(0,0,0,0.2);">
          <table style="width:100%; border-collapse:collapse; font-size:14px;">
            <thead style="position:sticky; top:0; background:#1e293b; z-index:10;">
               <tr>
                  <th style="padding:12px; text-align:left; color:#94a3b8; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1);">EMPLOYEE</th>
                  <th style="padding:12px; text-align:center; color:#94a3b8; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1);">MORNING</th>
                  <th style="padding:12px; text-align:center; color:#94a3b8; font-weight:600; border-bottom:1px solid rgba(255,255,255,0.1);">AFTERNOON</th>
               </tr>
            </thead>
            <tbody id="swal-rows">
              ${
                matched.length
                  ? matched
                      .map(
                        (r) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:12px; color:#f1f5f9; white-space: nowrap; font-weight:500;">${escapeHtml(r.employee_name || r.employee_id)}</td>
                  <td style="padding:12px; text-align:center; color:#94a3b8; font-family:monospace; white-space: nowrap;">${escapeHtml(formatTime12(r.time_in_morning))}</td>
                  <td style="padding:12px; text-align:center; color:#94a3b8; font-family:monospace; white-space: nowrap;">${escapeHtml(formatTime12(r.time_in_afternoon))}</td>
                </tr>`,
                      )
                      .join("")
                  : `<tr><td colspan="3" style="padding:20px; text-align:center; color:#64748b;">No records found</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    Swal.fire({
      title: `<span style="color:#f8fafc; font-size:20px;">${escapeHtml(category)}</span>`,
      html,
      width: 800,
      showConfirmButton: false,
      showCloseButton: true,
      background: "#1e293b",
      customClass: { popup: "border border-slate-700 shadow-2xl rounded-2xl" },
      didOpen: () => {
        const input = document.getElementById("swal-search");
        const tbody = document.getElementById("swal-rows");
        input?.addEventListener("input", (e) => {
          const query = e.target.value.toLowerCase();
          const filtered = matched.filter((r) =>
            (r.employee_name || r.employee_id).toLowerCase().includes(query),
          );
          tbody.innerHTML = filtered.length
            ? filtered
                .map(
                  (r) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:12px; color:#f1f5f9; white-space: nowrap; font-weight:500;">${escapeHtml(r.employee_name || r.employee_id)}</td>
              <td style="padding:12px; text-align:center; color:#94a3b8; font-family:monospace; white-space: nowrap;">${escapeHtml(formatTime12(r.time_in_morning))}</td>
              <td style="padding:12px; text-align:center; color:#94a3b8; font-family:monospace; white-space: nowrap;">${escapeHtml(formatTime12(r.time_in_afternoon))}</td>
            </tr>`,
                )
                .join("")
            : `<tr><td colspan="3" style="padding:20px; text-align:center; color:#64748b;">No matches</td></tr>`;
        });
        input?.focus();
      },
    });
  };

  const navDate = (d) =>
    setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + d)));
  const handleDateChange = (e) =>
    setCurrentDate(parseYYYYMMDDToDate(e.target.value));

  if (loading)
    return (
      <div className="h-96 w-full bg-[#0B1221] rounded-3xl animate-pulse border border-white/5" />
    );

  return (
    // MAIN CONTAINER
    <div className="relative w-full overflow-hidden rounded-3xl p-[1px] shadow-2xl bg-[#0B1221] border border-slate-800">
      {/* Content Container */}
      <div className="relative z-10 w-full rounded-3xl p-5 sm:p-6 flex flex-col gap-6">
        {/* 1. Header Section */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Attendance Overview
              </h2>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 ml-6">
              {displayDateString(currentDate).toUpperCase()}
            </p>
          </div>

          {/* DATE PICKER */}
          <div className="flex items-center justify-between bg-[#151e32] rounded-xl p-1.5 border border-slate-700/50 w-[240px] self-start shadow-inner">
            <button
              onClick={() => navDate(-1)}
              className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <input
              type="date"
              value={localYYYYMMDD(currentDate)}
              onChange={handleDateChange}
              className="min-w-0 flex-1 bg-transparent border-none text-sm text-slate-200 focus:ring-0 cursor-pointer text-center font-bold px-0"
              style={{ colorScheme: "dark" }}
            />
            <button
              onClick={() => navDate(1)}
              className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. HERO STATS CARD */}
        <div className="w-full bg-[#151e32] border border-slate-700/30 rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col items-center">
            <span className="px-5 py-1.5 rounded-full bg-[#1e293b] text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-5 border border-blue-500/10 shadow-sm">
              Live Count
            </span>
            <h1 className="text-7xl sm:text-8xl font-black text-slate-200 tracking-tighter drop-shadow-2xl">
              {onDutyCount}
            </h1>
            <p className="text-sm text-slate-400 font-semibold mt-2">
              Employees On Duty
            </p>
          </div>
        </div>

        {/* 3. CHART SECTION (Always Rendered) */}
        <div className="w-full h-[320px] bg-[#0f1623] border border-slate-800 rounded-3xl p-4 sm:p-6 relative">
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* 4. FOOTER SUMMARY */}
        <div className="text-center mt-2 pb-1">
          <p className="text-sm text-slate-500 font-medium tracking-wide">
            Summary for {displayDateString(currentDate)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
