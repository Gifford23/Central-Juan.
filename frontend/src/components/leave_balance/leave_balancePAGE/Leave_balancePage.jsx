import React from "react";
import LeaveBalanceList from "../leave_balance_components/LeaveBalanceList"; 
// 👆 adjust the path depending on where your component is stored
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions";
//  const breadcrumbItems = [
//     // { label: 'Payroll Dashboard', path: '/payrolldashboard' },
//     { label: 'Leave Types', path: '/LeaveTypePage' },
//     { label: 'Overtime', path: '/overtime' },
//     { label: 'Holidays', path: '/holidays' },
//     { label: 'Leave Balance', path: '/LeaveBalancePage' },
//     { label: 'Work Time Settings', path: '/WorkTimeSettings' },
//  ];

export default function LeaveBalancePage() {
     const { user } = useSession();
      const { permissions, loading: permLoading } = usePermissions(user?.username); 
      const breadcrumbItems = [
        !permLoading && permissions?.leave_type && { label: 'Leave Types', path: '/LeaveTypePage' },
        !permLoading && permissions?.overtime && { label: 'Overtime', path: '/overtime' },
        !permLoading && permissions?.holiday && { label: 'Holidays', path: '/holidays' },
        !permLoading && permissions?.leave_balances && { label: 'Leave Balance', path: '/LeaveBalancePage' },
        !permLoading && permissions?.schedule_settings && { label: 'Work Time Settings', path: '/WorkTimeSettings' },
      ].filter(Boolean); // remove any falsy (unauthorized) entries

  return (
    <div className="p-6">

          <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>Leave Balances</span>
              {/* <div className="hidden md:block"> */}
                <Breadcrumbs items={breadcrumbItems} />
              {/* </div> */}
            </div>
      
      {/* Render your reusable component */}
      <LeaveBalanceList />
    </div>
  );
}
