import { ListCheck, Logs, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
// import useCardPermissions from "../../user_permisson/hooks/useCardPermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 
import { Users, Briefcase, FileText } from "lucide-react";

const Att_dashboard_v3 = () => {
  const { user } = useSession();
  // const { permissions, loading: permLoading } = usePermissions(user?.role);
  // const { cardPermissions, loading: cardPermLoading  } = useCardPermissions(user?.role);
  // const { permissions, loading: permLoading } = usePermissions(user?.username); 
  const { permissions, loading } = usePermissions(user?.username); 

  const navigate = useNavigate();

  const goToDTR = () => {
    navigate("/attendanceRecord");
  };

  const goToLOG = () => {
    navigate("/attendance");
  };

  const goToApproveLeave = () => {
    navigate("/ApproveLeavePage"); // <-- your new route
  };
  const goToScheduleM =() => {
    navigate("/ShiftSchedulePage");
  };

return (
  <div className="flex flex-col items-center justify-around w-full h-full gap-6 px-4 py-6 pb-20 text-center md:flex-row md:flex-wrap">
    {/* Attendance DTR */}
    {!loading && permissions?.attendance_dtr && (
      <a
        onClick={goToDTR}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] 
                        group-hover:translate-y-[0%] transition-transform duration-300 
                        Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 
                        w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 
                        Glc-dashboard-newdesign-iconcolor">
          <ListCheck size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <ListCheck size={"15%"} strokeWidth={1} /> Horizon Time & Attendance
        </h3>
<p
  className="relative z-10 Glc-dashboard-newdesign-textcolor2 
             text-slate-400 text-xs sm:text-sm md:text-base 
             leading-snug px-3 text-center break-words"
>
  Manage Employees Time &<br className="hidden sm:block" />
  Attendance
</p>


      </a>
    )}

    {/* Attendance Logs */}
    {!loading && permissions?.attendance_log && (
      <a
        onClick={goToLOG}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] 
                        group-hover:translate-y-[0%] transition-transform duration-300 
                        Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 
                        w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 
                        Glc-dashboard-newdesign-iconcolor">
          <Logs size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <Logs size={"15%"} strokeWidth={1} /> Attendance Logs
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-violet-200">
          Manage Attendance Logs
        </p>
      </a>
    )}

    {/* Approve Leave */}
    {!loading && permissions?.leave_access && (
      <a
        onClick={goToApproveLeave}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] 
                        group-hover:translate-y-[0%] transition-transform duration-300 
                        Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 
                        w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 
                        Glc-dashboard-newdesign-iconcolor">
          <CheckCircle size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor text-slate-950">
          <CheckCircle size={"15%"} strokeWidth={1} /> Leave
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400 group-hover:text-green-400">
          Manage Employee Leaves
        </p>
      </a>
    )}

    {/* Schedule Management */}
    {!loading && permissions?.schedule_management && (
      <a
        onClick={goToScheduleM}
        className="attendance-dashboard-box_v3 nb-dashboard-bg group w-full max-w-sm min-w-[300px] min-h-[160px] md:min-h-[200px]"
        style={{ borderRadius: 15 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r translate-y-[100%] 
                        group-hover:translate-y-[0%] transition-transform duration-300 
                        Glc-dashboard-newdesign-bgcolor" />
        <div className="absolute z-10 transition-transform duration-300 
                        w-fit -bottom-8 -right-35 text-slate-200 group-hover:rotate-12 
                        Glc-dashboard-newdesign-iconcolor">
          <Briefcase size={"70%"} strokeWidth={1} />
        </div>
        <h3 className="relative z-10 text-lg font-medium Glc-dashboard-newdesign-textcolor">
          <Briefcase size={"15%"} strokeWidth={1} /> Schedule Management
        </h3>
        <p className="relative z-10 Glc-dashboard-newdesign-textcolor2 text-slate-400">
          Assign Employee Schedule
        </p>
      </a>
    )}
  </div>
);

};

export default Att_dashboard_v3;
