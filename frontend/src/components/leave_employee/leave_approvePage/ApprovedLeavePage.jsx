import React from "react";
import ApproveLeaveTable from "../leave_approve_components/ApproveLeaveTable";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";

// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions"; 

export default function ApproveLeavePage() {
  const { user } = useSession(); // ✅ get user FIRST
  // const { permissions, loading: permLoading } = usePermissions(user?.role); // ✅ now safe
  const { permissions, loading: permLoading } = usePermissions(user?.username); 

  const isApproveLeave = location.pathname.includes("/attendance"); // ✅ fix `.includes ===` bug

  if (permLoading) return <p>Loading permissions...</p>;

const breadcrumbItems = [
  !permLoading && permissions?.attendance_dtr && { label: 'Horizon Time & Attendance', path: '/attendanceRecord' },
  !permLoading && permissions?.attendance_log && { label: 'Attendance Logs', path: '/attendance' },
  !permLoading && permissions?.leave_access && { label: 'Manage Leave', path: '/ApproveLeavePage' },
  !permLoading && permissions?.schedule_management && { label: 'Schedule Management', path: '/ShiftSchedulePage' },
].filter(Boolean); // remove any falsy (unauthorized) entries


  return (
      <>
        {!isApproveLeave && (
          <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className="text-2xl font-semibold">Approved Leave List</span>
              <div className="hidden md:block">
                <Breadcrumbs items={breadcrumbItems} />
              </div>          
            </div>
        )}

        {!permLoading && permissions?.can_add && (
          <ApproveLeaveTable />
        )}

        {/* {!permLoading && !permissions.can_action && (
          <p className="text-red-600">
            You don’t have permission to view this page.
          </p>
        )} */}
      </>
  );
}
