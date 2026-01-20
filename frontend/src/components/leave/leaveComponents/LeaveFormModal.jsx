import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  MenuItem,
  Button,
  InputLabel,
} from "@mui/material";
import { fetchLeaveRequests, createLeaveRequest } from "../leaveApi/useLeaveAPI";
import BASE_URL from "../../../../backend/server/config";
import { fetchLeaveTypesAdmin } from "../leaveApi/useLeaveTypeAdminAPI"


const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  width: 500,
};

const LeaveFormModal = ({ open, onClose, employeeId, onSuccess }) => {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [form, setForm] = useState({
    employee_id: employeeId || "",
    leave_type_id: "",
    date_from: "",
    date_until: "",
    reason: "",
    attachment: null,
  });

  const [totalDays, setTotalDays] = useState(1.0);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch(`${BASE_URL}/employeesSide/employees.php`);
        const data = await res.json();
        if (Array.isArray(data)) setEmployees(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    if (!employeeId) {
      loadEmployees();
    }
  }, [employeeId]);

  useEffect(() => {
  const loadLeaveTypes = async () => {
    try {
      const res = await fetchLeaveTypesAdmin();
      const types = Array.isArray(res.data) ? res.data : [];
      console.log("Leave types loaded:", types);
      setLeaveTypes(types);
    } catch (error) {
      console.error("Error fetching leave types:", error);
      setLeaveTypes([]);
    }
  };

  loadLeaveTypes();
}, []);


  useEffect(() => {
    if (form.date_from && form.date_until) {
      const from = new Date(form.date_from);
      const until = new Date(form.date_until);
      const diffInMs = until - from;
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24) + 1;
      setTotalDays(diffInDays > 0 ? parseFloat(diffInDays.toFixed(2)) : 1);
    }
  }, [form.date_from, form.date_until]);

const handleChange = (e) => {
  const { name, value, files } = e.target;

  if (name === "leave_type_id") {
    // Find selected leave type object
    const selectedType = leaveTypes.find((type) => type.leave_type_id === value);
    if (selectedType) {
      // Set default_days from selected leave type
      setTotalDays(parseFloat(selectedType.default_days));
    }
  }

  setForm((prev) => ({
    ...prev,
    [name]: files ? files[0] : value,
  }));
};


  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    for (const key in form) {
      if (form[key]) formData.append(key, form[key]);
    }
    formData.append("total_days", totalDays);

    try {
      const data = await createLeaveRequest(formData); // ⬅ use your custom API function

      if (data.success) {
        alert("Leave request submitted successfully.");
        onClose();
        if (onSuccess) onSuccess();
      } else {
        alert(data.message || "Failed to submit leave request.");
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Something went wrong.");
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box component="form" onSubmit={handleSubmit} sx={style}>
        <Typography variant="h6" gutterBottom>
          Submit Leave Request
        </Typography>

        {!employeeId && (
          <TextField
            select
            fullWidth
            label="Select Employee"
            name="employee_id"
            value={form.employee_id}
            onChange={handleChange}
            margin="normal"
            required
          >
            {employees.map((emp) => (
              <MenuItem key={emp.employee_id} value={emp.employee_id}>
                {emp.first_name} {emp.last_name}
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField
          select
          fullWidth
          label="Leave Type"
          name="leave_type_id"
          value={form.leave_type_id}
          onChange={handleChange}
          margin="normal"
          required
        >
          {leaveTypes.map((type) => (
            <MenuItem key={type.leave_type_id} value={type.leave_type_id}>
              {type.leave_name}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          fullWidth
          type="date"
          label="Date From"
          name="date_from"
          value={form.date_from}
          onChange={handleChange}
          margin="normal"
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          fullWidth
          type="date"
          label="Date Until"
          name="date_until"
          value={form.date_until}
          onChange={handleChange}
          margin="normal"
          InputLabelProps={{ shrink: true }}
          required
        />

        <TextField
          fullWidth
          label="Total Days"
          value={totalDays}
          disabled
          margin="normal"
        />

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          margin="normal"
          required
        />

        <InputLabel htmlFor="attachment" sx={{ mt: 2 }}>
          Attachment (Optional)
        </InputLabel>
        <input
          type="file"
          name="attachment"
          accept="image/*,.pdf"
          onChange={handleChange}
          style={{ marginTop: 8, marginBottom: 16 }}
        />

        <Box display="flex" justifyContent="flex-end" gap={2}>
          <Button onClick={onClose} color="secondary">
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Submit
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default LeaveFormModal;
