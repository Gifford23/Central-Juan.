import React, { useEffect, useState } from "react";
import BASE_URL from "../../../backend/server/config";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import AttendanceListCard from "../attendance/AttendanceLogsAdminM/Components_AttendanceLogs/AttenLogs_ListCard";
import {
  CalendarDays,
  ArrowUpDown,
  Users,
  Clock,
  ClipboardCheck,
  Activity,
  CheckCircle2,
  TrendingUp,
  Sparkles,
} from "lucide-react";

// ─────────────────────────────────────────────
// CUSTOM SCROLLBAR STYLES (inject once)
// ─────────────────────────────────────────────
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 5px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 999px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
`;

// ─────────────────────────────────────────────
// SKELETON CARD (enhanced)
// ─────────────────────────────────────────────
function SkeletonAttendanceCard() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 p-5 shadow-sm animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-100" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-3/4 bg-slate-200 rounded-full" />
          <div className="h-2.5 w-1/2 bg-slate-100 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <div className="h-9 bg-slate-50 rounded-xl border border-slate-100" />
        <div className="h-9 bg-slate-50 rounded-xl border border-slate-100" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, gradient, delay = 0 }) {
  const gradients = {
    blue: "from-blue-500 to-indigo-600",
    emerald: "from-emerald-500 to-teal-600",
    orange: "from-orange-500 to-orange-600",
    violet: "from-violet-500 to-purple-600",
  };

  const bgLight = {
    blue: "bg-blue-50/80",
    emerald: "bg-emerald-50/80",
    orange: "bg-orange-50/80",
    violet: "bg-violet-50/80",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/60 ${bgLight[gradient] || bgLight.blue} p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}
      style={{
        animation: `fadeSlideUp 0.5s ease-out ${delay}s both`,
      }}
    >
      <div
        className={`absolute -top-6 -right-6 w-16 h-16 rounded-full bg-gradient-to-br ${gradients[gradient]} opacity-10 blur-lg`}
      />

      <div className="relative flex items-center gap-3">
        <div
          className={`p-2 rounded-xl bg-gradient-to-br ${gradients[gradient]} text-white shadow-sm`}
        >
          <Icon size={15} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider leading-none">
            {label}
          </p>
          <p className="text-lg font-extrabold text-slate-800 tracking-tight mt-0.5 leading-tight">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LEADERBOARD ROW
// ─────────────────────────────────────────────
function LeaderboardRow({ row, rank, maxCount }) {
  const rankConfig = {
    1: {
      text: "text-emerald-700",
      border: "border-emerald-200",
      ringColor: "ring-emerald-300",
      barColor: "bg-gradient-to-r from-emerald-400 to-teal-400",
      rowBg: "#f0fdf4, #ecfdf5",
      badge: "1",
      badgeBg: "bg-emerald-100 text-emerald-700",
    },
    2: {
      text: "text-blue-700",
      border: "border-blue-200",
      ringColor: "ring-blue-300",
      barColor: "bg-gradient-to-r from-blue-400 to-indigo-400",
      rowBg: "#eff6ff, #dbeafe",
      badge: "2",
      badgeBg: "bg-blue-100 text-blue-700",
    },
    3: {
      text: "text-violet-700",
      border: "border-violet-200",
      ringColor: "ring-violet-300",
      barColor: "bg-gradient-to-r from-violet-400 to-purple-400",
      rowBg: "#f5f3ff, #ede9fe",
      badge: "3",
      badgeBg: "bg-violet-100 text-violet-700",
    },
  };
  const rc = rankConfig[rank];
  const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

  return (
    <TableRow
      sx={{
        "&:last-child td, &:last-child th": { border: 0 },
        transition: "all 0.2s ease",
        "&:hover": {
          backgroundColor: rc ? undefined : "#f8fafc",
          transform: "scale(1.002)",
        },
        ...(rc && {
          background: `linear-gradient(135deg, ${rc.rowBg})`,
        }),
      }}
    >
      <TableCell sx={{ paddingY: "12px", paddingX: "14px", width: 44 }}>
        {rc ? (
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-extrabold ${rc.badgeBg}`}
          >
            {rc.badge}
          </span>
        ) : (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-[10px] font-bold text-slate-400 tabular-nums">
            {rank}
          </span>
        )}
      </TableCell>

      <TableCell sx={{ paddingY: "12px", paddingX: "8px" }}>
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm ring-2 ring-offset-1 ${rc ? rc.ringColor : "ring-slate-200"}`}
            style={{
              background: `linear-gradient(135deg, hsl(${(rank * 47 + 200) % 360}, 60%, 50%), hsl(${(rank * 47 + 230) % 360}, 55%, 60%))`,
            }}
          >
            {row.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-slate-700 truncate block max-w-[140px]">
              {row.name}
            </span>
            <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${rc ? rc.barColor : "bg-emerald-400"}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell align="right" sx={{ paddingY: "12px", paddingX: "14px" }}>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm ${
            rc
              ? `${rc.text} ${rc.border} bg-white/80`
              : "bg-emerald-50 text-emerald-700 border-emerald-100"
          }`}
        >
          <CheckCircle2 size={12} className="shrink-0" />
          {row.count}
          <span className="font-normal opacity-60">{row.timeLabel}</span>
        </span>
      </TableCell>
    </TableRow>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
const Punctual = () => {
  const todayFullDate = new Date().toISOString().split("T")[0];

  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [punctualCounts, setPunctualCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayFullDate);
  const [isAscending, setIsAscending] = useState(false);

  // ── Helpers ───────────────────────────────
  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const suffix = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${suffix}`;
  };
  const isMidnight = (time) => time === "12:00 AM" || time === "00:00:00";

  // ── Data Fetching ─────────────────────────
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      const allData = data.data || [];
      setAttendanceData(allData);
      const dateRecords = allData.filter(
        (record) =>
          new Date(record.attendance_date).toISOString().split("T")[0] ===
          selectedDate,
      );
      setFilteredData(dateRecords);
      calculatePunctuality(dateRecords, selectedDate);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePunctuality = (data, date) => {
    const counts = {};
    data.forEach((record) => {
      const timeIn = record.time_in_morning;
      const recordDate = new Date(record.attendance_date)
        .toISOString()
        .split("T")[0];
      if (recordDate === date && timeIn >= "08:00:00" && timeIn <= "09:05:00") {
        counts[record.employee_name] = (counts[record.employee_name] || 0) + 1;
      }
    });
    setPunctualCounts(counts);
  };

  const handleDateChange = (e) => setSelectedDate(e.target.value);
  const toggleSortOrder = () => setIsAscending((prev) => !prev);

  const rows = Object.entries(punctualCounts)
    .map(([employee, count]) => ({
      name: employee,
      count,
      timeLabel: count === 1 ? "time" : "times",
    }))
    .sort((a, b) => (isAscending ? a.count - b.count : b.count - a.count));

  const maxCount = rows.length > 0 ? Math.max(...rows.map((r) => r.count)) : 0;

  // ── Derived stats ─────────────────────────
  const punctualCount = Object.keys(punctualCounts).length;
  const totalRecords = filteredData.length;
  const punctualityRate =
    totalRecords > 0 ? Math.round((punctualCount / totalRecords) * 100) : 0;

  // ── Effects ───────────────────────────────
  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    const filtered = attendanceData.filter(
      (record) =>
        new Date(record.attendance_date).toISOString().split("T")[0] ===
        selectedDate,
    );
    setFilteredData(filtered);
    calculatePunctuality(filtered, selectedDate);
  }, [selectedDate]);

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        ${scrollbarStyles}
      `}</style>

      <div className="flex flex-col w-full bg-white rounded-2xl border border-slate-200/60 shadow-lg overflow-hidden">
        {/* ══════════════════════════
            HEADER
        ══════════════════════════ */}
        <div className="relative px-5 sm:px-7 pt-6 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background:
                "linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6, #6366f1, #3b82f6)",
              backgroundSize: "200% 100%",
              animation: "shimmer 3s linear infinite",
            }}
          />
          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl shadow-md shadow-blue-200/50 shrink-0">
                  <Clock size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
                    Daily Attendance
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    {new Date(selectedDate + "T00:00:00").toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="relative group shrink-0">
              <CalendarDays
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none z-10"
              />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={todayFullDate}
                className="pl-9 pr-3 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all duration-200 cursor-pointer w-full sm:w-auto hover:border-slate-300"
              />
            </div>
          </div>

          {!loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <StatCard
                icon={Users}
                label="Total Records"
                value={totalRecords}
                gradient="blue"
                delay={0}
              />
              <StatCard
                icon={CheckCircle2}
                label="On-Time"
                value={punctualCount}
                gradient="emerald"
                delay={0.05}
              />
              <StatCard
                icon={Activity}
                label="Rate"
                value={`${punctualityRate}%`}
                gradient="orange"
                delay={0.1}
              />
              <StatCard
                icon={TrendingUp}
                label="Top Streak"
                value={maxCount > 0 ? `${maxCount}×` : "—"}
                gradient="violet"
                delay={0.15}
              />
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            ATTENDANCE CARDS
        ══════════════════════════════════════════ */}
        <div className="px-4 sm:px-6 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={13} className="text-indigo-400" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
              Attendance Records
            </h3>
            {!loading && filteredData.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full ml-1">
                {filteredData.length}
              </span>
            )}
          </div>

          <div
            className="overflow-y-auto pr-1 custom-scrollbar"
            style={{ maxHeight: "292px" }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 pb-1">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonAttendanceCard key={i} />
                ))
              ) : filteredData.length > 0 ? (
                filteredData.map((item, index) => (
                  <div
                    key={item.attendance_id}
                    className="transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-200/50 active:scale-[0.98] rounded-2xl"
                    style={{
                      animation: `fadeSlideUp 0.4s ease-out ${index * 0.03}s both`,
                    }}
                  >
                    {/* ✅ REMOVED: onDelete prop no longer passed */}
                    <AttendanceListCard
                      item={item}
                      formatTime={formatTime}
                      isMidnight={isMidnight}
                    />
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-16 bg-gradient-to-b from-slate-50/80 to-white rounded-2xl border border-dashed border-slate-200">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-100 shadow-sm">
                    <Users className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    No attendance records
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-[200px] text-center">
                    No data found for this date. Try selecting a different date.
                  </p>
                </div>
              )}
            </div>
          </div>

          {!loading && filteredData.length > 6 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                {filteredData.length - 6} more · scroll ↓
              </span>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
            </div>
          )}
        </div>

        {/* ══════════════════════════
            DIVIDER
        ══════════════════════════ */}
        <div className="mx-5 sm:mx-7 mb-4 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* ══════════════════════════
            PUNCTUALITY COMPLIANCE
        ══════════════════════════ */}
        <div className="px-4 sm:px-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-emerald-50 rounded-lg">
                <ClipboardCheck size={14} className="text-emerald-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                Punctuality Compliance
              </h3>
              {rows.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {rows.length}
                </span>
              )}
            </div>

            <button
              onClick={toggleSortOrder}
              className="group flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 px-3.5 py-2 rounded-xl shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <ArrowUpDown
                size={11}
                className="group-hover:scale-110 transition-transform"
              />
              {isAscending ? "Lowest first" : "Highest first"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
            <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ backgroundColor: "transparent" }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e2e8f0",
                          width: 44,
                          paddingY: "10px",
                          paddingX: "14px",
                          color: "#94a3b8",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        #
                      </TableCell>
                      <TableCell
                        sx={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e2e8f0",
                          paddingY: "10px",
                          paddingX: "8px",
                          color: "#64748b",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Employee
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          backgroundColor: "#f8fafc",
                          borderBottom: "2px solid #e2e8f0",
                          paddingY: "10px",
                          paddingX: "14px",
                          color: "#64748b",
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        On-Time
                      </TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          <div className="py-10 flex flex-col items-center gap-2.5">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                              <ClipboardCheck className="w-6 h-6 text-emerald-200" />
                            </div>
                            <p className="text-xs text-slate-400 font-semibold">
                              No punctuality data for this date
                            </p>
                            <p className="text-[10px] text-slate-300">
                              Records will appear when employees check in on
                              time.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row, idx) => (
                        <LeaderboardRow
                          key={row.name}
                          row={row}
                          rank={isAscending ? rows.length - idx : idx + 1}
                          maxCount={maxCount}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Punctual;
