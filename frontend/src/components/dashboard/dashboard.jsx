import React, { useEffect, useState } from "react";
import { useSession } from "../../../src/context/SessionContext";
import { useNavigate } from "react-router-dom";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
} from "date-fns";
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
} from "lucide-react";
import Snowfall from "react-snowfall";

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

function Dashboard() {
  const { user } = useSession();
  const navigate = useNavigate();

  // --- State Management ---
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [activeEmployeeData, setActiveEmployeeData] = useState([]);
  const [showTasks, setShowTasks] = useState(false);
  const [holidays, setHolidays] = useState([]);

  // Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [showAddTask, setShowAddTask] = useState(false);

  // Task Editing State
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const [editingTaskDescription, setEditingTaskDescription] = useState("");
  const [showDescription, setShowDescription] = useState({});

  // --- Handlers ---

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

  const handlePrevMonth = () => {
    setSelectedDate(
      (prevDate) =>
        new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1),
    );
  };

  const handleNextMonth = () => {
    setSelectedDate(
      (prevDate) =>
        new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1),
    );
  };

  const handleToggleDescription = (dateKey, index) => {
    setShowDescription((prev) => ({
      ...prev,
      [`${dateKey}-${index}`]: !prev[`${dateKey}-${index}`],
    }));
  };

  // --- Task Logic (CRUD) ---

  const handleAddTask = () => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    const newTask = { title: newTaskTitle, description: newTaskDescription };
    setTasks((prev) => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), newTask],
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
    setTasks((prev) => ({
      ...prev,
      [dateKey]: updatedTasks,
    }));
    setEditingTask(null);
    setEditingTaskTitle("");
    setEditingTaskDescription("");
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const handleDeleteTask = (dateKey, index) => {
    const updatedTasks = tasks[dateKey].filter((_, i) => i !== index);
    setTasks((prev) => ({
      ...prev,
      [dateKey]: updatedTasks,
    }));
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const loadTasks = () => {
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || {};
    setTasks(savedTasks);
  };

  // --- Date & Time Logic ---

  const now = new Date();
  const philippinesTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
  const hours = philippinesTime.getHours();

  let greeting = "Hello";
  if (hours >= 0 && hours < 12) {
    greeting = "Good morning";
  } else if (hours >= 12 && hours < 18) {
    greeting = "Good afternoon";
  } else {
    greeting = "Good evening";
  }

  // --- Data Fetching ---

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await fetch(`${BASE_URL}/holiday/get_holiday.php`);
        const data = await res.json();
        if (data.success) {
          setHolidays(data.data || []);
        } else {
          console.warn("⚠️ No holiday data found.");
        }
      } catch (err) {
        console.error("❌ Error fetching holidays:", err);
      }
    };
    fetchHolidays();
  }, []);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch employee count
        const employeeResponse = await fetch(
          `${BASE_URL}/employeesSide/employees.php?count=true`,
        );
        if (employeeResponse.ok) {
          const data = await employeeResponse.json();
          setEmployeeCount(data.total_count);
        }

        // Fetch department count
        const departmentResponse = await fetch(
          `${BASE_URL}/departments/department.php?count=true`,
        );
        if (departmentResponse.ok) {
          const departmentData = await departmentResponse.json();
          setDepartmentCount(departmentData.total_departments);
        }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    fetchCounts();
    loadTasks();
  }, []);

  return (
    <>
      {/* <Snowfall color="white"/> */}

      {/* Main Container */}
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* --- Header Section --- */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="p-2 bg-indigo-50 rounded-lg text-blue-600">
                  <LayoutDashboard size={24} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {greeting},{" "}
                  <span className="text-blue-600">
                    {user?.full_name || user?.username}
                  </span>
                </h1>
              </div>
              <div className="flex flex-col md:flex-row md:items-center text-slate-500 font-medium ml-4 md:ml-11">
                {/* Top Line: Role */}
                <span className="text-lg md:text-base">
                  {user?.role || "Admin"} Dashboard
                </span>

                {/* Separator: Hidden on mobile, Visible on Desktop */}
                <span className="hidden md:block mx-2">•</span>

                {/* Bottom Line: Date (Smaller on mobile) */}
                <span className="text-sm md:text-base text-slate-400 md:text-slate-500">
                  {format(new Date(), "EEEE, MMMM dd, yyyy")}
                </span>
              </div>
            </div>

            {/* Quick Stats Summary */}
            {/* responsive breakdown:
   - w-full: Full width on phones
   - md:w-auto: Snaps to content width on iPad Mini (768px) & Zenbook Fold (853px)
   - flex-wrap: Prevents breaking if the screen gets very narrow
*/}
            <div className="flex flex-wrap w-full md:w-auto gap-3 mt-4 md:mt-0 ml-4 md:ml-0 pr-4 md:pr-0">
              {/* Employees Card */}
              {/* flex-1 (stretches on mobile) -> md:flex-none (compact on iPad/Fold) */}
              <div className="flex-1 md:flex-none px-10 py-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center min-w-[120px] shadow-sm transition-all hover:shadow-md">
                <span className="text-2xl md:text-3xl font-bold text-slate-800">
                  {(employeeCount ?? 0).toString().padStart(2, "0")}
                </span>
                <span className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  Employees
                </span>
              </div>

              {/* Departments Card */}
              <div className="flex-1 md:flex-none px-[1.875rem] py-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center min-w-[120px] shadow-sm transition-all hover:shadow-md">
                <span className="text-2xl md:text-3xl font-bold text-slate-800">
                  {(departmentCount ?? 0).toString().padStart(2, "0")}
                </span>
                <span className="text-[11px] md:text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">
                  Departments
                </span>
              </div>
            </div>
          </header>

          {/* --- Main Grid Layout --- */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* === LEFT COLUMN: Operational (Tasks & Directory) === */}
            <div className="xl:col-span-4 flex flex-col gap-6">
              {/* Task Management Widget (Restored Content) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-fit">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold text-slate-800">
                      Calendar & Tasks
                    </h3>
                  </div>
                  {/* Add Task Button (Ensures user can add tasks) */}
                  {!showAddTask && (
                    <button
                      onClick={handleShowAddTask}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-900 bg-indigo-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Plus size={14} /> New Task
                    </button>
                  )}
                </div>

                {/* Task Manager Component */}
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
              </div>

              {/* Branch Directory Widget */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                {/* This renders the directory list you see in the screenshot */}
                <BranchDirectory />
              </div>
            </div>

            {/* === RIGHT COLUMN: Analytics & Reporting === */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              {/* Top Row: Attendance Analytics */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                    <Activity size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Real-time Attendance
                    </h3>
                    <p className="text-xs text-slate-500">
                      Live monitoring of employee punctuality
                    </p>
                  </div>
                </div>
                <div className="w-full">
                  <Punctual />
                </div>
              </div>

              {/* Bottom Row: Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Activity Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <TrendingUp size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Employee Activity
                    </h3>
                  </div>
                  <div className="flex-1 w-full bg-slate-50/50 rounded-xl border border-slate-100 p-2 flex items-center justify-center min-h-[300px]">
                    <AttendanceDashboard data={activeEmployeeData} />
                  </div>
                </div>

                {/* Department Distribution */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <ChartPie strokeWidth={2.25} />{" "}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">
                      Department Overview
                    </h3>
                  </div>
                  <div className="flex-1 w-full bg-slate-50/50 rounded-xl border border-slate-100 p-2 flex items-center justify-center min-h-[300px]">
                    <DepartmentDoughnutChart />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* --- Footer --- */}
          <footer className="mt-auto pt-6 pb-2 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 font-medium px-4">
              {/* Left: Server/Revision Info */}
              <div className="flex items-center gap-2 mb-2 sm:mb-0">
                <span className="font bold-mono text-slate-400">
                  CJIS-SERV01
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span>Revision 11.04.25</span>
              </div>

              {/* Right: System Status with Visual Indicator */}
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-emerald-700 tracking-wide uppercase text-[10px] font-bold">
                  System Stable
                </span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
