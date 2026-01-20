import { useEffect, useState } from "react";
import { useSession } from "../../context/SessionContext";
import AttendanceModal from "./AttendanceModal";
import "../../../Styles/components/attendance/attendance.css";
import { Maximize } from "lucide-react";
import Swal from "sweetalert2";
import { Tooltip } from "react-tooltip";
import BASE_URL from '../../../backend/server/config'; 
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import BackAttndance from "./BackbuttonNav";
import EmployeeCount from "./employeeCount";


const AttendanceMAdmin = () => {
  const { user } = useSession(); // Get user from context
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // New state for search query
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // State for selected date
  const [dateFrom, setDateFrom] = useState(""); // State for "Date From"
  const [dateTo, setDateTo] = useState(""); // State for "Date To"
  const isAttendanceSummary = location.pathname.includes === '/attendance';

  const fetchAttendance = async () => {
    setLoading(true);
    try {
        const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
        const data = await response.json();

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

  useEffect(() => {
    fetchAttendance();
  }, []);

  const isMidnight = (time) => {
    return time === "12:00 AM" || time === "00:00:00";
};
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // useEffect(() => {
  //   // Set dateFrom and dateTo to today's date when the component mounts
  //   const today = getTodayDate();
  //   setDateFrom(today);
  //   setDateTo(today);
  //   fetchAttendance();
  // }, []);


  // const showToday = () => {
  //   const today = getTodayDate(); // Get today's date in YYYY-MM-DD format
  //   setDateFrom(today);
  //   setDateTo(today);
  // };

  const handleDelete = async (id) => {
    Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!"
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`${BASE_URL}/attendance/delete_attendance.php?id=${id}`, {
                    method: "DELETE",
                });
                const data = await response.json();
                if (data.success) {
                    Swal.fire({
                        icon: "success",
                        title: "Deleted!",
                        text: "Record deleted successfully.",
                    });
                    fetchAttendance();
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Oops!",
                        text: data.message || "Failed to delete the record.",
                    });
                }
            } catch (error) {
                Swal.fire({
                    icon: "error",
                    title: "Error!",
                    text: "Error deleting record: " + error.message,
                });
            }
        }
    });
};


  const openModal = (data = null) => {
    setModalData(data);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalData(null);
    setModalVisible(false);
    fetchAttendance(); // Refresh after create/edit
  };

  // Utility function to format time from military to 12-hour format
  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(':');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12; // Convert 0 to 12
    return `${formattedHours}:${minutes} ${suffix}`;
  }
  

  // Initialize state with the current date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Function to go to the previous month
  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  // Function to go to the next month
  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  // Format the date for display
  const formattedDate = currentDate.toLocaleString('default', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const formatDateTime = (dateString) => {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true // Use 12-hour format
    };
    const date = new Date(dateString);
    return date.toLocaleString('en-US', options);
};

  // Get the weekdays for the current month
  const showToday = () => {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    setDateFrom(today);
    setDateTo(today);
  };


  const calculateAttendanceSummary = () => {
    let onTimeMorningCount = 0;
    let earlyMorningCount = 0;
    let lateMorningCount = 0;
    let onTimeAfternoonCount = 0;
    let earlyAfternoonCount = 0;
    let lateAfternoonCount = 0;

    filteredAttendanceData.forEach(item => {
      // Morning calculations
      const timeInMorning = item.time_in_morning; // Assuming this is in "HH:mm" format
      if (timeInMorning) {
        const [hours, minutes] = timeInMorning.split(':').map(Number);
        const timeInMorningDate = new Date();
        timeInMorningDate.setHours(hours, minutes);

        const morningOnTimeThreshold = new Date();
        morningOnTimeThreshold.setHours(9, 0); // 9:00 AM

        if (timeInMorningDate.getTime() === morningOnTimeThreshold.getTime()) {
          onTimeMorningCount++;
        } else if (timeInMorningDate < morningOnTimeThreshold) {
          earlyMorningCount++;
        } else if (timeInMorningDate > morningOnTimeThreshold) {
          lateMorningCount++;
        }
      }

      // Afternoon calculations
      const timeInAfternoon = item.time_in_afternoon; // Assuming this is in "HH:mm" format
      if (timeInAfternoon) {
        const [hours, minutes] = timeInAfternoon.split(':').map(Number);
        const timeInAfternoonDate = new Date();
        timeInAfternoonDate.setHours(hours, minutes);

        const afternoonOnTimeThreshold = new Date();
        afternoonOnTimeThreshold.setHours(13, 0); // 1:00 PM

        if (timeInAfternoonDate.getTime() === afternoonOnTimeThreshold.getTime()) {
          onTimeAfternoonCount++;
        } else if (timeInAfternoonDate < afternoonOnTimeThreshold) {
          earlyAfternoonCount++;
        } else if (timeInAfternoonDate > afternoonOnTimeThreshold) {
          lateAfternoonCount++;
        }
      }
    });

    return {
      onTimeMorningCount,
      earlyMorningCount,
      lateMorningCount,
      onTimeAfternoonCount,
      earlyAfternoonCount,
      lateAfternoonCount,
    };
  };

  // Filter attendance data based on search query
  const filteredAttendanceData = attendanceData.filter(item => {
    const itemDate = new Date(item.attendance_date).toISOString().split('T')[0];
    return (
        (!dateFrom || itemDate >= dateFrom) && // Check if itemDate is greater than or equal to dateFrom
        (!dateTo || itemDate <= dateTo) &&     // Check if itemDate is less than or equal to dateTo
        (
            item.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.employee_id.toString().includes(searchQuery)
        )
    );
});

const sortedAttendanceData = filteredAttendanceData.sort((a, b) => {
  return new Date(b.attendance_date) - new Date(a.attendance_date);
});
  // const { onTimeCount, earlyCount, lateCount } = calculateAttendanceSummary();

  const {
    onTimeMorningCount,
    earlyMorningCount,
    lateMorningCount,
    onTimeAfternoonCount,
    earlyAfternoonCount,
    lateAfternoonCount,
  } = calculateAttendanceSummary();

    
  const breadcrumbItems = [
    // { label: 'Home', path: '/' },
    { label: 'Attendance Dashboard', path: '/attendancedashboard' },
    { label: 'Attendance Logs' },
  ];

  return (
    <div className="w-full space-y-5 h-fit">
    <>
      <div className="att_container">

        <EmployeeCount/>


        {modalVisible && (
          <AttendanceModal
            data={modalData}
            onClose={closeModal}
          />
        )}
      </div>
      
      <div className="flex flex-col items-center justify-center w-full py-2">
        <input
          type="text text-black"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-[80vw] p-2 my-1 text-center border rounded-[5px] mx-3"
        />

          {user?.role === "ADMIN" && (
            <>
            <div className="flex flex-row w-[80vw] justify-evenly">
            <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full mx-1 text-center border rounded-[5px]"
                placeholder="Date From"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full mx-1 text-center border rounded-[5px]"
                placeholder="Date To"
              />
            </div>
            <button 
                    onClick={showToday} 
                    className="px-4 py-2 my-3  bg-blue-600 text-white rounded-[15px] hover:bg-blue-700 transition w-[60vw]"
                >
                    Show  Date Today 
            </button>
            </>
          )}

      </div>

      {/* table information */}
      {loading ? (
  <p className="text-gray-600">Loading attendance...</p>
) : filteredAttendanceData.length > 0 ? (
  <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {sortedAttendanceData.map((item) => (
      <div key={item.attendance_id} className="p-4 transition-all duration-300 bg-white rounded-lg shadow-md hover:shadow-lg">
        
        <div className="mb-2">
          <h3 className="text-lg font-semibold">{item.employee_name}</h3>
          <p className="text-sm text-gray-500">Emp. ID: {item.employee_id}</p>
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <p><strong>Date:</strong> {new Date(item.attendance_date).toLocaleDateString()}</p>
          <p>
            <strong>Morning:</strong>{" "}
            {isMidnight(formatTime(item.time_in_morning)) ? "N/A" : formatTime(item.time_in_morning)} 
            {" to "} 
            {isMidnight(formatTime(item.time_out_morning)) ? "N/A" : formatTime(item.time_out_morning)}
          </p>
          <p>
            <strong>Afternoon:</strong>{" "}
            {isMidnight(formatTime(item.time_in_afternoon)) ? "N/A" : formatTime(item.time_in_afternoon)} 
            {" to "} 
            {isMidnight(formatTime(item.time_out_afternoon)) ? "N/A" : formatTime(item.time_out_afternoon)}
          </p>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          <p><strong>Credited:</strong> {item.days_credited}</p>
          <p><strong>Overtime:</strong> {item.overtime_hours} hrs</p>
        </div>
      </div>
    ))}
  </div>
) : (
  <p className="text-gray-500">No attendance records found.</p>
)}

      
    </>
    </div>
  );
};

export default AttendanceMAdmin;