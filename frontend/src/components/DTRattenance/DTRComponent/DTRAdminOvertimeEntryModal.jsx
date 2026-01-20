import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import BASE_URL from "../../../../backend/server/config";

const AdminAddOvertimeModal = ({ employeeId, employeeName, attendanceDate, onClose, onSaved }) => {
  const [timeStart, setTimeStart] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);

  useEffect(() => {
    const fetchOvertime = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/overtime/admin_get_overtime.php`, {
          params: { employee_id: employeeId, date_requested: attendanceDate }
        });
        if (res.data.success && res.data.data) {
          const data = res.data.data;
          setExistingRequest(data);
          setTimeStart(data.time_start.slice(0,5));
          setEndTime(data.end_time.slice(0,5));
          setReason(data.reason);
        } else {
          setExistingRequest(null);
          setTimeStart("");
          setEndTime("");
          setReason("");
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchOvertime();
  }, [employeeId, attendanceDate]);

  const handleSubmit = async () => {
    if (!timeStart || !endTime || !reason) {
      Swal.fire("Warning", "Please fill in all fields.", "warning");
      return;
    }

    setLoading(true);
    try {
      if (existingRequest) {
        const res = await axios.put(`${BASE_URL}/overtime/admin_update_overtime.php`, {
          request_id: existingRequest.request_id,
          time_start: timeStart,
          end_time: endTime,
          reason
        }, { headers: { "Content-Type": "application/json" } });

        if (res.data.success) {
          Swal.fire("Updated", "Overtime updated successfully.", "success");
          onSaved();
        } else {
          Swal.fire("Error", res.data.message || "Update failed", "error");
        }

      } else {
        const res = await axios.post(`${BASE_URL}/overtime/admin_add_overtime.php`, {
          employee_id: employeeId,
          employee_name: employeeName,
          date_requested: attendanceDate,
          time_start: timeStart,
          end_time: endTime,
          reason
        }, { headers: { "Content-Type": "application/json" } });

        if (res.data.success) {
          Swal.fire("Added", "Overtime added successfully.", "success");
          onSaved();
        } else {
          Swal.fire("Error", res.data.message || "Add failed", "error");
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Request failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRequest) return;
    const confirm = await Swal.fire({
      title: "Delete Overtime?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!"
    });
    if (confirm.isConfirmed) {
      try {
        const res = await axios.delete(`${BASE_URL}/overtime/admin_delete_overtime.php`, {
          data: { request_id: existingRequest.request_id },
          headers: { "Content-Type": "application/json" }
        });
        if (res.data.success) {
          Swal.fire("Deleted", "Overtime deleted successfully.", "success");
          onSaved();
        } else {
          Swal.fire("Error", res.data.message || "Delete failed", "error");
        }
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Delete failed", "error");
      }
    }
  };

  return (
    <div className="absolute z-50 w-full max-w-md p-6 space-y-3 bg-white border rounded-lg shadow-lg top-16 right-4">
      <h2 className="text-2xl font-bold text-center">Admin Manage Overtime</h2>
      <div className="space-y-1 text-sm text-gray-600">
        <p><b>ID:</b> {employeeId}</p>
        <p><b>Name:</b> {employeeName}</p>
        <p><b>Date:</b> {attendanceDate}</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Start Time</label>
        <input type="time" value={timeStart} onChange={e => setTimeStart(e.target.value)} className="w-full p-2 border rounded" />

        <label className="block text-sm">End Time</label>
        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded" />

        <label className="block text-sm">Reason</label>
        <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full p-2 border rounded" placeholder="Reason" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {existingRequest && (
          <button onClick={handleDelete} className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700">Delete</button>
        )}
        <button onClick={onClose} className="px-4 py-2 text-white bg-gray-400 rounded hover:bg-gray-500">Cancel</button>
        <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">
          {loading ? "Saving..." : existingRequest ? "Update Overtime" : "Save Overtime"}
        </button>
      </div>
    </div>
  );
};

export default AdminAddOvertimeModal;
