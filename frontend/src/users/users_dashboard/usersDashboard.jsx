import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Briefcase, FileText, UserCog, UserPlus, Contact    } from "lucide-react";
// import "../../../Styles/components/employee/employeeDashboard.css";
import { useSession } from "../../context/SessionContext";
// import useCardPermissions from "../user_permisson/hooks/useCardPermissions";
import usePermissions from "../../users/hooks/usePermissions"; 

const UsersManagement = () => {
  const { user } = useSession();    

  // const { cardPermissions, loading: cardPermLoading  } = useCardPermissions(user?.role);
  const { permissions, loading } = usePermissions(user?.username); 

  const navigate = useNavigate();

  const goToUsersManagement = () => navigate("/users");
  const goToUsersRoleManagement = () => navigate("/role-manager");
  const goToEmployee201 = () => navigate("/employee201");
  const goToApprover = () => navigate("/approval-assign");
  const goToApprovalsQueue = () => navigate("/approval");

  return (
<div className="flex flex-col items-center w-full h-full px-4 md:px-10 pb-20 gap-6">
  {/* Header */}
  <div className="flex flex-row w-full pt-2 pb-3 border-b-2 gap-x-2 items-end Glc-dashboard-bg-header">
    <span className="text-2xl font-semibold">Users Management</span>
    <span className="text-sm font-bold nb-dashboard-text-subheader">
      DASHBOARD
    </span>
  </div>

  {/* Cards wrapper with vertical centering */}
  <div className="flex-1 flex items-center justify-center w-full">

     {/* if without 201 2 col */}
    <div className="  flex flex-wrap justify-center items-center gap-8">

     {/* if with 201 3 col */}
    {/*  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:grid-rows-2 lg:grid-cols-3 lg:grid-rows-1 md:gap-8 justify-items-center items-center w-full">*/}

      {/* Departments */}


      {/* Employee List */}
          {!loading && permissions?.manage_users_access && (

      <a
        onClick={goToUsersManagement}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
        style={{ borderRadius: 15 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
          <Users size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
          <Users size={"15%"} strokeWidth={1} /> Role-Based Access Control 
        </h3>
        <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-violet-200">
          View & Manage Roles based Access
        </p>
      </a>
            )}
            


      {!loading && permissions?.user_role_management && (

            <a
        onClick={goToUsersRoleManagement}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
        style={{ borderRadius: 15 }}

      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
          <UserCog  size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
          <UserCog  size={"15%"} strokeWidth={1} /> Role Management
        </h3>
        <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Manage Employee Roles
        </p>
      </a>
            )}

      {!loading && permissions?.assign_approver && (

                <a
            onClick={goToApprover}
            className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
            style={{ borderRadius: 15 }}

          >
            <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <UserPlus   size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
              <UserPlus   size={"15%"} strokeWidth={1} /> Assign Approver Level
            </h3>
            <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
              Assign Approver Level to Roles
            </p>
          </a>
      )}

      {!loading && permissions?.approvals_queue && (

                <a
            onClick={goToApprovalsQueue}
            className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]"
            style={{ borderRadius: 15 }}

          >
            <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <Contact    size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium duration-300 Glc-dashboard-newdesign-textcolor">
              <Contact    size={"15%"} strokeWidth={1} />Approvals Queue
            </h3>
            <p className="relative z-10 duration-300 Glc-dashboard-newdesign-textcolor2 text-slate-400">
              Approvals Shift Queue
            </p>
          </a>
      )}

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

export default UsersManagement;
