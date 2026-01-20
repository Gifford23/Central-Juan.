// src/features/late-request-notification/hooks/useLateRequest.js
import { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

export default function useLateRequest(employeeId, employeeName, attendanceDate) {
  const [requestedTimeInMorning, setRequestedTimeInMorning] = useState("");
  const [requestedTimeOutMorning, setRequestedTimeOutMorning] = useState("");
  const [requestedTimeInAfternoon, setRequestedTimeInAfternoon] = useState("");
  const [requestedTimeOutAfternoon, setRequestedTimeOutAfternoon] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setRequestedTimeInMorning("");
    setRequestedTimeOutMorning("");
    setRequestedTimeInAfternoon("");
    setRequestedTimeOutAfternoon("");
    setReason("");
    setAttendanceDate("");
  };

  const setAttendanceDate = (date) => {
    if (date instanceof Function) {
      console.warn("Pass a string date, not a function.");
      return;
    }
    _setAttendanceDate(date);
  };

  const [_attendanceDate, _setAttendanceDate] = useState(attendanceDate);

  const handleSubmit = async () => {
    if (!_attendanceDate || !reason) {
      alert("Please fill in the attendance date and reason.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        employee_id: employeeId,
        employee_name: employeeName,
        attendance_date: _attendanceDate,
        requested_time_in_morning: requestedTimeInMorning,
        requested_time_out_morning: requestedTimeOutMorning,
        requested_time_in_afternoon: requestedTimeInAfternoon,
        requested_time_out_afternoon: requestedTimeOutAfternoon,
        reason,
      };

      const response = await axios.post(
        `${BASE_URL}/late_request_clockInOut/add_late_attendance_request.php`,
        payload, // 👈 remove JSON.stringify
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      if (response.data.success) {
        alert("Late attendance request submitted successfully.");
        clearForm();
      } else {
        console.error("Server response:", response.data);
        alert(response.data.message || "Failed to submit request.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("An error occurred while submitting the request.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!_attendanceDate || !employeeId) return;
  
    const fetchAttendanceByDate = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/mobile/time_in/get_attendance.php`, {
          params: { employee_id: employeeId, date: _attendanceDate },
        });
  
        if (response.data.success && response.data.data.length > 0) {
          // If records exist, populate fields with the existing values
          const record = response.data.data[0];
          setRequestedTimeInMorning(record.time_in_morning === "00:00:00" ? "" : record.time_in_morning);
          setRequestedTimeOutMorning(record.time_out_morning === "00:00:00" ? "" : record.time_out_morning);
          setRequestedTimeInAfternoon(record.time_in_afternoon === "00:00:00" ? "" : record.time_in_afternoon);
          setRequestedTimeOutAfternoon(record.time_out_afternoon === "00:00:00" ? "" : record.time_out_afternoon);
          setReason(record.reason || "");
        } else {
          // If no record exists, keep the fields empty or allow the user to enter data
          setRequestedTimeInMorning("");
          setRequestedTimeOutMorning("");
          setRequestedTimeInAfternoon("");
          setRequestedTimeOutAfternoon("");
          setReason("");
        }
      } catch (error) {
        console.error("Error fetching attendance by date:", error);
      }
    };
  
    fetchAttendanceByDate();
  }, [_attendanceDate, employeeId]);
  

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        clearForm();
        _setAttendanceDate("");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return {
    attendanceDate: _attendanceDate,
    setAttendanceDate: _setAttendanceDate,
    requestedTimeInMorning,
    setRequestedTimeInMorning,
    requestedTimeOutMorning,
    setRequestedTimeOutMorning,
    requestedTimeInAfternoon,
    setRequestedTimeInAfternoon,
    requestedTimeOutAfternoon,
    setRequestedTimeOutAfternoon,
    reason,
    setReason,
    loading,
    handleSubmit,
  };
}
