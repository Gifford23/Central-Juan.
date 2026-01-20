import React from "react";
import { motion } from "framer-motion";

const AttendanceModal = ({ isOpen, onClose, employeeName, attendanceRecords }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg shadow-lg w-11/12 max-w-4xl p-5 relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="text-lg font-semibold">
            Attendance Summary — {employeeName}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Attendance Table */}
        <div className="overflow-x-auto mt-4 max-h-[60vh] overflow-y-auto">
          {attendanceRecords && attendanceRecords.length > 0 ? (
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-gray-100 text-gray-700 sticky top-0">
                <tr>
                  <th className="py-2 px-3 border">Date</th>
                  <th className="py-2 px-3 border">Time In (AM)</th>
                  <th className="py-2 px-3 border">Time Out (AM)</th>
                  <th className="py-2 px-3 border">Time In (PM)</th>
                  <th className="py-2 px-3 border">Time Out (PM)</th>
                  <th className="py-2 px-3 border">Rendered Hours</th>
                  <th className="py-2 px-3 border">Days Credited</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((att, i) => (
                  <tr key={i} className="text-center hover:bg-gray-50 border-t">
                    <td className="py-1 px-3 border">{att.attendance_date}</td>
                    <td className="py-1 px-3 border">{att.time_in_morning || "-"}</td>
                    <td className="py-1 px-3 border">{att.time_out_morning || "-"}</td>
                    <td className="py-1 px-3 border">{att.time_in_afternoon || "-"}</td>
                    <td className="py-1 px-3 border">{att.time_out_afternoon || "-"}</td>
                    <td className="py-1 px-3 border">{att.total_rendered_hours}</td>
                    <td className="py-1 px-3 border">{att.days_credited}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 italic py-4">
              No attendance records available.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AttendanceModal;
