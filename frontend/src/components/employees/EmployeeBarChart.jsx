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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AttendanceDashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [onDutyCount, setOnDutyCount] = useState(0);

  // Helpers
  const localYYYYMMDD = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

  const parseYYYYMMDDToDate = (yyyyMmDd) => new Date(`${yyyyMmDd}T00:00`);
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

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setAttendanceData(data.data);
      else throw new Error(data.message || "Failed to fetch attendance data");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const selectedDate = localYYYYMMDD(currentDate);
  const filteredAttendance = attendanceData.filter(
    (a) => String(a.attendance_date || "").slice(0, 10) === selectedDate
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
      lateM = 0,
      earlyA = 0,
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
    return {
      earlyM,
      onTimeM,
      lateM,
      earlyA,
      onTimeA,
      lateA,
    };
  })();

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
        backgroundColor: "rgba(59, 130, 246, 0.9)",
        borderRadius: 8,
      },
    ],
  };

  const escapeHtml = (str = "") =>
    String(str).replace(/[&<>]/g, (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[tag] || tag));

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
    const matched = filteredAttendance.filter((r) => recordMatchesCategory(r, category));

    const html = `
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;gap:8px;align-items:center">
          <input id="swal-search" placeholder="Search name or ID..." style="flex:1;padding:10px;border-radius:10px;border:1px solid #d1d5db;font-size:14px"/>
          <div style="min-width:110px;color:#374151;font-size:13px">Matches: <strong id="swal-count">${matched.length}</strong></div>
        </div>

        <div style="max-height:420px;overflow:auto;border-radius:10px">
          <table style="width:100%;border-collapse:collapse;font-size:14px;background:#fff;border-radius:10px">
            <thead style="background:#f3f4f6;position:sticky;top:0;z-index:1">
              <tr>
                <th style="padding:8px 10px;text-align:left;border-bottom:1px solid #e5e7eb">Employee</th>
                <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e5e7eb">AM In</th>
                <th style="padding:8px 10px;text-align:center;border-bottom:1px solid #e5e7eb">PM In</th>
              </tr>
            </thead>
            <tbody id="swal-rows">
              ${
                matched.length
                  ? matched
                      .map((r) => {
                        const n = escapeHtml(r.employee_name || r.employee_id);
                        const am = escapeHtml(formatTime12(r.time_in_morning));
                        const pm = escapeHtml(formatTime12(r.time_in_afternoon));
                        return `<tr>
                          <td style="padding:8px 10px;border-bottom:1px solid #e9edf0">${n}</td>
                          <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #e9edf0">${am}</td>
                          <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #e9edf0">${pm}</td>
                        </tr>`;
                      })
                      .join("")
                  : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#6b7280">No records</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    Swal.fire({
      title: `${escapeHtml(category)} — ${escapeHtml(displayDateString(currentDate))}`,
      html,
      width: window.innerWidth < 600 ? "90%" : 760,
      showCloseButton: true,
      showConfirmButton: false,
      background: "#fff",
      didOpen: () => {
        const c = Swal.getHtmlContainer();
        if (!c) return;
        const input = c.querySelector("#swal-search");
        const tbody = c.querySelector("#swal-rows");
        const countEl = c.querySelector("#swal-count");

        const render = (q = "") => {
          const query = q.toLowerCase();
          const filtered = matched.filter(
            (r) =>
              r.employee_name?.toLowerCase().includes(query) ||
              r.employee_id?.toLowerCase().includes(query)
          );

          countEl.textContent = filtered.length;
          tbody.innerHTML = filtered.length
            ? filtered
                .map((r) => {
                  const n = escapeHtml(r.employee_name || r.employee_id);
                  const am = escapeHtml(formatTime12(r.time_in_morning));
                  const pm = escapeHtml(formatTime12(r.time_in_afternoon));
                  return `<tr>
                    <td style="padding:8px 10px;border-bottom:1px solid #e9edf0">${n}</td>
                    <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #e9edf0">${am}</td>
                    <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #e9edf0">${pm}</td>
                  </tr>`;
                })
                .join("")
            : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#6b7280">No results</td></tr>`;
        };

        input?.addEventListener("input", (e) => render(e.target.value));
        input?.focus();
      },
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_, elements) => {
      if (elements?.length) showEmployeesForCategory(chartData.labels[elements[0].index]);
    },
    scales: {
      x: { ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,0.1)" } },
      y: { beginAtZero: true, ticks: { color: "#e5e7eb" }, grid: { color: "rgba(255,255,255,0.1)" } },
    },
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}` } },
    },
  };

  const goToPreviousDay = () => setCurrentDate((d) => new Date(d.setDate(d.getDate() - 1)));
  const goToNextDay = () => setCurrentDate((d) => new Date(d.setDate(d.getDate() + 1)));
  const handleDateChange = (e) => setCurrentDate(parseYYYYMMDDToDate(e.target.value));

  if (loading)
    return (
      <div className="text-gray-300 text-center py-6 animate-pulse">
        Loading attendance summary...
      </div>
    );

  return (
    <div className="w-full bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border border-gray-700 rounded-3xl shadow-lg p-6">
      {/* Header with responsive layout */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Attendance Summary
        </h2>

        <div className="w-full md:w-auto flex items-center justify-center md:justify-end gap-2">
          <button
            onClick={goToPreviousDay}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white"
          >
            ←
          </button>
          <input
            type="date"
            value={localYYYYMMDD(currentDate)}
            onChange={handleDateChange}
            className="p-2 rounded-lg bg-gray-800 border border-gray-600 text-white text-sm"
          />
          <button
            onClick={goToNextDay}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white"
          >
            →
          </button>
        </div>
      </div>

      {/* Readable Date */}
      <div className="text-center mb-4 text-sm text-gray-300 font-medium">
        {displayDateString(currentDate)}
      </div>

      {/* On Duty Counter */}
      <div className="bg-gray-950/60 border border-gray-700 rounded-2xl py-5 text-center mb-5 shadow-inner">
        <p className="text-gray-300 text-sm uppercase tracking-wide">
          Employees On Duty
        </p>
        <h1 className="text-6xl font-extrabold tracking-wider mt-2 text-white">
          {onDutyCount}
        </h1>
      </div>

      {/* Chart */}
      <div className="w-full h-[320px] bg-gray-950/50 border border-gray-700 rounded-2xl p-4 shadow-inner backdrop-blur-sm">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <p className="text-xs text-gray-500 mt-3 text-center">
        Summary for {displayDateString(currentDate)}
      </p>
    </div>
  );
};

export default AttendanceDashboard;
