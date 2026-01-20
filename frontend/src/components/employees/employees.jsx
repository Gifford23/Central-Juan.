// Employees.jsx
import React, { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import EmployeeModal from "./EmployeeModal"; // Import the modal component
import AssignScheduleModal from "../schedule-manager/schedule-manager-components/AssignScheduleModal";
import { useLocation } from "react-router-dom";
import '../../../Styles/components/employee/employeejsx.css'; // Import your CSS file
import BASE_URL from '../../../backend/server/config'; // Adjust the path as necessary
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import EmployeeListView from './employeeTableMode/employeeListView';
import EmployeeGridView from './employeeTableMode/employeeGridView';
import { useSession } from '../../context/SessionContext';
import usePermissions from "../../users/hooks/usePermissions";
import { Tooltip } from "@mui/material";
import Tabs from "../breadcrumbs/Tabs";
import {
  Printer,
  Trash2,
  Search,
  Plus,
  AlignJustify,
  Grid3x3,
  UserRoundX,
  Users,
  Briefcase,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function Employees() {
  const { state } = useLocation();
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const [customId, setCustomId] = useState("");

  const [statusFilter, setStatusFilter] = useState("active");
  const [typeFilter, setTypeFilter] = useState("all");
  // NEW filter states
  const [branchFilter, setBranchFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");

  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState('list');

  // Mobile toggles
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  // Assign modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignPreselectedEmployees, setAssignPreselectedEmployees] = useState([]);
  const [workTimes, setWorkTimes] = useState([]);

  const tabs = useMemo(
    () => [
      {
        key: "employees",
        label: "Employee List",
        sublabel: "View & Manage Employees",
        icon: Users,
        onClick: () => navigate("/employees"),
      },
      {
        key: "departments",
        label: "Departments",
        sublabel: "Manage Employee Departments",
        icon: Briefcase,
        onClick: () => navigate("/department"),
      },
      {
        key: "branches",
        label: "Branch",
        sublabel: "Manage Branches",
        icon: Building2,
        onClick: () => navigate("/branches"),
      },
    ],
    [navigate]
  );

  // NEW: key to force remount of AssignScheduleModal so it picks up initialSelectedEmployees
  const [assignModalKey, setAssignModalKey] = useState(0);
  const breadcrumbItems = [
    !permLoading && permissions?.employee_list && { key: "dashboard", label: "Employee Lists", path: "/employees" },
    !permLoading && permissions?.department && { key: "employees", label: "Departments", path: "/department" },
    !permLoading && permissions?.branches && { key: "branches", label: "Branches", path: "/branches" },
  ].filter(Boolean);




  
  // --------- Move fetchEmployees out so we can call it after add/update ---------
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/employeesSide/employees.php`);
      const data = await response.json();
      if (data.message) {
        // server returned an error-like message
        console.warn("employees.php message:", data.message);
        setEmployees([]);
      } else {
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching employee data:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Error fetching employees. Check console." });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkTimes = async () => {
    try {
      const res = await fetch(`${BASE_URL}/work_time/read_work_time.php`);
      const data = await res.json();
      setWorkTimes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("Failed to fetch workTimes:", err);
      setWorkTimes([]);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      await fetchEmployees();
      await fetchWorkTimes();
    };
    if (isMounted) init();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleListView = () => {
    setActiveView('list');
  };

  const handleGridView = () => {
    setActiveView('grid');
  };

  // IMPORTANT: This function is passed to EmployeeModal as onSubmit.
  // It MUST return the server result so EmployeeModal can inspect addResult.employee_id etc.
  const handleAddOrUpdateEmployee = async (newEmployee, mode = "add") => {
    const url = mode === "update"
      ? `${BASE_URL}/employeesSide/update_employee.php`
      : `${BASE_URL}/employeesSide/add_employee.php`;
    const method = mode === "update" ? "PUT" : "POST";

    const currentUser = JSON.parse(localStorage.getItem("user")) || {};

    const payload = {
      ...newEmployee,
      current_user: {
        full_name: currentUser?.full_name || currentUser?.username || "Unknown",
        role: currentUser?.role || "GUEST",
      },
    };

    try {
      console.log("Sending employee request:", { url, method, payload });
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Server returned non-JSON:", text);
        Swal.fire({ icon: "error", title: "Server Error", text: "Unexpected server response. Check console." });
        return { success: false, message: "Invalid server response" };
      }

      console.log("Server response:", data);

      if (data.status === "success" || data.success) {
        // Build created/updated employee object to add locally (we still refresh the list below)
        const createdEmployee = {
          ...newEmployee,
          ...(data.employee || {}),
        };

        // show success and wait for user to click OK
        await Swal.fire({ icon: "success", title: "Success", text: data.message || "Employee saved." });

        // re-fetch the employees list (lightweight) so computed backend values (base_salary, etc.) appear
        await fetchEmployees();

        // Return server data (so EmployeeModal can use employee_id, email, password if returned)
        return { ...data, employee: createdEmployee, employee_id: createdEmployee.employee_id, email: createdEmployee.email, password: data.password || data.generated_password || null };
      } else {
        Swal.fire({ icon: "error", title: "Error", text: data.message || "Failed to save employee." });
        return { success: false, message: data.message || "Failed" };
      }
    } catch (error) {
      console.error("Error saving employee:", error);
      Swal.fire({ icon: "error", title: "Error", text: error.message || "Network error" });
      return { success: false, message: error.message || "Network error" };
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async (employee_id) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const currentUser = JSON.parse(localStorage.getItem("user")) || {};
      const response = await fetch(
        `${BASE_URL}/employeesSide/delete_employee.php?id=${employee_id}&full_name=${encodeURIComponent(currentUser.full_name || "")}&role=${encodeURIComponent(currentUser.role || "")}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" }
        }
      );

      const data = await response.json();
      if (data.success || data.status === "success") {
        setEmployees((prev) => prev.filter(emp => emp.employee_id !== employee_id));
        Swal.fire({ icon: "success", title: "Deleted", text: data.message || "Employee deleted" });
      } else {
        Swal.fire({ icon: "error", title: "Error", text: data.message || "Failed to delete" });
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Something went wrong. See console." });
    }
  };

  const handleToggleStatus = async (employee) => {
    const newStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      const response = await fetch(`${BASE_URL}/employeesSide/update_employee_status.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employee.employee_id, status: newStatus })
      });
      const data = await response.json();
      if (data.success || data.status === "success") {
        setEmployees(prev => prev.map(emp => emp.employee_id === employee.employee_id ? { ...emp, status: newStatus } : emp));
        Swal.fire('Updated!', `Employee marked as ${newStatus}`, 'success');
      } else {
        Swal.fire('Error!', data.message || 'Status update failed.', 'error');
      }
    } catch (error) {
      console.error("Error updating status:", error);
      Swal.fire('Error!', 'Something went wrong.', 'error');
    }
  };

  const handleDeleteSelectedEmployees = async () => {
    if (selectedEmployees.length === 0) {
      Swal.fire("Info", "No employees selected.", "info");
      return;
    }

    const confirmed = await Swal.fire({
      title: `Delete ${selectedEmployees.length} employees?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
    });
    if (!confirmed.isConfirmed) return;

    try {
      const response = await fetch(`${BASE_URL}/employeesSide/delete_multiple.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_ids: selectedEmployees }),
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(prev => prev.filter(emp => !selectedEmployees.includes(emp.employee_id)));
        setSelectedEmployees([]);
        Swal.fire("Deleted", "Selected employees deleted.", "success");
      } else {
        Swal.fire("Error", data.message || "Failed to delete employees.", "error");
      }
    } catch (error) {
      console.error("Error deleting employees:", error);
      Swal.fire("Error", "Error deleting employees. See console.", "error");
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedEmployees(employees.map(emp => emp.employee_id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
    );
  };

  // ---------- Derived filter option lists (dynamic) ----------
  // Helper: normalize undefined/null -> 'Not assigned' so options are stable
  const normalize = (v) => (v === undefined || v === null || v === "" ? "Not assigned" : String(v));

  // Helper: base filters applied when computing counts for options
  const matchesBaseFilters = (emp, { ignoreBranch = false, ignoreDept = false, ignorePos = false, ignoreType = false, ignoreStatus = false } = {}) => {
    const fullName = `${emp.first_name} ${emp.middle_name || ""} ${emp.last_name}`.toLowerCase();
    const matchesSearch = (emp.employee_id || "").toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
      fullName.includes(searchQuery.toLowerCase());
    const matchesStatus = ignoreStatus ? true : (statusFilter === "all" || emp.status === statusFilter);
    const matchesType = ignoreType ? true : (typeFilter === "all" || (emp.employee_type || "Unknown") === typeFilter);

    // For branch/department/position counts, optionally ignore the dimension being counted
    const empBranch = normalize(emp.branch_name);
    const empDept = normalize(emp.department_name);
    const empPos = normalize(emp.position_name);

    const matchesBranch = ignoreBranch ? true : (branchFilter === "all" || empBranch === branchFilter);
    const matchesDept = ignoreDept ? true : (departmentFilter === "all" || empDept === departmentFilter);
    const matchesPos = ignorePos ? true : (positionFilter === "all" || empPos === positionFilter);

    return matchesSearch && matchesStatus && matchesType && matchesBranch && matchesDept && matchesPos;
  };

  // Branches with counts (respecting search/status/type but not department/position filters by default)
  const branchesWithCount = useMemo(() => {
    const map = new Map();
    employees.forEach(emp => {
      const b = normalize(emp.branch_name);
      // Count branch occurrences respecting search/type/status and current other filters except branch
      const baseMatch = matchesBaseFilters(emp, { ignoreBranch: true, ignoreDept: true, ignorePos: true });
      if (!map.has(b)) map.set(b, 0);
      if (baseMatch) map.set(b, map.get(b) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, searchQuery, statusFilter, typeFilter, branchFilter, departmentFilter, positionFilter]);

  // Departments depend on selected branch; include counts that respect search/status/type and branch selection
  const departmentsWithCount = useMemo(() => {
    const map = new Map();
    employees.forEach(emp => {
      const b = normalize(emp.branch_name);
      const d = normalize(emp.department_name);
      // Only consider employee if it matches base filters and matches currently selected branch (or branchFilter === 'all')
      const baseMatch = matchesBaseFilters(emp, { ignoreBranch: false, ignoreDept: true, ignorePos: true });
      if ((branchFilter === "all" || b === branchFilter) && baseMatch) {
        if (!map.has(d)) map.set(d, 0);
        map.set(d, map.get(d) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, branchFilter, searchQuery, statusFilter, typeFilter, departmentFilter, positionFilter]);

  // Positions depend on branch+department; counts respect selected branch & department plus base filters
  const positionsWithCount = useMemo(() => {
    const map = new Map();
    employees.forEach(emp => {
      const b = normalize(emp.branch_name);
      const d = normalize(emp.department_name);
      const p = normalize(emp.position_name);
      const baseMatch = matchesBaseFilters(emp, { ignoreBranch: false, ignoreDept: false, ignorePos: true });
      if ((branchFilter === "all" || b === branchFilter) &&
          (departmentFilter === "all" || d === departmentFilter) &&
          baseMatch) {
        if (!map.has(p)) map.set(p, 0);
        map.set(p, map.get(p) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, branchFilter, departmentFilter, searchQuery, statusFilter, typeFilter, positionFilter]);

  // Types with counts: respect branch/department/position/status/search but ignore current type selection
  const typesWithCount = useMemo(() => {
    const map = new Map();
    employees.forEach(emp => {
      const b = normalize(emp.branch_name);
      const d = normalize(emp.department_name);
      const p = normalize(emp.position_name);
      const t = emp.employee_type || "Unknown";
      const baseMatch = matchesBaseFilters(emp, { ignoreType: true, ignoreBranch: false, ignoreDept: false, ignorePos: false, ignoreStatus: false });
      if ((branchFilter === "all" || b === branchFilter) &&
          (departmentFilter === "all" || d === departmentFilter) &&
          (positionFilter === "all" || p === positionFilter) &&
          baseMatch) {
        if (!map.has(t)) map.set(t, 0);
        map.set(t, map.get(t) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, branchFilter, departmentFilter, positionFilter, searchQuery, statusFilter, typeFilter]);

  // Status counts: respect other filters & type but ignore current status selection
  const statusWithCount = useMemo(() => {
    const map = { active: 0, inactive: 0 };
    employees.forEach(emp => {
      const b = normalize(emp.branch_name);
      const d = normalize(emp.department_name);
      const p = normalize(emp.position_name);
      const baseMatch = matchesBaseFilters(emp, { ignoreStatus: true, ignoreBranch: false, ignoreDept: false, ignorePos: false, ignoreType: false });
      if ((branchFilter === "all" || b === branchFilter) &&
          (departmentFilter === "all" || d === departmentFilter) &&
          (positionFilter === "all" || p === positionFilter) &&
          baseMatch) {
        const s = emp.status === 'active' ? 'active' : 'inactive';
        map[s] = (map[s] || 0) + 1;
      }
    });
    return map;
  }, [employees, branchFilter, departmentFilter, positionFilter, searchQuery, typeFilter, statusFilter]);

  // ---------- Filter the employees list using all filters ----------
  const filteredEmployees = employees
    .filter((employee) => {
      const fullName = `${employee.first_name} ${employee.middle_name || ""} ${employee.last_name}`.toLowerCase();
      const matchesSearch =
        (employee.employee_id || "").toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        fullName.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
      const matchesType = typeFilter === "all" || employee.employee_type === typeFilter;

      // normalized values for branch/department/position (so undefined becomes 'Not assigned')
      const empBranch = normalize(employee.branch_name);
      const empDept = normalize(employee.department_name);
      const empPos = normalize(employee.position_name);

      const matchesBranch = branchFilter === "all" || empBranch === branchFilter;
      const matchesDept = departmentFilter === "all" || empDept === departmentFilter;
      const matchesPos = positionFilter === "all" || empPos === positionFilter;

      return matchesSearch && matchesStatus && matchesType && matchesBranch && matchesDept && matchesPos;
    })
    .sort((a, b) => {
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      return 0;
    });

  const handlePrintSelected = () => {
    const selectedData = employees.filter(emp => selectedEmployees.includes(emp.employee_id));
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    const tableHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>Selected Employees</h2>
          <table>
            <thead>
              <tr>
                <th>Employee ID</th><th>Branch</th><th>First Name</th><th>Middle Name</th><th>Last Name</th>
                <th>Email</th><th>Contact</th><th>DOB</th><th>Department</th><th>Position</th>
              </tr>
            </thead>
            <tbody>
              ${selectedData.map(emp => `
                <tr>
                  <td>${emp.employee_id}</td>
                  <td>${emp.branch_name || "Not assigned"}</td>
                  <td>${emp.first_name}</td>
                  <td>${emp.middle_name || "N/A"}</td>
                  <td>${emp.last_name}</td>
                  <td>${emp.email || "N/A"}</td>
                  <td>${emp.contact_number || "N/A"}</td>
                  <td>${emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : "N/A"}</td>
                  <td>${emp.department_name || "N/A"}</td>
                  <td>${emp.position_name || "N/A"}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(tableHtml);
    printWindow.document.close();
    printWindow.print();
  };

  // When EmployeeModal requests opening assign, parent handles it:
  const handleOpenAssign = (employeeIds = []) => {
    // ensure employees array contains those ids, otherwise you might want to fetch minimal info
    console.log("handleOpenAssign called with:", employeeIds);
    setAssignPreselectedEmployees(employeeIds);

    // NEW: update key so the AssignScheduleModal remounts and picks up the new initialSelectedEmployees
    setAssignModalKey(Date.now());

    setIsAssignModalOpen(true);
  };

  // ----- Simple wrappers for AssignScheduleModal's API hooks -----
  const createSchedule = async (payload) => {
    try {
      const r = await fetch(`${BASE_URL}/schedule-manager/create-sm.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (err) {
      console.error("createSchedule error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const updateSchedule = async (payload) => {
    try {
      const r = await fetch(`${BASE_URL}/schedules/update_schedule.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await r.json();
    } catch (err) {
      console.error("updateSchedule error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const deleteSchedule = async (schedule_id) => {
    try {
      const r = await fetch(`${BASE_URL}/schedules/delete_schedule.php?id=${encodeURIComponent(schedule_id)}`, {
        method: "DELETE",
      });
      return await r.json();
    } catch (err) {
      console.error("deleteSchedule error:", err);
      return { success: false, message: "Network error" };
    }
  };

  const fetchSchedules = async () => {
    try {
      const r = await fetch(`${BASE_URL}/schedules/schedules.php`);
      return await r.json();
    } catch (err) {
      console.warn("fetchSchedules error:", err);
      return [];
    }
  };

  // Handlers to maintain dependent filters
  const onBranchChange = (val) => {
    setBranchFilter(val);
    setDepartmentFilter("all");
    setPositionFilter("all");
  };

  const onDepartmentChange = (val) => {
    setDepartmentFilter(val);
    setPositionFilter("all");
  };

  const onPositionChange = (val) => {
    setPositionFilter(val);
  };

  // Clear filters action (branch/department/position + type + status)
  const clearAllFilters = () => {
    setBranchFilter("all");
    setDepartmentFilter("all");
    setPositionFilter("all");
    setTypeFilter("all");
    setStatusFilter("active");
  };

  return (
    <div className="container flex w-full gap-y-4">
      <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className='text-2xl font-semibold'>Employee List</span>
        {/* Breadcrumbs: hidden on mobile (<640px) */}
        <div className="hidden sm:block">
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      {/* RESPONSIVE HEADER */}
      <div className="w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search employees, ID, or attendance..."
              className="w-full h-10 pl-10 pr-3 text-sm border border-gray-200 rounded-lg outline-none bg-gray-50 focus:ring-2 focus:ring-blue-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search employees"
            />
            <div className="absolute text-gray-500 -translate-y-1/2 left-3 top-1/2">
              <Search size={18} />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            {/* Desktop controls */}
            <div className="hidden sm:flex sm:items-center sm:gap-3">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
                <option value="all">All Status ({(statusWithCount.active || 0) + (statusWithCount.inactive || 0)})</option>
                <option value="active">Active ({statusWithCount.active || 0})</option>
                <option value="inactive">Inactive ({statusWithCount.inactive || 0})</option>
              </select>

              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
                <option value="all">All Types ({typesWithCount.reduce((s, t) => s + t.count, 0)})</option>
                {typesWithCount.map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
                ))}
              </select>

              {/* --- New filters: Branch / Department / Position (with counts) --- */}
              <div className="flex items-center gap-2">
                <select value={branchFilter} onChange={(e) => onBranchChange(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
                  <option value="all">All Branches ({branchesWithCount.reduce((s, b) => s + b.count, 0)})</option>
                  {branchesWithCount.map(b => (
                    <option key={b.name} value={b.name}>{b.name} ({b.count})</option>
                  ))}
                </select>

                <select value={departmentFilter} onChange={(e) => onDepartmentChange(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
                  <option value="all">All Departments ({departmentsWithCount.reduce((s, d) => s + d.count, 0)})</option>
                  {departmentsWithCount.map(d => (
                    <option key={d.name} value={d.name}>{d.name} ({d.count})</option>
                  ))}
                </select>

                <select value={positionFilter} onChange={(e) => onPositionChange(e.target.value)} className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg">
                  <option value="all">All Positions ({positionsWithCount.reduce((s, p) => s + p.count, 0)})</option>
                  {positionsWithCount.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.count})</option>
                  ))}
                </select>

                {/* Clear filters button (small) */}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  title="Clear all filters"
                  className="px-2 py-1 text-sm bg-white border rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <div className="flex items-center gap-2">
                {!permLoading && permissions?.can_add && (
                  <Tooltip title="Add Employee" placement="bottom">
                    <button
                      className="flex items-center justify-center w-10 h-10 text-white bg-blue-600 rounded-lg"
                      onClick={() => {
                        setEditingEmployee(null);
                        setIsModalOpen(true);
                      }}
                      aria-label="Add employee"
                    >
                      <Plus size={18} />
                    </button>
                  </Tooltip>
                )}

                {!permLoading && permissions?.can_delete && (
                  <Tooltip title="Delete Selected Employees" placement="bottom">
                    <button className="flex items-center justify-center w-10 h-10 border rounded-lg" onClick={handleDeleteSelectedEmployees}>
                      <Trash2 size={18} />
                    </button>
                  </Tooltip>
                )}

                {!permLoading && permissions?.can_print && (
                  <Tooltip title="Print Selected" placement="bottom">
                    <button className="flex items-center justify-center w-10 h-10 border rounded-lg" onClick={handlePrintSelected}>
                      <Printer size={18} />
                    </button>
                  </Tooltip>
                )}
              </div>

              <div className="flex items-center gap-1 pl-3 ml-2 border-l">
                <Tooltip title="List View">
                  <button onClick={handleListView} className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeView === 'list' ? 'bg-blue-100' : 'hover:bg-gray-100'}`} aria-pressed={activeView === 'list'}>
                    <AlignJustify size={18} />
                  </button>
                </Tooltip>

                <Tooltip title="Grid View">
                  <button onClick={handleGridView} className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeView === 'grid' ? 'bg-blue-100' : 'hover:bg-gray-100'}`} aria-pressed={activeView === 'grid'}>
                    <Grid3x3 size={18} />
                  </button>
                </Tooltip>
              </div>
            </div>

            {/* Mobile actions & filters */}
            <div className="flex items-center gap-2 sm:hidden">
              {/* Actions (hamburger) */}
              <button
                onClick={() => {
                  setMobileActionsOpen(s => !s);
                  setMobileFiltersOpen(false); // close filters when opening actions
                }}
                className="flex items-center justify-center w-10 h-10 bg-white border rounded-lg"
                aria-expanded={mobileActionsOpen}
                aria-controls="mobile-actions-panel"
                aria-label="Open actions"
              >
                <AlignJustify size={18} />
              </button>

              {/* Filters (funnel icon) */}
              <button
                onClick={() => {
                  setMobileFiltersOpen(s => !s);
                  setMobileActionsOpen(false); // close actions when opening filters
                }}
                className="flex items-center justify-center w-10 h-10 bg-white border rounded-lg"
                aria-expanded={mobileFiltersOpen}
                aria-controls="mobile-filters"
                aria-label="Open filters"
              >
                {/* Funnel SVG (small, self-contained so no additional import needed) */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 3H2l8 9v7l4 2v-9l8-9z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile actions panel (shows when hamburger is toggled) */}
        <div id="mobile-actions-panel" className={`${mobileActionsOpen ? 'max-h-[260px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-200 mt-3 sm:hidden`}>
          <div className="flex flex-col gap-3 p-3 bg-white border rounded-lg">
            <div className="flex gap-2">
              {!permLoading && permissions?.can_add && (
                <button
                  className="flex-1 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg"
                  onClick={() => { setEditingEmployee(null); setIsModalOpen(true); setMobileActionsOpen(false); }}
                >
                  Add
                </button>
              )}
              {!permLoading && permissions?.can_delete && (
                <button
                  className="flex-1 px-3 py-2 text-sm border rounded-lg"
                  onClick={() => { handleDeleteSelectedEmployees(); setMobileActionsOpen(false); }}
                >
                  Delete
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {!permLoading && permissions?.can_print && (
                <button className="flex-1 px-3 py-2 text-sm border rounded-lg" onClick={() => { handlePrintSelected(); setMobileActionsOpen(false); }}>
                  Print
                </button>
              )}

              <button onClick={handleListView} className={`flex-1 px-3 py-2 text-sm rounded-lg ${activeView === 'list' ? 'bg-blue-100' : 'border'}`}>List</button>
              <button onClick={handleGridView} className={`flex-1 px-3 py-2 text-sm rounded-lg ${activeView === 'grid' ? 'bg-blue-100' : 'border'}`}>Grid</button>
            </div>
          </div>
        </div>

        {/* Mobile filters panel */}
        <div id="mobile-filters" className={`${mobileFiltersOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} overflow-hidden transition-all duration-200 mt-3 sm:hidden`}>
          <div className="flex flex-col gap-3 p-3 bg-white border rounded-lg">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-4 py-2 text-sm bg-white border rounded-lg">
              <option value="all">All Status ({(statusWithCount.active || 0) + (statusWithCount.inactive || 0)})</option>
              <option value="active">Active ({statusWithCount.active || 0})</option>
              <option value="inactive">Inactive ({statusWithCount.inactive || 0})</option>
            </select>

            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-4 py-2 text-sm bg-white border rounded-lg">
              <option value="all">All Types ({typesWithCount.reduce((s, t) => s + t.count, 0)})</option>
              {typesWithCount.map(t => <option key={t.name} value={t.name}>{t.name} ({t.count})</option>)}
            </select>

            {/* Mobile: Branch / Department / Position (with counts) */}
            <div className="flex flex-col gap-2">
              <select value={branchFilter} onChange={(e) => onBranchChange(e.target.value)} className="w-full px-4 py-2 text-sm bg-white border rounded-lg">
                <option value="all">All Branches ({branchesWithCount.reduce((s, b) => s + b.count, 0)})</option>
                {branchesWithCount.map(b => <option key={b.name} value={b.name}>{b.name} ({b.count})</option>)}
              </select>

              <select value={departmentFilter} onChange={(e) => onDepartmentChange(e.target.value)} className="w-full px-4 py-2 text-sm bg-white border rounded-lg">
                <option value="all">All Departments ({departmentsWithCount.reduce((s, d) => s + d.count, 0)})</option>
                {departmentsWithCount.map(d => <option key={d.name} value={d.name}>{d.name} ({d.count})</option>)}
              </select>

              <select value={positionFilter} onChange={(e) => onPositionChange(e.target.value)} className="w-full px-4 py-2 text-sm bg-white border rounded-lg">
                <option value="all">All Positions ({positionsWithCount.reduce((s, p) => s + p.count, 0)})</option>
                {positionsWithCount.map(p => <option key={p.name} value={p.name}>{p.name} ({p.count})</option>)}
              </select>

              <button onClick={() => { clearAllFilters(); setMobileFiltersOpen(false); }} className="w-full px-4 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50">Clear filters</button>
            </div>

            <div className="flex gap-2">
              {!permLoading && permissions?.can_add && <button className="flex-1 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg" onClick={() => { setEditingEmployee(null); setIsModalOpen(true); setMobileFiltersOpen(false); }}>Add</button>}
              {!permLoading && permissions?.can_delete && <button className="flex-1 px-4 py-2 text-sm border rounded-lg" onClick={() => { handleDeleteSelectedEmployees(); setMobileFiltersOpen(false); }}>Delete</button>}
              {!permLoading && permissions?.can_print && <button className="flex-1 px-4 py-2 text-sm border rounded-lg" onClick={() => { handlePrintSelected(); setMobileFiltersOpen(false); }}>Print</button>}
            </div>

            <div className="flex gap-2">
              <button onClick={() => { handleListView(); setMobileFiltersOpen(false); }} className={`flex-1 px-4 py-2 text-sm rounded-lg ${activeView === 'list' ? 'bg-blue-100' : 'border'}`}>List</button>
              <button onClick={() => { handleGridView(); setMobileFiltersOpen(false); }} className={`flex-1 px-4 py-2 text-sm rounded-lg ${activeView === 'grid' ? 'bg-blue-100' : 'border'}`}>Grid</button>
            </div>
          </div>
        </div>
      </div>


      {/* MAIN CONTENT: Views */}
      {activeView === 'list' ? (
        <EmployeeListView
          loading={loading}
          filteredEmployees={filteredEmployees}
          selectedEmployees={selectedEmployees}
          handleSelectAll={handleSelectAll}
          handleSelectEmployee={handleSelectEmployee}
          handleEditEmployee={handleEditEmployee}
          handleDeleteEmployee={handleDeleteEmployee}
          handleToggleStatus={handleToggleStatus}
          user={user}
        />
      ) : (
        <EmployeeGridView
          loading={loading}
          filteredEmployees={filteredEmployees}
          selectedEmployees={selectedEmployees}
          handleSelectAll={handleSelectAll}
          handleSelectEmployee={handleSelectEmployee}
          handleEditEmployee={handleEditEmployee}
          handleDeleteEmployee={handleDeleteEmployee}
          user={user}
        />
      )}

      {filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center p-6 text-gray-500">
          <UserRoundX className="w-10 h-10 mb-2 text-gray-400" />
          <p>No employees found{searchQuery ? ` for "${searchQuery}"` : ""}.</p>
        </div>
      )}

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={(emp, mode) => handleAddOrUpdateEmployee(emp, mode)}
        employee={editingEmployee}
        onOpenAssign={handleOpenAssign} // IMPORTANT: pass handler so modal can trigger assign
      />

      {/* Assign Schedule Modal */}
      <AssignScheduleModal
        // NEW: pass key so it remounts when we want to force it re-init with new initialSelectedEmployees
        key={assignModalKey}
        open={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        workTimes={workTimes}
        employees={employees}
        initialSelectedEmployees={assignPreselectedEmployees}
        createSchedule={createSchedule}
        updateSchedule={updateSchedule}
        deleteSchedule={deleteSchedule}
        fetchSchedules={fetchSchedules}
        sw={(opts) => Swal.fire(opts)}
      />
    </div>
  );
}

export default Employees;





// import { useState, useEffect } from "react";
// import React from 'react';
// import Swal from "sweetalert2";
// import EmployeeModal from "./EmployeeModal"; // Import the modal component
// import { useLocation, useOutletContext } from 'react-router-dom';
// import '../../../Styles/components/employee/employeejsx.css'; // Import your CSS file
// import BASE_URL from '../../../backend/server/config'; // Adjust the path as necessary
// import { Printer, Trash2, User, UserCheckIcon, UserRoundPlus, UserRound, Search, Plus, AlignJustify, Grid3x3 } from "lucide-react";
// import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
// import { tr } from "date-fns/locale";
// import EmployeeListView from './employeeTableMode/employeeListView';
// import EmployeeGridView from './employeeTableMode/employeeGridView';
// import { useSession } from '../../context/SessionContext';
// import axiosInstance from '../../components/utils/axiosInstance';
// import { Tooltip } from "@mui/material";
// import { tooltipClasses } from "@mui/material/Tooltip";
// import EmployeeTypeBadge from "./employeeComponents/EmployeeTypebadge";
// // import usePermissions from "../../components/user_permisson/hooks/usePermissions";
// import usePermissions from "../../users/hooks/usePermissions"; 

// function Employees() {
//   const { state } = useLocation();
//   const { user } = useSession(); // Access user from Outlet context
//   const { permissions, loading: permLoading } = usePermissions(user?.username);
//   const [statusFilter, setStatusFilter] = useState('Active');
//   const [employmentTypeFilter, setEmploymentTypeFilter] = useState("all");

//   const [employees, setEmployees] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editingEmployee, setEditingEmployee] = useState(null);
//   const [selectedEmployees, setSelectedEmployees] = useState([]);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [showListView, setShowListView] = useState(true);
//   const [showGridView, setShowGridView] = useState(false);
//   const [activeView, setActiveView] = useState('list');
//   // const { permissions, loading: permLoading } = usePermissions(user?.role);

//   // Define a function named goToDepartment that does not take any parameters

//   const handleListView = () => {
//     setActiveView('list');
//     setShowListView(true);
//     setShowGridView(false);
//   }

//   const handleGridView = () => {
//     setActiveView('grid');
//     setShowListView(false);
//     setShowGridView(true);
//   }

//   useEffect(() => {
//     const fetchEmployees = async () => {
//       try {
//         const response = await fetch(`${BASE_URL}/employeesSide/employees.php`);
//         const data = await response.json();
//         if (data.message) {
//           alert(data.message);
//         } else {
//           setEmployees(data);
//         }
//       } catch (error) {
//         alert("Error fetching employee data. Please try again later.");
//         console.error("Error fetching employee data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchEmployees();
//   }, []);



//   // useEffect(() => {
//   //   const fetchEmployees = async () => {
//   //     try {
//   //       const response = await fetch(`${BASE_URL}/employeesSide/employees.php`);
//   //       const data = await response.json();
//   //       if (!data.message) {
//   //         setEmployees(data);
//   //       }
//   //     } catch (error) {
//   //       console.error("Error fetching employee data:", error);
//   //     } finally {
//   //       setLoading(false);
//   //     }
//   //   };
  
//   //   fetchEmployees(); // Initial fetch
//   //   const intervalId = setInterval(fetchEmployees, 10000); // Poll every 10s
  
//   //   return () => clearInterval(intervalId); // Cleanup
//   // }, []);

//   const handleAddOrUpdateEmployee = async (newEmployee) => {
//     const url = editingEmployee
//         ? `${BASE_URL}/employeesSide/update_employee.php`
//         : `${BASE_URL}/employeesSide/add_employee.php`;
//     const method = editingEmployee ? "PUT" : "POST";

//     try {
//         console.log("Sending request:", { url, method, body: JSON.stringify(newEmployee) });

//         const response = await fetch(url, {
//             method,
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(newEmployee),
//         });

//         const text = await response.text();
//         let data;

//         try {
//             data = JSON.parse(text);
//         } catch {
//             Swal.fire({
//                 icon: "error",
//                 title: "Error!",
//                 text: "Unexpected server error. Please try again.",
//             });
//             console.error("Server response (not JSON):", text);
//             return;
//         }

//         console.log("Server response:", data);

//         if (data.status === "success") {
//             console.log("Final Status: Success");

//             if (editingEmployee) {
//                 setEmployees((prevEmployees) =>
//                     prevEmployees.map((emp) =>
//                         emp.employee_id === newEmployee.employee_id ? newEmployee : emp
//                     )
//                 );
//             } else {
//                 setEmployees((prevEmployees) => [...prevEmployees, newEmployee]);
//             }

//             setEditingEmployee(null);
//             setIsModalOpen(false);

//             Swal.fire({
//                 icon: "success",
//                 title: "Success!",
//                 text: data.message || "Employee record successfully saved.",
//             });
//         } else {
//             Swal.fire({
//                 icon: "error",
//                 title: "Error!",
//                 text: data.message || "Failed to save employee record.",
//             });
//         }
//     } catch (error) {
//         Swal.fire({
//             icon: "error",
//             title: "Error!",
//             text: error.message || "Error saving employee. Please try again later.",
//         });
//         console.error("Error saving employee:", error);
//     }
//   };


  

//   const handleEditEmployee = (employee) => {
//     setEditingEmployee(employee);
//     setIsModalOpen(true);
//   };



// const handleDeleteEmployee = async (employee_id) => {
//   const result = await Swal.fire({
//     title: "Are you sure?",
//     text: "This action cannot be undone!",
//     icon: "warning",
//     showCancelButton: true,
//     confirmButtonColor: "#d33",
//     cancelButtonColor: "#3085d6",
//     confirmButtonText: "Yes, delete it!",
//   });

//   if (!result.isConfirmed) return; // If user cancels, do nothing

//   try {
//     const response = await fetch(`${BASE_URL}/employeesSide/delete_employee.php?id=${employee_id}`, {
//       method: "DELETE",
//     });

//     const data = await response.json();
//     if (data.success) {
//       setEmployees((prevEmployees) => prevEmployees.filter(emp => emp.employee_id !== employee_id));

//       Swal.fire({
//         title: "Deleted!",
//         text: "Employee has been deleted successfully.",
//         icon: "success",
//         confirmButtonColor: "#3085d6",
//       });
//     } else {
//       Swal.fire({
//         title: "Error!",
//         text: data.message || "Failed to delete employee.",
//         icon: "error",
//         confirmButtonColor: "#d33",
//       });
//     }
//   } catch (error) {
//     console.error("Error deleting employee:", error);
//     Swal.fire({
//       title: "Error!",
//       text: "Something went wrong. Please try again later.",
//       icon: "error",
//       confirmButtonColor: "#d33",
//     });
//   }
// };


//   const handleSelectAll = (event) => {
//     if (event.target.checked) {
//       setSelectedEmployees(employees.map(emp => emp.employee_id));
//     } else {
//       setSelectedEmployees([]);
//     }
//   };

//   const handleSelectEmployee = (employeeId) => {
//     setSelectedEmployees(prev =>
//       prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]
//     );
//   };

//   const handleToggleStatus = async (employee) => {
//   const newStatus = employee.status === 'active' ? 'inactive' : 'active';

//   try {
//     const response = await fetch(`${BASE_URL}/employeesSide/update_employee_status.php`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         employee_id: employee.employee_id,
//         status: newStatus
//       })
//     });

//     const data = await response.json();
//     if (data.success) {
//       setEmployees(prev =>
//         prev.map(emp =>
//           emp.employee_id === employee.employee_id ? { ...emp, status: newStatus } : emp
//         )
//       );
//       Swal.fire('Updated!', `Employee marked as ${newStatus}`, 'success');
//     } else {
//       Swal.fire('Error!', data.message || 'Status update failed.', 'error');
//     }
//   } catch (error) {
//     console.error("Error updating status:", error);
//     Swal.fire('Error!', 'Something went wrong.', 'error');
//   }
// };


//   const handleDeleteSelectedEmployees = async () => {
//     if (selectedEmployees.length === 0) {
//       alert("No employees selected.");
//       return;
//     }

//     if (!window.confirm("Are you sure you want to delete the selected employees?")) return;

//     try {
//       const response = await fetch(`${BASE_URL}/employeesSide/delete_multiple.php`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ employee_ids: selectedEmployees }),
//       });

//       const data = await response.json();
//       if (data.success) {
//         setEmployees(employees.filter(emp => !selectedEmployees.includes(emp.employee_id)));
//         setSelectedEmployees([]);
//         alert("Selected employees deleted successfully.");
//       } else {
//         alert(data.message || "Failed to delete employees.");
//       }
//     } catch (error) {
//       alert("Error deleting employees. Please try again later.");
//       console.error("Error deleting employees:", error);
//     }
//   };

//   const filteredEmployees = employees.filter((employee) => {
//     const fullName = `${employee.first_name} ${employee.middle_name || ""} ${employee.last_name}`.toLowerCase();

//     const matchesSearch =
//       employee.employee_id.toString().includes(searchQuery.toLowerCase()) ||
//       fullName.includes(searchQuery.toLowerCase());

//     const matchesStatus =
//       statusFilter === "all" ||
//       employee.status?.toLowerCase() === statusFilter.toLowerCase();

//     const matchesEmploymentType =
//       employmentTypeFilter === "all" ||
//       employee.employee_type?.toLowerCase() === employmentTypeFilter.toLowerCase();

//     return matchesSearch && matchesStatus && matchesEmploymentType;
//   });

//   const handlePrintSelected = () => {
//     const selectedData = employees.filter(emp => selectedEmployees.includes(emp.employee_id));
//     const printWindow = window.open('', '_blank', 'width=800,height=600');
//     const tableHtml = `
//       <html>
//         <head>
//           <style>
//             body {
//               font-family: Arial, sans-serif;
//               padding: 20px;
//             }
//             table {
//               width: 100%;
//               border-collapse: collapse;
//             }
//             th, td {
//               padding: 8px;
//               border: 1px solid #ddd;
//               text-align: left;
//             }
//             th {
//               background-color: #f2f2f2;
//             }
//           </style>
//         </head>
//         <body>
//           <h2>Selected Employees</h2>
//           <table>
//             <thead>
//               <tr>
//                 <th>Employee ID</th>
//                 <th>First Name</th>
//                 <th>Middle Name</th>
//                 <th>Last Name</th>
//                 <th>Email</th>
//                 <th>Contact Number</th>
//                 <th>Date of Birth</th>
//                 <th>Department Name</th>
//                 <th>Position Name</th>
//                 <th>Base Salary</th>
                
//               </tr>
//             </thead>
//             <tbody>
//               ${selectedData
//                 .map(emp => `
//                   <tr>
//                     <td>${emp.employee_id}</td>
//                     <td>${emp.first_name}</td>
//                     <td>${emp.middle_name || "N/A"}</td>
//                     <td>${emp.last_name}</td>
//                     <td>${emp.email}</td>
//                     <td>${emp.contact_number}</td>
//                     <td>${new Date(emp.date_of_birth || "N/A").toLocaleDateString()}</td>
//                     <td>${emp.department_name || "N/A"}</td>
//                     <td>${emp.position_name || "N/A"}</td>
//                     <td>${emp.base_salary || "N/A"}</td>
                   
//                   </tr>
//                 `)
//                 .join('')}
//             </tbody>
//           </table>
//         </body>
//       </html>
//     `;
//     printWindow.document.write(tableHtml);
//     printWindow.document.close();
//     printWindow.print();
//   };

//   const breadcrumbItems = [
//     // { label: 'Home', path: '/' },
//     { label: 'Employee Dashboard', path: '/employeedashboard' },
//     { label: 'Employees' },
//   ];
  

//   return (
//     <div className="container flex w-full gap-y-4">
//       <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
//         <span className='text-2xl font-semibold'>Employee List</span>
//         <Breadcrumbs items={breadcrumbItems} />
//       </div>
      
//     <div className="flex flex-col w-full gap-2 md:flex-row md:justify-between">
//       {/* Left side: search + filters */}
//       <div className="flex flex-col w-full gap-2 sm:flex-row md:w-auto">
//         {/* Search */}
//         <div className="relative w-full sm:w-64">
//           <input
//             type="text"
//             placeholder="Search"
//             className="w-full h-10 p-2 pl-10 pr-3 bg-gray-200 rounded-lg shadow-inner"
//             value={searchQuery}
//             onChange={(e) => setSearchQuery(e.target.value)}
//           />
//           <div className="absolute transform -translate-y-1/2 left-3 top-1/2">
//             <Search size={18} className="text-gray-600" />
//           </div>
//         </div>

//         {/* Filters side by side */}
//         <div className="flex flex-row w-full gap-2 sm:w-auto">
//           {/* Status filter (left) */}
//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//             className="w-full h-10 p-2 border border-gray-300 rounded-lg sm:w-auto"
//           >
//             <option value="active">Active</option>
//             <option value="all">All</option>
//             <option value="inactive">Inactive</option>

//           </select>

//           {/* Employment type filter (right) */}
//           <select
//             value={employmentTypeFilter}
//             onChange={(e) => setEmploymentTypeFilter(e.target.value)}
//             className="w-full h-10 p-2 bg-white border border-gray-300 rounded-lg sm:w-auto"
//           >
//             <option value="all">All Types</option>
//             <option value="regular">Regular</option>
//             <option value="part-time">Part-time</option>
//             <option value="ojt">OJT</option>
//             <option value="contractual">Contractual</option>
//             <option value="project-based">Project-Based</option>
//           </select>
//         </div>
//       </div>

//       {/* Right side: align right */}
//       <div className="flex flex-row items-center justify-end w-full overflow-x-auto gap-x-3 md:w-auto">
//         {/* Buttons */}
//         <div className="flex flex-row gap-x-2">
//           {!permLoading && permissions?.can_add && (
//             <Tooltip title="Add Employee" placement="bottom">
//               <button
//                 className="items-center w-10 h-10 rounded-lg cursor-pointer employee-newheaderbuttons-solid place-items-center hover:transition hover:duration-400 hover:ease-out hover:scale-95"
//                 onClick={() => {
//                   setEditingEmployee(null);
//                   setIsModalOpen(true);
//                 }}
//               >
//                 <Plus size={25} />
//               </button>
//             </Tooltip>
//           )}
//           {!permLoading && permissions?.can_delete && (
//             <Tooltip title="Delete Selected" placement="bottom">
//               <button
//                 className="items-center w-10 h-10 border rounded-lg cursor-pointer employee-newheaderbuttons-outline place-items-center hover:transition hover:duration-400 hover:ease-out hover:scale-95"
//                 onClick={handleDeleteSelectedEmployees}
//               >
//                 <Trash2 size={23} />
//               </button>
//             </Tooltip>
//           )}
//           {!permLoading && permissions?.can_print && (
//             <Tooltip title="Print Selected" placement="bottom">
//               <button
//                 className="items-center w-10 h-10 border rounded-lg cursor-pointer employee-newheaderbuttons-outline place-items-center hover:transition hover:duration-400 hover:ease-out hover:scale-95"
//                 onClick={handlePrintSelected}
//               >
//                 <Printer size={23} />
//               </button>
//             </Tooltip>
//           )}
//         </div>

//         {/* Divider */}
//         <div className="w-[2px] h-6 bg-black" />

//         {/* View toggle */}
//           <div className="flex flex-row h-10 overflow-hidden border rounded-lg w-fit divide-x-1 employee-newheaderbuttons-outline">
//             <Tooltip 
//               title="List View"
//               placement="bottom-end"
//               slotProps={{
//                 popper: {
//                   sx: {
//                     [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]: {
//                       marginTop: '7px',
//                       backgroundColor: '#46494c',
//                     }
//                   }
//                 }
//               }}
//             >
//               <div onClick={handleListView} 
//                 className={`w-10 content-center place-items-center cursor-pointer hover:bg-[#ACCCFC]/50
//                   ${activeView === 'list' ? 'employee-newheaderbuttons-solid' : ''}
//                 `}
//               >
//                 <AlignJustify size={23}/>
//               </div>
//             </Tooltip>

//             <Tooltip 
//               title="Grid View"
//               placement="bottom-end"
//               slotProps={{
//                 popper: {
//                   sx: {
//                     [`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]: {
//                       marginTop: '7px',
//                       backgroundColor: '#46494c',
//                     }
//                   }
//                 }
//               }}
//             >
//               <div onClick={handleGridView} 
//                 className={`w-10 content-center place-items-center cursor-pointer hover:bg-[#ACCCFC]/50
//                   ${activeView === 'grid' ? 'employee-newheaderbuttons-solid' : ''}
//                 `}
//               >
//                 <Grid3x3 size={23}/>
//               </div>
//             </Tooltip>
//           </div>
//         </div>
//       </div>



            
//       {filteredEmployees.length === 0 ? (
//         <div className="p-4 text-center text-gray-600">
//           {employmentTypeFilter !== "all"
//             ? `No employees found with type: ${employmentTypeFilter}`
//             : "No employees found for this search."}
//         </div>
//       ) : (
//         <>
//           {showListView && (
//             <EmployeeListView
//               loading={loading}
//               filteredEmployees={filteredEmployees}
//               selectedEmployees={selectedEmployees}
//               handleSelectAll={handleSelectAll}
//               handleSelectEmployee={handleSelectEmployee}
//               handleEditEmployee={handleEditEmployee}
//               handleDeleteEmployee={handleDeleteEmployee}
//               handleToggleStatus={handleToggleStatus}
//               user={user}
//             />
//           )}

//           {showGridView && (
//             <EmployeeGridView
//               loading={loading}
//               filteredEmployees={filteredEmployees}
//               selectedEmployees={selectedEmployees}
//               handleSelectAll={handleSelectAll}
//               handleSelectEmployee={handleSelectEmployee}
//               handleEditEmployee={handleEditEmployee}
//               handleDeleteEmployee={handleDeleteEmployee}
//               user={user}
//             />
//           )}
//         </>
//       )}


//       <EmployeeModal
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         onSubmit={handleAddOrUpdateEmployee}
//         employee={editingEmployee}
//       />
//     </div>
//   );
// }

// export default Employees;



