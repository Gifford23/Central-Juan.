import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import BASE_URL from '../../../backend/server/config'; 

const EmployeeCount = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [employeeCount, setEmployeeCount] = useState(0);
  
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await response.json();
      console.log("Fetched Data:", data); // Log the fetched data

      if (data.success) {
        setAttendanceData(data.data);
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: data.message || "Failed to fetch attendance data.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Error fetching attendance: " + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const isActiveOnDate = (record) => {
    // Check if the attendance date matches the selected date
    const isDateMatch = record.attendance_date === selectedDate;

    // Check if both time_in_morning and time_in_afternoon are valid (not null or empty)
    const morningValid = record.time_in_morning && record.time_in_morning.trim() !== '';
    const afternoonValid = record.time_in_afternoon && record.time_in_afternoon.trim() !== '';

    return isDateMatch && morningValid && afternoonValid; // Return true only if both times are valid and date matches
  };

  const countActiveEmployees = () => {
    const filteredData = attendanceData.filter(isActiveOnDate);
    console.log("Filtered Data:", filteredData); // Log filtered data
    setActiveEmployeeCount(filteredData.length);
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    countActiveEmployees();
  }, [attendanceData, selectedDate]);

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  useEffect(() => {
    const fetchEmployeeCount = async () => {
      try {
        const response = await fetch(`${BASE_URL}/employeesSide/employees.php?count=true`);
        if (response.ok) {
          const data = await response.json();
          setEmployeeCount(data.total_count);
        } else {
          console.error("Failed to fetch employee count");
        }
      } catch (error) {
        console.error("Error fetching employee count:", error);
      }
    };

    fetchEmployeeCount();
  }, []);


  return (
    <div className="w-full p-4 active-employees-container ">
      {/* <div className="flex justify-start w-full date-selector">
        <input 
          type="date" 
          value={selectedDate} 
          onChange={handleDateChange} 
          className="p-2 border rounded"
        />
      </div> */}
      <div className="flex flex-col flex-1 w-full p-2 low_board rounded-3xl ">

          <div className="flex flex-row items-center w-full m-2 text-center text-black justify-evenly">
            <div className="text-2xl font-light">ACTIVE EMPLOYEES:</div>
            <div className="text-5xl font-thin ">{loading ? '...' : activeEmployeeCount}</div>
          </div>
          <div>
          <div className="flex flex-row justify-center w-full font-albert md:text-6xl">
            <p className=" font-albert">Total Employee: </p> <strong>{(employeeCount ?? 0).toString().padStart(2, "0")} </strong> 
            </div>
          </div>

        </div>
      </div>
  );
};

export default EmployeeCount;