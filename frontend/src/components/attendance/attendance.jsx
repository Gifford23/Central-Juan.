import { useEffect, useState } from "react";
import { useSession } from "../../context/SessionContext";
import AttendanceModal from "./AttendanceModal";
import "../../../Styles/components/attendance/attendance.css";
import { Maximize } from "lucide-react";
import Swal from "sweetalert2";
import { Tooltip } from "react-tooltip";
import BASE_URL from '../../../backend/server/config'; 
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import { ChevronDown, ChevronUp } from "lucide-react"; // install lucide-react if not
import usePermissions from "../../users/hooks/usePermissions";
const Attendance = () => {
  const { user } = useSession(); // Get user from context
    const { permissions, loading: permLoading } = usePermissions(user?.username); 
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState(""); // New state for search query
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // State for selected date
  const [dateFrom, setDateFrom] = useState(""); // State for "Date From"
  const [dateTo, setDateTo] = useState(""); // State for "Date To"
  const isAttendanceSummary = location.pathname.includes === '/attendance';
  const [showPresentSummary, setShowPresentSummary] = useState(true);
  const [showAwaySummary, setShowAwaySummary] = useState(false);


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

// Automatically expand on larger screens
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth >= 768) {
      setShowPresentSummary(true);
      setShowAwaySummary(true);
    } else {
      setShowPresentSummary(false);
      setShowAwaySummary(false);
    }
  };
  handleResize();
  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}, []);


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
  !permLoading && permissions?.attendance_dtr && { label: 'Horizon Time & Attendance', path: '/attendanceRecord' },
  !permLoading && permissions?.attendance_log && { label: 'Attendance Logs', path: '/attendance' },
  !permLoading && permissions?.leave_access && { label: 'Manage Leave', path: '/ApproveLeavePage' },
  !permLoading && permissions?.schedule_management && { label: 'Schedule Management', path: '/ShiftSchedulePage' },
].filter(Boolean); // remove any falsy (unauthorized) entries


const SummaryItem = ({ label, value }) => (
  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-lg font-semibold text-gray-800">{value}</p>
  </div>
);


  return (
    <div className="w-full space-y-5 h-fit">
    {!isAttendanceSummary && (
      <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className='text-2xl font-semibold'>Attendance Logs</span>
          <div className="hidden md:block">
            <Breadcrumbs items={breadcrumbItems} />
          </div>      
        </div>
      )}
    <>
      <div className="att_container">

<div className="flex flex-col flex-wrap gap-4 px-2 py-3 lg:flex-row">
  {/* PRESENT SUMMARY CARD */}
  <article className="flex-1 min-w-[300px] bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-200 p-4">
    {/* Header */}
    <button
      onClick={() => setShowPresentSummary(!showPresentSummary)}
      className="flex items-center justify-between w-full pb-2 mb-3 border-b focus:outline-none"
    >
      <div className="flex items-center gap-3">
        <span className="p-2 text-blue-600 bg-blue-100 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </span>
        <h3 className="text-lg font-semibold text-gray-800">Present Summary</h3>
      </div>
      <span className="block text-gray-600 md:hidden">
        {showPresentSummary ? <ChevronUp /> : <ChevronDown />}
      </span>
    </button>

    {/* Content */}
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 transition-all duration-300 overflow-hidden ${
        showPresentSummary ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div>
        <p className="mb-2 font-medium text-gray-700">Morning Summary</p>
        <div className="space-y-2">
          <SummaryItem label="On time" value={onTimeMorningCount} />
          <SummaryItem label="Early time-in" value={earlyMorningCount} />
          <SummaryItem label="Late time-in" value={lateMorningCount} />
        </div>
      </div>
      <div>
        <p className="mb-2 font-medium text-gray-700">Afternoon Summary</p>
        <div className="space-y-2">
          <SummaryItem label="On time" value={onTimeAfternoonCount} />
          <SummaryItem label="Early time-in" value={earlyAfternoonCount} />
          <SummaryItem label="Late time-in" value={lateAfternoonCount} />
        </div>
      </div>
    </div>
  </article>

  {/* AWAY SUMMARY CARD */}
  <article className="flex-1 min-w-[300px] bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-200 p-4">
    <button
      onClick={() => setShowAwaySummary(!showAwaySummary)}
      className="flex items-center justify-between w-full pb-2 mb-3 border-b focus:outline-none"
    >
      <div className="flex items-center gap-3">
        <span className="p-2 text-red-600 bg-red-100 rounded-full">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </span>
        <h3 className="text-lg font-semibold text-gray-800">Away Summary</h3>
      </div>
      <span className="block text-gray-600 md:hidden">
        {showAwaySummary ? <ChevronUp /> : <ChevronDown />}
      </span>
    </button>

    <div
      className={`grid grid-cols-2 gap-4 transition-all duration-300 overflow-hidden ${
        showAwaySummary ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <SummaryItem label="Day off" value={22} />
      <SummaryItem label="Time off" value={2} />
    </div>
  </article>
</div>

        {modalVisible && (
          <AttendanceModal
            data={modalData}
            onClose={closeModal}
          />
        )}
      </div>
      
{/* FILTER INPUTS + BUTTONS */}
<div className="flex flex-col w-full gap-4 px-4 py-3 bg-white border border-gray-200 shadow-sm rounded-2xl sm:flex-row sm:items-center sm:justify-between">
  
  {/* Search Input */}
  <div className="w-full sm:w-1/3">
    <input
      type="text"
      placeholder="Search employee..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className="w-full px-4 py-2 text-sm transition border border-gray-300 rounded-full outline-none focus:ring-2 focus:ring-blue-400"
    />
  </div>

  {/* Date Range Inputs */}
  {user?.role === "ADMIN" && (
    <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:flex sm:items-center">
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <label className="text-xs font-medium text-gray-500 sm:hidden">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full px-4 py-2 text-sm border border-gray-300 rounded-full outline-none sm:w-40 focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <label className="text-xs font-medium text-gray-500 sm:hidden">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full px-4 py-2 text-sm border border-gray-300 rounded-full outline-none sm:w-40 focus:ring-2 focus:ring-blue-400"
        />
      </div>
    </div>
  )}

  {/* Show Today Button */}
  <div className="w-full sm:w-auto">
    <button
      onClick={showToday}
      className="w-full px-5 py-2 text-sm font-medium text-white transition bg-blue-600 rounded-full shadow-sm hover:bg-blue-700 sm:w-auto"
    >
      Show Today
    </button>
  </div>
</div>


{/* Responsive Attendance List */}
{loading ? (
  <p className="text-gray-500">Loading...</p>
) : filteredAttendanceData.length > 0 ? (
  <div className="flex flex-col w-full gap-4 mt-4 attendance-list">
    {sortedAttendanceData.map((item) => (
      <div
        key={item.attendance_id}
        className="flex flex-col w-full p-4 transition-all duration-200 bg-white border border-gray-200 shadow-sm rounded-xl hover:shadow-md"
      >
        {/* Top Section */}
        <div className="flex flex-col pb-3 mb-3 border-b sm:flex-row sm:justify-between sm:items-center">
          <div className="flex flex-col">
            <h3 className="text-base font-semibold text-gray-800 sm:text-lg">{item.employee_name}</h3>
            <div className="text-sm text-gray-500">
              Emp. ID: <strong>{item.employee_id}</strong> • Atten. ID:{" "}
              <strong>{item.attendance_id}</strong>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600 sm:mt-0">
            {new Date(item.attendance_date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Attendance Times */}
        <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="mb-1 font-semibold text-gray-800">Morning</p>
            <p>
              {isMidnight(formatTime(item.time_in_morning))
                ? "N/A"
                : formatTime(item.time_in_morning)}{" "}
              →{" "}
              {isMidnight(formatTime(item.time_out_morning))
                ? "N/A"
                : formatTime(item.time_out_morning)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50">
            <p className="mb-1 font-semibold text-gray-800">Afternoon</p>
            <p>
              {isMidnight(formatTime(item.time_in_afternoon))
                ? "N/A"
                : formatTime(item.time_in_afternoon)}{" "}
              →{" "}
              {isMidnight(formatTime(item.time_out_afternoon))
                ? "N/A"
                : formatTime(item.time_out_afternoon)}
            </p>
          </div>
        </div>

        {/* Summary Info */}
        <div className="grid grid-cols-3 gap-3 mt-3 text-sm text-gray-700 sm:grid-cols-4">
          <div className="p-2 text-center rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase">Credited</p>
            <p className="font-semibold">{item.days_credited}</p>
          </div>
          <div className="p-2 text-center rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase">Deducted</p>
            <p className="font-semibold">{item.deducted_days}</p>
          </div>
          <div className="p-2 text-center rounded-lg bg-gray-50">
            <p className="text-xs text-gray-500 uppercase">Overtime</p>
            <p className="font-semibold">{item.overtime_hours}</p>
          </div>
          <div className="hidden p-2 text-center rounded-lg sm:block bg-gray-50">
            <p className="text-xs text-gray-500 uppercase">Created At</p>
            <p className="font-semibold">{formatDateTime(item.create_at)}</p>
          </div>
        </div>

        {/* For Mobile Created At */}
        <div className="block mt-2 text-xs text-gray-500 sm:hidden">
          Created: {formatDateTime(item.create_at)}
        </div>
      </div>
    ))}
  </div>
) : (
  <p className="mt-4 text-center text-gray-500">No attendance records.</p>
)}

      
    </>
    </div>
  );
};

export default Attendance;