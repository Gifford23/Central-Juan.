import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useLocation } from "react-router-dom";
import BASE_URL from "../../../backend/server/config";
import NotificationActionButtonEmp from "./NotificationComponents/NotificationActionButtonEmp";
import { useSession } from "../../context/SessionContext";
import {
  Bell,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  FileText,
  Timer,
} from "lucide-react";

// --- Helper Functions ---
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time) => {
  if (!time || time === "00:00:00") return "--";
  const [h, m] = time.split(":");
  const date = new Date();
  date.setHours(h, m);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// --- Icon & Color Helpers ---
const getNotificationIcon = (type) => {
  switch (type) {
    case "Overtime":
      return <Timer className="w-5 h-5" />;
    case "Leave":
      return <Calendar className="w-5 h-5" />;
    case "Late Attendance":
      return <Clock className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Approved":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "Rejected":
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
  }
};

const getTypeColor = (type) => {
  switch (type) {
    case "Overtime":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Leave":
      return "bg-green-100 text-green-700 border-green-200";
    case "Late Attendance":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-purple-100 text-purple-700 border-purple-200";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Approved":
      return "bg-green-50 text-green-700 border-green-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
};

const NotificationList = () => {
  const location = useLocation();
  const { user } = useSession(); // session fallback
  const state = location.state || {};

  // Robust fallback logic for Employee ID
  const candidateEmployeeId =
    state.employeeId ||
    state.employee_id ||
    state.employeeData?.employee_id ||
    state.employeeData?.id ||
    user?.employee_id ||
    user?.employeeId ||
    user?.username ||
    null;

  const [employeeId, setEmployeeId] = useState(candidateEmployeeId);
  const [items, setItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newCandidate =
      (location.state &&
        (location.state.employeeId ||
          location.state.employeeData?.employee_id ||
          location.state.employee_id)) ||
      user?.employee_id ||
      user?.employeeId ||
      user?.username ||
      null;
    setEmployeeId(newCandidate);
  }, [location.state, user]);

  useEffect(() => {
    if (employeeId) {
      fetchRequests(employeeId);
    } else {
      setItems([]);
    }
  }, [employeeId]);

  const fetchRequests = async (empId) => {
    if (!empId) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${BASE_URL}/mobile/EmployeeSideNotification/get_employee_notification.php`,
        {
          params: { employee_id: empId },
        },
      );

      if (res.data && res.data.success) {
        const raw = Array.isArray(res.data.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        const filtered = raw.filter(
          (item) => String(item.employee_id) === String(empId),
        );

        const normalized = filtered.map((item, index) => {
          const _localId =
            item.id ?? item.leave_id ?? item.notification_id ?? index;
          const date_display =
            item.attendance_date ||
            item.date_requested ||
            item.date_from ||
            item.created_at ||
            item.date ||
            item.requested_at ||
            null;
          return { ...item, _localId, date_display };
        });

        const sorted = normalized.sort((a, b) => {
          const ta = a.date_display ? new Date(a.date_display).getTime() : 0;
          const tb = b.date_display ? new Date(b.date_display).getTime() : 0;
          return tb - ta;
        });

        setItems(sorted);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const onSelectAll = () => {
    const allIds = items.map((item) => item._localId);
    setSelectedIds(new Set(allIds));
  };

  const onDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      Swal.fire("No selection", "Please select items to delete.", "warning");
      return;
    }

    const result = await Swal.fire({
      title: `Delete ${selectedIds.size} item(s)?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        for (let id of selectedIds) {
          await axios.delete(
            `${BASE_URL}/mobile/EmployeeSideNotification/delete_employee_notification.php`,
            {
              data: { id },
            },
          );
        }
        await fetchRequests(employeeId);
        setSelectedIds(new Set());
        Swal.fire("Deleted", "Selected notifications were deleted.", "success");
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire(
          "Error",
          "Failed to delete some or all notifications.",
          "error",
        );
      }
    }
  };

  const filteredItems = items.filter((item) => {
    const typeMatch = filterType === "All" || item.request_type === filterType;
    const statusMatch = filterStatus === "All" || item.status === filterStatus;
    return typeMatch && statusMatch;
  });

  if (!employeeId) {
    return (
      <div className="flex flex-col w-full h-screen items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow border border-gray-100">
          <div className="p-3 bg-red-100 rounded-full w-fit mx-auto mb-4 text-orange-500">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No Employee Found
          </h3>
          <p className="text-sm text-gray-600">
            We couldn't determine which employee's notifications to show. Please
            ensure you are logged in correctly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {" "}
      {/* Extra padding bottom for mobile nav */}
      {/* --- Sticky Header --- */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm safe-area-inset-top">
        <div className="max-w-5xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-none">
                  Notifications
                </h1>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  {filteredItems.length}{" "}
                  {filteredItems.length === 1 ? "Update" : "Updates"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-50/50 border-t border-gray-100 px-2 py-2">
          <div className="max-w-5xl mx-auto">
            <NotificationActionButtonEmp
              selectedIds={selectedIds}
              onDeleteSelected={handleDeleteSelected}
              onSelectAll={onSelectAll}
              onDeselectAll={onDeselectAll}
              filterType={filterType}
              setFilterType={setFilterType}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          </div>
        </div>
      </div>
      {/* --- Main Content --- */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-3"></div>
            <p className="text-sm font-medium">Syncing notifications...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
              <Bell className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              All caught up!
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {filterType !== "All" || filterStatus !== "All"
                ? "No records match your current filters."
                : "You have no new notifications at the moment."}
            </p>
          </div>
        )}

        {/* List of Notifications */}
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <div
              key={item._localId}
              className={`group relative bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden
                ${
                  selectedIds.has(item._localId)
                    ? "border-blue-400 ring-1 ring-blue-100 bg-blue-50/10"
                    : "border-gray-200 hover:border-blue-300 hover:shadow-md"
                }
              `}
            >
              <div className="p-3 sm:p-5 flex items-start gap-3 sm:gap-4">
                {/* Selection Checkbox */}
                <div className="pt-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item._localId)}
                    onChange={() => toggleSelect(item._localId)}
                    className="w-5 h-5 sm:w-4 sm:h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Content Container - Use min-w-0 to allow flex children to shrink/wrap */}
                <div className="flex-1 min-w-0">
                  {/* Header Row: Flex Wrap Enabled */}
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 max-w-full">
                      <span
                        className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${getTypeColor(item.request_type)}`}
                      >
                        {getNotificationIcon(item.request_type)}
                      </span>
                      <div className="min-w-0">
                        {/* Title: Removed truncate, added break-words */}
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 leading-tight break-words">
                          {item.request_type} Request
                        </h4>
                        <span className="text-[11px] text-gray-400 font-medium sm:hidden">
                          {formatDate(item.date_display)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge: Won't get cut off, moves to new line if needed */}
                    <div
                      className={`
                            inline-flex items-center gap-1.5 px-2.5 py-1 
                            rounded-full text-xs font-semibold border whitespace-nowrap
                            ${getStatusColor(item.status)}
                        `}
                    >
                      {getStatusIcon(item.status)}
                      <span>{item.status || "Pending"}</span>
                    </div>
                  </div>

                  {/* Metadata Row (Desktop) */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 font-medium mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(item.date_display)}
                    </span>
                    {item.employee_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {item.employee_name}
                      </span>
                    )}
                  </div>

                  {/* Dynamic Data Content */}
                  <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 sm:p-4 mt-2 text-sm w-full">
                    {/* Late Attendance Details - STACKED on mobile (grid-cols-1) */}
                    {item.request_type === "Late Attendance" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                        <div className="bg-white p-2 rounded border border-gray-100 shadow-sm w-full">
                          <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wide block mb-1">
                            Morning Shift
                          </span>
                          {/* break-words ensures time doesn't overflow */}
                          <div className="font-mono text-gray-800 font-medium break-words text-xs sm:text-sm">
                            {formatTime(item.current_time_in_morning)}{" "}
                            <span className="text-gray-400 mx-1">-</span>{" "}
                            {formatTime(item.current_time_out_morning)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-100 shadow-sm w-full">
                          <span className="text-[10px] uppercase font-bold text-orange-500 tracking-wide block mb-1">
                            Afternoon Shift
                          </span>
                          <div className="font-mono text-gray-800 font-medium break-words text-xs sm:text-sm">
                            {formatTime(item.current_time_in_afternoon)}{" "}
                            <span className="text-gray-400 mx-1">-</span>{" "}
                            {formatTime(item.current_time_out_afternoon)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overtime Details */}
                    {item.request_type === "Overtime" && (
                      <div className="flex items-center gap-3 bg-white p-3 rounded border border-gray-100 shadow-sm">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full shrink-0">
                          <Timer className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium uppercase">
                            Duration
                          </p>
                          <p className="text-lg font-bold text-gray-900">
                            {item.hours_requested
                              ? `${item.hours_requested} hrs`
                              : "0 hrs"}
                            {item.minutes_requested
                              ? ` ${item.minutes_requested} mins`
                              : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Leave Details - STACKED on mobile */}
                    {item.request_type === "Leave" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wide block mb-1">
                            Start Date
                          </span>
                          <div className="font-medium text-gray-800">
                            {formatDate(item.date_from)}
                          </div>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-100 shadow-sm">
                          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wide block mb-1">
                            End Date
                          </span>
                          <div className="font-medium text-gray-800">
                            {formatDate(item.date_until)}
                          </div>
                        </div>
                        <div className="bg-green-50 p-2 rounded border border-green-100 flex items-center justify-center sm:justify-start">
                          <span className="text-sm font-semibold text-green-700">
                            {item.total_days || 1} Total Day(s)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Reason Section - Common for all - FORCE WRAP */}
                    {item.reason && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            {" "}
                            {/* min-w-0 forces wrapping inside flex */}
                            <span className="text-xs font-semibold text-gray-500 block mb-1">
                              Reason / Note:
                            </span>
                            <p className="text-gray-700 italic text-sm whitespace-pre-wrap break-words">
                              "{item.reason}"
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NotificationList;

// import React, { useEffect, useState } from 'react';
// import { Card, Typography, Box, Chip } from '@mui/material';
// import axios from 'axios';
// import BASE_URL from '../../../backend/server/config';

// const formatDate = (dateStr) => {
//   if (!dateStr) return '—';
//   const d = new Date(dateStr);
//   return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
// };

// const formatTime = (time) => {
//   if (!time || time === '00:00:00') return '--';
//   const [h, m] = time.split(':');
//   const date = new Date();
//   date.setHours(h, m);
//   return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
// };

// const NotificationList = () => {
//   const [items, setItems] = useState([]);

//   useEffect(() => {
//     const fetchRequests = async () => {
//       try {
//         const res = await axios.get(`${BASE_URL}/mobile/EmployeeSideNotification/get_employee_notification.php`);
//         if (res.data.success) {
//           // Sort by date descending
//           const sorted = res.data.data.sort((a, b) =>
//             new Date(b.attendance_date || b.date_requested) -
//             new Date(a.attendance_date || a.date_requested)
//           );
//           setItems(sorted);
//         }
//       } catch (err) {
//         console.error("Failed to fetch requests:", err);
//       }
//     };

//     fetchRequests();
//   }, []);

//   return (
//     <Box display="flex" flexDirection="column" gap={2}>
//       {items.map((item, index) => (
//         <Card key={index} sx={{ p: 1 }}>
//           <Box display="flex" justifyContent="space-between" alignItems="center">
//             <Typography fontWeight="bold">
//               {formatDate(item.attendance_date || item.date_requested)}
//             </Typography>
//             <Chip
//               size="small"
//               label={item.request_type}
//               color={item.request_type === 'Overtime' ? 'primary' : 'secondary'}
//             />
//           </Box>

//           <Box fontSize="small" mt={0.5}>
//             <div>
//               AM: {formatTime(item.current_time_in_morning)} / {formatTime(item.current_time_out_morning)}
//             </div>
//             <div>
//               PM: {formatTime(item.current_time_in_afternoon)} / {formatTime(item.current_time_out_afternoon)}
//             </div>
//           </Box>

//           <Typography fontSize="small" mt={0.5}>
//             <strong>Status:</strong>{" "}
//             <span style={{
//               color: item.status === 'Approved' ? 'green' :
//                     item.status === 'Rejected' ? 'red' : 'orange'
//             }}>
//               {item.status}
//             </span>
//           </Typography>

//           <Typography fontSize="small">
//             <strong>Credit:</strong>{" "}
//             {item.hours_requested
//               ? `${item.hours_requested} hr ${item.minutes_requested || 0} min`
//               : 'N/A'}
//           </Typography>
//         </Card>
//       ))}
//     </Box>
//   );
// };

// export default NotificationList;
