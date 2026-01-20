import { useNavigate } from "react-router-dom";
import { useSession } from "../../../context/SessionContext";
// import useCardPermissions from "../../user_permisson/hooks/useCardPermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 

import {
  AlarmClockPlus,
  Banknote,
  Calendar1,
  PhilippinePeso,
  ClipboardList,
  Users,
  Briefcase
} from "lucide-react";

const util_dashboard_v2 = () => {
  const { user } = useSession();
  // const { cardPermissions, loading: cardPermLoading  } = useCardPermissions(user?.role);
  const { permissions, loading } = usePermissions(user?.username); 

  const navigate = useNavigate();

  const goToSalaryGrade = () => {
    // console.log("Button clicked, navigating to Salary Grades");
    navigate("/salaryGrades");
  };

  const gotToSalaryforEmployee = () => {
    // console.log("Button clicked, navigating to Salary for Employee");
    navigate("/salary_for_employee");
  };

  const goToDeduction = () => {
    // console.log("Button clicked, navigating to Deductions");
    navigate("/deduction");
  };

  const goToOvertime = () => {
    // console.log("Button clicked, navigating to Overtime");
    navigate("/overtime");
  };

  const goToHoliday = () => {
    // console.log("Button clicked, navigating to Holidays");
    navigate("/holidays");
  };

  const goToLeaveBalance = () => {
    // console.log("Button clicked, navigating to Employee Leave Balances");
    navigate("/LeaveBalancePage"); // <-- adjust this route to match your LeaveBalanceList page
  };

  const goToLeaveTypePage = () => {
    // console.log("Button clicked, navigating to Employee Leave Balances");
    navigate("/LeaveTypePage"); // <-- adjust this route to match your LeaveBalanceList page
  };

  const goToScheduleS = () => {
    // console.log("Button clicked, navigating to Employee Leave Balances");
    navigate("/WorkTimeSettings"); // <-- adjust this route to match your LeaveBalanceList page
  };
  
  return (
    <div className="flex flex-col items-center w-full h-full gap-6 px-4 py-6 pb-20">
      {/* Row 1 → 3 Cards */}
      <div className="flex flex-col items-center justify-center w-full gap-6 md:flex-row">
        {/* {!loading && permissions?.late_deduction && (
          <a onClick={goToDeduction} className="utilities-dashboard-box_v3 nb-dashboard-bg min-w-[300px] group w-full max-w-sm min-h-[160px] md:min-h-[200px]" style={{ borderRadius: 15 }}>
            <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
            <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
              <Banknote size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
              <Banknote size={"15%"} strokeWidth={1} /> Late Deductions
            </h3>
            <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">Manage Late Deductions</p>
          </a>
        )} */}

        {!loading && permissions?.leave_type && (
          <a onClick={goToLeaveTypePage} className="utilities-dashboard-box_v3 nb-dashboard-bg min-w-[300px] group w-full max-w-sm min-h-[160px] md:min-h-[200px]" style={{ borderRadius: 15 }}>
            <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
            <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
              <Banknote size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
              <Banknote size={"15%"} strokeWidth={1} /> Leave Type
            </h3>
            <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">Manage Leave Type</p>
          </a>
        )}

        {!loading && permissions?.overtime && (
          <a onClick={goToOvertime} className="utilities-dashboard-box_v3 nb-dashboard-bg group min-w-[300px] w-full max-w-sm min-h-[160px] md:min-h-[200px]" style={{ borderRadius: 15 }}>
            <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
            <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
              <AlarmClockPlus size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
              <AlarmClockPlus size={"15%"} strokeWidth={1} /> Overtime
            </h3>
            <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">Manage Overtime</p>
          </a>
        )}
      </div>

      {/* Row 2 → 3 Cards */}
      <div className="flex flex-col items-center justify-center w-full gap-6 md:flex-row">
        {!loading && permissions?.holiday && (
          <a onClick={goToHoliday} className="utilities-dashboard-box_v3 nb-dashboard-bg group min-w-[300px] w-full max-w-sm min-h-[160px] md:min-h-[200px]" style={{ borderRadius: 15 }}>
            <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
            <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
              <Calendar1 size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
              <Calendar1 size={"15%"} strokeWidth={1} /> Holidays
            </h3>
            <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">Manage Holidays</p>
          </a>
        )}

        {!loading && permissions?.leave_balances && (
          <a onClick={goToLeaveBalance} className="utilities-dashboard-box_v3 nb-dashboard-bg min-w-[300px] group w-full max-w-sm min-h-[160px] md:min-h-[200px]" style={{ borderRadius: 15 }}>
            <div className="Glc-dashboard-newdesign-bgcolor absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
            <div className="absolute z-10 transition-transform duration-300 Glc-dashboard-newdesign-iconcolor w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12">
              <ClipboardList size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
              <ClipboardList size={"15%"} strokeWidth={1} /> Leave Balances
            </h3>
            <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">View Employee Leave Balances</p>
          </a>
        )}

        {!loading && permissions?.schedule_settings && (
          <a onClick={goToScheduleS} className="attendance-dashboard-box_v3 nb-dashboard-bg group relative cursor-pointer w-full max-w-sm min-w-[300px]" style={{ borderRadius: 15 }}>
            <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300 Glc-dashboard-newdesign-bgcolor" />
            <div className="absolute z-10 transition-transform duration-300 w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 Glc-dashboard-newdesign-iconcolor">
              <Briefcase size={"70%"} strokeWidth={1} />
            </div>
            <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
              <Briefcase size={"15%"} strokeWidth={1} /> Work Time Settings
            </h3>
            <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">Manage Work Time Settings</p>
          </a>
        )}
      </div>
    </div>
  );

};

export default util_dashboard_v2;
