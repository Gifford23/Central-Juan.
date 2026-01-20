// ...existing imports
import React, { useState, useEffect } from "react";
import axios from "axios";
import BASE_URL from '../../../backend/server/config';
import { useLocation } from 'react-router-dom';
import SaveIcon from '@mui/icons-material/Save';

const OvertimeRequestPage = () => {
  const [timeStart, setTimeStart] = useState("");
  const [actualTimeStart, setActualTimeStart] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [holidayInfo, setHolidayInfo] = useState(null);
  const location = useLocation();

  const { employeeName, employeeId } = location.state || {};

  // ✅ Calculate correct hours even if endTime is past midnight
  const calculateOvertimeDuration = (start, end) => {
    if (!start || !end) return;

    const [startHour, startMinute] = start.split(":").map(Number);
    const [endHour, endMinute] = end.split(":").map(Number);

    const startDate = new Date(0, 0, 0, startHour, startMinute);
    let endDate = new Date(0, 0, 0, endHour, endMinute);

    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }

    const diffMs = endDate - startDate;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = diffMin / 60;

    setHours(diffHr.toFixed(2));
  };

  useEffect(() => {
    const fetchOvertimeStart = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/overtime_settings/overtime_settings.php`);
        if (response.data.success && response.data.data.length > 0) {
          const latest = response.data.data[response.data.data.length - 1];
          const rawTime = latest.overtime_start;
          const formattedTime = rawTime.substring(0, 5);
          setTimeStart(formattedTime);
          setActualTimeStart(formattedTime);
        } else {
          console.warn("No previous overtime settings found.");
        }
      } catch (error) {
        console.error("Failed to fetch overtime settings:", error);
      }
    };
    fetchOvertimeStart();
  }, []);

  useEffect(() => {
    const fetchExistingOvertime = async () => {
      if (!selectedDate || !employeeId) return;
      try {
        const response = await axios.get(`${BASE_URL}/overtime/get_overtime_by_date.php`, {
          params: {
            employee_id: employeeId,
            date_requested: selectedDate,
          }
        });

        if (response.data.success && response.data.data) {
          const { time_start, end_time, hours_requested, reason } = response.data.data;
          setActualTimeStart(time_start);
          setEndTime(end_time);
          setHours(hours_requested);
          setReason(reason);
        } else {
          setActualTimeStart(timeStart);
          setEndTime("");
          setHours("");
          setReason("");
        }
      } catch (error) {
        console.error("Error fetching existing overtime:", error);
      }
    };

    fetchExistingOvertime();
  }, [selectedDate, employeeId, timeStart]);

  useEffect(() => {
    const fetchHolidayInfo = async () => {
      if (!selectedDate) {
        setHolidayInfo(null);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/holiday/get_holiday_by_date.php?date=${selectedDate}`);
        if (response.data.success) {
          setHolidayInfo(response.data.data);
          console.log("Holiday Info:", response.data.data);
        } else {
          setHolidayInfo(null); // Not a holiday
        }
      } catch (error) {
        console.error("Failed to fetch holiday info:", error);
        setHolidayInfo(null);
      }
    };

    fetchHolidayInfo();
  }, [selectedDate]);


  // ✅ Recalculate hours if either time changes
  useEffect(() => {
    if (actualTimeStart && endTime) {
      calculateOvertimeDuration(actualTimeStart, endTime);
    }
  }, [actualTimeStart, endTime]);

  const handleSubmit = async () => {
    if (!selectedDate || !actualTimeStart || !endTime || !reason) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("employee_id", employeeId);
      formData.append("employee_name", employeeName);
      formData.append("date_requested", selectedDate);
      formData.append("time_start", actualTimeStart);
      formData.append("end_time", endTime);
      formData.append("hours_requested", hours);
      formData.append("reason", reason);

      console.log("Form Data", {

  reason: reason
});

      const response = await axios.post(
        `${BASE_URL}/overtime/add_overtime_request.php`,
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      if (response.data.success) {
        alert(response.data.message || "Overtime request submitted successfully.");
        setTimeStart("");
        setActualTimeStart("");
        setEndTime("");
        setHours("");
        setReason("");
        setSelectedDate("");
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

  const formatTo12Hour = (time24) => {
    if (!time24) return "--:--";
    const [hour, minute] = time24.split(":");
    const h = parseInt(hour, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    const adjustedHour = h % 12 || 12;
    return `${adjustedHour}:${minute} ${ampm}`;
  };

  return (
    <div className="flex justify-center w-full h-full p-4 bg-gray-50">
      <div className="w-full max-w-xl p-6 space-y-6 bg-white shadow-lg rounded-2xl">
        <h2 className="text-2xl font-bold text-center text-gray-800">Overtime Request</h2>

        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="font-medium">Employee ID:</span> {employeeId}</p>
          <p><span className="font-medium">Employee Name:</span> {employeeName}</p>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex flex-col w-1/2">
            <label className="mb-1 text-sm font-medium text-gray-700">Overtime Start</label>
            <div className="w-full p-2.5 text-red-600 rounded-lg">
              {formatTo12Hour(timeStart)}
            </div>
          </div>

          <div className="flex flex-col w-1/2">
            <label className="mb-1 text-sm font-medium text-gray-700">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-row gap-4">
          <div className="flex flex-col w-1/2">
            <label className="mb-1 text-sm font-medium text-gray-700">Start Time</label>
            <input
              type="time"
              value={actualTimeStart}
              onChange={(e) => setActualTimeStart(e.target.value)}
              min={timeStart}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex flex-col w-1/2">
            <label className="mb-1 text-sm font-medium text-gray-700">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg resize-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter reason for overtime"
            rows={4}
          />
        </div>

        <div className="text-sm text-gray-700">
          <strong>Total Hours:</strong> {hours ? `${hours} hr` : "--"}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSubmit}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition ${
              loading
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
            disabled={loading}
          >
            <SaveIcon fontSize="small" />
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>

        <div className="flex flex-col text-sm text-gray-500 space-y-0.5">
          <span>This page is under development.</span>
          <span>If you encounter a bug, please </span>
          <span>report it to Programmer</span>
        </div>
      </div>
    </div>
  );
};

export default OvertimeRequestPage;



// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import BASE_URL from '../../../backend/server/config';
// import { useLocation } from 'react-router-dom';
// import SaveIcon from '@mui/icons-material/Save';

// const OvertimeRequestPage = () => {
//   const [timeStart, setTimeStart] = useState("");
//   const [actualTimeStart, setActualTimeStart] = useState("");
//   const [endTime, setEndTime] = useState("");
//   const [hours, setHours] = useState("");
//   const [reason, setReason] = useState("");
//   const [selectedDate, setSelectedDate] = useState("");
//   const [loading, setLoading] = useState(false);
//   const location = useLocation();

//   const { employeeName, employeeId } = location.state || {};

//   useEffect(() => {
//     const fetchPreviousRequests = async () => {
//       try {
//         const response = await axios.get(`${BASE_URL}/overtime_settings/overtime_settings.php`);
//         if (response.data.success && response.data.data.length > 0) {
//           const latest = response.data.data[response.data.data.length - 1];
//           const rawTime = latest.overtime_start;
//           const formattedTime = rawTime.substring(0, 5);
//           setTimeStart(formattedTime);
//           setActualTimeStart(formattedTime);
//         } else {
//           console.warn("No previous overtime settings found.");
//         }
//       } catch (error) {
//         console.error("Failed to fetch previous requests:", error);
//       }
//     };
//     fetchPreviousRequests();
//   }, []);

//   const handleSubmit = async () => {
//     if (!selectedDate || !actualTimeStart || !endTime || !reason) {
//       alert("Please fill in all fields.");
//       return;
//     }

//     setLoading(true);
//     try {
//       const formData = new URLSearchParams();
//       formData.append("employee_id", employeeId);
//       formData.append("employee_name", employeeName);
//       formData.append("date_requested", selectedDate);
//       formData.append("time_start", actualTimeStart);
//       formData.append("end_time", endTime);
//       formData.append("hours_requested", hours);
//       formData.append("reason", reason);

//       console.log("Submitting request with data:", {
//         employee_id: employeeId,
//         employee_name: employeeName,
//         date_requested: selectedDate,
//         time_start: actualTimeStart,
//         end_time: endTime,
//         hours_requested: hours,
//         reason: reason,
//       });

//       const response = await axios.post(
//         `${BASE_URL}/overtime/add_overtime_request.php`,
//         formData,
//         {
//           headers: {
//             "Content-Type": "application/x-www-form-urlencoded",
//           },
//         }
//       );

//       if (response.data.success) {
//         alert("Overtime request submitted successfully.");
//         setTimeStart("");
//         setActualTimeStart("");
//         setEndTime("");
//         setHours("");
//         setReason("");
//         setSelectedDate("");
//       } else {
//         console.error("Server response:", response.data);
//         alert(response.data.message || "Failed to submit request.");
//       }
//     } catch (error) {
//       console.error("Submission error:", error);
//       alert("An error occurred while submitting the request.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const formatTo12Hour = (time24) => {
//     if (!time24) return "--:--";
//     const [hour, minute] = time24.split(":");
//     const h = parseInt(hour, 10);
//     const ampm = h >= 12 ? "PM" : "AM";
//     const adjustedHour = h % 12 || 12;
//     return `${adjustedHour}:${minute} ${ampm}`;
//   };

// return (
//   <div className="flex justify-center w-full h-full p-4 bg-gray-50">
//     <div className="w-full max-w-xl p-6 space-y-6 bg-white shadow-lg rounded-2xl">
//       <h2 className="text-2xl font-bold text-center text-gray-800">Overtime Request</h2>

//       <div className="space-y-1 text-sm text-gray-600">
//         <p><span className="font-medium">Employee ID:</span> {employeeId}</p>
//         <p><span className="font-medium">Employee Name:</span> {employeeName}</p>
//       </div>

//       <div className="flex flex-row gap-4">
//         <div className="flex flex-col w-1/2">
//           <label className="mb-1 text-sm font-medium text-gray-700">Overtime Start</label>
//           <div className="w-full p-2.5 text-red-600 rounded-lg">
//             {formatTo12Hour(timeStart)}
//           </div>
//         </div>

//         <div className="flex flex-col w-1/2">
//           <label className="mb-1 text-sm font-medium text-gray-700">Select Date</label>
//           <input
//             type="date"
//             value={selectedDate}
//             onChange={(e) => setSelectedDate(e.target.value)}
//             className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>
//       </div>

//       <div className="flex flex-row gap-4">
//         <div className="flex flex-col w-1/2">
//           <label className="mb-1 text-sm font-medium text-gray-700">Start Time</label>
//           <input
//             type="time"
//             value={actualTimeStart}
//             onChange={(e) => setActualTimeStart(e.target.value)}
//             min={timeStart}
//             className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>

//         <div className="flex flex-col w-1/2">
//           <label className="mb-1 text-sm font-medium text-gray-700">End Time</label>
//           <input
//             type="time"
//             value={endTime}
//             onChange={(e) => setEndTime(e.target.value)}
//             className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
//           />
//         </div>
//       </div>

//       <div>
//         <label className="block mb-1 text-sm font-medium text-gray-700">Reason</label>
//         <textarea
//           value={reason}
//           onChange={(e) => setReason(e.target.value)}
//           className="w-full p-2.5 border border-gray-300 rounded-lg resize-none focus:ring-blue-500 focus:border-blue-500"
//           placeholder="Enter reason for overtime"
//           rows={4}
//         />
//       </div>

//       <div className="flex justify-end pt-2">
//         <button
//           onClick={handleSubmit}
//           className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition ${
//             loading
//               ? "bg-green-400 cursor-not-allowed"
//               : "bg-green-600 hover:bg-green-700"
//           }`}
//           disabled={loading}
//         >
//           <SaveIcon fontSize="small" />
//           {loading ? "Submitting..." : "Submit"}
//         </button>
//       </div>

//       <div className="flex flex-col text-sm text-gray-500 space-y-0.5">
//         <span>This page is under development.</span>
//         <span>If you encounter a bug, please </span>
//         <span>report it to Programmer</span>
//       </div>


//     </div>
//   </div>
// );


// };

// export default OvertimeRequestPage;
