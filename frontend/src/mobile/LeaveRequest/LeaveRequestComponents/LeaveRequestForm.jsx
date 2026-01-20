import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { createLeaveRequest, fetchLeaveRequests } from '../LeaverequestAPI/useLeaveRequestsAPI';
import { fetchLeaveTypesAdmin } from '../../../components/leave/leaveApi/useLeaveTypeAdminAPI';

export default function LeaveRequestForm() {
  const location = useLocation();
  const { employeeData } = location.state || {};

  // Form state
  const [form, setForm] = useState({
    employee_id: employeeData?.employee_id || '',
    leave_type_id: '',
    date_from: '',
    date_until: '',
    total_days: 1,
    reason: ''
  });

  // Data states
  const [leaveList, setLeaveList] = useState([]); // Employee leave requests
  const [leaveTypes, setLeaveTypes] = useState([]); // Available leave types
  const [loading, setLoading] = useState(false); // For submit button state

  // Fetch leave requests of the employee
  useEffect(() => {
    if (employeeData?.employee_id) {
      fetchLeaveRequests(employeeData.employee_id)
        .then((data) => {
          // console.log('Fetched leave requests:', data); // Debug log
          setLeaveList(data);
        });
    }
  }, [employeeData]);

  // Fetch available leave types from Admin API
  useEffect(() => {
    fetchLeaveTypesAdmin().then((res) => {
      if (Array.isArray(res)) {
        setLeaveTypes(res);
      } else if (Array.isArray(res?.data)) {
        setLeaveTypes(res.data);
      } else {
        setLeaveTypes([]);
      }
    });
  }, []);

  // ===== Helper functions =====

  // Calculate "date until" based on start date + total days
  const calculateDateUntil = (startDate, totalDays) => {
    if (!startDate || !totalDays) return '';
    const start = new Date(startDate);
    start.setDate(start.getDate() + (parseFloat(totalDays) - 1));
    return start.toISOString().split('T')[0];
  };

  // ===== Helper functions =====
const getLeaveBalance = (leaveTypeId) => {
  if (!leaveTypeId) return 0;
  const employeeLeave = leaveList.find(
    (l) => l.leave_type_id === parseInt(leaveTypeId)
  );
  return employeeLeave?.leave_balance ?? 0;
};


  // Calculate total days between two dates
  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 1;
  };

  // ===== Event handlers =====

  // Handle leave type selection
  const handleLeaveTypeChange = (e) => {
    const selectedId = e.target.value;
    const selectedType = leaveTypes.find(
      (lt) => lt.leave_type_id === parseInt(selectedId)
    );

    if (selectedType) {
      setForm((prev) => ({
        ...prev,
        leave_type_id: selectedId,
        total_days: selectedType.default_days || 1,
        date_until: prev.date_from
          ? calculateDateUntil(prev.date_from, selectedType.default_days || 1)
          : ''
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        leave_type_id: '',
        total_days: 1,
        date_until: ''
      }));
    }
  };

  // Handle "date from" change
  const handleDateFromChange = (e) => {
    const newDateFrom = e.target.value;
    const selectedType = leaveTypes.find(
      (lt) => lt.leave_type_id === parseInt(form.leave_type_id)
    );

    setForm((prev) => ({
      ...prev,
      date_from: newDateFrom,
      date_until: selectedType
        ? calculateDateUntil(newDateFrom, selectedType.default_days || prev.total_days)
        : prev.date_until
    }));
  };

  // Handle "date until" change
// Handle "date until" change
// Handle "date until" change with auto-correct
const handleDateUntilChange = (e) => {
  const newDateUntil = e.target.value;
  const days = calculateDaysBetween(form.date_from, newDateUntil);
  const balance = getLeaveBalance(form.leave_type_id);

  if (!form.date_from) {
    Swal.fire("Select start date first!", "", "warning");
    return;
  }

  // If leave has a balance limit
  if (balance > 0 && days > balance) {
    Swal.fire({
      icon: "info",
      title: "Adjusted to Balance",
      text: `You only have ${balance} day(s) left. Your leave was adjusted automatically.`,
      timer: 2000,
      showConfirmButton: false,
    });

    const adjustedUntil = addDays(form.date_from, balance);

    setForm((prev) => ({
      ...prev,
      date_until: adjustedUntil, // ✅ always a real date string
      total_days: balance,
    }));
  } else {
    // Normal case
    setForm((prev) => ({
      ...prev,
      date_until: newDateUntil,
      total_days: days,
    }));
  }
};

function addDays(dateStr, days) {
  if (!dateStr || !days) return null;
  const date = new Date(dateStr);
  date.setDate(date.getDate() + (days - 1)); // -1 so day count matches correctly
  return date.toISOString().split("T")[0]; // return YYYY-MM-DD
}


  // Handle form submit
const handleSubmit = async (e) => {
  e.preventDefault();

  // ✅ Extra validation for reason
  if (!form.reason.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Reason Required',
      text: 'Please enter a reason for your leave request.'
    });
    return;
  }

  setLoading(true);

  try {
    const res = await createLeaveRequest(form);

    if (res.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Leave request submitted!',
        text: 'Your leave request has been sent successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      fetchLeaveRequests(employeeData.employee_id).then(setLeaveList);

      setForm({
        employee_id: employeeData?.employee_id || '',
        leave_type_id: '',
        date_from: '',
        date_until: '',
        total_days: 1,
        reason: ''
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: res.message || 'Something went wrong. Please try again.'
      });
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Network Error',
      text: 'Unable to submit leave request. Please check your connection.'
    });
  } finally {
    setLoading(false);
  }
};


  // ===== UI Rendering =====
  return (
    <div className="max-w-lg p-6 mx-auto bg-white shadow-lg rounded-xl">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Request Leave</h2>

      {/* Employee Info */}
      <div className="p-3 mb-4 text-gray-700 rounded-lg bg-gray-50">
        <p><strong>Employee ID:</strong> {employeeData?.employee_id || 'N/A'}</p>
      </div>

      {/* Leave Request Form */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Leave Type Selection */}
        <div>
          <label className="block mb-1 font-medium">Leave Type</label>
          <select
            value={form.leave_type_id}
            onChange={handleLeaveTypeChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            required
          >
            <option value="">-- Select Leave Type --</option>
            {leaveTypes.map((lt) => {
              const employeeLeave = leaveList.find(
                (l) => l.leave_type_id === lt.leave_type_id
              );
              const leaveBalance = employeeLeave?.leave_balance ?? 0;

              const displayName =
                lt.is_paid && leaveBalance > 0
                  ? `${lt.leave_name} (Balance: ${leaveBalance})`
                  : `${lt.leave_name} (Unpaid)`;

              return (
                <option
                  key={lt.leave_type_id}
                  value={lt.leave_type_id}
                  disabled={lt.is_paid && leaveBalance <= 0}
                >
                  {displayName}
                </option>
              );
            })}
          </select>

          {/* Warning if no leave type selected */}
          {!form.leave_type_id && (
            <p className="mt-1 text-sm text-red-500">
              ⚠️ Please select a leave type to enable date selection.
            </p>
          )}
        </div>

        {/* Date From */}
        <div>
          <label className="block mb-1 font-medium">Date From</label>
          <input
            type="date"
            value={form.date_from}
            onChange={handleDateFromChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200 ${
              !form.leave_type_id ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
            disabled={!form.leave_type_id}
          />
        </div>

        {/* Date Until */}
        <div>
          <label className="block mb-1 font-medium">Date Until</label>
          <input
            type="date"
            value={form.date_until}
            onChange={handleDateUntilChange}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200 ${
              !form.leave_type_id ? 'bg-gray-100 cursor-not-allowed' : ''
            }`}
            required
            disabled={!form.leave_type_id}
          />
        </div>

        {/* Total Days (readonly) */}
        <div>
          <label className="block mb-1 font-medium">Total Days</label>
          <input
            type="number"
            step="0.01"
            value={form.total_days}
            className="w-full px-3 py-2 bg-gray-100 border rounded-lg cursor-not-allowed focus:outline-none focus:ring focus:ring-blue-200"
            disabled
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block mb-1 font-medium">Reason</label>
<textarea
  value={form.reason}
  onChange={(e) => setForm({ ...form, reason: e.target.value })}
  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
  rows="3"
  required
/>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 text-white rounded-lg transition ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Leave Requests List */}
      {/* <h3 className="mt-6 mb-2 text-xl font-bold text-gray-800">My Leave Requests</h3>
      {leaveList.length === 0 ? (
        <p className="text-gray-500">No leave requests found.</p>
      ) : (
        <ul className="divide-y">
          {leaveList.map((lr) => (
            <li key={lr.leave_id} className="py-2">
              <span className="font-medium">{lr.leave_type_name}</span> - {lr.status}
              <br />
              <span className="text-sm text-gray-600">
                {lr.date_from} to {lr.date_until}
              </span>
            </li>
          ))}
        </ul>
      )} */}
    </div>
  );
}
