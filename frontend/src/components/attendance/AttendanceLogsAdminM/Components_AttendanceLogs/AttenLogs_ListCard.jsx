import React from 'react';

const AttendanceListCard = ({ item, onDelete, formatTime, isMidnight }) => (
  <div className="p-4 transition-all duration-300 bg-white rounded-lg shadow-md  min-w-[250px] hover:shadow-lg">
    <div className="mb-2">
      <h3 className="text-lg font-semibold">{item.employee_name}</h3>
      <p className="text-sm text-gray-500">Emp. ID: {item.employee_id}</p>
    </div>

    <div className="space-y-1 text-sm text-gray-700">
      <p><strong>Date:</strong> {new Date(item.attendance_date).toLocaleDateString()}</p>
      <p>
        <strong>Morning:</strong>{" "}
        {isMidnight(formatTime(item.time_in_morning)) ? "N/A" : formatTime(item.time_in_morning)} to{" "}
        {isMidnight(formatTime(item.time_out_morning)) ? "N/A" : formatTime(item.time_out_morning)}
      </p>
      <p>
        <strong>Afternoon:</strong>{" "}
        {isMidnight(formatTime(item.time_in_afternoon)) ? "N/A" : formatTime(item.time_in_afternoon)} to{" "}
        {isMidnight(formatTime(item.time_out_afternoon)) ? "N/A" : formatTime(item.time_out_afternoon)}
      </p>
    </div>

    <div className="mt-3 text-sm text-gray-500">
      <p><strong>Credited:</strong> {item.days_credited}</p>
      <p><strong>Overtime:</strong> {item.overtime_hours} hrs</p>
    </div>

    <div className="flex justify-end mt-4">
      <button
        onClick={() => onDelete(item.attendance_id)}
        className="text-sm text-red-600 hover:underline"
      >
        Delete
      </button>
    </div>
  </div>
);

export default AttendanceListCard;
