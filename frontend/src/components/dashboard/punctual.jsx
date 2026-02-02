import React, { useEffect, useState } from "react";
import BASE_URL from "../../../backend/server/config";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import AttendanceListCard from "../attendance/AttendanceLogsAdminM/Components_AttendanceLogs/AttenLogs_ListCard";

const Punctual = () => {
  const todayFullDate = new Date().toISOString().split("T")[0];

  const [attendanceData, setAttendanceData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [punctualCounts, setPunctualCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayFullDate);
  const [isAscending, setIsAscending] = useState(true);

  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const suffix = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes} ${suffix}`;
  };

  const isMidnight = (time) => {
    return time === "12:00 AM" || time === "00:00:00";
  };

  const handleDelete = () => {};

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      const allData = data.data || [];

      setAttendanceData(allData);

      const dateRecords = allData.filter((record) => {
        const recordDate = new Date(record.attendance_date)
          .toISOString()
          .split("T")[0];
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
    data.forEach((record) => {
      const timeIn = record.time_in_morning;
      const recordDate = new Date(record.attendance_date)
        .toISOString()
        .split("T")[0];
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
      timeLabel: count === 1 ? "time" : "times",
    }))
    .sort((a, b) => (isAscending ? a.count - b.count : b.count - a.count));

  useEffect(() => {
    fetchAttendance();
  }, []);

  useEffect(() => {
    const filtered = attendanceData.filter((record) => {
      const recordDate = new Date(record.attendance_date)
        .toISOString()
        .split("T")[0];
      return recordDate === selectedDate;
    });
    setFilteredData(filtered);
    calculatePunctuality(filtered, selectedDate);
  }, [selectedDate]);

  return (
    // MAIN CONTAINER:
    // - h-auto min-h-[600px] on mobile (allows scrolling content naturally)
    // - md:h-full (fits perfectly into dashboard grid slots on tablets/desktop)
    <div className="flex flex-col w-full h-auto min-h-[600px] md:h-full p-4 sm:p-5 bg-white shadow-sm border border-slate-200 rounded-xl">
      {/* --- Header Section --- */}
      {/* Stacks vertically on mobile, Row on Tablet+ */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            Daily Attendance
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5 uppercase tracking-wide">
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Date Picker: Full width on mobile for easy tapping */}
        <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 p-1.5 rounded-lg border border-slate-200 md:bg-transparent md:border-0 md:p-0">
          <label className="text-xs font-semibold text-slate-600 whitespace-nowrap pl-2 md:pl-0">
            Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={handleDateChange}
            className="flex-1 md:flex-none w-full md:w-auto px-3 py-1.5 text-xs font-medium text-slate-700 bg-white md:bg-slate-50 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
            max={todayFullDate}
          />
        </div>
      </div>

      {/* --- Attendance Cards Grid --- */}
      {/* flex-1 allows this section to grow/shrink based on available space */}
      <div className="flex-1 overflow-y-auto pr-1 mb-4 min-h-[200px]">
        {/* Grid adjusts columns based on screen width */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-10 opacity-70">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs text-slate-500 font-medium">
                Loading records...
              </p>
            </div>
          ) : filteredData.length > 0 ? (
            filteredData.map((item) => (
              <div
                key={item.attendance_id}
                className="transition-transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <AttendanceListCard
                  item={item}
                  onDelete={handleDelete}
                  formatTime={formatTime}
                  isMidnight={isMidnight}
                />
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p className="text-sm font-medium text-slate-400">
                No attendance records for this date.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* --- Divider --- */}
      <div className="h-px bg-slate-200 w-full mb-3"></div>

      {/* --- Punctuality Section Header --- */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Punctuality Leaderboard
        </h3>
        <button
          onClick={toggleSortOrder}
          className="text-[10px] sm:text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors active:bg-blue-200"
        >
          Sort: {isAscending ? "Lowest First" : "Highest First"}
        </button>
      </div>

      {/* --- Punctuality Table --- */}
      {/* Fixed height ensures the widget doesn't grow indefinitely on desktop */}
      <div className="flex-none h-[180px] sm:h-[25vh] md:h-[18vh] overflow-hidden border border-slate-200 rounded-lg bg-white relative">
        <div className="absolute inset-0 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ backgroundColor: "transparent" }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell
                    sx={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      paddingY: "8px",
                    }}
                  >
                    Employee
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      paddingY: "8px",
                    }}
                  >
                    On-Time Count
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} align="center" className="py-6">
                      <p className="text-xs text-slate-400 italic">
                        No punctuality data available.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.name}
                      hover
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell
                        sx={{
                          fontSize: "0.8rem",
                          color: "#334155",
                          fontWeight: 500,
                          paddingY: "8px",
                        }}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell align="right" sx={{ paddingY: "8px" }}>
                        <div className="inline-flex items-center justify-end px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-100">
                          <span className="text-sm font-bold text-emerald-600 mr-1.5">
                            {row.count}
                          </span>
                          <span className="text-[10px] text-emerald-500 font-medium lowercase tracking-wide">
                            {row.timeLabel}
                          </span>
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
    </div>
  );
};

export default Punctual;
