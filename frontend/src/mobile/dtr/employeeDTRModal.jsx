import { useState, useEffect } from "react";
import PropTypes from "prop-types"; // Import PropTypes
import "../../../Styles/components/attendance/AttendanceModal.css";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/config";
import { format } from "date-fns";
import {
  CalendarSearch,
  Clock,
  Save,
  X,
  Calendar,
  Sun,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const EmployeeDTRModal = ({ data, onClose, onCreditedDaysChange }) => {
  const [formData, setFormData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const currentDay = new Date().getDate();
  const isFirstHalf = currentDay <= 15;
  const [showFirstHalf, setShowFirstHalf] = useState(isFirstHalf);

  const calculateTotalCreditedDays = () => {
    const firstHalfDays = formData.slice(0, 15).reduce((total, record) => {
      return total + (parseFloat(record.days_credited) || 0);
    }, 0);

    const secondHalfDays = formData.slice(15).reduce((total, record) => {
      return total + (parseFloat(record.days_credited) || 0);
    }, 0);

    return { firstHalfDays, secondHalfDays };
  };

  useEffect(() => {
    if (data) {
      fetchAttendanceRecords(data.employee_id);
    }
  }, [data]);

  useEffect(() => {
    const { firstHalfDays, secondHalfDays } = calculateTotalCreditedDays();
    onCreditedDaysChange(firstHalfDays, secondHalfDays);
  }, [formData]);

  useEffect(() => {
    if (data) {
      fetchAttendanceRecords(data.employee_id);
    }
  }, [data, selectedMonth, selectedYear]); // Ensure this effect runs when month or year changes

  const fetchAttendanceRecords = async (employeeId) => {
    try {
      const response = await fetch(
        `${BASE_URL}/attendance/get_attendance.php?employee_id=${employeeId}&month=${selectedMonth + 1}&year=${selectedYear}`,
      );
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const initialData = [];

        for (let day = 1; day <= 15; day++) {
          const attendanceDate = new Date(selectedYear, selectedMonth, day + 1)
            .toISOString()
            .split("T")[0];
          const foundRecord = result.data.find(
            (record) => record.attendance_date === attendanceDate,
          );

          initialData.push({
            attendance_id: foundRecord ? foundRecord.attendance_id : null,
            employee_id: employeeId,
            employee_name: data.employee_name,
            attendance_date: attendanceDate,
            time_in_morning: foundRecord ? foundRecord.time_in_morning : "",
            time_out_morning: foundRecord ? foundRecord.time_out_morning : "",
            time_in_afternoon: foundRecord ? foundRecord.time_in_afternoon : "",
            time_out_afternoon: foundRecord
              ? foundRecord.time_out_afternoon
              : "",
            days_credited: foundRecord ? foundRecord.days_credited : "",
            deducted_days: foundRecord ? foundRecord.deducted_days : "",
            overtime_hours: foundRecord ? foundRecord.overtime_hours : "",
          });
        }

        const daysInMonth = new Date(
          selectedYear,
          selectedMonth + 1,
          0,
        ).getDate();
        for (let day = 16; day <= daysInMonth; day++) {
          const attendanceDate = new Date(selectedYear, selectedMonth, day + 1)
            .toISOString()
            .split("T")[0];
          const foundRecord = result.data.find(
            (record) => record.attendance_date === attendanceDate,
          );

          initialData.push({
            attendance_id: foundRecord ? foundRecord.attendance_id : null,
            employee_id: employeeId,
            employee_name: data.employee_name,
            attendance_date: attendanceDate,
            time_in_morning: foundRecord ? foundRecord.time_in_morning : "",
            time_out_morning: foundRecord ? foundRecord.time_out_morning : "",
            time_in_afternoon: foundRecord ? foundRecord.time_in_afternoon : "",
            time_out_afternoon: foundRecord
              ? foundRecord.time_out_afternoon
              : "",
            days_credited: foundRecord ? foundRecord.days_credited : "",
            deducted_days: foundRecord ? foundRecord.deducted_days : "",
            overtime_hours: foundRecord ? foundRecord.overtime_hours : "",
          });
        }

        setFormData(initialData);
      } else {
        console.error(
          "Error fetching attendance records:",
          result.message || "No data found",
        );
      }
    } catch (error) {
      console.error("Error fetching attendance records:", error);
    }
  };

  const handleChange = (index, field, value) => {
    const record = formData[index];
    if (isSunday(record.attendance_date)) {
      return; // Prevent changes if the date is Sunday
    }

    if (value === "12:00 AM") {
      value = "--:-- --";
    }

    const updatedData = [...formData];
    updatedData[index][field] = value;
    setFormData(updatedData);
  };

  const handleSave = async (index) => {
    const record = formData[index];
    try {
      const method = record.attendance_id ? "PUT" : "POST";
      const url = record.attendance_id
        ? `${BASE_URL}/attendance/update_attendance.php?id=${record.attendance_id}`
        : `${BASE_URL}/attendance/create_attendance.php`;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(record),
      });
      const result = await response.json();
      if (result.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: `Attendance record for ${record.attendance_date} saved successfully.`,
        });
        fetchAttendanceRecords(data.employee_id);
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: result.message || "Failed to save attendance record.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Error saving record: " + error.message,
      });
    }
  };

  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value, 10); // Ensure month is an integer
    setSelectedMonth(month);
    fetchAttendanceRecords(data.employee_id); // Fetch records for the new month
  };

  const isSunday = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0;
  };

  const getDaysArray = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate(); // Get the number of days in the month
    const daysArray = [];

    for (let day = 16; day <= 31; day++) {
      if (day <= daysInMonth) {
        daysArray.push(day); // Push actual day if it exists in the month
      } else {
        daysArray.push(null); // Push null for days that don't exist
      }
    }
    return daysArray;
  };

  const renderInputField = (record, field, index) => {
    const isDisabled = isSunday(record.attendance_date);
    return (
      <div className="relative">
        <Clock
          className={`absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 ${isDisabled ? "text-gray-400" : "text-blue-500"}`}
        />
        <input
          type="time"
          value={
            record[field] === "00:00:00" || record[field] === "00:00"
              ? ""
              : record[field]
          }
          onChange={(e) => handleChange(index, field, e.target.value)}
          className={`border pl-8 pr-2 py-2 rounded-lg min-w-[140px] max-w-full text-sm transition-all ${
            isDisabled
              ? "bg-gray-100 cursor-not-allowed opacity-60 border-gray-300"
              : "bg-white border-gray-300 hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          }`}
          readOnly={isDisabled}
        />
      </div>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full h-full sm:h-auto sm:max-w-6xl sm:max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-3 sm:py-4 border-b border-blue-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              <div>
                <h2 className="text-lg sm:text-xl font-bold">
                  Daily Time Record
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm truncate max-w-[200px] sm:max-w-none">
                  {data?.employee_name || "Employee"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Controls Section */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-5 flex-shrink-0">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
            {/* Month Selection */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
              <div className="flex items-center space-x-3 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2">
                  <CalendarSearch className="w-5 h-5 text-blue-600" />
                  <div className="flex flex-col">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      Select Month
                    </label>
                    <span className="text-xs text-gray-500">
                      Choose payroll period
                    </span>
                  </div>
                </div>
              </div>
              <select
                value={selectedMonth}
                onChange={handleMonthChange}
                className="w-full sm:w-48 lg:w-56 border-2 border-gray-300 rounded-xl px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white shadow-sm hover:border-blue-400"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i} className="py-2">
                    {new Date(0, i).toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => setShowFirstHalf(!showFirstHalf)}
                className="flex-1 sm:flex-none px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-2.5 font-medium"
              >
                <Calendar className="w-5 h-5" />
                <span>{showFirstHalf ? "Show 2nd Half" : "Show 1st Half"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50">
          {/* 1st Half */}
          {showFirstHalf ? (
            <div className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">
                  Days 1-15
                </h3>
                <span className="text-xs sm:text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full flex-shrink-0">
                  First Half
                </span>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] sm:min-w-0">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          #
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Date
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time In AM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time Out AM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time In PM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time Out PM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Credited
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Deduction
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Overtime
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.slice(0, 15).map((record, index) => (
                        <tr
                          key={record.attendance_id || index}
                          className={`border-b transition-colors ${
                            isSunday(record.attendance_date)
                              ? "bg-red-50 hover:bg-red-100"
                              : index % 2 === 0
                                ? "bg-white hover:bg-gray-50"
                                : "bg-gray-50 hover:bg-gray-100"
                          }`}
                        >
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                            <div className="flex items-center justify-center">
                              <span className="text-xs sm:text-sm font-medium text-gray-900">
                                {index + 1}
                              </span>
                              {isSunday(record.attendance_date) && (
                                <Sun className="w-3 h-3 text-red-500 ml-1 flex-shrink-0" />
                              )}
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 border-r">
                            <input
                              type="text"
                              value={
                                record.attendance_date
                                  ? format(
                                      new Date(record.attendance_date),
                                      "MMM d, yyyy",
                                    )
                                  : ""
                              }
                              readOnly
                              className="w-full text-center bg-transparent border-none text-xs sm:text-sm font-medium text-gray-700"
                            />
                          </td>
                          {/* Mobile: Show time inputs in a single row */}
                          <td
                            className="px-2 sm:px-4 py-2 sm:py-3 border-r sm:hidden"
                            colSpan="4"
                          >
                            <div className="grid grid-cols-2 gap-1 sm:hidden">
                              {[
                                "time_in_morning",
                                "time_out_morning",
                                "time_in_afternoon",
                                "time_out_afternoon",
                              ].map((field, idx) => (
                                <div key={field} className="text-xs">
                                  <div className="text-gray-500 mb-1 text-center">
                                    {field.includes("in") ? "In" : "Out"}{" "}
                                    {field.includes("morning") ? "AM" : "PM"}
                                  </div>
                                  {renderInputField(record, field, index)}
                                </div>
                              ))}
                            </div>
                          </td>
                          {/* Desktop: Show individual columns */}
                          {[
                            "time_in_morning",
                            "time_out_morning",
                            "time_in_afternoon",
                            "time_out_afternoon",
                          ].map((field) => (
                            <td
                              key={field}
                              className="px-2 sm:px-4 py-2 sm:py-3 border-r hidden sm:table-cell"
                            >
                              {renderInputField(record, field, index)}
                            </td>
                          ))}
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                            <span className="text-xs sm:text-sm font-semibold text-blue-600">
                              {record.days_credited || "0"}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                            <span className="text-xs sm:text-sm font-medium text-red-600">
                              {record.deducted_days || "0"}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                            <span className="text-xs sm:text-sm font-medium text-orange-600">
                              {record.overtime_hours || "0"}
                            </span>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleSave(index)}
                              className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 mx-auto ${
                                isSunday(record.attendance_date) ||
                                (!record.time_in_morning &&
                                  !record.time_out_morning &&
                                  !record.time_in_afternoon &&
                                  !record.time_out_afternoon)
                                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                              }`}
                              disabled={
                                isSunday(record.attendance_date) ||
                                (!record.time_in_morning &&
                                  !record.time_out_morning &&
                                  !record.time_in_afternoon &&
                                  !record.time_out_afternoon)
                              }
                            >
                              <Save className="w-3 h-3" />
                              <span className="hidden sm:inline">Save</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {/* 2nd Half */}
          {!showFirstHalf ? (
            <div className="p-3 sm:p-6">
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0"></div>
                <h3 className="text-base sm:text-lg font-bold text-gray-800">
                  Days 16-31
                </h3>
                <span className="text-xs sm:text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full flex-shrink-0">
                  Second Half
                </span>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] sm:min-w-0">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          #
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Date
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time In AM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time Out AM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time In PM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r hidden sm:table-cell">
                          Time Out PM
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Credited
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Deduction
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r">
                          Overtime
                        </th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDaysArray(selectedMonth, selectedYear).map(
                        (day, index) => {
                          const recordIndex = index + 15;
                          const record = formData[recordIndex] || {};
                          return (
                            <tr
                              key={record.attendance_id || index + 15}
                              className={`border-b transition-colors ${
                                day === null
                                  ? "bg-gray-100"
                                  : isSunday(record.attendance_date)
                                    ? "bg-red-50 hover:bg-red-100"
                                    : index % 2 === 0
                                      ? "bg-white hover:bg-gray-50"
                                      : "bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                                <div className="flex items-center justify-center">
                                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                                    {day !== null ? day : ""}
                                  </span>
                                  {day !== null &&
                                    isSunday(record.attendance_date) && (
                                      <Sun className="w-3 h-3 text-red-500 ml-1 flex-shrink-0" />
                                    )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 border-r">
                                <input
                                  type="text"
                                  value={
                                    record.attendance_date
                                      ? format(
                                          new Date(record.attendance_date),
                                          "MMM d, yyyy",
                                        )
                                      : ""
                                  }
                                  readOnly
                                  className="w-full text-center bg-transparent border-none text-xs sm:text-sm font-medium text-gray-700"
                                />
                              </td>
                              {/* Mobile: Show time inputs in a single row */}
                              <td
                                className="px-2 sm:px-4 py-2 sm:py-3 border-r sm:hidden"
                                colSpan="4"
                              >
                                {day !== null ? (
                                  <div className="grid grid-cols-2 gap-1 sm:hidden">
                                    {[
                                      "time_in_morning",
                                      "time_out_morning",
                                      "time_in_afternoon",
                                      "time_out_afternoon",
                                    ].map((field, idx) => (
                                      <div key={field} className="text-xs">
                                        <div className="text-gray-500 mb-1 text-center">
                                          {field.includes("in") ? "In" : "Out"}{" "}
                                          {field.includes("morning")
                                            ? "AM"
                                            : "PM"}
                                        </div>
                                        {renderInputField(
                                          record,
                                          field,
                                          recordIndex,
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center text-gray-400 text-xs">
                                    Non-existent day
                                  </div>
                                )}
                              </td>
                              {/* Desktop: Show individual columns */}
                              {[
                                "time_in_morning",
                                "time_out_morning",
                                "time_in_afternoon",
                                "time_out_afternoon",
                              ].map((field) => (
                                <td
                                  key={field}
                                  className="px-2 sm:px-4 py-2 sm:py-3 border-r hidden sm:table-cell"
                                >
                                  {renderInputField(record, field, recordIndex)}
                                </td>
                              ))}
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                                <span className="text-xs sm:text-sm font-semibold text-blue-600">
                                  {record.days_credited || "0"}
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                                <span className="text-xs sm:text-sm font-medium text-red-600">
                                  {record.deducted_days || "0"}
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center border-r">
                                <span className="text-xs sm:text-sm font-medium text-orange-600">
                                  {record.overtime_hours || "0"}
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-2 sm:py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSave(recordIndex)}
                                  className={`px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-medium rounded-lg transition-all flex items-center space-x-1 mx-auto ${
                                    day === null ||
                                    isSunday(record.attendance_date) ||
                                    (!record.time_in_morning &&
                                      !record.time_out_morning &&
                                      !record.time_in_afternoon &&
                                      !record.time_out_afternoon)
                                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                      : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"
                                  }`}
                                  disabled={
                                    day === null ||
                                    isSunday(record.attendance_date) ||
                                    (!record.time_in_morning &&
                                      !record.time_out_morning &&
                                      !record.time_in_afternoon &&
                                      !record.time_out_afternoon)
                                  }
                                >
                                  <Save className="w-3 h-3" />
                                  <span className="hidden sm:inline">Save</span>
                                </button>
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Professional Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="truncate">
                Sundays are marked as non-working days
              </span>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowFirstHalf(!showFirstHalf)}
                className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-md flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{showFirstHalf ? "Show 2nd Half" : "Show 1st Half"}</span>
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-md flex items-center justify-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm"
                onClick={onClose}
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Close</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

EmployeeDTRModal.propTypes = {
  data: PropTypes.shape({
    employee_id: PropTypes.string.isRequired,
    employee_name: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onCreditedDaysChange: PropTypes.func.isRequired,
};

export default EmployeeDTRModal;
