import React, { useEffect, useState } from 'react';
import BASE_URL from '../../../backend/server/config';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button
} from '@mui/material';
import AttendanceListCard from '../attendance/AttendanceLogsAdminM/Components_AttendanceLogs/AttenLogs_ListCard';

const Punctual = () => {
  const todayFullDate = new Date().toISOString().split('T')[0];

  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [punctualCounts, setPunctualCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayFullDate);
  const [isAscending, setIsAscending] = useState(true);

  const formatTime = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${suffix}`;
  };

  const isMidnight = (time) => {
    return time === '12:00 AM' || time === '00:00:00';
  };

  const handleDelete = () => {};

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      const allData = data.data || [];

      setAttendanceData(allData);

      const dateRecords = allData.filter(record => {
        const recordDate = new Date(record.attendance_date).toISOString().split('T')[0];
        return recordDate === selectedDate;
      });

      setFilteredData(dateRecords);
      calculatePunctuality(dateRecords, selectedDate);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePunctuality = (data, date) => {
    const counts = {};
    data.forEach(record => {
      const timeIn = record.time_in_morning;
      const recordDate = new Date(record.attendance_date).toISOString().split('T')[0];
      if (recordDate === date && timeIn >= "08:00:00" && timeIn <= "09:05:00") {
        counts[record.employee_name] = (counts[record.employee_name] || 0) + 1;
      }
    });
    setPunctualCounts(counts);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const toggleSortOrder = () => {
    setIsAscending(!isAscending);
  };

  const rows = Object.entries(punctualCounts)
    .map(([employee, count]) => ({
      name: employee,
      count,
      timeLabel: count === 1 ? 'time' : 'times',
    }))
    .sort((a, b) => (isAscending ? a.count - b.count : b.count - a.count));

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    const filtered = attendanceData.filter(record => {
      const recordDate = new Date(record.attendance_date).toISOString().split('T')[0];
      return recordDate === selectedDate;
    });
    setFilteredData(filtered);
    calculatePunctuality(filtered, selectedDate);
  }, [selectedDate]);

  return (
<div className="flex flex-col w-full p-4 bg-white shadow-lg rounded-2xl h-[55vh]">
  {/* Header */}
  <div className="flex flex-col mb-2 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-base font-semibold text-gray-800 md:text-lg">Employees on Duty</h2>
      <p className="text-xs text-gray-500">
        {new Date(selectedDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>
    </div>
    <div className="flex items-center gap-2 mt-1 md:mt-0">
      <label className="text-xs text-gray-700">Select Date:</label>
      <input
        type="date"
        value={selectedDate}
        onChange={handleDateChange}
        className="p-1 text-xs text-gray-800 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        max={todayFullDate}
      />
    </div>
  </div>

  {/* Attendance Cards */}
  <div className="grid grid-cols-1 gap-2 p-1 overflow-y-auto border border-gray-200 rounded-lg sm:grid-cols-2 lg:grid-cols-3"
       style={{ height: '24vh' }}>
    {loading ? (
      <div className="flex items-center justify-center w-full h-full col-span-full">
        <p className="text-sm text-gray-400">Loading attendance...</p>
      </div>
    ) : filteredData.length > 0 ? (
      filteredData.map(item => (
        <AttendanceListCard
          key={item.attendance_id}
          item={item}
          onDelete={handleDelete}
          formatTime={formatTime}
          isMidnight={isMidnight}
        />
      ))
    ) : (
      <div className="flex items-center justify-center w-full h-full col-span-full">
        <p className="text-sm text-gray-500">No attendance records found.</p>
      </div>
    )}
  </div>

  {/* Sort button */}
  <div className="flex justify-center my-1 md:justify-end">
    <button
      onClick={toggleSortOrder}
      className="px-3 py-1 text-xs text-white transition bg-blue-600 rounded-md hover:bg-blue-700"
    >
      Sort {isAscending ? 'Descending' : 'Ascending'}
    </button>
  </div>

  {/* Punctuality Table */}
  <div className="overflow-auto border border-gray-200 rounded-lg bg-gray-50"
       style={{ height: '18vh' }}>
    <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell className="sticky top-0 text-xs text-gray-700 bg-gray-100">Employee</TableCell>
            <TableCell align="right" className="sticky top-0 text-xs text-gray-700 bg-gray-100">Punctuality Count</TableCell>
          </TableRow>
        </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={2}
              align="center"
              className="text-xs text-gray-500"
            >
              No punctuality records available.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row) => (
            <TableRow key={row.name}>
              <TableCell className="text-xs text-gray-700">{row.name}</TableCell>
              <TableCell
                align="right"
                className="text-xs text-gray-700 whitespace-nowrap w-auto px-3"
              >
                <div className="flex items-center justify-end gap-1">
                  <strong>{row.count}</strong>
                  <span>{row.timeLabel}</span>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
      </Table>
    </TableContainer>
  </div>
</div>


  );
};

export default Punctual;
