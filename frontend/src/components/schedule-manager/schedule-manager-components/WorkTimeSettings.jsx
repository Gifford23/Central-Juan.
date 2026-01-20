import { useState, useEffect } from "react";
import BreakTimeTable from "../../break-time/componets/BreakTimeTable";
import WorkTimeBreakTable from "../../work-time-break/work-time-break-components/WorkTimeBreakTable";
import ShiftMappingManager from "../../late-deduction-settings/late-deduction-mapping/late-deduction-mappingComponents/ShiftMappingManager";
import TierAndRulesManagementPage from "../../late-deduction-settings/late-deduction-TierAndRule/TierAndRulesmangementPage";
import TimeShiftView from "./TimeShiftView";
import { Divide } from "lucide-react";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions";
const WorkTimeSettings = () => {
        const { user } = useSession();
        const { permissions, loading: permLoading } = usePermissions(user?.username); 
        const [data, setData] = useState([]);
            const breadcrumbItems = [
              !permLoading && permissions?.leave_type && { label: 'Leave Types', path: '/LeaveTypePage' },
              !permLoading && permissions?.overtime && { label: 'Overtime', path: '/overtime' },
              !permLoading && permissions?.holiday && { label: 'Holidays', path: '/holidays' },
              !permLoading && permissions?.leave_balances && { label: 'Leave Balance', path: '/LeaveBalancePage' },
              !permLoading && permissions?.schedule_settings && { label: 'Work Time Settings', path: '/WorkTimeSettings' },
            ].filter(Boolean); // remove any falsy (unauthorized) entries

  return (
    <>

    <div className="w-full py-5">
      {/* Section title */}
      

          <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>View and Create Work Schedule</span>
              {/* <div className="hidden md:block"> */}
                <Breadcrumbs items={breadcrumbItems} />
              {/* </div> */}
            </div>

      {/* <h3 className="text-lg font-semibold text-gray-800 mb-2">
        View and Create Work Schedule
      </h3> */}

      {/* Horizontal line */}
      <hr className="border-gray-300 mb-4" />

      {/* Content */}
      <div className="w-full">
        <TimeShiftView />
      </div>
    </div>

    {/* Responsive container: stacked on mobile, two-column split on md+ */}
    <div className="w-full py-5">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        View and Create Break Time and assign to Schedules
      </h3>
      {/* Horizontal line */}
      <hr className="border-gray-300 mb-4" />

      <div
        className="w-full grid grid-cols-1 md:grid-cols-2 gap-4"
        role="region"
        aria-label="Breaks and work-time break mappings"
      >
        {/* Left panel: Add / Manage Breaks */}
        <div className="min-w-0">
          <BreakTimeTable />
        </div>

        {/* Right panel: Assign breaks to work times */}
        <div className="min-w-0">
          <WorkTimeBreakTable />
        </div>
      </div>
    </div>

{/* late deduction rules */}
<div className="w-full h-full max-h-[70vh] py-4">
  <h3 className="text-lg font-semibold text-gray-800 mb-2">
    View and Create Break Time and Assign to Schedules
  </h3>

  {/* Horizontal line */}
  <hr className="border-gray-300 mb-4" />

  {/* Responsive container: column on mobile, row on md+ */}
  <div className="flex flex-col md:flex-row gap-4 w-full h-full">
    {/* creating late tier and rules */}
    <div className="flex-1 min-w-0">
      <TierAndRulesManagementPage />
    </div>

    {/* view/mapping/assign late deduction to work time */}
    <div className="flex-1 min-w-0">
      <ShiftMappingManager />
    </div>
  </div>
</div>

    </>
  );
};

export default WorkTimeSettings;
