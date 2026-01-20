import React, { useState, useEffect } from 'react';

const EmployeeLeaveFormModal = ({ open, onClose, onSave, editData }) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    leave_type_id: '',
    date_from: '',
    date_until: '',
    total_days: 1,
    reason: '',
    status: 'pending',
  });

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      setFormData({
        employee_id: '',
        leave_type_id: '',
        date_from: '',
        date_until: '',
        total_days: 1,
        reason: '',
        status: 'pending',
      });
    }
  }, [editData]);

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{editData ? 'Edit Employee Leave' : 'Create Employee Leave'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            name="employee_id"
            value={formData.employee_id}
            onChange={handleChange}
            placeholder="Employee ID"
            required
          />
          <input
            name="leave_type_id"
            value={formData.leave_type_id}
            onChange={handleChange}
            placeholder="Leave Type ID"
            required
          />
          <input
            type="date"
            name="date_from"
            value={formData.date_from}
            onChange={handleChange}
            required
          />
          <input
            type="date"
            name="date_until"
            value={formData.date_until}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="total_days"
            value={formData.total_days}
            onChange={handleChange}
            step="0.5"
            min="0.5"
            required
          />
          <textarea
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            placeholder="Reason"
          />
          <select name="status" value={formData.status} onChange={handleChange}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="modal-actions">
            <button type="submit">{editData ? 'Update' : 'Create'}</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeLeaveFormModal;
