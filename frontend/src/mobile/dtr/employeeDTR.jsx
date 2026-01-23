import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  TrendingUp,
  FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";

const EmployeeDTR = ({ employeeId }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchAttendance = async (range = dateRange) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await response.json();

      if (data.success) {
        let employeeAttendance = data.data.filter(
          (item) => item.employee_id === employeeId,
        );

        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (range.start && range.end) {
          const start = new Date(range.start);
          const end = new Date(range.end);
          employeeAttendance = employeeAttendance.filter((item) => {
            const recordDate = new Date(item.attendance_date);
            return recordDate >= start && recordDate <= end;
          });
        } else {
          employeeAttendance = employeeAttendance.filter((item) => {
            const recordDate = new Date(item.attendance_date);
            return recordDate <= today;
          });
        }

        employeeAttendance.sort(
          (a, b) => new Date(b.attendance_date) - new Date(a.attendance_date),
        );

        setAttendanceData(employeeAttendance);
      } else {
        console.error("Failed to fetch data");
      }
    } catch (error) {
      console.error("API Error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) fetchAttendance();
  }, [employeeId]);

  const formatTime = (timeString) => {
    if (!timeString || timeString === "00:00:00") return null;
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return format(date, "h:mm a");
  };

  const getStatus = (record) => {
    if (record.days_credited > 0) return "complete";
    if (!record.time_in_morning && !record.time_in_afternoon) return "absent";
    return "incomplete";
  };

  const handleDateFilter = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Filter Records",
      html: `
        <div class="flex flex-col gap-3 text-left">
          <label class="text-sm font-semibold text-gray-600">Start Date</label>
          <input id="start-date" class="swal2-input m-0 w-full text-sm" type="date">
          <label class="text-sm font-semibold text-gray-600 mt-2">End Date</label>
          <input id="end-date" class="swal2-input m-0 w-full text-sm" type="date">
        </div>
      `,
      focusConfirm: false,
      confirmButtonColor: "#2563EB",
      showCancelButton: true,
      preConfirm: () => {
        return {
          start: document.getElementById("start-date").value,
          end: document.getElementById("end-date").value,
        };
      },
    });

    if (formValues && formValues.start && formValues.end) {
      setDateRange(formValues);
      fetchAttendance(formValues);
    }
  };

  const handleReset = () => {
    setDateRange({ start: "", end: "" });
    fetchAttendance({ start: "", end: "" });
  };

  // Calculate stats
  const stats = {
    total: attendanceData.length,
    complete: attendanceData.filter((r) => getStatus(r) === "complete").length,
    incomplete: attendanceData.filter((r) => getStatus(r) === "incomplete")
      .length,
    absent: attendanceData.filter((r) => getStatus(r) === "absent").length,
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 rounded-2xl shadow-xl border border-gray-200/50 overflow-hidden">
      {/* Enhanced Header with Stats */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-4 sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-md opacity-50 group-hover:opacity-75 transition-opacity"></div>
              <div className="relative p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Daily Time Record
              </h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                {dateRange.start
                  ? `${format(parseISO(dateRange.start), "MMM d, yyyy")} - ${format(parseISO(dateRange.end), "MMM d, yyyy")}`
                  : "All Records"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button
              onClick={fetchAttendance}
              className="p-2.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-200"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <div className="h-8 w-px bg-gray-200"></div>

            <button
              onClick={handleDateFilter}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition-all shadow-sm hover:shadow-md"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </button>

            {dateRange.start && (
              <button
                onClick={handleReset}
                className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all border border-red-200 hover:border-red-300 shadow-sm"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards - Mobile Responsive */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-4 sm:px-6 pb-4 sm:pb-6">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<FileText className="w-4 h-4" />}
            color="blue"
          />
          <StatCard
            label="Complete"
            value={stats.complete}
            icon={<CheckCircle2 className="w-4 h-4" />}
            color="emerald"
          />
          <StatCard
            label="Incomplete"
            value={stats.incomplete}
            icon={<AlertCircle className="w-4 h-4" />}
            color="amber"
          />
          <StatCard
            label="Absent"
            value={stats.absent}
            icon={<XCircle className="w-4 h-4" />}
            color="red"
          />
        </div>
      </div>

      {/* Enhanced Table - Desktop */}
      <div className="hidden lg:block overflow-x-auto flex-1 bg-white/50">
        <table className="w-full">
          <thead className="sticky top-0 bg-gradient-to-r from-gray-50 to-slate-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="py-4 px-6 text-left">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                    Date
                  </span>
                </div>
              </th>
              <th className="py-4 px-6 text-left">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                    Morning Shift
                  </span>
                </div>
              </th>
              <th className="py-4 px-6 text-left">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                    Afternoon Shift
                  </span>
                </div>
              </th>
              <th className="py-4 px-6 text-center">
                <span className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                  Credit
                </span>
              </th>
              <th className="py-4 px-6 text-right">
                <span className="text-xs font-bold uppercase text-gray-600 tracking-wider">
                  Status
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse bg-white">
                  <td className="py-5 px-6">
                    <div className="h-4 bg-gray-200 rounded-lg w-32"></div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="h-8 w-8 bg-gray-200 rounded-full mx-auto"></div>
                  </td>
                  <td className="py-5 px-6">
                    <div className="h-6 bg-gray-200 rounded-full w-24 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : attendanceData.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-20 text-center bg-white">
                  <div className="flex flex-col items-center justify-center">
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl mb-4 border border-gray-200">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <span className="text-base font-semibold text-gray-400">
                      No records found
                    </span>
                    <span className="text-sm text-gray-400 mt-1">
                      Try adjusting your filters
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              attendanceData.map((record, index) => {
                const status = getStatus(record);
                const dateObj = parseISO(record.attendance_date);

                return (
                  <motion.tr
                    key={record.attendance_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.3 }}
                    className="hover:bg-blue-50/50 transition-all group cursor-default bg-white border-b border-gray-50"
                  >
                    <td className="py-5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-base">
                          {isValid(dateObj)
                            ? format(dateObj, "MMM d, yyyy")
                            : record.attendance_date}
                        </span>
                        <span className="text-xs text-gray-500 font-medium mt-0.5">
                          {isValid(dateObj) ? format(dateObj, "EEEE") : ""}
                        </span>
                      </div>
                    </td>

                    <td className="py-5 px-6">
                      <TimeCell
                        inTime={formatTime(record.time_in_morning)}
                        outTime={formatTime(record.time_out_morning)}
                      />
                    </td>

                    <td className="py-5 px-6">
                      <TimeCell
                        inTime={formatTime(record.time_in_afternoon)}
                        outTime={formatTime(record.time_out_afternoon)}
                      />
                    </td>

                    <td className="py-5 px-6 text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 font-bold text-blue-700 text-base border-2 border-blue-200 shadow-sm">
                        {record.days_credited || 0}
                      </div>
                    </td>

                    <td className="py-5 px-6 text-right">
                      <StatusBadge status={status} />
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 shadow-md animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          ))
        ) : attendanceData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="p-5 bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl mb-4 border border-gray-200">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <span className="text-base font-semibold text-gray-400">
              No records found
            </span>
          </div>
        ) : (
          attendanceData.map((record, index) => {
            const status = getStatus(record);
            const dateObj = parseISO(record.attendance_date);

            return (
              <motion.div
                key={record.attendance_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-base">
                        {isValid(dateObj)
                          ? format(dateObj, "MMM d, yyyy")
                          : record.attendance_date}
                      </div>
                      <div className="text-xs text-gray-600 font-medium mt-0.5">
                        {isValid(dateObj) ? format(dateObj, "EEEE") : ""}
                      </div>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-4">
                  {/* Morning Shift */}
                  <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl p-3 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                        Morning Shift
                      </span>
                    </div>
                    <MobileTimeCell
                      inTime={formatTime(record.time_in_morning)}
                      outTime={formatTime(record.time_out_morning)}
                    />
                  </div>

                  {/* Afternoon Shift */}
                  <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 rounded-xl p-3 border border-amber-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                        Afternoon Shift
                      </span>
                    </div>
                    <MobileTimeCell
                      inTime={formatTime(record.time_in_afternoon)}
                      outTime={formatTime(record.time_out_afternoon)}
                    />
                  </div>

                  {/* Credit */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-600">
                      Days Credited
                    </span>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 font-bold text-blue-700 text-base border-2 border-blue-200">
                      {record.days_credited || 0}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-white/80 backdrop-blur-sm flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-500">
        <span className="font-medium">
          Showing {attendanceData.length}{" "}
          {attendanceData.length === 1 ? "record" : "records"}
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Synced with Server
        </span>
      </div>
    </div>
  );
};

// --- Enhanced Sub Components ---

const StatCard = ({ label, value, icon, color }) => {
  const colorClasses = {
    blue: "from-blue-500 to-indigo-600 text-blue-700 bg-blue-50 border-blue-200",
    emerald:
      "from-emerald-500 to-teal-600 text-emerald-700 bg-emerald-50 border-emerald-200",
    amber:
      "from-amber-500 to-orange-600 text-amber-700 bg-amber-50 border-amber-200",
    red: "from-red-500 to-rose-600 text-red-700 bg-red-50 border-red-200",
  };

  const classes = colorClasses[color] || colorClasses.blue;

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${classes.split(" ")[0]} ${classes.split(" ")[1]} rounded-xl blur-md opacity-0 group-hover:opacity-20 transition-opacity`}
      ></div>
      <div
        className={`relative bg-white rounded-xl p-3 sm:p-4 border ${classes.split(" ").slice(-1)} shadow-sm hover:shadow-md transition-shadow`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {label}
          </span>
          <div className={`p-1.5 ${classes.split(" ")[3]} rounded-lg`}>
            {icon}
          </div>
        </div>
        <div
          className={`text-2xl sm:text-3xl font-bold ${classes.split(" ")[2]}`}
        >
          {value}
        </div>
      </div>
    </div>
  );
};

const TimeCell = ({ inTime, outTime }) => {
  if (!inTime && !outTime)
    return (
      <div className="flex items-center py-2">
        <span className="text-sm text-gray-400 italic font-medium">
          No logs
        </span>
      </div>
    );

  return (
    <div className="flex flex-col gap-2 min-h-[52px] justify-center">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 flex-shrink-0"></div>
        <span className="text-xs text-gray-500 font-semibold w-7 flex-shrink-0">
          IN
        </span>
        <span className="text-sm font-mono font-bold text-gray-800">
          {inTime || "--:--"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50 flex-shrink-0"></div>
        <span className="text-xs text-gray-500 font-semibold w-7 flex-shrink-0">
          OUT
        </span>
        <span className="text-sm font-mono font-bold text-gray-800">
          {outTime || "--:--"}
        </span>
      </div>
    </div>
  );
};

const MobileTimeCell = ({ inTime, outTime }) => {
  if (!inTime && !outTime)
    return (
      <span className="text-sm text-gray-400 italic font-medium">
        No logs recorded
      </span>
    );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span className="text-xs text-gray-600 font-semibold">IN</span>
        </div>
        <span className="text-sm font-mono font-bold text-gray-800">
          {inTime || "--:--"}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-xs text-gray-600 font-semibold">OUT</span>
        </div>
        <span className="text-sm font-mono font-bold text-gray-800">
          {outTime || "--:--"}
        </span>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    complete: {
      bg: "bg-gradient-to-r from-emerald-50 to-teal-50",
      text: "text-emerald-700",
      border: "border-emerald-300",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      label: "Complete",
    },
    incomplete: {
      bg: "bg-gradient-to-r from-amber-50 to-orange-50",
      text: "text-amber-700",
      border: "border-amber-300",
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: "Incomplete",
    },
    absent: {
      bg: "bg-gradient-to-r from-red-50 to-rose-50",
      text: "text-red-700",
      border: "border-red-300",
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: "Absent",
    },
  };

  const config = configs[status] || configs.incomplete;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 ${config.bg} ${config.text} ${config.border} shadow-sm`}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};

export default EmployeeDTR;
