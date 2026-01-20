// src/pages/leave/leaveComponents/LeaveRequestTable.jsx
import React, { useEffect, useState } from 'react';
import { fetchLeaveRequests, deleteLeaveRequest } from '../leaveApi/useLeaveAPI';
import { Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const LeaveRequestTable = ({ onEdit }) => {
  const [leaveRequests, setLeaveRequests] = useState([]);

// src/pages/leave/leaveComponents/LeaveRequestTable.jsx
const loadData = async () => {
  const res = await fetchLeaveRequests();
  console.log("📦 API Response (from hook):", res);

  if (Array.isArray(res)) {
    console.log("✅ Setting leaveRequests from array");
    setLeaveRequests(res);
  } else if (Array.isArray(res?.data)) {
    console.log("✅ Setting leaveRequests from res.data array");
    setLeaveRequests(res.data);
  } else {
    console.warn("⚠️ Unexpected response structure:", res);
    setLeaveRequests([]);
  }
};


  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this leave request?');
    if (confirmDelete) {
      const res = await deleteLeaveRequest(id);
      if (res.success) loadData();
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="mb-4 text-lg font-semibold">Employee Leave Requests</h2>
      <table className="w-full border table-auto">
        <thead>
          <tr className="bg-gray-100">
            <th>Employee ID</th>
            <th>Leave Type</th>
            <th>Date From</th>
            <th>Date Until</th>
            <th>Status</th>
            <th>Total Days</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {leaveRequests.length === 0 ? (
            <tr>
              <td colSpan="7" className="py-4 text-center">
                No leave requests found.
              </td>
            </tr>
          ) : (
            leaveRequests.map((leave) => (
              <tr key={leave.leave_id} className="border-t">
                <td>{leave.employee_id || '-'}</td>
                <td>{leave.leave_type_name || '-'}</td>
                <td>{leave.date_from || '-'}</td>
                <td>{leave.date_until || '-'}</td>
                <td>{leave.status || '-'}</td>
                <td>{leave.total_days || '-'}</td>
                <td>
                  <Button
                    onClick={() => onEdit(leave)}
                    size="small"
                    startIcon={<EditIcon />}
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(leave.leave_id)}
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeaveRequestTable;
