import { useEffect, useState } from 'react';
import axios from 'axios';
import BASE_URL from "../../../../../backend/server/config";

const useAttendance = (employeeId, selectedDate) => {
  const [attendanceId, setAttendanceId] = useState(null);
  const [timeInMorning, setTimeInMorning] = useState('');
  const [timeOutMorning, setTimeOutMorning] = useState('');
  const [timeInAfternoon, setTimeInAfternoon] = useState('');
  const [timeOutAfternoon, setTimeOutAfternoon] = useState('');

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(
        `${BASE_URL}/mobile/time_in/get_attendance.php`,
        {
          params: {
            employee_id: employeeId,
            date: selectedDate,
          },
        }
      );

      const data = response.data?.data;
      if (data?.length > 0) {
        const todayRecord = data[0];
        setAttendanceId(todayRecord.attendance_id);
        setTimeInMorning(normalizeTime(todayRecord.time_in_morning));
        setTimeOutMorning(normalizeTime(todayRecord.time_out_morning));
        setTimeInAfternoon(normalizeTime(todayRecord.time_in_afternoon));
        setTimeOutAfternoon(normalizeTime(todayRecord.time_out_afternoon));
      } else {
        resetTimeValues();
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    }
  };

  // ✅ Normalize backend time into HH:mm
  const normalizeTime = (time) => {
    if (!time || time === "00:00:00" || time === "00:00") return "";
    return time.slice(0, 5);  // Always extract HH:mm only
  };

  const resetTimeValues = () => {
    setAttendanceId(null);
    setTimeInMorning('');
    setTimeOutMorning('');
    setTimeInAfternoon('');
    setTimeOutAfternoon('');
  };

  useEffect(() => {
    if (employeeId) {
      fetchAttendance();
    }
  }, [employeeId, selectedDate]);

  const saveAttendance = async () => {
    try {
      const payload = {
        attendance_id: attendanceId,
        employee_id: employeeId,
        date: selectedDate,
        time_in_morning: timeInMorning || "00:00",
        time_out_morning: timeOutMorning || "00:00",
        time_in_afternoon: timeInAfternoon || "00:00",
        time_out_afternoon: timeOutAfternoon || "00:00",
      };
  
      const endpoint = attendanceId
        ? `${BASE_URL}/mobile/time_in/update_attendance.php`
        : `${BASE_URL}/mobile/time_in/create_attendance.php`;
  
      const response = await axios.post(endpoint, payload);
  
      if (response.data.success) {
        console.log("Attendance saved successfully");
        fetchAttendance(); // Refresh after save
      } else {
        console.error("Failed to save attendance:", response.data.message);
      }
    } catch (err) {
      console.error("Error saving attendance:", err);
    }
  };

  return {
    attendanceId,
    timeInMorning,
    timeOutMorning,
    timeInAfternoon,
    timeOutAfternoon,
    setTimeInMorning,
    setTimeOutMorning,
    setTimeInAfternoon,
    setTimeOutAfternoon,
    saveAttendance, 
  };
};

export default useAttendance;






// import { useEffect, useState } from 'react';
// import axios from 'axios';
// import BASE_URL from "../../../../../backend/server/config";

// const useAttendance = (employeeId, selectedDate) => {
//   const [attendanceId, setAttendanceId] = useState(null);
//   const [timeInMorning, setTimeInMorning] = useState('');
//   const [timeOutMorning, setTimeOutMorning] = useState('');
//   const [timeInAfternoon, setTimeInAfternoon] = useState('');
//   const [timeOutAfternoon, setTimeOutAfternoon] = useState('');

//   const fetchAttendance = async () => {
//     try {
//       const response = await axios.get(
//         `${BASE_URL}/mobile/time_in/get_attendance.php`,
//         {
//           params: {
//             employee_id: employeeId,
//             date: selectedDate,
//           },
//         }
//       );

//       const data = response.data?.data;
//       if (data?.length > 0) {
//         const todayRecord = data[0];
//         setAttendanceId(todayRecord.attendance_id);
//         setTimeInMorning(cleanTime(todayRecord.time_in_morning));
//         setTimeOutMorning(cleanTime(todayRecord.time_out_morning));
//         setTimeInAfternoon(cleanTime(todayRecord.time_in_afternoon));
//         setTimeOutAfternoon(cleanTime(todayRecord.time_out_afternoon));
//       } else {
//         // Reset time values if no attendance record is found
//         resetTimeValues();
//       }
//     } catch (err) {
//       console.error('Failed to fetch attendance:', err);
//     }
//   };

//   const cleanTime = (time) => {
//     if (time === "00:00:00") return "";
//     return time;
//   };

//   const resetTimeValues = () => {
//     setAttendanceId(null);
//     setTimeInMorning('');
//     setTimeOutMorning('');
//     setTimeInAfternoon('');
//     setTimeOutAfternoon('');
//   };

//   useEffect(() => {
//     if (employeeId) {
//       fetchAttendance();
//     }
//   }, [employeeId, selectedDate]);

//   const saveAttendance = async () => {
//     try {
//       const payload = {
//         attendance_id: attendanceId,
//         employee_id: employeeId,
//         date: selectedDate,
//         time_in_morning: timeInMorning || "00:00:00",
//         time_out_morning: timeOutMorning || "00:00:00",
//         time_in_afternoon: timeInAfternoon || "00:00:00",
//         time_out_afternoon: timeOutAfternoon || "00:00:00",
//       };
  
//       const endpoint = attendanceId
//         ? `${BASE_URL}/mobile/time_in/update_attendance.php`  // if record exists
//         : `${BASE_URL}/mobile/time_in/create_attendance.php`; // if no record yet
  
//       const response = await axios.post(endpoint, payload);
  
//       if (response.data.success) {
//         console.log("Attendance saved successfully");
//         fetchAttendance(); // Refresh data after save
//       } else {
//         console.error("Failed to save attendance:", response.data.message);
//       }
//     } catch (err) {
//       console.error("Error saving attendance:", err);
//     }
//   };
  

//   return {
//     attendanceId,
//     timeInMorning,
//     timeOutMorning,
//     timeInAfternoon,
//     timeOutAfternoon,
//     setTimeInMorning,
//     setTimeOutMorning,
//     setTimeInAfternoon,
//     setTimeOutAfternoon,
//     saveAttendance, 
//   };
// };

// export default useAttendance;



