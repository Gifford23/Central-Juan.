import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, Building2, Fingerprint } from "lucide-react";
import "../../../Styles/components/employee/employeeDashboard.css";
import { useSession } from "../../context/SessionContext";
import usePermissions from "../../users/hooks/usePermissions";

const EmployeeDashboard = () => {
  const { user } = useSession();
  const { permissions, loading } = usePermissions(user?.username);
  const navigate = useNavigate();

  const goToDepartment = () => navigate("/department");
  const goToEmployeeList = () => navigate("/employees");
  const goToBranches = () => navigate("/branches");
  const goToUsersBiometrics = () => navigate("/UsersBiometrics");

  return (
    <div className="flex flex-col items-center w-full h-full gap-6 px-4 pb-20 md:px-10">
      {/* Header */}
      <div className="flex flex-row items-end w-full pt-2 pb-3 border-b-2 gap-x-2 Glc-dashboard-bg-header">
        <span className="text-2xl font-semibold">Employee</span>
        <span className="text-sm font-bold nb-dashboard-text-subheader">
          DASHBOARD
        </span>
      </div>

      {/* Cards Wrapper */}
      <div className="flex flex-1 w-full items-center justify-center">
        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : (
          <div
            className={`
              inline-grid justify-items-center gap-6 md:gap-8 w-auto
              ${(() => {
                const visibleCount = [
                  permissions?.employee_list,
                  permissions?.department,
                  permissions?.branches,
                  permissions?.user_biometrics,
                ].filter(Boolean).length;

                if (visibleCount === 1) return "grid-cols-1";
                if (visibleCount === 2) return "grid-cols-1 md:grid-cols-2";
                if (visibleCount === 3) return "grid-cols-1 md:grid-cols-3";
                return "grid-cols-1 md:grid-cols-4";
              })()}
            `}
          >
            {/* Employee List */}
            {permissions?.employee_list && (
              <a
                onClick={goToEmployeeList}
                className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
                style={{ borderRadius: 15 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
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
            )}

            {/* Department */}
            {permissions?.department && (
              <a
                onClick={goToDepartment}
                className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
                style={{ borderRadius: 15 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
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
            )}

            {/* Branches */}
            {permissions?.branches && (
              <a
                onClick={goToBranches}
                className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
                style={{ borderRadius: 15 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
                <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
                  <Building2 size={"70%"} strokeWidth={1} />
                </div>
                <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
                  <Building2 size={"15%"} strokeWidth={1} /> Branch
                </h3>
                <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
                  Manage Branches
                </p>
              </a>
            )}

            {/* Biometrics */}
            {permissions?.user_biometrics && (
              <a
                onClick={goToUsersBiometrics}
                className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
                style={{ borderRadius: 15 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
                <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
                  <Fingerprint size={"70%"} strokeWidth={1} />
                </div>
                <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
                  <Fingerprint size={"15%"} strokeWidth={1} /> Biometrics
                </h3>
                <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
                  Manage Users Biometrics
                </p>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
