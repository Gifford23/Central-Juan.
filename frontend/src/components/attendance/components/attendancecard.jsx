// components/attendance/AttendanceCards.jsx
import React from 'react';

const AttendanceCards = ({ loading, data, formatTime, isMidnight }) => {
  if (loading) {
    return <p className="text-gray-600">Loading attendance...</p>;
  }

  if (data.length === 0) {
    return <p className="text-gray-500">No attendance records found.</p>;
  }

  return (
    <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((item) => (
        <div
          key={item.attendance_id}
          className="p-4 transition-all duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
        >
          <div className="mb-2">
            <h3 className="text-lg font-semibold">{item.employee_name}</h3>
            <p className="text-sm text-gray-500">Emp. ID: {item.employee_id}</p>
          </div>

          <div className="space-y-1 text-sm text-gray-700">
            <p>
              <strong>Date:</strong> {new Date(item.attendance_date).toLocaleDateString()}
            </p>
            <p>
              <strong>Morning:</strong>{" "}
              {isMidnight(formatTime(item.time_in_morning)) ? "N/A" : formatTime(item.time_in_morning)}{" "}
              to{" "}
              {isMidnight(formatTime(item.time_out_morning)) ? "N/A" : formatTime(item.time_out_morning)}
            </p>
            <p>
              <strong>Afternoon:</strong>{" "}
              {isMidnight(formatTime(item.time_in_afternoon)) ? "N/A" : formatTime(item.time_in_afternoon)}{" "}
              to{" "}
              {isMidnight(formatTime(item.time_out_afternoon)) ? "N/A" : formatTime(item.time_out_afternoon)}
            </p>
          </div>

          <div className="mt-3 text-sm text-gray-500">
            <p><strong>Credited:</strong> {item.days_credited}</p>
            <p><strong>Overtime:</strong> {item.overtime_hours} hrs</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AttendanceCards;
