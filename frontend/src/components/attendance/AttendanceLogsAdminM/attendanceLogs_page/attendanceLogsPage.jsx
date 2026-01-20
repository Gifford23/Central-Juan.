import React, { useState } from 'react';
import useAttendanceData from '../attenddanceLogs_hooks/useAttendanceData';
import { deleteAttendanceRecord } from '../atttendanceLogs_APIs/attendanceAPI';
import EmployeeCount from '../../EmployeeCount';
import SearchAndDateFilter from '../Components_AttendanceLogs/AttenLogs_searchAndFilter';
import AttendanceListCard from '../Components_AttendanceLogs/AttenLogs_ListCard';
import Swal from 'sweetalert2';

// ✅ Local utility functions (kept inline)
export const formatTime = (time) => {
  if (!time) return 'N/A';
  const [hours, minutes] = time.split(':');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes} ${suffix}`;
};

export const isMidnight = (time) => {
  return time === '12:00 AM' || time === '00:00:00';
};

// ✅ Convert to Philippine Time (Asia/Manila)
export const formatToPhilippineTime = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const AttendanceLogsAdminMobile = () => {
  const { attendanceData, loading, fetchAttendance } = useAttendanceData();
  const todayDate = new Date().toISOString().split('T')[0];
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(todayDate); // ✅ default today
  const [dateTo, setDateTo] = useState(todayDate);     // ✅ default today


  const openModal = (data = null) => {
    setModalData(data);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setModalData(null);
    fetchAttendance();
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      const data = await deleteAttendanceRecord(id);
      if (data.success) {
        Swal.fire('Deleted!', 'Record deleted successfully.', 'success');
        fetchAttendance();
      } else {
        Swal.fire('Oops!', data.message || 'Failed to delete record.', 'error');
      }
    }
  };

  const showToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFrom(today);
    setDateTo(today);
  };

  const filteredAttendanceData = attendanceData.filter(item => {
    const itemDate = new Date(item.attendance_date).toISOString().split('T')[0];
    return (
      (!dateFrom || itemDate >= dateFrom) &&
      (!dateTo || itemDate <= dateTo) &&
      (
        item.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee_id.toString().includes(searchQuery)
      )
    );
  });

  const sortedAttendanceData = filteredAttendanceData.sort((a, b) => {
    return new Date(b.attendance_date) - new Date(a.attendance_date);
  });

  return (
    <div className="w-full space-y-5 h-fit">
      <div className="att_container">
        <EmployeeCount />
        {modalVisible && (
          <AttendanceModal
            data={modalData}
            onClose={closeModal}
          />
        )}
      </div>

      <SearchAndDateFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        onTodayClick={showToday}
      />

      {loading ? (
        <p className="text-gray-600">Loading attendance...</p>
      ) : sortedAttendanceData.length > 0 ? (
        <div className="grid w-full h-full grid-cols-1 gap-4 overflow-scroll sm:grid-cols-2 lg:grid-cols-3">
          {sortedAttendanceData.map(item => (
            <AttendanceListCard
              key={item.attendance_id}
              item={{
                ...item,
                attendance_date: formatToPhilippineTime(item.attendance_date), // ✅ force PHT
              }}
              onDelete={handleDelete}
              formatTime={formatTime}
              isMidnight={isMidnight}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No attendance records found.</p>
      )}
    </div>
  );
};

export default AttendanceLogsAdminMobile;
