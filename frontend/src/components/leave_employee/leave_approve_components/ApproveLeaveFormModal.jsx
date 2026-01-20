import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import {
  fetchEmployeesAPI,
  fetchLeaveTypesAPI,
} from "../approve_leaveAPI/approved_leaveAPI";
import LeaveTypeFormModal from "../../leave/leaveComponents/LeaveTypeFormModal";
import { createLeaveTypeAdmin } from "../../leave/leaveApi/useLeaveTypeAdminAPI";
import { useLeaves } from "../approved_leavehook/useApproveLeave"; // adjust path

export default function ApproveLeaveFormModal({
  open,
  onClose,
  onSave,
  selected,
}) {
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [openLeaveTypeModal, setOpenLeaveTypeModal] = useState(false);
  const { leaveBalance, fetchBalance } = useLeaves();

  const [form, setForm] = useState({
    employee_id: "",
    leave_type_id: "",
    date_from: "",
    date_until: "",
    total_days: "",
    reason: "",
    status: "approved",
  });

  // Load dropdowns
  const loadDropdowns = async () => {
    try {
      const [empRes, leaveRes] = await Promise.all([
        fetchEmployeesAPI(),
        fetchLeaveTypesAPI(),
      ]);

      if (Array.isArray(empRes.data)) {
        setEmployees(empRes.data);
      } else if (Array.isArray(empRes.data.data)) {
        setEmployees(empRes.data.data);
      }

      if (Array.isArray(leaveRes.data)) {
        setLeaveTypes(leaveRes.data);
      } else if (Array.isArray(leaveRes.data.data)) {
        setLeaveTypes(leaveRes.data.data);
      }
    } catch (err) {
      console.error("❌ Error loading dropdown data:", err);
    }
  };

useEffect(() => {
  fetchBalance(form.employee_id, form.leave_type_id);
}, [form.employee_id, form.leave_type_id]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    if (selected) setForm(selected);
  }, [selected]);

  useEffect(() => {
    if (form.date_from && form.date_until) {
      const from = new Date(form.date_from);
      const until = new Date(form.date_until);
      if (!isNaN(from) && !isNaN(until) && until >= from) {
        const diffDays = (until - from) / (1000 * 60 * 60 * 24) + 1;
        setForm((prev) => ({ ...prev, total_days: diffDays }));
      }
    }
  }, [form.date_from, form.date_until]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

const handleSubmit = async () => {
  if (
    !form.employee_id ||
    !form.leave_type_id ||
    !form.date_from ||
    !form.date_until ||
    !form.reason
  ) {
    Swal.fire({
      icon: "warning",
      title: "Missing Fields",
      text: "⚠️ Please fill out all required fields before saving.",
      confirmButtonColor: "#3085d6",
    });
    return;
  }

  // 🔹 Show loading alert
  Swal.fire({
    title: "Saving...",
    text: "Please wait while we save your request.",
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    // simulate saving (wrap onSave in a Promise in case it’s not async)
    await Promise.resolve(onSave(form));

    Swal.fire({
      icon: "success",
      title: "Saved!",
      text: "Leave request has been saved successfully.",
      timer: 1500,
      showConfirmButton: false,
    });

    onClose();
  } catch (error) {
    console.error("❌ Error saving form:", error);
    Swal.fire({
      icon: "error",
      title: "Save Failed",
      text: "Something went wrong. Please try again.",
    });
  }
};




  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50">
      <div className="flex flex-col p-6 bg-white rounded-lg w-96">
        <h2 className="mb-4 text-lg font-bold">
          {selected ? "Edit Leave" : "Add Leave"}
        </h2>
{/* Employee Dropdown */}
<label className="mb-1 text-sm font-medium">
  Employee <span className="text-red-500">*</span>
</label>
<select
  name="employee_id"
  value={form.employee_id}
  onChange={handleChange}
  className="w-full p-2 mb-2 border rounded"
>
  <option value="">-- Select Employee --</option>
  {employees.map((emp) => (
    <option key={emp.employee_id} value={emp.employee_id}>
      {emp.first_name} {emp.last_name}
    </option>
  ))}
</select>

{/* 🔹 Instructional Text */}
{!form.employee_id && (
  <p className="mb-3 text-xs text-red-500">
    ⚠️ Please select an employee before filling out the form.
  </p>
)}

{/* Leave Type Dropdown */}
<label className="mb-1 text-sm font-medium">
  Leave Type <span className="text-red-500">*</span>
</label>
<div className="flex gap-2 mb-2">
  <select
    name="leave_type_id"
    value={form.leave_type_id}
    onChange={handleChange}
    disabled={!form.employee_id}
    className="flex-1 p-2 border rounded hover:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:border-gray-300"
  >
    <option value="">-- Select Leave Type --</option>
    {leaveTypes.map((lt) => (
      <option key={lt.leave_type_id} value={lt.leave_type_id}>
        {lt.leave_name}
      </option>
    ))}
  </select>

  <button
    type="button"
    onClick={() => form.employee_id && setOpenLeaveTypeModal(true)}
    disabled={!form.employee_id}
    className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
  >
    + Add
  </button>
</div>

{leaveBalance && (
  <div className="p-2 mb-2 text-sm border rounded bg-gray-50">
    <p>
      <strong>Balance:</strong> {parseFloat(leaveBalance.leave_balance ?? 0)} days
    </p>
    <p>
      <strong>Type:</strong> {leaveBalance.is_paid === 1 ? "Paid" : "Unpaid"}
    </p>
  </div>
)}

{/* Date Pickers */}
<label className="mb-1 text-sm font-medium">
  Date From <span className="text-red-500">*</span>
</label>
<input
  type="date"
  name="date_from"
  value={form.date_from}
  onChange={handleChange}
  disabled={!form.employee_id}
  className="flex-1 p-2 mb-2 transition border rounded hover:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
/>

<label className="mb-1 text-sm font-medium">
  Date Until <span className="text-red-500">*</span>
</label>
<input
  type="date"
  name="date_until"
  value={form.date_until}
  onChange={handleChange}
  disabled={!form.employee_id}
  className="flex-1 p-2 mb-2 transition border rounded hover:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
/>

{/* Reason */}
<label className="mb-1 text-sm font-medium">
  Reason <span className="text-red-500">*</span>
</label>
<textarea
  name="reason"
  value={form.reason}
  onChange={handleChange}
  placeholder="Reason"
  disabled={!form.employee_id}
  className="flex-1 p-2 mb-2 transition border rounded hover:border-blue-500 focus:ring focus:ring-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
/>



        {/* Buttons */}
        <button
          onClick={handleSubmit}
          className="w-full py-2 text-white bg-blue-600 rounded"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="w-full py-2 mt-2 text-white bg-gray-400 rounded"
        >
          Cancel
        </button>
      </div>

      {/* 🔹 Inline LeaveTypeFormModal */}
      <LeaveTypeFormModal
        open={openLeaveTypeModal}
        handleClose={() => setOpenLeaveTypeModal(false)}
        onSave={async (newType) => {
          try {
            const response = await createLeaveTypeAdmin(newType);
            if (response?.success) {
              await loadDropdowns();
            }
          } catch (err) {
            console.error("❌ Failed to add leave type:", err);
          } finally {
            setOpenLeaveTypeModal(false);
          }
        }}
      />
    </div>
  );
}
