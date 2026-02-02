import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, FileText } from "lucide-react";
import "../../../Styles/components/employee/employeeDashboard.css";

const EmployeeDashboard = () => {
  const navigate = useNavigate();

  const goToDepartment = () => navigate("/department");
  const goToEmployeeList = () => navigate("/employees");
  const goToScheduleM = () => navigate("/ShiftSchedulePage");
  const goToScheduleS = () => navigate("/WorkTimeSettings");
  const goToEmployee201 = () => navigate("/employee201");

  return (
    <div className="flex flex-col items-center w-full h-full px-4 md:px-10 pb-20 gap-6">
      {/* Header */}
      <div className="flex flex-row w-full pt-2 pb-3 border-b-2 gap-x-2 items-end Glc-dashboard-bg-header">
        <span className="text-2xl font-semibold">Attendance</span>
        <span className="text-sm font-bold nb-dashboard-text-subheader">
          DASHBOARD
        </span>
      </div>

      {/* Cards wrapper with vertical centering */}
      <div className="flex-1 flex items-center justify-center w-full">
        {/* if without 201 2 col */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:grid-rows-2 lg:grid-cols-2 lg:grid-rows-1 md:gap-8 justify-items-center items-center w-full">
          {/* if with 201 3 col */}
          {/*  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:grid-rows-2 lg:grid-cols-3 lg:grid-rows-1 md:gap-8 justify-items-center items-center w-full">*/}

          {/* Departments */}

          {/* Employee List */}
          <a
            onClick={goToEmployeeList}
            className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
          >
            <div className="absolute inset-0 bg-linear-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <Users size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
              <Users size={"15%"} strokeWidth={1} /> Employee List
            </h3>
            <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-violet-200">
              View & Manage Employees
            </p>
          </a>

          <a
            onClick={goToDepartment}
            className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
          >
            <div className="absolute inset-0 bg-linear-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <Briefcase size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
              <Briefcase size={"15%"} strokeWidth={1} /> Departments
            </h3>
            <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
              Manage Employee Departments
            </p>
          </a>

          <a
            onClick={goToScheduleM}
            className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
          >
            <div className="absolute inset-0 bg-linear-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <Briefcase size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
              <Briefcase size={"15%"} strokeWidth={1} /> Schedule Management
            </h3>
            <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
              Assign Employee Schedule
            </p>
          </a>

          <a
            onClick={goToScheduleS}
            className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
          >
            <div className="absolute inset-0 bg-linear-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <Briefcase size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
              <Briefcase size={"15%"} strokeWidth={1} /> Schedule Settings
            </h3>
            <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
              Manage Schedule
            </p>
          </a>

          {/* Employee 201 */}
          {/* <a
        onClick={goToEmployee201}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
          <FileText size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
          <FileText size={"15%"} strokeWidth={1} /> Employee 201
        </h3>
        <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-green-400">
          Manage Employee Records
        </p>
      </a> */}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
