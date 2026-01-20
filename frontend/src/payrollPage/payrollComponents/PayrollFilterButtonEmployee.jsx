// src/payrollComponents/PayrollFilterButtonEmployee.jsx
import { useState } from "react";

export default function PayrollFilterButtonEmployee({ onFilterChange }) {
  const [statusFilter, setStatusFilter] = useState("active"); // default active
  const [typeFilter, setTypeFilter] = useState("all");

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setStatusFilter(value);
    onFilterChange({ status: value, type: typeFilter });
  };

  const handleTypeChange = (e) => {
    const value = e.target.value;
    setTypeFilter(value);
    onFilterChange({ status: statusFilter, type: value });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={handleStatusChange}
        className="px-3 py-1 text-sm border rounded-lg"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="all">All</option>
      </select>

      {/* Employee Type Filter */}
      <select
        value={typeFilter}
        onChange={handleTypeChange}
        className="px-3 py-1 text-sm border rounded-lg"
      >
        <option value="all">All Types</option>
        <option value="Regular">Regular</option>
        <option value="Part-time">Part-time</option>
        <option value="OJT">OJT</option>
        <option value="Contractual">Contractual</option>
        <option value="Project-Based">Project-Based</option>
      </select>
    </div>
  );
}
