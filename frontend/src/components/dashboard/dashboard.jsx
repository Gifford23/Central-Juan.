import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "../../../src/context/SessionContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  Building2,
  Calendar as CalendarIcon,
  TrendingUp,
  Activity,
  Briefcase,
  ChartPie,
  CircleUserRound,
  LayoutDashboard,
  Clock,
  Plus,
  User,
  Sparkles,
  ArrowUpRight,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
  RefreshCw,
  FileText,
  CalendarClock,
  Home,
  Pencil,
  Hourglass,
  Hash,
  Loader2,
} from "lucide-react";

// --- Internal Components ---
import AttendanceDashboard from "../../components/employees/EmployeeBarChart";
import DepartmentDoughnutChart from "../departments/departmentDoughnut";
import Punctual from "./punctual";
import TaskManagement from "./taskManager";
import BranchDirectory from "./BranchDirectory";

// --- Config ---
import BASE_URL from "../../../backend/server/config";
import "../../../Styles/dashboard/dashboard.css";
import "../../../Styles/globals.css";

// ─────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon, accent = "blue" }) {
  const accents = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-100",
      value: "text-blue-700",
    },
    indigo: {
      bg: "bg-indigo-50",
      text: "text-indigo-600",
      border: "border-indigo-100",
      value: "text-indigo-700",
    },
  };
  const c = accents[accent] || accents.blue;

  return (
    <div
      className={`group relative flex items-center gap-4 px-5 py-4 bg-white rounded-2xl border ${c.border} shadow-sm hover:shadow-md transition-all duration-300 min-w-[160px] overflow-hidden`}
    >
      <div
        className={`absolute inset-0 ${c.bg} opacity-0 group-hover:opacity-60 transition-opacity duration-300 rounded-2xl pointer-events-none`}
      />
      <div
        className={`relative shrink-0 w-11 h-11 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shadow-sm`}
      >
        <Icon size={20} />
      </div>
      <div className="relative">
        <p className={`text-2xl font-bold tracking-tight ${c.value}`}>
          {String(value ?? 0).padStart(2, "0")}
        </p>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
          {label}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────
function SectionCard({ children, className = "" }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PANEL HEADER
// ─────────────────────────────────────────────────────────
function PanelHeader({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  action,
}) {
  return (
    <div className="relative px-5 sm:px-6 py-4 border-b border-slate-100 bg-white flex items-center justify-between gap-3">
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] ${iconBg.replace("bg-", "bg-gradient-to-r from-")} opacity-60`}
      />
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 ${iconBg} ${iconColor} rounded-xl shadow-sm shrink-0`}
        >
          <Icon size={18} />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// REQUEST TYPE CONFIG
// ─────────────────────────────────────────────────────────
const REQUEST_TYPE_CONFIG = {
  overtime: {
    icon: Clock,
    label: "Overtime",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  leave: {
    icon: CalendarClock,
    label: "Leave",
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
  },
  correction: {
    icon: Pencil,
    label: "Correction",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  work_from_home: {
    icon: Home,
    label: "WFH",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
};

const STATUS_CONFIG = {
  pending: {
    icon: Hourglass,
    label: "Pending",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    dot: "bg-orange-400",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-400",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dot: "bg-red-400",
  },
};

// ─────────────────────────────────────────────────────────
// SKELETON ROW
// ─────────────────────────────────────────────────────────
function SkeletonRequestRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
      <div className="w-8 h-8 rounded-full bg-slate-100" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 bg-slate-100 rounded-full" />
        <div className="h-2.5 w-20 bg-slate-50 rounded-full" />
      </div>
      <div className="h-5 w-16 bg-slate-100 rounded-full" />
      <div className="h-7 w-20 bg-slate-50 rounded-lg" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ATTENDANCE REQUEST ROW
// ─────────────────────────────────────────────────────────
function RequestRow({ request, onApprove, onReject, isProcessing }) {
  const typeConfig =
    REQUEST_TYPE_CONFIG[request.request_type] || REQUEST_TYPE_CONFIG.leave;
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig.icon;

  const nameHash = (request.employee_name || "")
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const avatarHue = (nameHash * 47) % 360;
  const initials = (request.employee_name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="group flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-colors duration-150">
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 shadow-sm"
        style={{
          background: `linear-gradient(135deg, hsl(${avatarHue}, 55%, 50%), hsl(${(avatarHue + 30) % 360}, 50%, 58%))`,
        }}
      >
        {initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
            {request.employee_name}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border ${typeConfig.bg} ${typeConfig.text} ${typeConfig.border}`}
          >
            <TypeIcon size={9} />
            {typeConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Hash size={8} />
            <span className="tabular-nums">{request.employee_id}</span>
          </div>
          {request.department && (
            <>
              <span className="text-slate-200 text-[10px]">·</span>
              <span className="text-[10px] text-slate-400">
                {request.department}
              </span>
            </>
          )}
          <span className="text-slate-200 text-[10px]">·</span>
          <span className="text-[10px] text-slate-400 tabular-nums">
            {new Date(request.request_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {request.reason && (
          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1 leading-relaxed">
            {request.reason}
          </p>
        )}
      </div>

      {/* Status / Actions */}
      <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
        {request.status === "pending" ? (
          <>
            <button
              onClick={() => onApprove(request.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <CheckCircle2 size={11} />
              )}
              Approve
            </button>
            <button
              onClick={() => onReject(request.id)}
              disabled={isProcessing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={11} />
              Reject
            </button>
          </>
        ) : (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
          >
            <StatusIcon size={10} />
            {statusConfig.label}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────
function Dashboard() {
  const { user } = useSession();
  const navigate = useNavigate();

  // --- State ---
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [activeEmployeeData, setActiveEmployeeData] = useState([]);
  const [showTasks, setShowTasks] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDescription, setEditingTaskDescription] = useState("");
  const [showDescription, setShowDescription] = useState({});

  // --- Attendance Requests State ---
  const [attendanceRequests, setAttendanceRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestFilter, setRequestFilter] = useState("pending");
  const [processingId, setProcessingId] = useState(null);

  // --- Handlers (unchanged) ---
  const handleShowTasks = () => {
    setShowTasks(true);
    setShowAddTask(false);
  };
  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowTasks(true);
    setShowAddTask(false);
  };
  const handleShowAddTask = () => {
    setShowAddTask(true);
    setShowTasks(false);
  };
  const handlePrevMonth = () =>
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNextMonth = () =>
    setSelectedDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToggleDescription = (dateKey, index) => {
    setShowDescription((prev) => ({
      ...prev,
      [`${dateKey}-${index}`]: !prev[`${dateKey}-${index}`],
    }));
  };
  const handleAddTask = () => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    setTasks((prev) => ({
      ...prev,
      [dateKey]: [
        ...(prev[dateKey] || []),
        { title: newTaskTitle, description: newTaskDescription },
      ],
    }));
    setNewTaskTitle("");
    setNewTaskDescription("");
    setShowAddTask(false);
    setShowTasks(true);
  };
  const handleEditTask = (dateKey, index) => {
    setEditingTask({ dateKey, index });
    setEditingTaskTitle(tasks[dateKey][index].title);
    setEditingTaskDescription(tasks[dateKey][index].description);
  };
  const handleSaveTask = () => {
    const { dateKey, index } = editingTask;
    const updatedTasks = [...tasks[dateKey]];
    updatedTasks[index] = {
      title: editingTaskTitle,
      description: editingTaskDescription,
    };
    setTasks((prev) => ({ ...prev, [dateKey]: updatedTasks }));
    setEditingTask(null);
    setEditingTaskTitle("");
    setEditingTaskDescription("");
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };
  const handleDeleteTask = (dateKey, index) => {
    const updatedTasks = tasks[dateKey].filter((_, i) => i !== index);
    setTasks((prev) => ({ ...prev, [dateKey]: updatedTasks }));
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };
  const loadTasks = () => {
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || {};
    setTasks(savedTasks);
  };

  // --- Attendance Request Handlers ---
  const fetchAttendanceRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const statusParam =
        requestFilter !== "all" ? `?status=${requestFilter}` : "";
      console.log(
        "Fetching requests from:",
        `${BASE_URL}/attendance/attendance_requests.php${statusParam}`,
      );
      const response = await fetch(
        `${BASE_URL}/attendance/attendance_requests.php${statusParam}`,
      );
      if (!response.ok) throw new Error("Failed to fetch requests");
      const data = await response.json();
      console.log("API Response:", data);
      if (data.success) {
        setAttendanceRequests(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching attendance requests:", error);
      setAttendanceRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, [requestFilter]);

  const handleApproveRequest = async (id) => {
    setProcessingId(id);
    try {
      const response = await fetch(
        `${BASE_URL}/attendance/attendance_requests.php`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status: "approved",
            reviewed_by: user?.full_name || user?.username || "Admin",
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        fetchAttendanceRequests();
      }
    } catch (error) {
      console.error("Error approving request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (id) => {
    setProcessingId(id);
    try {
      const response = await fetch(
        `${BASE_URL}/attendance/attendance_requests.php`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            status: "rejected",
            reviewed_by: user?.full_name || user?.username || "Admin",
          }),
        },
      );
      const data = await response.json();
      if (data.success) {
        fetchAttendanceRequests();
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
    } finally {
      setProcessingId(null);
    }
  };

  // --- Greeting ---
  const now = new Date();
  const philippinesTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
  const hours = philippinesTime.getHours();
  const greeting =
    hours < 12
      ? "Good morning"
      : hours < 18
        ? "Good afternoon"
        : "Good evening";
  const greetingEmoji = hours < 12 ? "🌤️" : hours < 18 ? "☀️" : "🌙";

  // --- Derived request counts ---
  const pendingCount = attendanceRequests.filter(
    (r) => r.status === "pending",
  ).length;
  const approvedCount = attendanceRequests.filter(
    (r) => r.status === "approved",
  ).length;
  const rejectedCount = attendanceRequests.filter(
    (r) => r.status === "rejected",
  ).length;

  // --- Data Fetching ---
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await fetch(`${BASE_URL}/holiday/get_holiday.php`);
        const data = await res.json();
        if (data.success) setHolidays(data.data || []);
      } catch (err) {
        console.error("Error fetching holidays:", err);
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [empRes, deptRes] = await Promise.all([
          fetch(`${BASE_URL}/employeesSide/employees.php?count=true`),
          fetch(`${BASE_URL}/departments/department.php?count=true`),
        ]);
        if (empRes.ok) {
          const d = await empRes.json();
          setEmployeeCount(d.total_count);
        }
        if (deptRes.ok) {
          const d = await deptRes.json();
          setDepartmentCount(d.total_departments);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };
    fetchCounts();
    loadTasks();
  }, []);

  useEffect(() => {
    fetchAttendanceRequests();
  }, [requestFilter]);

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/80 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* ══════════════════════════════════════════════
            HEADER BANNER
        ══════════════════════════════════════════════ */}
        <header className="relative bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400" />
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-gradient-to-br from-blue-100/50 to-indigo-100/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-gradient-to-br from-slate-100/80 to-blue-50/40 rounded-full blur-2xl pointer-events-none" />

          <div className="relative px-5 sm:px-8 py-5 sm:py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200/60">
                  <LayoutDashboard className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {greeting},&nbsp;
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      {user?.full_name || user?.username}
                    </span>
                  </h1>
                  <span className="text-lg leading-none">{greetingEmoji}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-semibold text-blue-600 uppercase tracking-wide">
                    <User size={10} />
                    {user?.role || "Admin"}
                  </span>
                  <span className="text-slate-300 text-xs">·</span>
                  <span className="text-xs text-slate-400 font-medium">
                    {format(new Date(), "EEEE, MMMM dd, yyyy")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <StatCard
                value={employeeCount}
                label="Employees"
                icon={Users}
                accent="blue"
              />
              <StatCard
                value={departmentCount}
                label="Departments"
                icon={Building2}
                accent="indigo"
              />
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════
            MAIN GRID
        ══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
          {/* ═══════════════════════════════════
              LEFT COLUMN — Operational
          ═══════════════════════════════════ */}
          <div className="xl:col-span-4 flex flex-col gap-5 sm:gap-6">
            <SectionCard>
              <PanelHeader
                icon={CalendarIcon}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                title="Calendar & Tasks"
                subtitle={format(selectedDate, "MMMM yyyy")}
                action={
                  !showAddTask && (
                    <button
                      onClick={handleShowAddTask}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-100 hover:border-blue-600 px-3 py-1.5 rounded-xl transition-all duration-200 shadow-sm"
                    >
                      <Plus size={13} />
                      New Task
                    </button>
                  )
                }
              />
              <div className="p-0">
                <TaskManagement
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  handlePrevMonth={handlePrevMonth}
                  handleNextMonth={handleNextMonth}
                  handleDateClick={handleDateClick}
                  tasks={tasks}
                  showTasks={showTasks}
                  setShowTasks={setShowTasks}
                  handleShowTasks={handleShowTasks}
                  showAddTask={showAddTask}
                  setShowAddTask={setShowAddTask}
                  handleShowAddTask={handleShowAddTask}
                  newTaskTitle={newTaskTitle}
                  setNewTaskTitle={setNewTaskTitle}
                  newTaskDescription={newTaskDescription}
                  setNewTaskDescription={setNewTaskDescription}
                  handleAddTask={handleAddTask}
                  editingTask={editingTask}
                  editingTaskTitle={editingTaskTitle}
                  setEditingTaskTitle={setEditingTaskTitle}
                  editingTaskDescription={editingTaskDescription}
                  setEditingTaskDescription={setEditingTaskDescription}
                  handleSaveTask={handleSaveTask}
                  handleEditTask={handleEditTask}
                  handleDeleteTask={handleDeleteTask}
                  handleToggleDescription={handleToggleDescription}
                  showDescription={showDescription}
                  holidays={holidays}
                />
              </div>
            </SectionCard>

            <SectionCard className="h-fit">
              <BranchDirectory />
            </SectionCard>

            {/* ══════════════════════════════════════════
                ATTENDANCE REQUESTS — Live Panel
            ══════════════════════════════════════════ */}
            <SectionCard className="flex flex-col">
              <PanelHeader
                icon={ClipboardList}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                title="Attendance Requests"
                subtitle="Review and approve employee requests"
                action={
                  <button
                    onClick={fetchAttendanceRequests}
                    disabled={requestsLoading}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 disabled:opacity-50"
                    title="Refresh"
                  >
                    <RefreshCw
                      size={14}
                      className={requestsLoading ? "animate-spin" : ""}
                    />
                  </button>
                }
              />

              {/* Mini stat bar */}
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-50 border border-orange-100 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  <span className="text-[10px] font-bold text-orange-700 tabular-nums">
                    {pendingCount}
                  </span>
                  <span className="text-[10px] text-orange-500 font-medium">
                    Pending
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-700 tabular-nums">
                    {approvedCount}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-medium">
                    Approved
                  </span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-red-50 border border-red-100 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[10px] font-bold text-red-700 tabular-nums">
                    {rejectedCount}
                  </span>
                  <span className="text-[10px] text-red-500 font-medium">
                    Rejected
                  </span>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="px-4 pb-2">
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
                  {[
                    { key: "pending", label: "Pending" },
                    { key: "approved", label: "Approved" },
                    { key: "rejected", label: "Rejected" },
                    { key: "all", label: "All" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setRequestFilter(tab.key)}
                      className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-all duration-200 ${
                        requestFilter === tab.key
                          ? "bg-white text-slate-800 shadow-sm"
                          : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Request list */}
              <div className="flex-1 overflow-y-auto max-h-[380px] custom-scrollbar">
                {requestsLoading ? (
                  <div className="divide-y divide-slate-50">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonRequestRow key={i} />
                    ))}
                  </div>
                ) : attendanceRequests.length > 0 ? (
                  attendanceRequests.map((request) => (
                    <RequestRow
                      key={request.id}
                      request={request}
                      onApprove={handleApproveRequest}
                      onReject={handleRejectRequest}
                      isProcessing={processingId === request.id}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 border border-slate-100">
                      <ClipboardList className="w-6 h-6 text-slate-200" />
                    </div>
                    <p className="text-xs font-bold text-slate-400">
                      No {requestFilter !== "all" ? requestFilter : ""} requests
                    </p>
                    <p className="text-[10px] text-slate-300 mt-1 text-center max-w-[180px]">
                      {requestFilter === "pending"
                        ? "All caught up! No pending requests to review."
                        : "No requests match this filter."}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer link */}
              <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => navigate("/requests")}
                  className="group flex items-center justify-center gap-1.5 w-full text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <FileText size={12} />
                  View All Requests
                  <ArrowUpRight
                    size={11}
                    className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                  />
                </button>
              </div>
            </SectionCard>
          </div>

          {/* ═══════════════════════════════════
              RIGHT COLUMN — Analytics
          ═══════════════════════════════════ */}
          <div className="xl:col-span-8 flex flex-col gap-5 sm:gap-6">
            <SectionCard>
              <PanelHeader
                icon={Activity}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
                title="Real-time Attendance"
                subtitle="Live monitoring of employee punctuality"
              />
              <div className="p-4 sm:p-6">
                <Punctual />
              </div>
            </SectionCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
              <SectionCard className="flex flex-col min-w-0">
                <PanelHeader
                  icon={TrendingUp}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-600"
                  title="Employee Activity"
                  subtitle="Attendance trend overview"
                />
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <div className="w-full flex-1 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-center min-h-[300px] sm:min-h-[340px] p-3">
                    <div className="w-full h-full">
                      <AttendanceDashboard data={activeEmployeeData} />
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard className="flex flex-col min-w-0">
                <PanelHeader
                  icon={ChartPie}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                  title="Department Overview"
                  subtitle="Headcount by department"
                />
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <div className="w-full flex-1 bg-slate-50/70 rounded-xl border border-slate-100 flex items-center justify-center min-h-[300px] sm:min-h-[340px] p-3">
                    <div className="w-full h-full">
                      <DepartmentDoughnutChart />
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            FOOTER
        ══════════════════════════════════════════════ */}
        <footer className="pt-2 pb-1">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-1">
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full shadow-sm">
                <span className="font-mono font-semibold text-slate-500">
                  CJIS-SERV01
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400">Revision 11.04.25</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-emerald-700 text-[11px] font-bold uppercase tracking-widest">
                System Stable
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
