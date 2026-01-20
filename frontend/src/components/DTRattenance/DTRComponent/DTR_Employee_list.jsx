import React, { useEffect, useState } from "react";
import { useSession } from "../../../context/SessionContext"; // Import the useSession hook
import DTR_record from "./DTR_record";
import "../../../../Styles/components/attendance/attendance.css";
import Swal from "sweetalert2";
import BASE_URL from "../../../../backend/server/config";
import PresentSummary from "../../attendance/attendanceSummary";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
import { fetchEmployeesAPI } from "../DTR_atte_APIs/employeesAPI";
import { UserRoundX } from "lucide-react"; // fallback icon when no employees
import usePermissions from "../../../users/hooks/usePermissions";
// MUI components (used for inputs, buttons and cards)
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

/*
  DTREmployeeLIst (refactor)
  - Converted the previous table-based layout into a responsive card / list layout (no <table> used).
  - Preserved all business logic unchanged: fetching attendance, deduping, summary calculations, bulk update flow, filters, and DTR_record integration.
  - UI uses a combination of Tailwind utilities and MUI components for a modern look consistent with the DTR_record change.
  - Added developer comments throughout; did not remove or alter unrelated logic.
  - Added color-coded badges for employee_type (warm/bright palette) and status (cool/notification palette).
*/

const DTREmployeeLIst = () => {
  const { user } = useSession(); // Get user from context
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null); // State to track the expanded row
  const [searchQuery, setSearchQuery] = useState(""); // New state for search query
  const [statusFilter, setStatusFilter] = useState("active"); // default active
  const [typeFilter, setTypeFilter] = useState("all"); // default all
  const [employees, setEmployees] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  // Derived lists
  const departments = [
    ...new Set(employees.map((e) => e.department_name).filter(Boolean)),
  ];
  const branches = [
    ...new Set(employees.map((e) => e.branch_name).filter(Boolean)),
  ];
  const positionsForSelectedDept =
    departmentFilter === "all"
      ? [...new Set(employees.map((e) => e.position_name).filter(Boolean))]
      : [
          ...new Set(
            employees
              .filter((e) => e.department_name === departmentFilter)
              .map((e) => e.position_name)
              .filter(Boolean),
          ),
        ];

  const [summaryCounts, setSummaryCounts] = useState({
    onTimeMorningCount: 0,
    earlyMorningCount: 0,
    lateMorningCount: 0,
    onTimeAfternoonCount: 0,
    earlyAfternoonCount: 0,
    lateAfternoonCount: 0,
  });

  // loading state for bulk update
  const [updateAllLoading, setUpdateAllLoading] = useState(false);

  useEffect(() => {
    // load employees for extra metadata (status, type)
    const loadEmployees = async () => {
      setLoading(true);
      const data = await fetchEmployeesAPI();
      setEmployees(data);
      setLoading(false);
    };
    loadEmployees();
  }, []);

  // State to hold credited days for each employee
  const [creditedDays, setCreditedDays] = useState({});

  // Fetch attendance list (deduped by employee_id)
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
      const data = await response.json();

      if (data.success) {
        // Filter out duplicates based on employee_id
        const uniqueAttendance = [];
        const seenIds = new Set();

        data.data.forEach((item) => {
          if (!seenIds.has(item.employee_id)) {
            seenIds.add(item.employee_id);
            uniqueAttendance.push(item);
          }
        });

        setAttendanceData(uniqueAttendance);
        calculateAttendanceSummary(uniqueAttendance); // Calculate summary after fetching data
      } else {
        Swal.fire({
          icon: "error",
          title: "Oops!",
          text: data.message || "Failed to fetch attendance data.",
        });
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
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
    const loadEmployees = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE_URL}/employeesSide/employees.php`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setEmployees(data);
        } else {
          console.error("Invalid employees response", data);
        }
      } catch (err) {
        console.error("Error fetching employees:", err);
      } finally {
        setLoading(false);
      }
    };
    loadEmployees();
  }, []);

  // Build simple attendance summary counts used for the header card
  const calculateAttendanceSummary = (data) => {
    let onTimeMorningCount = 0;
    let earlyMorningCount = 0;
    let lateMorningCount = 0;
    let onTimeAfternoonCount = 0;
    let earlyAfternoonCount = 0;
    let lateAfternoonCount = 0;

    data.forEach((item) => {
      // Morning calculations
      const timeInMorning = item.time_in_morning; // Assuming this is in "HH:mm" format
      if (timeInMorning) {
        const [hours, minutes] = timeInMorning.split(":").map(Number);
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
        const [hours, minutes] = timeInAfternoon.split(":").map(Number);
        const timeInAfternoonDate = new Date();
        timeInAfternoonDate.setHours(hours, minutes);

        const afternoonOnTimeThreshold = new Date();
        afternoonOnTimeThreshold.setHours(13, 0); // 1:00 PM

        if (
          timeInAfternoonDate.getTime() === afternoonOnTimeThreshold.getTime()
        ) {
          onTimeAfternoonCount++;
        } else if (timeInAfternoonDate < afternoonOnTimeThreshold) {
          earlyAfternoonCount++;
        } else if (timeInAfternoonDate > afternoonOnTimeThreshold) {
          lateAfternoonCount++;
        }
      }
    });

    // Update the summary counts state
    setSummaryCounts({
      onTimeMorningCount,
      earlyMorningCount,
      lateMorningCount,
      onTimeAfternoonCount,
      earlyAfternoonCount,
      lateAfternoonCount,
    });
  };

  useEffect(() => {
    fetchAttendance(); // Fetch attendance data when the component mounts
  }, []);

  const toggleRow = (employeeId) => {
    // Toggle the expanded row
    setExpandedRow((prev) => (prev === employeeId ? null : employeeId));
  };

  // ------------------- NEW: Bulk update handler for this page -------------------
  const handleUpdateAllAttendances = async () => {
    const confirmation = await Swal.fire({
      title: "Update attendance for ALL employees?",
      text: `This will recalculate and update attendance for all employees for the current month. This action cannot be undone. Proceed?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, update all",
      cancelButtonText: "Cancel",
    });

    if (!confirmation.isConfirmed) return;

    setUpdateAllLoading(true);
    Swal.fire({
      title: "Updating all attendance...",
      text: "Please wait — recalculating attendances for everyone.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    // Save currently expanded row so we can re-open after refresh
    const prevExpanded = expandedRow;

    try {
      const now = new Date();
      const payload = {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        user_full_name:
          (user && (user.full_name || user.fullName || user.name)) || "SYSTEM",
        user_role: (user && (user.role || user.user_role)) || "SYSTEM",
      };

      const resp = await fetch(
        `${BASE_URL}/attendance/bulk_update_attendance.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(
          `Server responded with ${resp.status}${txt ? ": " + txt : ""}`,
        );
      }

      const json = await resp
        .json()
        .catch(() => ({ success: false, message: "Invalid JSON from server" }));

      if (json && json.success) {
        // close loading modal and show success
        Swal.close();
        await Swal.fire(
          "Done",
          json.message || "All attendances updated successfully.",
          "success",
        );

        // Collapse the expanded row (if any) so the child DTR_record will remount later
        setExpandedRow(null);

        // Refresh attendance list
        try {
          await fetchAttendance();
        } catch (err) {
          console.warn("Failed to refresh attendance after bulk update", err);
        }

        // Re-open previously expanded row to force its DTR_record to remount and refetch schedules
        if (prevExpanded) {
          // small delay to ensure data settled (optional, but helps UX for heavy DB ops)
          setTimeout(() => setExpandedRow(prevExpanded), 200);
        }
      } else {
        Swal.close();
        await Swal.fire(
          "Error",
          (json && json.message) || "Failed to update all attendances.",
          "error",
        );
      }
    } catch (err) {
      console.error("Bulk update error", err);
      Swal.close();
      await Swal.fire("Error", `Bulk update failed: ${err.message}`, "error");
    } finally {
      setUpdateAllLoading(false);
      try {
        Swal.close();
      } catch (e) {}
    }
  };
  // ---------------------------------------------------------------------------

  // Merge attendance with employee metadata and apply filters
  const filteredData = attendanceData
    .map((att) => {
      const emp = employees.find((e) => e.employee_id === att.employee_id);
      return {
        ...att,
        status: emp?.status || "inactive",
        employee_type: emp?.employee_type || "N/A",
        department_name: emp?.department_name || "",
        position_name: emp?.position_name || "",
        branch_name: emp?.branch_name || "",
      };
    })
    .filter((item) => {
      const matchesSearch = item.employee_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        item.status?.toLowerCase() === statusFilter.toLowerCase();
      const matchesType =
        typeFilter === "all" ||
        item.employee_type?.toLowerCase() === typeFilter.toLowerCase();
      const matchesDept =
        departmentFilter === "all" || item.department_name === departmentFilter;
      const matchesPos =
        positionFilter === "all" || item.position_name === positionFilter;
      const matchesBranch =
        branchFilter === "all" || item.branch_name === branchFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesType &&
        matchesDept &&
        matchesPos &&
        matchesBranch
      );
    });

  const breadcrumbItems = [
    !permLoading &&
      permissions?.attendance_dtr && {
        label: "Horizon Time & Attendance",
        path: "/attendanceRecord",
      },
    !permLoading &&
      permissions?.attendance_log && {
        label: "Attendance Logs",
        path: "/attendance",
      },
    !permLoading &&
      permissions?.leave_access && {
        label: "Manage Leave",
        path: "/ApproveLeavePage",
      },
    !permLoading &&
      permissions?.schedule_management && {
        label: "Schedule Management",
        path: "/ShiftSchedulePage",
      },
  ].filter(Boolean); // remove any falsy (unauthorized) entries

  // ------------------ Badge renderers (only UI change) ------------------
  // Keep these functions small and isolated so no business logic is modified.
  const renderStatusBadge = (status) => {
    const s = (status || "").toString().toLowerCase();
    // Statuses use cool/notification palette (distinct from type colors)
    switch (s) {
      case "active":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
            Active
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 ring-1 ring-slate-200">
            Inactive
          </span>
        );
      case "on leave":
      case "on_leave":
      case "leave":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 ring-1 ring-amber-200">
            On Leave
          </span>
        );
      case "suspended":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 ring-1 ring-red-200">
            Suspended
          </span>
        );
      default:
        // fallback: a distinct cool blue
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 ring-1 ring-sky-200">
            {status || "Unknown"}
          </span>
        );
    }
  };

  const renderTypeBadge = (type) => {
    const t = (type || "").trim().toLowerCase();

    const baseClass =
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ring-1";

    switch (t) {
      case "regular":
        return (
          <span
            className={`${baseClass} bg-orange-50 text-orange-900 ring-orange-200`}
          >
            Regular
          </span>
        );

      case "part-time":
      case "part time":
      case "parttime":
        return (
          <span
            className={`${baseClass} bg-purple-50 text-purple-900 ring-purple-200`}
          >
            Part-time
          </span>
        );

      case "ojt":
        return (
          <span
            className={`${baseClass} bg-teal-50 text-teal-900 ring-teal-200`}
          >
            OJT
          </span>
        );

      case "contractual":
        return (
          <span
            className={`${baseClass} bg-rose-50 text-rose-900 ring-rose-200`}
          >
            Contractual
          </span>
        );

      case "project-based":
      case "project based":
        return (
          <span
            className={`${baseClass} bg-indigo-50 text-indigo-900 ring-indigo-200`}
          >
            Project-Based
          </span>
        );

      case "n/a":
      case "n\\a":
      case "na":
      case "":
        return (
          <span
            className={`${baseClass} bg-stone-50 text-stone-800 ring-stone-200`}
          >
            N/A
          </span>
        );

      default:
        return (
          <span
            className={`${baseClass} bg-amber-50 text-amber-900 ring-amber-200`}
          >
            {type || "Unknown"}
          </span>
        );
    }
  };

  // -----------------------------------------------------------------------

  return (
    <div className="w-full space-y-4 h-fit">
      {/* Mobile Tip Banner */}
      <div className="block md:hidden w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 px-4 py-2 text-sm shadow-sm">
        This view works better on desktop for full functionality.
      </div>

      {/* Header */}
      <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className="text-2xl font-semibold">
          Employees Daily Time Record
        </span>

        {/* Hidden on small screens, visible from md (>=768px) */}
        {/* <div className="hidden md:block"> */}
        <Breadcrumbs items={breadcrumbItems} />
        {/* </div> */}
      </div>

      <div className="space-y-3 att_container">
        {/* Search + filters bar */}
        <Box className="flex items-center justify-between gap-3">
          {/* Search field (MUI TextField with tailwind container) */}
          <TextField
            placeholder="Search employee name or id"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
            sx={{ maxWidth: 560 }}
          />

          {/* Filters and actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleUpdateAllAttendances}
              disabled={updateAllLoading}
              variant="contained"
              sx={{ textTransform: "none" }}
              startIcon={
                updateAllLoading ? <CircularProgress size={16} /> : null
              }
            >
              {updateAllLoading ? "Updating All..." : "Update All"}
            </Button>
            {/* Department Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="department-filter">Department</InputLabel>
              <Select
                labelId="department-filter"
                value={departmentFilter}
                label="Department"
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPositionFilter("all"); // reset positions when department changes
                }}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Position Filter */}
            {/* <FormControl size="small" sx={{ minWidth: 160 }}>
  <InputLabel id="position-filter">Position</InputLabel>
  <Select
    labelId="position-filter"
    value={positionFilter}
    label="Position"
    onChange={(e) => setPositionFilter(e.target.value)}
  >
    <MenuItem value="all">All Positions</MenuItem>
    {positionsForSelectedDept.map((pos) => (
      <MenuItem key={pos} value={pos}>{pos}</MenuItem>
    ))}
  </Select>
</FormControl> */}

            {/* Branch Filter */}
            {/* <FormControl size="small" sx={{ minWidth: 140 }}>
  <InputLabel id="branch-filter">Branch</InputLabel>
  <Select
    labelId="branch-filter"
    value={branchFilter}
    label="Branch"
    onChange={(e) => setBranchFilter(e.target.value)}
  >
    <MenuItem value="all">All Branches</MenuItem>
    {branches.map((br) => (
      <MenuItem key={br} value={br}>{br}</MenuItem>
    ))}
  </Select>
</FormControl> */}

            {/* Branch Filter */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="branch-filter">Branch</InputLabel>
              <Select
                labelId="branch-filter"
                value={branchFilter}
                label="Branch"
                onChange={(e) => setBranchFilter(e.target.value)}
              >
                <MenuItem value="all">All Branches</MenuItem>
                {branches.map((br) => (
                  <MenuItem key={br} value={br}>
                    {br}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Position Filter */}
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="position-filter">Position</InputLabel>
              <Select
                labelId="position-filter"
                value={positionFilter}
                label="Position"
                onChange={(e) => setPositionFilter(e.target.value)}
              >
                <MenuItem value="all">All Positions</MenuItem>
                {positionsForSelectedDept.map((pos) => (
                  <MenuItem key={pos} value={pos}>
                    {pos}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="status-filter">Status</InputLabel>
              <Select
                labelId="status-filter"
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel id="type-filter">Type</InputLabel>
              <Select
                labelId="type-filter"
                value={typeFilter}
                label="Type"
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="Regular">Regular</MenuItem>
                <MenuItem value="Part-time">Part-time</MenuItem>
                <MenuItem value="OJT">OJT</MenuItem>
                <MenuItem value="Contractual">Contractual</MenuItem>
                <MenuItem value="Project-Based">Project-Based</MenuItem>
              </Select>
            </FormControl>
          </div>
        </Box>

        {/* Info / summary bar (keeps existing PresentSummary usage if desired) */}
        {/* <div className="flex flex-wrap items-stretch gap-3">
          <Card className="flex-1 min-w-[220px]">
            <CardContent>
              <Typography variant="subtitle2" className="text-gray-500">Attendance Summary</Typography>
              <Stack direction="row" spacing={2} className="items-center mt-2">
                <div className="text-sm">AM On-time: <strong>{summaryCounts.onTimeMorningCount}</strong></div>
                <div className="text-sm">AM Early: <strong>{summaryCounts.earlyMorningCount}</strong></div>
                <div className="text-sm">AM Late: <strong>{summaryCounts.lateMorningCount}</strong></div>
                <div className="text-sm">PM On-time: <strong>{summaryCounts.onTimeAfternoonCount}</strong></div>
                <div className="text-sm">PM Early: <strong>{summaryCounts.earlyAfternoonCount}</strong></div>
                <div className="text-sm">PM Late: <strong>{summaryCounts.lateAfternoonCount}</strong></div>
              </Stack>
            </CardContent>
          </Card>

          {/* Optional: PresentSummary component preserved (if it renders per-employee summary elsewhere) */}
        {/* <div className="flex-1 min-w-[220px]">
            <PresentSummary data={attendanceData} />
          </div>
        </div> */}

        {/* Main list (no table) */}
        <div className="pt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <CircularProgress />
            </div>
          ) : filteredData.length > 0 ? (
            <div className="grid gap-4">
              {filteredData.map((item) => {
                // Get credited days for the current employee or default to 0
                const { firstHalfDays = 0, secondHalfDays = 0 } =
                  creditedDays[item.employee_id] || {};

                const isExpanded = expandedRow === item.employee_id;

                return (
                  <div key={item.attendance_id}>
                    {/* Employee card header (click toggles expansion) */}
                    <Card
                      className={`w-full transition-shadow ${isExpanded ? "shadow-2xl" : "shadow-md"} cursor-pointer`}
                      onClick={() => toggleRow(item.employee_id)}
                    >
                      <CardContent className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 p-3">
                          {/* Avatar with initials */}
                          {/* <Avatar
  src={item.image || item.avatar || ""}
  sx={{ bgcolor: '#3b82f6', width: 48, height: 48, fontSize: 18 }}
>
  {/* Fallback to initials if no image */
                          /* {(!item.image && !item.avatar) &&
    (item.employee_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'U')}
</Avatar> */}

                          {/* Employee info */}
                          <div className="flex-1 flex flex-col">
                            {/* Name */}
                            <Typography
                              variant="subtitle1"
                              className="font-semibold text-gray-800 truncate"
                            >
                              {item.employee_name}
                            </Typography>

                            {/* Meta info stacked under name */}
                            <div className="flex flex-col gap-1 mt-1 text-sm text-gray-600">
                              <span>
                                Dept: <strong>{item.department_name}</strong>
                              </span>
                              <span>
                                Pos: <strong>{item.position_name}</strong>
                              </span>
                              {item.branch_name && (
                                <span>
                                  Branch: <strong>{item.branch_name}</strong>
                                </span>
                              )}
                              <span>
                                ID: <strong>{item.employee_id}</strong>
                              </span>
                            </div>

                            {/* Badges under meta info */}
                            <div className="flex items-center gap-2 mt-2">
                              {renderTypeBadge(item.employee_type)}
                              <div className="w-px h-4 bg-slate-200" />
                              {renderStatusBadge(item.status)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-sm text-left">
                            <div>
                              1st Half:{" "}
                              <strong className="font-mono">
                                {(firstHalfDays || 0).toFixed(2)}
                              </strong>
                            </div>
                            <div>
                              2nd Half:{" "}
                              <strong className="font-mono">
                                {(secondHalfDays || 0).toFixed(2)}
                              </strong>
                            </div>
                          </div>

                          <div className="pr-2">
                            <IconButton size="small">
                              {isExpanded ? <ChevronUp /> : <ChevronDown />}
                            </IconButton>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Expanded area — keeps DTR_record exactly as before, only rendered when expanded */}
                    {isExpanded && (
                      <div className="mt-2">
                        <DTR_record
                          data={item}
                          onClose={() => setExpandedRow(null)} // Close dropdown
                          onCreditedDaysChange={(firstHalf, secondHalf) => {
                            // Update credited days for the specific employee
                            setCreditedDays((prev) => ({
                              ...prev,
                              [item.employee_id]: {
                                firstHalfDays: firstHalf,
                                secondHalfDays: secondHalf,
                              },
                            }));
                          }} // Pass the callback
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
              {/* <UserRoundX className="w-10 h-10 mb-3 text-gray-400" /> */}
              <p>
                No employees found
                {searchQuery ? ` for "${searchQuery}"` : ""}
                {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}
                {typeFilter !== "all" ? ` and type "${typeFilter}"` : ""}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DTREmployeeLIst;

// import React, { useEffect, useState } from "react";
// import { useSession } from "../../../context/SessionContext"; // Import the useSession hook
// import DTR_record from "./DTR_record";
// import "../../../../Styles/components/attendance/attendance.css";
// import Swal from "sweetalert2";
// import BASE_URL from "../../../../backend/server/config";
// import PresentSummary from '../../attendance/attendanceSummary';
// import { ChevronDown, ChevronUp, Search } from "lucide-react";
// import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
// import { fetchEmployeesAPI } from "../DTR_atte_APIs/employeesAPI";
// import { UserRoundX } from "lucide-react"; // choose an icon

// const DTREmployeeLIst = () => {
//   const { user } = useSession(); // Get user from context
//   const [attendanceData, setAttendanceData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [expandedRow, setExpandedRow] = useState(null); // State to track the expanded row
//   const [searchQuery, setSearchQuery] = useState(""); // New state for search query
//   const [statusFilter, setStatusFilter] = useState("active"); // default active
//   const [typeFilter, setTypeFilter] = useState("all"); // default all
//   const [employees, setEmployees] = useState([]);

//   const [summaryCounts, setSummaryCounts] = useState({
//     onTimeMorningCount: 0,
//     earlyMorningCount: 0,
//     lateMorningCount: 0,
//     onTimeAfternoonCount: 0,
//     earlyAfternoonCount: 0,
//     lateAfternoonCount: 0,
//   });

//   // loading state for bulk update
//   const [updateAllLoading, setUpdateAllLoading] = useState(false);

//   useEffect(() => {
//     const loadEmployees = async () => {
//       setLoading(true);
//       const data = await fetchEmployeesAPI();
//       setEmployees(data);
//       setLoading(false);
//     };
//     loadEmployees();
//   }, []);

//   // State to hold credited days for each employee
//   const [creditedDays, setCreditedDays] = useState({});

//   const fetchAttendance = async () => {
//     setLoading(true);
//     try {
//       const response = await fetch(`${BASE_URL}/attendance/attendance.php`);
//       const data = await response.json();

//       if (data.success) {
//         // Filter out duplicates based on employee_id
//         const uniqueAttendance = [];
//         const seenIds = new Set();

//         data.data.forEach(item => {
//           if (!seenIds.has(item.employee_id)) {
//             seenIds.add(item.employee_id);
//             uniqueAttendance.push(item);
//           }
//         });

//         setAttendanceData(uniqueAttendance);
//         calculateAttendanceSummary(uniqueAttendance); // Calculate summary after fetching data
//       } else {
//         Swal.fire({
//           icon: "error",
//           title: "Oops!",
//           text: data.message || "Failed to fetch attendance data.",
//         });
//       }
//     } catch (error) {
//       console.error("Error fetching attendance:", error);
//       Swal.fire({
//         icon: "error",
//         title: "Error!",
//         text: "Error fetching attendance: " + error.message,
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const calculateAttendanceSummary = (data) => {
//     let onTimeMorningCount = 0;
//     let earlyMorningCount = 0;
//     let lateMorningCount = 0;
//     let onTimeAfternoonCount = 0;
//     let earlyAfternoonCount = 0;
//     let lateAfternoonCount = 0;

//     data.forEach(item => {
//       // Morning calculations
//       const timeInMorning = item.time_in_morning; // Assuming this is in "HH:mm" format
//       if (timeInMorning) {
//         const [hours, minutes] = timeInMorning.split(':').map(Number);
//         const timeInMorningDate = new Date();
//         timeInMorningDate.setHours(hours, minutes);

//         const morningOnTimeThreshold = new Date();
//         morningOnTimeThreshold.setHours(9, 0); // 9:00 AM

//         if (timeInMorningDate.getTime() === morningOnTimeThreshold.getTime()) {
//           onTimeMorningCount++;
//         } else if (timeInMorningDate < morningOnTimeThreshold) {
//           earlyMorningCount++;
//         } else if (timeInMorningDate > morningOnTimeThreshold) {
//           lateMorningCount++;
//         }
//       }

//       // Afternoon calculations
//       const timeInAfternoon = item.time_in_afternoon; // Assuming this is in "HH:mm" format
//       if (timeInAfternoon) {
//         const [hours, minutes] = timeInAfternoon.split(':').map(Number);
//         const timeInAfternoonDate = new Date();
//         timeInAfternoonDate.setHours(hours, minutes);

//         const afternoonOnTimeThreshold = new Date();
//         afternoonOnTimeThreshold.setHours(13, 0); // 1:00 PM

//         if (timeInAfternoonDate.getTime() === afternoonOnTimeThreshold.getTime()) {
//           onTimeAfternoonCount++;
//         } else if (timeInAfternoonDate < afternoonOnTimeThreshold) {
//           earlyAfternoonCount++;
//         } else if (timeInAfternoonDate > afternoonOnTimeThreshold) {
//           lateAfternoonCount++;
//         }
//       }
//     });

//     // Update the summary counts state
//     setSummaryCounts({
//       onTimeMorningCount,
//       earlyMorningCount,
//       lateMorningCount,
//       onTimeAfternoonCount,
//       earlyAfternoonCount,
//       lateAfternoonCount,
//     });
//   };

//   useEffect(() => {
//     fetchAttendance(); // Fetch attendance data when the component mounts
//   }, []);

//   const toggleRow = (employeeId) => {
//     // Toggle the expanded row
//     setExpandedRow(expandedRow === employeeId ? null : employeeId);
//   };

//   // ------------------- NEW: Bulk update handler for this page -------------------
//   const handleUpdateAllAttendances = async () => {
//     const confirmation = await Swal.fire({
//       title: 'Update attendance for ALL employees?',
//       text: `This will recalculate and update attendance for all employees for the current month. This action cannot be undone. Proceed?`,
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonText: 'Yes, update all',
//       cancelButtonText: 'Cancel'
//     });

//     if (!confirmation.isConfirmed) return;

//     setUpdateAllLoading(true);
//     Swal.fire({
//       title: 'Updating all attendance...',
//       text: 'Please wait — recalculating attendances for everyone.',
//       allowOutsideClick: false,
//       didOpen: () => Swal.showLoading()
//     });

//     // Save currently expanded row so we can re-open after refresh
//     const prevExpanded = expandedRow;

//     try {
//       const now = new Date();
//       const payload = {
//         month: now.getMonth() + 1,
//         year: now.getFullYear(),
//         user_full_name: (user && (user.full_name || user.fullName || user.name)) || 'SYSTEM',
//         user_role: (user && (user.role || user.user_role)) || 'SYSTEM'
//       };

//       const resp = await fetch(`${BASE_URL}/attendance/bulk_update_attendance.php`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       if (!resp.ok) {
//         const txt = await resp.text().catch(() => '');
//         throw new Error(`Server responded with ${resp.status}${txt ? ': ' + txt : ''}`);
//       }

//       const json = await resp.json().catch(() => ({ success: false, message: 'Invalid JSON from server' }));

//       if (json && json.success) {
//         // close loading modal and show success
//         Swal.close();
//         await Swal.fire('Done', json.message || 'All attendances updated successfully.', 'success');

//         // Collapse the expanded row (if any) so the child DTR_record will remount later
//         setExpandedRow(null);

//         // Refresh attendance list
//         try {
//           await fetchAttendance();
//         } catch (err) {
//           console.warn('Failed to refresh attendance after bulk update', err);
//         }

//         // Re-open previously expanded row to force its DTR_record to remount and refetch schedules
//         if (prevExpanded) {
//           // small delay to ensure data settled (optional, but helps UX for heavy DB ops)
//           setTimeout(() => setExpandedRow(prevExpanded), 200);
//         }
//       } else {
//         Swal.close();
//         await Swal.fire('Error', (json && json.message) || 'Failed to update all attendances.', 'error');
//       }
//     } catch (err) {
//       console.error('Bulk update error', err);
//       Swal.close();
//       await Swal.fire('Error', `Bulk update failed: ${err.message}`, 'error');
//     } finally {
//       setUpdateAllLoading(false);
//       try { Swal.close(); } catch (e) {}
//     }
//   };
//   // ---------------------------------------------------------------------------

//   const filteredData = attendanceData
//     .map((att) => {
//       // Match attendance with employee info
//       const emp = employees.find((e) => e.employee_id === att.employee_id);
//       return {
//         ...att,
//         status: emp?.status || "inactive",
//         employee_type: emp?.employee_type || "N/A",
//       };
//     })
//     .filter((item) => {
//       const matchesSearch = item.employee_name
//         ?.toLowerCase()
//         .includes(searchQuery.toLowerCase());

//       const matchesStatus =
//         statusFilter === "all" || item.status?.toLowerCase() === statusFilter.toLowerCase();

//       const matchesType =
//         typeFilter === "all" || item.employee_type?.toLowerCase() === typeFilter.toLowerCase();

//       return matchesSearch && matchesStatus && matchesType;
//     });

//   const breadcrumbItems = [
//     { label: 'Horizon Time & Attendance', path: '/attendanceRecord'},
//     { label: 'Attendance Logs', path: '/attendance' },
//     { label: 'Manange Leave', path: '/ApproveLeavePage' },
//     { label: 'Schedule Management', path: '/ShiftSchedulePage' },
//   ];

//   return (
//     <div className="w-full space-y-4 h-fit">
//       <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
//         <span className="text-2xl font-semibold">Employees Daily Time Record</span>

//         {/* Hidden on small screens, visible from md (>=768px) */}
//         <div className="hidden md:block">
//           <Breadcrumbs items={breadcrumbItems} />
//         </div>
//       </div>

//       <div className="space-y-3 att_container">

// <div className="flex items-center justify-between gap-3">
//   {/* 🔍 Search */}
//   <div className="relative flex-1">
//     <input
//       type="text"
//       placeholder="Search"
//       className="w-full h-10 p-2 pl-10 pr-3 bg-gray-200 rounded-lg shadow-inner"
//       value={searchQuery}
//       onChange={(e) => setSearchQuery(e.target.value)}
//     />
//     <div className="absolute transform -translate-y-1/2 left-3 top-1/2">
//       <Search size={18} className="text-gray-600" />
//     </div>
//   </div>

//   {/* ⬇️ Filters */}
//   <div className="flex items-center gap-2">
//     {/* NEW: Update All button placed BEFORE the status filter */}
//     <button
//       onClick={handleUpdateAllAttendances}
//       disabled={updateAllLoading}
//       className={`h-10 px-3 rounded text-white ${updateAllLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
//       title="Recalculate attendance for all employees (current month)"
//     >
//       {updateAllLoading ? 'Updating All...' : 'Update All'}
//     </button>

//     {/* Status Filter */}
//     <select
//       value={statusFilter}
//       onChange={(e) => setStatusFilter(e.target.value)}
//       className="h-10 p-2 border rounded"
//     >
//       <option value="all">All Status</option>
//       <option value="active">Active</option>
//       <option value="inactive">Inactive</option>
//     </select>

//     {/* Type Filter */}
//     <select
//       value={typeFilter}
//       onChange={(e) => setTypeFilter(e.target.value)}
//       className="h-10 p-2 border rounded"
//     >
//         <option value="all">All Types</option>
//         <option value="Regular">Regular</option>
//         <option value="Part-time">Part-time</option>
//         <option value="OJT">OJT</option>
//         <option value="Contractual">Contractual</option>
//         <option value="Project-Based">Project-Based</option> {/* Added option for Project-Based */}
//     </select>
//   </div>
// </div>

//         {/* Table information */}
//         {loading ? (
//           <p className="text-gray-500">Loading...</p>
//         ) : filteredData.length > 0 ? (
//           <div className="h-full attendance-table-info Glb-table ">
//             <table className="rounded-[0.5rem]">
//               <thead className="sticky top-0 z-0 py-2 overflow-auto text-white bg-gray-400 Glc-tableheader Glb-table-headeroverflow ">
//                 <tr className="text-left rounded-[0.5rem] tr_box">
//                   <th className="p-8 px-4 py-2 Glc-tableheader-text p-[8px] m-2">Employee Details</th>
//                   <th className="p-8 px-4 py-2 Glc-tableheader-text p-[8px] m-2">Total Credited Days</th>
//                   <th className="px-4 py-2"></th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredData.map((item) => {
//                   // Get credited days for the current employee or default to 0
//                   const { firstHalfDays = 0, secondHalfDays = 0 } = creditedDays[item.employee_id] || {};

//                   return (
//                     <React.Fragment key={item.attendance_id}>
//                       <tr
//                         className="rounded-[10px] my-1 top-1 odd:bg-gray-300 even:bg-gray-200 hover:bg-gray-400 cursor-pointer"
//                         onClick={() => toggleRow(item.employee_id)} // Toggle dropdown on row click
//                       >
//                         <td className="flex items-start px-4 py-2 Employee-details">
//                           <div className="flex flex-col items-start w-full ">
//                             <div className="Employee-name attendance-textSize-name border-b-[1px]">
//                               {item.employee_name}
//                             </div>
//                             <div className="Employee-id text-[13px] w-full text-left">
//                               <strong className='font-bold text-[15px]'>{item.employee_id} </strong>

//                               {/* Emp. ID: <strong className='font-bold text-[15px]'>{item.employee_id} </strong> */}
//                             </div>
//                           </div>
//                         </td>

//                         <td className="flex flex-col items-start w-full px-4 py-2">
//                           <div className="flex w-full text-left">
//                               1st Half: <strong className="font-mono"> {firstHalfDays.toFixed(2)}</strong>
//                           </div>
//                           <div className="flex w-full text-left">
//                               2nd Half: <strong className="font-mono"> {secondHalfDays.toFixed(2)}</strong>
//                           </div>
//                         </td>

//                         <td className="px-4 ">
//                           {expandedRow === item.employee_id ? <ChevronUp /> : <ChevronDown />}
//                         </td>
//                       </tr>

//                       {expandedRow === item.employee_id && ( // Render dropdown content if this row is expanded
//                         <div colSpan={user?.role === "ADMIN" ? 5 : 4} className="py-1 ">
//                           <DTR_record
//                             data={item}
//                             onClose={() => setExpandedRow(null)} // Close dropdown
//                             onCreditedDaysChange={(firstHalf, secondHalf) => {
//                               // Update credited days for the specific employee
//                               setCreditedDays(prev => ({
//                                 ...prev,
//                                 [item.employee_id]: { firstHalfDays: firstHalf, secondHalfDays: secondHalf }
//                               }));
//                             }} // Pass the callback
//                           />
//                         </div>
//                       )}
//                     </React.Fragment>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//         <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500">
//           <UserRoundX className="w-10 h-10 mb-3 text-gray-400" />
//           <p>
//             No employees found
//             {searchQuery ? ` for "${searchQuery}"` : ""}
//             {statusFilter !== "all" ? ` with status "${statusFilter}"` : ""}
//             {typeFilter !== "all" ? ` and type "${typeFilter}"` : ""}.
//           </p>
//         </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default DTREmployeeLIst;
