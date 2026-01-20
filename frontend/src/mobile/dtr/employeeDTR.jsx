import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";

const EmployeeDTR = ({ employeeId }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchAttendance = async (range = dateRange) => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await response.json();

      if (data.success) {
        let employeeAttendance = data.data.filter(
          (item) => item.employee_id === employeeId
        );

        const today = new Date();
        today.setHours(23, 59, 59, 999); // end of today

        if (range.start && range.end) {
          // ✅ Use user-defined range
          const start = new Date(range.start);
          const end = new Date(range.end);
          employeeAttendance = employeeAttendance.filter((item) => {
            const recordDate = new Date(item.attendance_date);
            return recordDate >= start && recordDate <= end;
          });
        } else {
          // ✅ Default filter: show records only up to today
          employeeAttendance = employeeAttendance.filter((item) => {
            const recordDate = new Date(item.attendance_date);
            return recordDate <= today;
          });
        }

        // Sort from newest → oldest
        employeeAttendance.sort(
          (a, b) => new Date(b.attendance_date) - new Date(a.attendance_date)
        );

        setAttendanceData(employeeAttendance);
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: data.message || "Failed to fetch attendance records",
        });
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "An error occurred while fetching attendance data.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!employeeId) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Employee data is missing. Please contact admin.",
      });
    } else {
      fetchAttendance();
    }
  }, [employeeId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const monthNames = [
      "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
      "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."
    ];
    return `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const formatTime12h = (timeString) => {
    if (!timeString || timeString === "00:00:00") return "--:--";
    const [hourStr, minuteStr] = timeString.split(":");
    let hour = parseInt(hourStr, 10);
    const minute = minuteStr;
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${ampm}`;
  };

  const openDateRangePopup = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Select Date Range",
      html: `
        <div class="flex flex-col gap-4 w-full">
          <div class="flex flex-col text-left">
            <label for="swal-input1" class="text-sm font-medium text-gray-700 mb-1">From</label>
            <input 
              id="swal-input1" 
              type="date" 
              class="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm w-full" 
            />
          </div>
          <div class="flex flex-col text-left">
            <label for="swal-input2" class="text-sm font-medium text-gray-700 mb-1">To</label>
            <input 
              id="swal-input2" 
              type="date" 
              class="px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none transition text-sm w-full" 
            />
          </div>
        </div>
      `,
      background: "#ffffff",
      width: "22rem",
      padding: "1.5rem",
      confirmButtonText: "Search",
      cancelButtonText: "Cancel",
      showCancelButton: true,
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl shadow-lg",
        title: "text-lg font-semibold text-gray-800 mb-2",
        confirmButton:
          "bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium mx-2 transition",
        cancelButton:
          "bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium mx-2 transition",
      },
      preConfirm: () => {
        const start = document.getElementById("swal-input1").value;
        const end = document.getElementById("swal-input2").value;
        if (!start || !end) {
          Swal.showValidationMessage("Both start and end dates are required");
        }
        return { start, end };
      },
    });

    if (formValues) {
      setDateRange(formValues);
      fetchAttendance(formValues);
    }
  };

  const clearDateRange = () => {
    setDateRange({ start: "", end: "" });
    fetchAttendance({ start: "", end: "" });
  };

  return (
    <div className="flex flex-col w-full h-full p-3 pb-16 rounded-lg shadow-md sm:p-5 bg-gray-50">
      <div className="flex flex-col items-center justify-between gap-3 mb-4 sm:flex-row">
        <h2 className="text-base font-semibold text-gray-700 sm:text-lg">
          Employee Daily Time Records
        </h2>
        <div className="flex gap-2">
          <button
            onClick={openDateRangePopup}
            className="px-4 py-2 text-sm font-medium text-white transition bg-blue-500 rounded-md hover:bg-blue-600"
          >
            Search by Date Range
          </button>
          {dateRange.start && dateRange.end && (
            <button
              onClick={clearDateRange}
              className="px-3 py-2 text-sm font-medium text-gray-700 transition bg-gray-200 rounded-md hover:bg-gray-300"
            >
              🗑 Clear Range
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-600">Loading...</p>
      ) : attendanceData.length === 0 ? (
        <p className="text-center text-gray-500">No attendance records found.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {attendanceData.map((record) => (
            <div
              key={record.attendance_id}
              className="flex flex-col p-3 transition bg-white rounded-lg shadow-sm sm:p-4 hover:shadow-md"
            >
              <div className="pb-1 mb-2 text-sm font-semibold text-gray-700 border-b sm:text-base">
                {formatDate(record.attendance_date)}
              </div>
              <div className="grid grid-cols-1 gap-3 text-xs text-gray-600 sm:grid-cols-3 sm:text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">Morning</span>
                  <span>
                    {formatTime12h(record.time_in_morning)} -{" "}
                    {formatTime12h(record.time_out_morning)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-700">Afternoon</span>
                  <span>
                    {formatTime12h(record.time_in_afternoon)} -{" "}
                    {formatTime12h(record.time_out_afternoon)}
                  </span>
                </div>
                <div className="flex items-center justify-start font-medium text-gray-700 sm:justify-center">
                  Credited: {record.days_credited || "--"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeDTR;
