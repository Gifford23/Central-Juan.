import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useLocation } from 'react-router-dom';
import BASE_URL from '../../../backend/server/config';
import NotificationActionButtonEmp from './NotificationComponents/NotificationActionButtonEmp';
import { useSession } from '../../context/SessionContext';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (time) => {
  if (!time || time === '00:00:00') return '--';
  const [h, m] = time.split(':');
  const date = new Date();
  date.setHours(h, m);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
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
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newCandidate =
      (location.state && (location.state.employeeId || location.state.employeeData?.employee_id || location.state.employee_id)) ||
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
      const res = await axios.get(`${BASE_URL}/mobile/EmployeeSideNotification/get_employee_notification.php`, {
        params: { employee_id: empId }
      });

      if (res.data && res.data.success) {
        const raw = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        const filtered = raw.filter(item => String(item.employee_id) === String(empId));

        const normalized = filtered.map((item, index) => {
          const _localId = item.id ?? item.leave_id ?? item.notification_id ?? index;
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
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const onSelectAll = () => {
    const allIds = items.map(item => item._localId);
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
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });

    if (result.isConfirmed) {
      try {
        for (let id of selectedIds) {
          await axios.delete(`${BASE_URL}/mobile/EmployeeSideNotification/delete_employee_notification.php`, {
            data: { id }
          });
        }
        await fetchRequests(employeeId);
        setSelectedIds(new Set());
        Swal.fire("Deleted", "Selected notifications were deleted.", "success");
      } catch (err) {
        console.error("Delete error:", err);
        Swal.fire("Error", "Failed to delete some or all notifications.", "error");
      }
    }
  };

  const filteredItems = items.filter(item => {
    const typeMatch = filterType === 'All' || item.request_type === filterType;
    const statusMatch = filterStatus === 'All' || item.status === filterStatus;
    return typeMatch && statusMatch;
  });

  if (!employeeId) {
    return (
      <div className="flex flex-col w-full h-screen items-center justify-center p-4">
        <div className="max-w-md text-center bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">No employee found</h3>
          <p className="text-sm text-gray-600">
            We couldn't determine which employee's notifications to show.
            Make sure you navigated from the dashboard or that you're logged in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-screen">
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

      <div className="flex-1 p-2 space-y-2 overflow-auto pb-20">
        {loading && (
          <div className="text-center text-sm text-gray-500">Loading notifications…</div>
        )}

        {!loading && filteredItems.length === 0 && (
          <div className="text-center text-sm text-gray-500">No notifications found.</div>
        )}

        {filteredItems.map((item) => (
          <div
            key={item._localId}
            className="w-full max-w-full sm:max-w-md p-3 mx-auto bg-white rounded-lg shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item._localId)}
                  onChange={() => toggleSelect(item._localId)}
                  className="w-4 h-4 mt-1"
                />
                <div>
                  <div className="text-sm font-semibold">{formatDate(item.date_display)}</div>
                  <div className="text-xs text-gray-500">{item.employee_name || item.employee_id || ''}</div>
                </div>
              </div>

              <span
                className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${
                  item.request_type === 'Overtime'
                    ? 'bg-blue-100 text-blue-600'
                    : item.request_type === 'Leave'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-purple-100 text-purple-600'
                }`}
              >
                {item.request_type || 'Notification'}
              </span>
            </div>

            {/* Late Attendance */}
            {item.request_type === 'Late Attendance' && (
              <div className="mt-2 text-xs">
                <div>AM: {formatTime(item.current_time_in_morning)} / {formatTime(item.current_time_out_morning)}</div>
                <div>PM: {formatTime(item.current_time_in_afternoon)} / {formatTime(item.current_time_out_afternoon)}</div>
              </div>
            )}

            {/* Overtime */}
            {item.request_type === 'Overtime' && (
              <div className="mt-2 text-xs">
                <strong>Credit:</strong>{' '}
                {item.hours_requested
                  ? `${item.hours_requested} hr ${item.minutes_requested || 0} min`
                  : 'N/A'}
              </div>
            )}

            {/* Leave */}
            {item.request_type === 'Leave' && (
              <div className="mt-2 text-xs">
                <div>
                  <strong>From:</strong> {formatDate(item.date_from)} → <strong>Until:</strong> {formatDate(item.date_until)}
                </div>
                <div><strong>Total Days:</strong> {item.total_days || 1}</div>
              </div>
            )}

            {/* Status (common to all) */}
            <div className="mt-2 text-xs">
              <strong>Status:</strong>{' '}
              <span className={
                item.status === 'Approved' ? 'text-green-600' :
                item.status === 'Rejected' ? 'text-red-600' :
                'text-yellow-600'
              }>
                {item.status ?? 'Pending'}
              </span>
            </div>

            {/* Reason (responsive, wraps and preserves newlines) */}
            <div className="mt-2">
              <div className="text-xs font-medium mb-1">Reason:</div>
              <div
                className="text-sm text-gray-700 whitespace-pre-wrap break-words overflow-wrap anywhere"
                style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
              >
                {item.reason || 'No reason provided'}
              </div>
            </div>
          </div>
        ))}
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
