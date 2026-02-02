import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";

const AttendanceSummary = () => {
  const BASE_URL = "http://10.178.233.143/central_juan/backend";
  const [attendanceData, setAttendanceData] = useState([]);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // 🟢 Fetch all attendance once
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setAttendanceData(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "No Data",
          text: data.message || "No attendance records found.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error Fetching Attendance",
        text: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // 🟡 Count unique employee IDs for selected date
  const countActiveEmployees = () => {
    const filteredByDate = attendanceData.filter(
      (record) => record.attendance_date === selectedDate,
    );
    const uniqueEmployees = new Set(filteredByDate.map((r) => r.employee_id));
    setActiveEmployeeCount(uniqueEmployees.size);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    countActiveEmployees();
  }, [attendanceData, selectedDate]);

  // 🗓 Format date nicely
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 🔘 Date change handlers
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const handleNextDate = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next.toISOString().split("T")[0]);
  };

  const handlePrevDate = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev.toISOString().split("T")[0]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-lg border border-gray-700 text-white">
      {/* HEADER SUMMARY */}
      <div className="flex flex-col items-center justify-center mb-6">
        <h1 className="text-2xl font-bold mb-2">Attendance Summary</h1>
        <p className="text-gray-300 text-lg font-semibold">
          {formatDate(selectedDate)}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={handlePrevDate}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-md font-semibold"
          >
            ⬅ Previous
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleNextDate}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-sm rounded-md font-semibold"
          >
            Next ➡
          </button>
        </div>
      </div>

      {/* ACTIVE EMPLOYEES */}
      <div className="flex flex-col items-center justify-center py-6 bg-gray-700/50 rounded-2xl border border-gray-600 shadow-inner">
        <span className="text-lg text-gray-300 font-medium mb-1">On Duty</span>
        <h1 className="text-6xl font-extrabold text-blue-400 drop-shadow-sm">
          {loading ? (
            <span className="text-gray-500 animate-pulse">...</span>
          ) : (
            activeEmployeeCount
          )}
        </h1>
      </div>

      {/* FOOTER */}
      <div className="text-xs text-gray-400 mt-4 text-center border-t border-gray-700 pt-2 font-bold tracking-wide">
        CJIS-SERV01 — REV
        {new Date().toISOString().slice(2, 10).replace(/-/g, "-")}
      </div>
    </div>
  );
};

export default AttendanceSummary;
