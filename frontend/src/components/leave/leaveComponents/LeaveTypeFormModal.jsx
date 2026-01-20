import React, { useEffect, useState } from 'react';
import {
  createLeaveTypeAdmin,
  updateLeaveTypeAdmin,
} from '../leaveApi/useLeaveTypeAdminAPI';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import Swal from "sweetalert2";

export default function LeaveTypeFormModal({ open, handleClose, selectedLeaveType, onSave }) {
  const [formData, setFormData] = useState({
    leave_name: '',
    is_paid: true,
    default_days: 1.0,
    leave_limit: 0.0,
    description: '',
  });

  const [loading, setLoading] = useState(false); // ✅ loading state

  useEffect(() => {
    if (selectedLeaveType) {
      setFormData({
        leave_name: selectedLeaveType.leave_name || '',
        is_paid: selectedLeaveType.is_paid === '1' || selectedLeaveType.is_paid === 1,
        default_days: selectedLeaveType.default_days || 1.0,
        leave_limit: selectedLeaveType.leave_limit || 0.0,
        description: selectedLeaveType.description || '',
      });
    } else {
      setFormData({
        leave_name: '',
        is_paid: true,
        default_days: 1.0,
        leave_limit: 0.0,
        description: '',
      });
    }
  }, [selectedLeaveType]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : ['default_days', 'leave_limit'].includes(name)
          ? parseFloat(value)
          : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.leave_name.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Missing Field",
        text: "Leave Name is required.",
        confirmButtonColor: "#3085d6",
      });
      return;
    }

    setLoading(true); // ✅ show loading state
    Swal.fire({
      title: "Saving...",
      text: "Please wait while we save the leave type.",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      let response;
      if (selectedLeaveType) {
        response = await updateLeaveTypeAdmin(selectedLeaveType.leave_type_id, formData);
      } else {
        response = await createLeaveTypeAdmin(formData);
      }

      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: "Leave type has been saved successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        onSave();
        handleClose();
      } else {
        Swal.fire({
          icon: "error",
          title: "Save Failed",
          text: response.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      console.error("❌ Error during save:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unexpected error occurred. Please try again.",
      });
    } finally {
      setLoading(false); // ✅ reset loading
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>
        {selectedLeaveType ? 'Edit Leave Type' : 'Add Leave Type'}
      </DialogTitle>
      <DialogContent dividers>
        <TextField
          fullWidth
          margin="dense"
          required
          name="leave_name"
          label="Leave Name *"
          value={formData.leave_name}
          onChange={handleChange}
        />
        <TextField
          fullWidth
          margin="dense"
          required
          name="default_days"
          label="Default Days *"
          type="number"
          inputProps={{ step: '0.01', min: '0' }}
          value={formData.default_days}
          onChange={handleChange}
        />
<TextField
  fullWidth
  margin="dense"
  required
  name="leave_limit"
  label="Leave Limit (per year) *"
  type="number"
  inputProps={{ step: '0.01', min: '0' }}
  value={formData.leave_limit}
  onChange={handleChange}
  disabled={!formData.is_paid}   // ✅ Disable if "Is Paid" is unchecked
/>
        <TextField
          fullWidth
          margin="dense"
          required
          name="description"
          label="Description *"
          multiline
          rows={2}
          value={formData.description}
          onChange={handleChange}
        />
        <FormControlLabel
          control={
            <Checkbox
              name="is_paid"
              checked={formData.is_paid}
              onChange={handleChange}
            />
          }
          label="Is Paid"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading} // ✅ prevent multiple clicks
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
