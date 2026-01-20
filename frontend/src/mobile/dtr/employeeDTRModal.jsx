import { useState, useEffect } from "react";
import PropTypes from "prop-types"; // Import PropTypes
import "../../../Styles/components/attendance/AttendanceModal.css";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import BASE_URL from '../../../backend/config';
import { format } from "date-fns";
import { CalendarSearch } from 'lucide-react';

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
      const response = await fetch(`${BASE_URL}/attendance/get_attendance.php?employee_id=${employeeId}&month=${selectedMonth + 1}&year=${selectedYear}`);
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        const initialData = [];

        for (let day = 1; day <= 15; day++) {
          const attendanceDate = new Date(selectedYear, selectedMonth, day + 1).toISOString().split('T')[0];
          const foundRecord = result.data.find(record => record.attendance_date === attendanceDate);

          initialData.push({
            attendance_id: foundRecord ? foundRecord.attendance_id : null,
            employee_id: employeeId,
            employee_name: data.employee_name,
            attendance_date: attendanceDate,
            time_in_morning: foundRecord ? foundRecord.time_in_morning : "",
            time_out_morning: foundRecord ? foundRecord.time_out_morning : "",
            time_in_afternoon: foundRecord ? foundRecord.time_in_afternoon : "",
            time_out_afternoon: foundRecord ? foundRecord.time_out_afternoon : "",
            days_credited: foundRecord ? foundRecord.days_credited : "",
            deducted_days: foundRecord ? foundRecord.deducted_days : "",
            overtime_hours: foundRecord ? foundRecord.overtime_hours : "",
          });
        }

        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let day = 16; day <= daysInMonth; day++) {
          const attendanceDate = new Date(selectedYear, selectedMonth, day + 1).toISOString().split('T')[0];
          const foundRecord = result.data.find(record => record.attendance_date === attendanceDate);

          initialData.push({
            attendance_id: foundRecord ? foundRecord.attendance_id : null,
            employee_id: employeeId,
            employee_name: data.employee_name,
            attendance_date: attendanceDate,
            time_in_morning: foundRecord ? foundRecord.time_in_morning : "",
            time_out_morning: foundRecord ? foundRecord.time_out_morning : "",
            time_in_afternoon: foundRecord ? foundRecord.time_in_afternoon : "",
            time_out_afternoon: foundRecord ? foundRecord.time_out_afternoon : "",
            days_credited: foundRecord ? foundRecord.days_credited : "",
            deducted_days: foundRecord ? foundRecord.deducted_days : "",
            overtime_hours: foundRecord ? foundRecord.overtime_hours : "",
          });
        }

        setFormData(initialData);
      } else {
        console.error("Error fetching attendance records:", result.message || "No data found");
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
      <input
        type="time"
        value={
          record[field] === "00:00:00" || record[field] === "00:00"
            ? ""
            : record[field]
        }
        onChange={(e) => handleChange(index, field, e.target.value)}
        className={`border p-2 rounded min-w-[133px] max-w-full ${isDisabled ? 'bg-gray-200 cursor-not-allowed opacity-60' : ''}`}
        readOnly={isDisabled}
      />
    );
  };

  return (
    <motion.div 
      className="flex items-center justify-center w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="w-full h-full overflow-auto border max-h-[70vh] bg-gray-300 p-3 rounded-[10px] mx-4 mb-2"
      >
        <h2 className="mb-4 text-2xl font-semibold">DTR</h2>
        
        {/* Month Picker */}
        <div className="flex flex-row items-center mb-4 gap-x-2">
          <label className="flex flex-row text-lg font-medium"><CalendarSearch /> Select Month:</label>
          <select value={selectedMonth} onChange={handleMonthChange} className="border-2 p-2 rounded w-[40vh]">
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <div className="flex justify-end w-full">  
            <button
              type="button"
              onClick={() => setShowFirstHalf(!showFirstHalf)}
              className="px-4 py-2 text-white bg-green-600 rounded toggle-btn hover:bg-green-700"
            >
              {showFirstHalf ? "Show 2nd Half" : "Show 1st Half"}
            </button> 
          </div> 
        </div>

        <div className="flex flex-col">
          {/* 1st Half */}
          {showFirstHalf ? (
            <div>
              <h3 className="mb-2 text-lg font-semibold">Days 1-15</h3>
              <div className="overflow-x-auto">
              <table className="w-full border border-collapse border-gray-300">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="px-2 py-4 text-center justify-evenly items-center border max-w-[100px]">#</th>
                    <th className="items-center px-2 py-4 text-center border max-w-[150px] justify-evenly">Date</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time In AM</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time Out AM</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time In PM</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time Out PM</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly">Credited</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly">Deduction</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly">Overtime</th>
                    <th className="items-center px-2 py-4 text-center border justify-evenly">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.slice(0, 15).map((record, index) => (
                    <tr
                      key={record.attendance_id || index}
                      className={
                        isSunday(record.attendance_date)
                          ? "bg-red-100 text-red-500 font-bold"
                          : index % 2 === 0
                          ? "bg-gray-100"
                          : "bg-white"
                      }
                    >
                      <td className="px-2 py-4 text-center justify-evenly items-center border max-w-[100px]">{index + 1}</td>
                      <td className="items-center px-2 py-4 text-center border justify-evenly max-w-[150px]">
                        <input
                          type="text "
                          value={
                            record.attendance_date
                              ? format(new Date(record.attendance_date), "MMM d, yyyy")
                              : ""
                          }
                          readOnly
                          className="w-full text-center bg-transparent border-none"
                        />
                      </td>
                      {["time_in_morning", "time_out_morning", "time_in_afternoon", "time_out_afternoon"].map((field) => (
                        <td key={field} className="items-center px-2 py-4 text-center border justify-evenly">
                          {renderInputField(record, field, index)}
                        </td>
                      ))}
                      <td className="items-center px-2 py-4 text-center border justify-evenly">{record.days_credited}</td>
                      <td className="items-center px-2 py-4 text-center border justify-evenly">{record.deducted_days}</td>
                      <td className="items-center px-2 py-4 text-center border justify-evenly">{record.overtime_hours}</td>
                      <td className="items-center px-2 py-4 text-center border justify-evenly">
                        <button
                          type="button"
                          onClick={() => handleSave(index)}
                          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSunday(record.attendance_date) ? 'cursor-not-allowed opacity-60' : ''}`}
                          disabled={
                            isSunday(record.attendance_date) || 
                            (!record.time_in_morning &&
                            !record.time_out_morning &&
                            !record.time_in_afternoon &&
                            !record.time_out_afternoon)
                          }
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
          ) : null}

          {/* 2nd Half */}
          {!showFirstHalf ? (
            <div>
              <h3 className="mb-2 text-lg font-semibold">Days 16-31</h3>
              <div className="overflow-x-auto">
                <table className="w-full border border-collapse border-gray-300">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="px-2 py-4 text-center justify-evenly items-center border max-w-[100px]">#</th>
                      <th className="items-center px-2 py-4 text-center border max-w-[150px] justify-evenly">Date</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time In AM</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time Out AM</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time In PM</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly min-w-[150px] max-w-[200px]">Time Out PM</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly">Credited</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly">Deduction</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly">Overtime</th>
                      <th className="items-center px-2 py-4 text-center border justify-evenly">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getDaysArray(selectedMonth, selectedYear).map((day, index) => {
                      const recordIndex = index + 15; // Adjust index for the second half
                      const record = formData[recordIndex] || {}; // Get the record or an empty object if it doesn't exist
                      return (
                        <tr
                          key={record.attendance_id || index + 15}
                          className={
                            day === null
                              ? "bg-gray-200" // Placeholder for non-existent days
                              : isSunday(record.attendance_date)
                              ? "bg-red-100 text-red-500 font-bold"
                              : index % 2 === 0
                              ? "bg-gray-100"
                              : "bg-white"
                          }
                        >
                          <td className="px-2 py-4 text-center justify-evenly items-center border max-w-[100px]">{day !== null ? day : ""}</td>
                          <td className="items-center px-2 py-4 text-center border justify-evenly max-w-[150px]">
                            <input
                              type="text"
                              value={
                                record.attendance_date
                                  ? format(new Date(record.attendance_date), "MMM d, yyyy")
                                  : ""
                              }
                              readOnly
                              className="w-full text-center bg-transparent border-none"
                            />
                          </td>
                          {["time_in_morning", "time_out_morning", "time_in_afternoon", "time_out_afternoon"].map((field) => (
                            <td key={field} className="items-center px-2 py-4 text-center border justify-evenly">
                              {renderInputField(record, field, recordIndex)}
                            </td>
                          ))}
                          <td className="items-center px-2 py-4 text-center border justify-evenly">{record.days_credited}</td>
                          <td className="items-center px-2 py-4 text-center border justify-evenly">{record.deducted_days}</td>
                          <td className="items-center px-2 py-4 text-center border justify-evenly">{record.overtime_hours}</td>
                          <td className="items-center px-2 py-4 text-center border justify-evenly">
                            <button
                              type="button"
                              onClick={() => handleSave(recordIndex)}
                              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isSunday(record.attendance_date) ? 'cursor-not-allowed opacity-60' : ''}`}
                              disabled={
                                isSunday(record.attendance_date) || 
                                (!record.time_in_morning &&
                                !record.time_out_morning &&
                                !record.time_in_afternoon &&
                                !record.time_out_afternoon)
                              }
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex justify-end w-full mt-4">
          <button
            type="button"
            onClick={() => setShowFirstHalf(!showFirstHalf)}
            className="px-4 py-2 mx-1 text-white bg-green-600 rounded toggle-btn hover:bg-green-700"
          >
            {showFirstHalf ? "Show 2nd Half" : "Show 1st Half"}
          </button> 
          <button
            type="button"
            className="py-2 px-2.5 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onClose}
          >
            Cancel
          </button>
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