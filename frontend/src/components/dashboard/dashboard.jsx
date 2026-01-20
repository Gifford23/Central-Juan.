import { useEffect, useState } from "react";
import { useSession } from "../../../src/context/SessionContext";
import { useNavigate } from "react-router-dom";
import "../../../Styles/dashboard/dashboard.css";
import "../../../Styles/globals.css"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import AttendanceDashboard from '../../components/employees/EmployeeBarChart'; // Import the bar chart component
import DepartmentDoughnutChart from '../departments/departmentDoughnut';
import ActiveEmployees from './ActiveEmployees';
import Punctual from './punctual';
import BASE_URL from '../../../backend/server/config'; 
import TaskManagement from './taskManager';
import BranchDirectory from "./BranchDirectory";
import Snowfall from "react-snowfall";
function Dashboard() {
  const { user } = useSession();
  const navigate = useNavigate();
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState({});
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskDescription, setEditingTaskDescription] = useState('');
  const [showDescription, setShowDescription] = useState({});
  const [showAddTask, setShowAddTask] = useState(false);
  const [activeEmployeeData, setActiveEmployeeData] = useState([]);
  const [showTasks, setShowTasks] = useState(false);
  const [holidays, setHolidays] = useState([]);
  
  const handleShowTasks = () => {
    setShowTasks(true);
    setShowAddTask(false); // Optionally hide the add task section
  };

useEffect(() => {
  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${BASE_URL}/holiday/get_holiday.php`);
      const data = await res.json();
      if (data.success) {
        setHolidays(data.data || []);   // ✅ this is correct
        console.log("📅 Holidays fetched:", data.data);
      } else {
        console.warn("⚠️ No holiday data found.");
      }
    } catch (err) {
      console.error("❌ Error fetching holidays:", err);
    }
  };

  fetchHolidays();
}, []);

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate),
  });

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowTasks(true);
    setShowAddTask(false);
  };

  const handleAddTask = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newTask = { title: newTaskTitle, description: newTaskDescription };
    setTasks((prevTasks) => ({
      ...prevTasks,
      [dateKey]: [...(prevTasks[dateKey] || []), newTask],
    }));
    setNewTaskTitle('');
    setNewTaskDescription('');
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
    updatedTasks[index] = { title: editingTaskTitle, description: editingTaskDescription };
    setTasks((prevTasks) => ({
      ...prevTasks,
      [dateKey]: updatedTasks,
    }));
    setEditingTask(null);
    setEditingTaskTitle('');
    setEditingTaskDescription('');
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const handleDeleteTask = (dateKey, index) => {
    const updatedTasks = tasks[dateKey].filter((_, i) => i !== index);
    setTasks((prevTasks) => ({
      ...prevTasks,
      [dateKey]: updatedTasks,
    }));
    localStorage.setItem("tasks", JSON.stringify(updatedTasks));
  };

  const handleToggleDescription = (dateKey, index) => {
    setShowDescription((prevShowDescription) => ({
      ...prevShowDescription,
      [`${dateKey}-${index}`]: !prevShowDescription[`${dateKey}-${index}`],
    }));
  };

  const handlePrevMonth = () => {
    setSelectedDate((prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate((prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1));
  };

  const loadTasks = () => {
    const savedTasks = JSON.parse(localStorage.getItem("tasks")) || {};
    setTasks(savedTasks);
  };

  const handleShowAddTask = () => {
    setShowAddTask(true);
    setShowTasks(false);
  };


  const now = new Date();
    const philippinesTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );
    const hours = philippinesTime.getHours();

    // Determine greeting
    let greeting = "Hello";
    if (hours >= 0 && hours < 12) {
      greeting = "Good morning";
    } else if (hours >= 12 && hours < 18) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    // Determine TEST greeting
    // let greeting = "Hello";
    // if (hours >= 0 && hours < 12) {
    //   greeting = "Good morning";
    // } else if (hours >= 12 && hours < 18) {
    //   greeting = "Good afternoon";
    // } else {
    //   greeting = "Good evening";
    // }

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        // Fetch employee count
        const employeeResponse = await fetch(
          `${BASE_URL}/employeesSide/employees.php?count=true`
        );
        if (employeeResponse.ok) {
          const data = await employeeResponse.json();
          setEmployeeCount(data.total_count);
        } else {
          console.error("Failed to fetch employee count");
        }

        // Fetch department count
        const departmentResponse = await fetch(
          `${BASE_URL}/departments/department.php?count=true`
        );
        if (departmentResponse.ok) {
          const departmentData = await departmentResponse.json();
          setDepartmentCount(departmentData.total_departments);
        } else {
          console.error("Failed to fetch department count");
        }

        // Fetch active employee data for the bar chart
        // const activeEmployeeResponse = await fetch(
        //   `${BASE_URL}/employeesSide/activeEmployees.php` // Adjust the URL as needed
        // );
        // if (activeEmployeeResponse.ok) {
        //   const activeData = await activeEmployeeResponse.json();
        //   setActiveEmployeeData(activeData); // Assuming activeData is an array of { date, count }
        // } else {
        //   console.error("Failed to fetch active employee data");
        // }
      } catch (error) {
        console.error("Error fetching counts:", error);
      }
    };

    fetchCounts();
    loadTasks(); // Load tasks from local storage
  }, []);

  // Get the day of the week for the first day of the month
  const firstDayOfMonth = getDay(startOfMonth(selectedDate));

  return (
    <>
{/* <Snowfall color="white"/> */}
<div className="w-full dashboard-container">
  {/** Head Content */}
  <div className="flex flex-col w-full mb-1 md:flex-row">

<div className="flex-1 p-5">
  <h1 className="text-2xl sm:text-3xl font-semibold leading-snug w-full break-words flex flex-col md:flex-row md:items-baseline md:gap-2">
    {greeting},{" "}
    <span className="font-bold">
      {user?.full_name || user?.username}
    </span>
    <span className="font-medium text-gray-600 text-xl sm:text-2xl">
      {user?.role}
    </span>
  </h1>
</div>


    <div className="flex flex-wrap justify-end gap-4 p-2">
      <div className="text-end">
        <div className="text-2xl md:text-4xl font-albert">
          {(employeeCount ?? 0).toString().padStart(2, "0")}
        </div>
        <p className="font-albert">Employee</p>
      </div>
      <div className="text-end">
        <div className="text-2xl md:text-4xl font-albert">
          {(departmentCount ?? 0).toString().padStart(2, "0")}
        </div>
        <p className="font-albert">Department</p>
      </div>
    </div>
  </div>

  {/** Dashboard Content */}
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* ===== Left Column (Task + Branch Directory) ===== */}
      <div className="flex flex-col w-full gap-6 lg:w-1/3">
        {/* 🗓️ Task Management */}
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

        {/* 🏢 Branch Directory (Under Task Management) */}
        <div className="bg-gray-800/50 rounded-2xl shadow-md border border-gray-700">
          <BranchDirectory />
        </div>
      </div>

      {/* ===== Right Column (Charts and Analytics) ===== */}
      <div className="flex flex-col w-full gap-4 lg:w-2/3">
        <div className="w-full">
          <Punctual />
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          {/* Attendance Bar Chart */}
          <div className="flex flex-col w-full p-4 bg-gray-600 rounded-3xl md:w-1/2">
            <AttendanceDashboard data={activeEmployeeData} />
          </div>

          {/* Department Doughnut Chart */}
          <div className="flex items-center justify-center w-full p-4 bg-gray-600 rounded-3xl md:w-1/2">
            <DepartmentDoughnutChart />
          </div>
        </div>
      </div>
    </div>
</div>
{/* Footer: Server + Revision Info */}
<div className="w-full text-center py-3 pb-[83px] sm:pb-3 text-sm mt-10 border-t border-gray-700 text-black font-bold tracking-wide">
  <p>
    CJIS-SERV01 — Revision 11-04-25
  </p>
</div>


</>
  );
}

export default Dashboard;