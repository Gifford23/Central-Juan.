import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { createLeaveRequest, fetchLeaveRequests } from '../../mobile/LeaveRequest/LeaverequestAPI/useLeaveRequestsAPI';
import { fetchLeaveTypesAdmin } from '../../components/leave/leaveApi/useLeaveTypeAdminAPI';

export default function TestMobile() {
  const location = useLocation();
  const { employeeData } = location.state || {};

  const [form, setForm] = useState({
    employee_id: employeeData?.employee_id || '',
    leave_type_id: '',
    date_from: '',
    date_until: '',
    total_days: 1,
    reason: ''
  });

  const [leaveList, setLeaveList] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false); // for form submit

  // Fetch leave requests
  useEffect(() => {
    if (employeeData?.employee_id) {
      fetchLeaveRequests(employeeData.employee_id).then(setLeaveList);
    }
  }, [employeeData]);

  // Fetch leave types
  useEffect(() => {
    fetchLeaveTypesAdmin().then((res) => {
      if (Array.isArray(res)) {
        setLeaveTypes(res);
      } else if (Array.isArray(res?.data)) {
        setLeaveTypes(res.data);
      } else {
        setLeaveTypes([]);
      }
    });
  }, []);

  // Helper functions
  const calculateDateUntil = (startDate, totalDays) => {
    if (!startDate || !totalDays) return '';
    const start = new Date(startDate);
    start.setDate(start.getDate() + (parseFloat(totalDays) - 1));
    return start.toISOString().split('T')[0];
  };

  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 1;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = (end - start) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 1;
  };

  // Event handlers
  const handleLeaveTypeChange = (e) => {
    const selectedId = e.target.value;
    const selectedType = leaveTypes.find(
      (lt) => lt.leave_type_id === parseInt(selectedId)
    );

    if (selectedType) {
      setForm((prev) => ({
        ...prev,
        leave_type_id: selectedId,
        total_days: selectedType.default_days || 1,
        date_until: prev.date_from
          ? calculateDateUntil(prev.date_from, selectedType.default_days || 1)
          : ''
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        leave_type_id: '',
        total_days: 1,
        date_until: ''
      }));
    }
  };

  const handleDateFromChange = (e) => {
    const newDateFrom = e.target.value;
    const selectedType = leaveTypes.find(
      (lt) => lt.leave_type_id === parseInt(form.leave_type_id)
    );

    setForm((prev) => ({
      ...prev,
      date_from: newDateFrom,
      date_until: selectedType
        ? calculateDateUntil(newDateFrom, selectedType.default_days || prev.total_days)
        : prev.date_until
    }));
  };

  const handleDateUntilChange = (e) => {
    const newDateUntil = e.target.value;
    setForm((prev) => ({
      ...prev,
      date_until: newDateUntil,
      total_days: calculateDaysBetween(prev.date_from, newDateUntil)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await createLeaveRequest(form);

      if (res.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Leave request submitted!',
          text: 'Your leave request has been sent successfully.',
          timer: 2000,
          showConfirmButton: false
        });

        fetchLeaveRequests(employeeData.employee_id).then(setLeaveList);
        setForm({
          employee_id: employeeData?.employee_id || '',
          leave_type_id: '',
          date_from: '',
          date_until: '',
          total_days: 1,
          reason: ''
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Submission Failed',
          text: res.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Unable to submit leave request. Please check your connection.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg p-6 mx-auto bg-white shadow-lg rounded-xl">
      <h2 className="mb-4 text-2xl font-bold text-gray-800">Request Leave</h2>

      {/* Employee Info */}
      <div className="p-3 mb-4 text-gray-700 rounded-lg bg-gray-50">
        <p><strong>Employee ID:</strong> {employeeData?.employee_id || 'N/A'}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Leave Type */}
        <div>
          <label className="block mb-1 font-medium">Leave Type</label>
          <select
            value={form.leave_type_id}
            onChange={handleLeaveTypeChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            required
          >
            <option value="">-- Select Leave Type --</option>
            {leaveTypes.map((lt) => (
              <option key={lt.leave_type_id} value={lt.leave_type_id}>
                {lt.leave_name}
              </option>
            ))}
          </select>
        </div>

        {/* Dates */}
        <div>
          <label className="block mb-1 font-medium">Date From</label>
          <input
            type="date"
            value={form.date_from}
            onChange={handleDateFromChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Date Until</label>
          <input
            type="date"
            value={form.date_until}
            onChange={handleDateUntilChange}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            required
          />
        </div>

        {/* Total Days */}
        <div>
          <label className="block mb-1 font-medium">Total Days</label>
          <input
            type="number"
            step="0.01"
            value={form.total_days}
            onChange={(e) => setForm({ ...form, total_days: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
          />
        </div>

        {/* Reason */}
        <div>
          <label className="block mb-1 font-medium">Reason</label>
          <textarea
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-200"
            rows="3"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 text-white rounded-lg transition ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Leave Requests List */}
      <h3 className="mt-6 mb-2 text-xl font-bold text-gray-800">My Leave Requests</h3>
      {leaveList.length === 0 ? (
        <p className="text-gray-500">No leave requests found.</p>
      ) : (
        <ul className="divide-y">
          {leaveList.map((lr) => (
            <li key={lr.leave_id} className="py-2">
              <span className="font-medium">{lr.leave_type_name}</span> - {lr.status}
              <br />
              <span className="text-sm text-gray-600">
                {lr.date_from} to {lr.date_until}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



// import React, { useState, useEffect } from 'react';
// import { useLocation } from 'react-router-dom';
// import { createLeaveRequest, fetchLeaveRequests } from '../../mobile/LeaveRequest/LeaverequestAPI/useLeaveRequestsAPI';

// export default function TestMobile() {
//   const location = useLocation();
//   const { employeeData } = location.state || {};

//   console.log("Loaded employeeData:", employeeData);

//   const [form, setForm] = useState({
//     employee_id: employeeData?.employee_id || '',
//     leave_type_id: '',
//     date_from: '',
//     date_until: '',
//     total_days: 1,
//     reason: ''
//   });
//   const [leaveList, setLeaveList] = useState([]);

//   useEffect(() => {
//     if (employeeData?.employee_id) {
//       console.log("Fetching leave requests for:", employeeData.employee_id);
//       fetchLeaveRequests(employeeData.employee_id).then(setLeaveList);
//     }
//   }, [employeeData]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     console.log("Submitting leave request:", form);
//     const res = await createLeaveRequest(form);
//     if (res.success) {
//       alert('Leave request submitted!');
//       fetchLeaveRequests(employeeData.employee_id).then(setLeaveList);
//     } else {
//       alert(res.message);
//     }
//   };

//   return (
//     <div className="max-w-lg p-6 mx-auto bg-white shadow-md rounded-xl">
//       <h2 className="mb-4 text-2xl font-bold">Request Leave</h2>

//       {/* Employee Info */}
//       <div className="mb-4 text-gray-700">
//         <p><strong>Employee ID:</strong> {employeeData?.employee_id || 'N/A'}</p>
//       </div>

//       {/* Leave Request Form */}
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label className="block mb-1 font-medium">Leave Type ID</label>
//           <input type="number"
//             value={form.leave_type_id}
//             onChange={e => setForm({ ...form, leave_type_id: e.target.value })}
//             className="w-full px-3 py-2 border rounded"
//             required />
//         </div>

//         <div>
//           <label className="block mb-1 font-medium">Date From</label>
//           <input type="date"
//             value={form.date_from}
//             onChange={e => setForm({ ...form, date_from: e.target.value })}
//             className="w-full px-3 py-2 border rounded"
//             required />
//         </div>

//         <div>
//           <label className="block mb-1 font-medium">Date Until</label>
//           <input type="date"
//             value={form.date_until}
//             onChange={e => setForm({ ...form, date_until: e.target.value })}
//             className="w-full px-3 py-2 border rounded"
//             required />
//         </div>

//         <div>
//           <label className="block mb-1 font-medium">Total Days</label>
//           <input type="number"
//             step="0.01"
//             value={form.total_days}
//             onChange={e => setForm({ ...form, total_days: e.target.value })}
//             className="w-full px-3 py-2 border rounded" />
//         </div>

//         <div>
//           <label className="block mb-1 font-medium">Reason</label>
//           <textarea
//             value={form.reason}
//             onChange={e => setForm({ ...form, reason: e.target.value })}
//             className="w-full px-3 py-2 border rounded"
//             rows="3"
//             required />
//         </div>

//         <button type="submit"
//           className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
//           Submit
//         </button>
//       </form>

//       {/* Leave Requests List */}
//       <h3 className="mt-6 mb-2 text-xl font-bold">My Leave Requests</h3>
//       {leaveList.length === 0 ? (
//         <p className="text-gray-500">No leave requests found.</p>
//       ) : (
//         <ul className="divide-y">
//           {leaveList.map(lr => (
//             <li key={lr.leave_id} className="py-2">
//               <span className="font-medium">{lr.leave_type_name}</span> - {lr.status}
//               <br />
//               <span className="text-sm text-gray-600">{lr.date_from} to {lr.date_until}</span>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }



// import "tailwindcss";
// import React, { useState, useEffect } from "react";
// // import axios from "axios";
// // import BASE_URL from '../../../backend/server/config';
// // import { useLocation } from 'react-router-dom';

// const TestMobile = () => {



//   return (
//     <p>test</p>
//   );
// };

// export default TestMobile;





// import "tailwindcss";
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import BASE_URL from '../../../backend/server/config';
// import { useLocation } from 'react-router-dom';

// const TestMobile = () => {
//   const [attendanceDate, setAttendanceDate] = useState("");
//   const [requestedTimeInMorning, setRequestedTimeInMorning] = useState("");
//   const [requestedTimeOutMorning, setRequestedTimeOutMorning] = useState("");
//   const [requestedTimeInAfternoon, setRequestedTimeInAfternoon] = useState("");
//   const [requestedTimeOutAfternoon, setRequestedTimeOutAfternoon] = useState("");
//   const [reason, setReason] = useState("");
//   const [loading, setLoading] = useState(false);
//   const location = useLocation();

//   const { employeeName = "Unknown Employee", employeeId } = location.state || {};

//   const handleSubmit = async () => {
//     if (!attendanceDate || !reason) {
//       alert("Please fill in the attendance date and reason.");
//       return;
//     }

//     setLoading(true);

//     try {
//       const payload = {
//         employee_id: employeeId,
//         employee_name: employeeName,
//         attendance_date: attendanceDate,
//         requested_time_in_morning: requestedTimeInMorning,
//         requested_time_out_morning: requestedTimeOutMorning,
//         requested_time_in_afternoon: requestedTimeInAfternoon,
//         requested_time_out_afternoon: requestedTimeOutAfternoon,
//         reason: reason,
//       };

//       const response = await axios.post(
//         `${BASE_URL}/late_request_clockInOut/add_late_attendance_request.php`,
//         JSON.stringify(payload),
//         {
//           headers: {
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       if (response.data.success) {
//         alert("Late attendance request submitted successfully.");
//         setAttendanceDate("");
//         setRequestedTimeInMorning("");
//         setRequestedTimeOutMorning("");
//         setRequestedTimeInAfternoon("");
//         setRequestedTimeOutAfternoon("");
//         setReason("");
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



//   useEffect(() => {
//     if (!attendanceDate || !employeeId) return;
  
//     const fetchAttendanceByDate = async () => {
//       try {
//         const response = await axios.get(`${BASE_URL}/mobile/time_in/get_attendance.php`, {
//           params: {
//             employee_id: employeeId,
//             date: attendanceDate,
//           },
//         });
  
//         if (response.data.success && response.data.data.length > 0) {
//           const record = response.data.data[0];
  
//           setRequestedTimeInMorning(record.time_in_morning === "00:00:00" ? "" : record.time_in_morning);
//           setRequestedTimeOutMorning(record.time_out_morning === "00:00:00" ? "" : record.time_out_morning);
//           setRequestedTimeInAfternoon(record.time_in_afternoon === "00:00:00" ? "" : record.time_in_afternoon);
//           setRequestedTimeOutAfternoon(record.time_out_afternoon === "00:00:00" ? "" : record.time_out_afternoon);
//           setReason(record.reason || "");
//         } else {
//           setRequestedTimeInMorning("");
//           setRequestedTimeOutMorning("");
//           setRequestedTimeInAfternoon("");
//           setRequestedTimeOutAfternoon("");
//           setReason("");
//         }
//       } catch (error) {
//         console.error("Error fetching attendance by date:", error);
//       }
//     };
  
//     fetchAttendanceByDate();
//   }, [attendanceDate, employeeId]);
  

// useEffect(() => {
//   const interval = setInterval(() => {
//     const now = new Date();
//     const isMidnight = now.getHours() === 0 && now.getMinutes() === 0;

//     if (isMidnight) {
//       setRequestedTimeInMorning("");
//       setRequestedTimeOutMorning("");
//       setRequestedTimeInAfternoon("");
//       setRequestedTimeOutAfternoon("");
//       setReason("");
//       setAttendanceDate("");
//     }
//   }, 60 * 1000); // check every 1 minute

//   return () => clearInterval(interval);
// }, []);


//   return (
//     <div className="flex h-full justify-center p-4 max-h-[80vh]">
//       <div className="p-6 rounded-[20px] shadow-md w-96 backdrop-blur-md bg-gray-500/30">
//         <h2 className="mb-4 text-xl font-semibold">Late Attendance Request</h2>

//         <div className="mb-4 text-sm text-gray-600">
//           <p><span className="font-medium">Employee ID:</span> {employeeId}</p>
//           <p><span className="font-medium">Employee Name:</span> {employeeName}</p>
//         </div>

//         <label className="block mb-1 text-sm text-gray-700">Attendance Date</label>
//         <input
//           type="date"
//           value={attendanceDate}
//           onChange={(e) => setAttendanceDate(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-100 rounded"
//         />

//         <label className="block mb-1 text-sm text-gray-700">Requested Time In (Morning)</label>
//         <input
//           type="time"
//           value={requestedTimeInMorning}
//           onChange={(e) => setRequestedTimeInMorning(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-100 rounded"
//         />

//         <label className="block mb-1 text-sm text-gray-700">Requested Time Out (Morning)</label>
//         <input
//           type="time"
//           value={requestedTimeOutMorning}
//           onChange={(e) => setRequestedTimeOutMorning(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-100 rounded"
//         />

//         <label className="block mb-1 text-sm text-gray-700">Requested Time In (Afternoon)</label>
//         <input
//           type="time"
//           value={requestedTimeInAfternoon}
//           onChange={(e) => setRequestedTimeInAfternoon(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-100 rounded"
//         />

//         <label className="block mb-1 text-sm text-gray-700">Requested Time Out (Afternoon)</label>
//         <input
//           type="time"
//           value={requestedTimeOutAfternoon}
//           onChange={(e) => setRequestedTimeOutAfternoon(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-100 rounded"
//         />

//         <label className="block mb-1 text-sm text-gray-700">Reason</label>
//         <textarea
//           value={reason}
//           onChange={(e) => setReason(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-100 rounded"
//           placeholder="Enter reason for late attendance"
//         />

//         <div className="flex justify-end w-full gap-4 mt-4">
//           <button
//             onClick={handleSubmit}
//             className="p-2 text-white bg-green-600 rounded-md"
//             disabled={loading}
//           >
//             {loading ? "Submitting..." : "Submit"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default TestMobile;


