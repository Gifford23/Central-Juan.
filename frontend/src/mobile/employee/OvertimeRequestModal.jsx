import React, { useState } from "react";
import axios from "axios";
import BASE_URL from '../../../backend/server/config';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';


const OvertimeRequestPage = ({ employeeId, employeeName }) => {
  const [timeStart, setTimeStart] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hours, setHours] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!timeStart || !endTime || !reason) {
      alert("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("employee_id", employeeId);
      formData.append("employee_name", employeeName);
      formData.append("time_start", timeStart);
      formData.append("end_time", endTime);
      formData.append("hours_requested", hours);
      formData.append("reason", reason);

      // console.log("Submitting request with data:", {
      //   employee_id: employeeId,
      //   employee_name: employeeName,
      //   time_start: timeStart,
      //   end_time: endTime,
      //   hours_requested: hours,
      //   reason: reason,
      // });

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
        alert("Overtime request submitted successfully.");
        setTimeStart("");
        setEndTime("");
        setHours("");
        setReason("");
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

  return (
  <div className="flex flex-col items-center justify-center h-full bg-gray-100 ">
    <div className="w-full p-6 bg-white rounded-lg shadow-lg">
      <h2 className="mb-4 text-xl font-bold text-center text-gray-800">Overtime Request</h2>

      <div className="mb-4 text-sm text-gray-600">
        <p><span className="font-medium">Employee ID:</span> {employeeId}</p>
        <p><span className="font-medium">Employee Name:</span> {employeeName}</p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700">Start Time</label>
          <input
            type="time"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-700">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for overtime"
            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full mt-5 p-2 rounded-md text-white font-semibold transition ${
          loading ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
        }`}
      >
        {loading ? "Submitting..." : "Submit Request"}
      </button>
    </div>
  </div>
);

};

export default OvertimeRequestPage;


// import React, { useState } from "react";
// import axios from "axios";
// import BASE_URL from '../../../backend/server/config';

// const OvertimeRequestModal = ({ isOpen, onClose, employeeId, employeeName }) => {
//   const [timeStart, setTimeStart] = useState("");
//   const [endTime, setEndTime] = useState("");
//   const [hours, setHours] = useState("");
//   const [reason, setReason] = useState("");
//   const [loading, setLoading] = useState(false);

  // const handleSubmit = async () => {
  //   if (!timeStart || !endTime || !reason) {
  //     alert("Please fill in all fields.");
  //     return;
  //   }

  //   setLoading(true);
  //   try {
  //     const formData = new URLSearchParams();
  //     formData.append("employee_id", employeeId);
  //     formData.append("employee_name", employeeName);
  //     formData.append("time_start", timeStart);
  //     formData.append("end_time", endTime);
  //     formData.append("hours_requested", hours);
  //     formData.append("reason", reason);

  //     console.log("Submitting request with data:", {
  //       employee_id: employeeId,
  //       employee_name: employeeName,
  //       time_start: timeStart,
  //       end_time: endTime,
  //       hours_requested: hours,
  //       reason: reason,
  //     });

  //     const response = await axios.post(
  //         `${BASE_URL}/overtime/add_overtime_request.php`,
  //         formData,
  //         {
  //             headers: {
  //                 "Content-Type": "application/x-www-form-urlencoded",
  //             },
  //         }
  //     );

  //     if (response.data.success) {
  //       alert("Overtime request submitted successfully.");
  //       setTimeStart("");
  //       setEndTime("");
  //       setHours("");
  //       setReason("");
  //       onClose();
  //     } else {
  //       console.error("Server response:", response.data);
  //       alert(response.data.message || "Failed to submit request.");
  //     }
  //   } catch (error) {
  //     console.error("Submission error:", error);
  //     alert("An error occurred while submitting the request.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 top-0 z-50 flex items-center justify-center modal bg-black/30 backdrop-blur-sm">
//       <div className="p-6 bg-white rounded-md modal-content w-96">
//         <h2 className="mb-4 text-xl font-semibold">Overtime Request</h2>

//         <div className="mb-4 text-sm text-gray-600">
//           <p><span className="font-medium">Employee ID:</span> {employeeId}</p>
//           <p><span className="font-medium">Employee Name:</span> {employeeName}</p>
//         </div>

//         <label className="block mb-1 text-sm text-gray-700">Start Time</label>
//         <input
//           type="time"
//           value={timeStart}
//           onChange={(e) => setTimeStart(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-300 rounded"
//         />

//         <label className="block mb-1 text-sm text-gray-700">End Time</label>
//         <input
//           type="time"
//           value={endTime}
//           onChange={(e) => setEndTime(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-300 rounded"
//         />

//         {/* <label className="block mb-1 text-sm text-gray-700">Hours Requested</label>
//         <input
//           type="number"
//           value={hours}
//           onChange={(e) => setHours(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-300 rounded"
//           placeholder="Enter number of hours"
//         /> */}

//         <label className="block mb-1 text-sm text-gray-700">Reason</label>
//         <textarea
//           value={reason}
//           onChange={(e) => setReason(e.target.value)}
//           className="w-full p-2 mb-4 border border-gray-300 rounded"
//           placeholder="Enter reason for overtime"
//         />

//         <div className="flex justify-end w-full gap-4 mt-4">
//           <button
//             onClick={onClose}
//             className="p-2 text-white bg-red-500 rounded-md"
//             disabled={loading}
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             className="text-white bg-green-600 rounded-md p -2"
//             disabled={loading}
//           >
//             {loading ? "Submitting..." : "Submit"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OvertimeRequestModal;