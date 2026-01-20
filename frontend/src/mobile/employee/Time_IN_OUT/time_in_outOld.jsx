

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate  } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../../../backend/server/config';
// import OvertimeRequestModal from './OvertimeRequestModal';
import "../../../../Styles/globals.css"
import Swal from 'sweetalert2';

const TimeInOut = ({employeeData}) => {
  const location = useLocation();
  const { employeeId, employeeName } = location.state || {};
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const navigate = useNavigate();

  const [attendanceId, setAttendanceId] = useState(null);
  const [timeInMorning, setTimeInMorning] = useState('');
  const [timeOutMorning, setTimeOutMorning] = useState('');
  const [timeInAfternoon, setTimeInAfternoon] = useState('');
  const [timeOutAfternoon, setTimeOutAfternoon] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const localDate = new Date(today.getTime() + today.getTimezoneOffset() * 60000);
    return localDate.toISOString().split('T')[0];
  });
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  

  const getTodayInPHT = () => {
    const phtDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [month, day, year] = phtDate.split('/');
    return `${year}-${month}-${day}`;
  };
  const handleOvertimeSubmit = ({ hours, reason }) => {
    // Replace this with your API call or Firestore logic
    console.log("Overtime request submitted:", hours, reason);
  };
  useEffect(() => {
    const today = getTodayInPHT();
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Manila',
        hour12: true,
      };
      const time = now.toLocaleString('en-US', {
        ...options,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const date = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      setCurrentTime(time);
      setCurrentDate(date);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
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

           setTimeInMorning(cleanTime(todayRecord.time_in_morning));
           setTimeOutMorning(cleanTime(todayRecord.time_out_morning));
           setTimeInAfternoon(cleanTime(todayRecord.time_in_afternoon));
           setTimeOutAfternoon(cleanTime(todayRecord.time_out_afternoon));

        } else {
          // Set default times if no records exist
          setAttendanceId(null);
          setTimeInMorning('');
          setTimeOutMorning(''); 
          // setTimeOutMorning('12:00'); // Set default Time Out (Morning) to 12:00 PM

          setTimeInAfternoon('');
          setTimeOutAfternoon(''); // Set default Time Out (Afternoon) to 6:00 PM
          // setTimeOutAfternoon('18:00'); // Set default Time Out (Afternoon) to 6:00 PM

        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      }
    };

    if (employeeId) {
      fetchAttendance();
    }
  }, [employeeId, selectedDate]);

  const handleSubmit = async () => {
    const formData = {
      attendance_date: selectedDate,
      employee_id: employeeId,
      employee_name: employeeName,
      time_in_morning: timeInMorning,
      time_out_morning: timeOutMorning,
      time_in_afternoon: timeInAfternoon,
      time_out_afternoon: timeOutAfternoon,
    };

 try {
      const response = await axios.post(
        `${BASE_URL}/mobile/time_in/create_attendance.php`,
        formData,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('API Response:', response.data);

      if (response.data.success) {
        alert('Attendance submitted successfully!');
      } else {
        alert('Failed to submit attendance. Error: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Failed to submit attendance.');
    }
  };

  const handleUpdate = async () => {
    if (!attendanceId) {
      alert('No attendance ID found to update.');
      return;
    }

    console.log('Updating attendance with ID:', attendanceId);
    console.log('Times:', timeInMorning, timeOutMorning, timeInAfternoon, timeOutAfternoon);

    try {
      const formData = {
        attendance_id: attendanceId,
        attendance_date: selectedDate,
        employee_id: employeeId,
        employee_name: employeeName,
        time_in_morning: timeInMorning,
        time_out_morning: timeOutMorning,
        time_in_afternoon: timeInAfternoon,
        time_out_afternoon: timeOutAfternoon,
      };

      const response = await axios.post(`${BASE_URL}/mobile/time_in/update_attendance.php`, formData);

      console.log('Backend response:', response.data);

      if (response.data.success) {
        alert('Attendance updated successfully!');
      } else {
        alert('Failed to update attendance: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      alert('Failed to update attendance.');
    }
  };




  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const cleanTime = (time) => {
    if (time === "00:00:00") return "";
    return time;
  };

  
  const isCurrentDate = () => {
    const today = new Date();
    const selected = new Date(selectedDate);
    return today.toISOString().split('T')[0] === selected.toISOString().split('T')[0];
  };


  const handleRequestLate = () => {
    if (!employeeData) return;
    const employeeName = `${employeeData.first_name} ${employeeData.middle_name || ''} ${employeeData.last_name}`.trim();
    const employeeId = employeeData.employee_id;
    console.log("Navigating with employee data:", { employeeId, employeeName });
    navigate("/TestMobile", { state: { employeeId, employeeName } });
  };

  const handleTimeInMorning = () => {
    // Check if the selected date is the current date
    if (!isCurrentDate()) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Date',
        text: 'You cannot clock in on a non-current date. Please contact admin.',
        confirmButtonText: 'Close',
      });
      return;
    }

    // Check if time in has already been recorded
    if (timeInMorning) {
      Swal.fire({
        icon: 'error',
        title: 'Time In Already Recorded',
        text: 'Attendance time already exists. Please contact the developer if you need to edit.',
        confirmButtonText: 'Close',
      });
      return;
    }

    // Check if time out has already been recorded
    if (timeOutMorning) {
      Swal.fire({
        icon: 'error',
        title: 'Time Out Already Recorded',
        text: 'Attendance time already exists. Please contact the developer if you need to edit.',
        confirmButtonText: 'Close',
      });
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    console.log(`Current Time: ${currentHour}:${currentMinute}`);

    // Check if the current time is between 8:50 AM and 10:00 AM
    if ((currentHour === 8 && currentMinute >= 50) || (currentHour === 9) || (currentHour === 10 && currentMinute === 0)) {
      const currentTime = getCurrentTime();
      setTimeInMorning(currentTime);  // Set the time-in for the morning session
    } else {
      // If time is outside the allowed range, show SweetAlert with options
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Time',
        text: 'You can only clock in between 8:50 AM and 10:00 AM.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          // Handle the late request submission
          sendLateRequest();
        } else if (result.isDismissed) {
          // Handle cancellation
          console.log('User canceled the action');
        }
      });
    }
  };

  const sendLateRequest = () => {
    navigate("/late-request", { state: { employeeId, employeeName } });
  };

  
  const handleTimeOutMorning = () => {
    if (!isCurrentDate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'You cannot clock out on a non-current date.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          sendLateRequest();
        }
      });
      return;
    }
  
    if (!timeInMorning) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Time-In',
        text: 'You cannot clock out in the morning without clocking in first.',
      });
      return;
    }
  
    if (timeOutMorning) {
      Swal.fire({
        icon: 'info',
        title: 'Already Clocked Out',
        text: 'Attendance time already exists. Please contact the developer if you need to edit.',
      });
      return;
    }
  
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    console.log(`Current Time: ${currentHour}:${currentMinute}`);
  
    if ((currentHour === 11 && currentMinute >= 30) || (currentHour === 12 && currentMinute < 30)) {
      const currentTime = getCurrentTime();
      setTimeOutMorning(currentTime);
    } else if (currentHour === 12 && currentMinute >= 30) {
      const autoTimeOut = "12:00 PM";
      setTimeOutMorning(autoTimeOut);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Time',
        text: 'You can only clock out between 11:30 AM and 12:30 PM.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          sendLateRequest();
        }
      });
    }
  };
  
  

  const handleTimeInAfternoon = () => {
    // Ensure the selected date is the current date
    if (!isCurrentDate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'You cannot clock in on a non-current date.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          sendLateRequest(); // Call your late request handler
        }
      });
      return;
    }
  
    // Prevent duplicate clock-in
    if (timeInAfternoon) {
      Swal.fire({
        icon: 'info',
        title: 'Already Clocked In',
        text: 'Attendance time already exists. Please contact the developer if you need to edit.',
        confirmButtonText: 'OK',
      });
      return;
    }
  
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
  
    // Allow clock-in between 12:30 PM and 1:30 PM
    if ((currentHour === 12 && currentMinute >= 30) || (currentHour === 13 && currentMinute <= 30)) {
      const currentTime = getCurrentTime(); // e.g., "1:05 PM"
      setTimeInAfternoon(currentTime);
    } else if (currentHour === 13 && currentMinute > 30) {
      setTimeInAfternoon("1:00 PM");
      Swal.fire({
        icon: 'info',
        title: 'Auto Clock-In',
        text: 'Clock-in time automatically set to 1:00 PM.',
        confirmButtonText: 'OK',
      });
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Time',
        text: 'You can only clock in between 12:30 PM and 1:30 PM.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          sendLateRequest();
        }
      });
    }
  };
  
  const handleTimeOutAfternoon = () => {
    // Check if the selected date is the current date
    if (!isCurrentDate()) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Date',
        text: 'You cannot clock out on a non-current date.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          sendLateRequest(); // Replace with your late request handler
        }
      });
      return;
    }
  
    // Check if timeOutAfternoon is already set
    if (timeOutAfternoon) {
      Swal.fire({
        icon: 'info',
        title: 'Already Clocked Out',
        text: 'Attendance time already exists. Please contact the developer if you need to edit.',
        confirmButtonText: 'OK',
      });
      return;
    }
  
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    console.log(`Current Time: ${currentHour}:${currentMinute}`);
  
    const hasClockedIn = timeInMorning || timeInAfternoon;
  
    // Allow clock out only between 5:00 PM and 6:30 PM
    if ((currentHour >= 17 && currentHour < 18) || (currentHour === 18 && currentMinute <= 30)) {
      if (hasClockedIn) {
        const currentTime = getCurrentTime();
        setTimeOutAfternoon(currentTime);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'No Clock-In Found',
          text: 'Please contact admin: no clock-in found for the afternoon.',
        });
      }
    } else if (currentHour > 18 || (currentHour === 18 && currentMinute > 30)) {
      if (hasClockedIn) {
        setTimeOutAfternoon('6:00 PM');
        Swal.fire({
          icon: 'info',
          title: 'Auto Clock-Out',
          text: 'Clock-out time automatically set to 6:00 PM.',
          confirmButtonText: 'OK',
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'No Clock-In Found',
          text: 'Please contact admin: no clock-in found for the afternoon.',
        });
      }
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Time',
        text: 'You can only clock out between 5:00 PM and 6:30 PM.',
        showCancelButton: true,
        confirmButtonText: 'Send Late Request',
        cancelButtonText: 'Cancel',
      }).then((result) => {
        if (result.isConfirmed) {
          sendLateRequest();
        }
      });
    }
  };
  
  

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? '' : '';
    const formattedHour = hour % 12 || 12; // Convert to 12-hour format
    return `${formattedHour}:${minutes} ${ampm}`;
  };  


  return (
    <div className="max-w-[400px] w-full h-full p-6 bg-white rounded-lg">
      <div className="flex flex-col w-full min-h-[30vh] p-6 overflow-y-scroll shadow-md h-full backdrop-blur-sm bg-gray-500/30 bg-gray-50 rounded-2xl">
        <div className="mb-4 text-center border-b">
          <span className="text-xl font-bold">Live Time (PHT)</span>
          <p className="text-lg">{currentDate}</p>
          <p className="text-lg">{currentTime}</p>
        </div>

        <h2 className="mb-4 text-2xl font-bold text-center">Time In/Out</h2>
        <p className="mb-2 text-center text-gray-600">
          <p>{employeeName} </p>
          <p>({employeeId})</p>
        </p>

        <div className="mb-4 ">
          <label className="block text-gray-700">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="block w-full p-2 mt-1 border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        <div className='flex flex-col w-full'>

        {/* Morning - Time In */}
        <div className="w-full mb-4">
          <label className="block mb-1 font-medium text-gray-700">Clock In - Morning</label>
          <button
            onClick={handleTimeInMorning}
            className="block w-full p-3 text-gray-800 transition-all duration-200 rounded-lg shadow-sm bg-amber-200 hover:bg-amber-300"
            disabled={!!timeInMorning} // Disable button if already clocked in
          >
            {timeInMorning ? formatTime(timeInMorning) : 'Clock In'}
          </button>
        </div>

        {/* Morning - Time Out */}
        <div className="w-full mb-4">
          <label className="block mb-1 font-medium text-gray-700">Clock Out - Morning</label>
          <button
            onClick={handleTimeOutMorning}
            className="block w-full p-3 text-gray-800 transition-all duration-200 rounded-lg shadow-sm bg-amber-200 hover:bg-amber-300"
            disabled={!!timeOutMorning} // ✅ Disable if already clocked out

          >
            {timeOutMorning ? formatTime(timeOutMorning) : 'Clock Out'}
          </button>
        </div>

        {/* Afternoon - Time In */}
        <div className="w-full mb-4">
          <label className="block mb-1 font-medium text-gray-700">Clock In - Afternoon</label>
          <button
            onClick={handleTimeInAfternoon}
            className="block w-full p-3 text-gray-800 transition-all duration-200 rounded-lg shadow-sm bg-rose-200 hover:bg-rose-300"
            disabled={!!timeInAfternoon} // ✅ Disable if already clocked in

          >
            {timeInAfternoon ? formatTime(timeInAfternoon) : 'Clock In'}
          </button>
        </div>

        {/* Afternoon - Time Out */}
        <div className="w-full mb-6">
          <label className="block mb-1 font-medium text-gray-700">Clock Out -  Afternoon</label>
          <button
            onClick={handleTimeOutAfternoon}
            className="block w-full p-3 text-gray-800 transition-all duration-200 rounded-lg shadow-sm bg-rose-200 hover:bg-rose-300"
            disabled={!!timeOutAfternoon} // ✅ Disable if already clocked out

          >
            {timeOutAfternoon ? formatTime(timeOutAfternoon) : 'Clock Out'}
          </button>
        </div>

        </div>

        <div className="flex flex-col">
          {attendanceId === null && (
            <button
              onClick={handleSubmit}
              className="px-2 py-2 text-white bg-green-500 rounded-full hover:bg-green-600 focus:outline-none"
            >
              Submit Attendance
            </button>
          )}

          {attendanceId && (
            <button
              onClick={handleUpdate}
              className="px-2 py-2 text-white bg-yellow-500 rounded-full hover:bg-yellow-600 focus:outline-none"
            >
              Update Attendance
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeInOut;