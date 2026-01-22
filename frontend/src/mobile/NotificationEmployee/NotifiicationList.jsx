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

// Helper functions for elegant design
const getNotificationIcon = (type) => {
  switch (type) {
    case "Overtime":
      return <Timer className="w-4 h-4" />;
    case "Leave":
      return <Calendar className="w-4 h-4" />;
    case "Late Attendance":
      return <Clock className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
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
      return "bg-blue-50 border-blue-200 text-blue-700";
    case "Leave":
      return "bg-green-50 border-green-200 text-green-700";
    case "Late Attendance":
      return "bg-orange-50 border-orange-200 text-orange-700";
    default:
      return "bg-purple-50 border-purple-200 text-purple-700";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-800 border-green-300";
    case "Rejected":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
  }
};

const NotificationList = () => {
  const location = useLocation();
  const { user } = useSession(); // session fallback
  const state = location.state || {};
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div className="flex flex-col w-full h-screen items-center justify-center p-4">
        <div className="max-w-md text-center bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">No employee found</h3>
          <p className="text-sm text-gray-600">
            We couldn't determine which employee's notifications to show. Make
            sure you navigated from the dashboard or that you're logged in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                Notifications
              </h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="text-xs sm:text-sm text-gray-500">
                {filteredItems.length}{" "}
                {filteredItems.length === 1 ? "item" : "items"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
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

      {/* Content */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 sm:mt-4 text-sm sm:text-base text-gray-500">
              Loading notifications...
            </p>
          </div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12">
            <div className="bg-gray-100 rounded-full p-3 sm:p-4 mb-3 sm:mb-4">
              <Bell className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              No notifications found
            </h3>
            <p className="text-sm text-gray-500 text-center px-4">
              {filterType !== "All" || filterStatus !== "All"
                ? "Try adjusting your filters to see more notifications."
                : "You're all caught up! No new notifications."}
            </p>
          </div>
        )}

        {/* Responsive Notification Cards */}
        <div className="space-y-3 sm:space-y-4 pb-6 sm:pb-8">
          {filteredItems.map((item) => (
            <div
              key={item._localId}
              className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item._localId)}
                      onChange={() => toggleSelect(item._localId)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                    />
                    <div className="flex items-center space-x-2 sm:space-x-2">
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg ${getTypeColor(item.request_type)}`}
                      >
                        {getNotificationIcon(item.request_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {item.request_type || "Notification"}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 truncate">
                          {formatDate(item.date_display)} •{" "}
                          {item.employee_name || item.employee_id}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div
                      className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
                    >
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(item.status)}
                        <span className="hidden sm:inline">
                          {item.status || "Pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Content */}
              <div className="px-3 sm:px-6 py-3 sm:py-4">
                {/* Type-specific content */}
                {item.request_type === "Late Attendance" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xs sm:text-sm font-medium text-blue-700 mb-1">
                        Morning Shift
                      </div>
                      <div className="text-sm sm:text-base text-gray-900">
                        {formatTime(item.current_time_in_morning)} /{" "}
                        {formatTime(item.current_time_out_morning)}
                      </div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                      <div className="text-xs sm:text-sm font-medium text-orange-700 mb-1">
                        Afternoon Shift
                      </div>
                      <div className="text-sm sm:text-base text-gray-900">
                        {formatTime(item.current_time_in_afternoon)} /{" "}
                        {formatTime(item.current_time_out_afternoon)}
                      </div>
                    </div>
                  </div>
                )}

                {item.request_type === "Overtime" && (
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs sm:text-sm font-medium text-blue-700 mb-1">
                          Requested Hours
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-gray-900">
                          {item.hours_requested
                            ? `${item.hours_requested}h ${item.minutes_requested || 0}m`
                            : "N/A"}
                        </div>
                      </div>
                      <Timer className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                    </div>
                  </div>
                )}

                {item.request_type === "Leave" && (
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-green-700 mb-1">
                          From
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-gray-900">
                          {formatDate(item.date_from)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-medium text-green-700 mb-1">
                          Until
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-gray-900">
                          {formatDate(item.date_until)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-green-200">
                      <div className="flex items-center justify-between">
                        <div className="text-xs sm:text-sm font-medium text-green-700">
                          Total Days
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-gray-900">
                          {item.total_days || 1}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reason Section */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start space-x-2 sm:space-x-3">
                    <FileText className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Reason / Details
                      </div>
                      <div className="text-sm sm:text-base text-gray-900 leading-relaxed break-words">
                        {item.reason || "No reason provided"}
                      </div>
                    </div>
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
