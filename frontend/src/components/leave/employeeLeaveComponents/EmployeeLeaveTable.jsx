import React from 'react';

const EmployeeLeaveTable = ({ employeeLeaves, onEdit, onDelete }) => {
  return (
    <div className="employee-leave-table">
      <h3>Employee Leaves</h3>
      <table>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Leave Type</th>
            <th>Date From</th>
            <th>Date Until</th>
            <th>Total Days</th>
            <th>Status</th>
            <th>Reason</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employeeLeaves.map((leave) => (
            <tr key={leave.leave_id}>
              <td>{leave.employee_id}</td>
              <td>{leave.leave_type_name || leave.leave_type_id}</td>
              <td>{leave.date_from}</td>
              <td>{leave.date_until}</td>
              <td>{leave.total_days}</td>
              <td>{leave.status}</td>
              <td>{leave.reason}</td>
              <td>
                <button onClick={() => onEdit(leave)}>Edit</button>
                <button onClick={() => onDelete(leave.leave_id)}>Delete</button>
              </td>
            </tr>
          ))}
          {employeeLeaves.length === 0 && (
            <tr>
              <td colSpan="8">No employee leave records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeLeaveTable;
