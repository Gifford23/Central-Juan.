import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import {
  Calendar as CalendarIcon,
  Search,
  Filter,
  RefreshCw,
  Download,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
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
          // Default: Last 30 days if no range selected (Cleaner initial view)
          employeeAttendance = employeeAttendance.filter((item) => {
            const recordDate = new Date(item.attendance_date);
            return recordDate <= today;
          });
        }

        // Sort: Newest first
        employeeAttendance.sort(
          (a, b) => new Date(b.attendance_date) - new Date(a.attendance_date),
        );

        setAttendanceData(employeeAttendance);
      } else {
        // Silent fail or toast in production
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

  // Helper to format time cleanly (e.g. 08:30 AM)
  const formatTime = (timeString) => {
    if (!timeString || timeString === "00:00:00") return null;
    const [hours, minutes] = timeString.split(":");
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    return format(date, "h:mm a");
  };

  // Determine status for badge
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

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden font-sans">
      {/* --- Toolbar --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center p-5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 mb-4 sm:mb-0">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Attendance Log</h2>
            <p className="text-xs text-gray-500 font-medium">
              {dateRange.start
                ? `${format(parseISO(dateRange.start), "MMM d, yyyy")} - ${format(parseISO(dateRange.end), "MMM d, yyyy")}`
                : "All Records"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendance}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>

          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          <button
            onClick={handleDateFilter}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-lg transition-all shadow-sm"
          >
            <Filter size={16} />
            Filter
          </button>

          {dateRange.start && (
            <button
              onClick={handleReset}
              className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="overflow-x-auto grow bg-gray-50/30">
        <style jsx>{`
          .dtr-table th,
          .dtr-table td {
            display: table-cell;
            vertical-align: middle;
            width: auto;
            flex: none;
            word-break: normal;
            text-align: left;
          }
          .dtr-table th.text-center,
          .dtr-table td.text-center {
            text-align: center;
          }
          .dtr-table th.text-right,
          .dtr-table td.text-right {
            text-align: right;
          }
        `}</style>
        <table className="dtr-table w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="py-4 px-6 text-xs font-bold uppercase text-gray-500 tracking-wider w-[20%]">
                Date
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase text-gray-500 tracking-wider w-[20%]">
                Morning Shift
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase text-gray-500 tracking-wider w-[20%]">
                Afternoon Shift
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase text-gray-500 tracking-wider w-[15%] text-center">
                Credit
              </th>
              <th className="py-4 px-6 text-xs font-bold uppercase text-gray-500 tracking-wider w-[15%] text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded w-8 mx-auto"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-6 bg-gray-200 rounded-full w-20 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : attendanceData.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <div className="p-4 bg-gray-50 rounded-full mb-3">
                      <Search size={32} className="opacity-50" />
                    </div>
                    <span className="text-sm font-medium">
                      No records found
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50/30 transition-colors group cursor-default border-b border-gray-50"
                  >
                    {/* Date Column */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 text-sm">
                          {isValid(dateObj)
                            ? format(dateObj, "MMM d, yyyy")
                            : record.attendance_date}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">
                          {isValid(dateObj) ? format(dateObj, "EEEE") : ""}
                        </span>
                      </div>
                    </td>

                    {/* Morning Column */}
                    <td className="py-4 px-6">
                      <TimeCell
                        inTime={formatTime(record.time_in_morning)}
                        outTime={formatTime(record.time_out_morning)}
                      />
                    </td>

                    {/* Afternoon Column */}
                    <td className="py-4 px-6">
                      <TimeCell
                        inTime={formatTime(record.time_in_afternoon)}
                        outTime={formatTime(record.time_out_afternoon)}
                      />
                    </td>

                    {/* Credit Column */}
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 font-bold text-gray-700 text-sm border border-gray-200">
                        {record.days_credited || 0}
                      </div>
                    </td>

                    {/* Status Column */}
                    <td className="py-4 px-6 text-right">
                      <StatusBadge status={status} />
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination (Static for now) */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 text-xs text-gray-400 flex justify-between items-center">
        <span>Showing {attendanceData.length} records</span>
        <span>Synced with Server</span>
      </div>
    </div>
  );
};

// --- Sub Components for cleaner code ---

const TimeCell = ({ inTime, outTime }) => {
  if (!inTime && !outTime)
    return (
      <div className="flex items-center justify-center py-2">
        <span className="text-xs text-gray-300 italic font-medium">
          No logs
        </span>
      </div>
    );

  return (
    <div className="flex flex-col gap-1.5 min-h-[48px] justify-center">
      <div className="flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"></div>
        <span className="text-xs text-gray-500 font-medium w-6 flex-shrink-0">
          IN
        </span>
        <span className="text-sm font-mono font-medium text-gray-700">
          {inTime || "--:--"}
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></div>
        <span className="text-xs text-gray-500 font-medium w-6 flex-shrink-0">
          OUT
        </span>
        <span className="text-sm font-mono font-medium text-gray-700">
          {outTime || "--:--"}
        </span>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const styles = {
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    incomplete: "bg-amber-50 text-amber-700 border-amber-200",
    absent: "bg-red-50 text-red-700 border-red-200",
  };

  const icons = {
    complete: <CheckCircle2 size={12} />,
    incomplete: <AlertCircle size={12} />,
    absent: <XCircle size={12} />,
  };

  const labels = {
    complete: "Complete",
    incomplete: "Incomplete",
    absent: "Absent",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${styles[status] || styles.incomplete} ml-auto`}
    >
      {icons[status] || icons.incomplete}
      {labels[status] || "Unknown"}
    </div>
  );
};

export default EmployeeDTR;
