import { useState, useEffect } from "react";
// import WorkTimePage from "./work-time/WorkTimePage";
import BreakTimeTable from "./break-time/componets/BreakTimeTable";
import WorkTimeBreakTable from "./work-time-break/work-time-break-components/WorkTimeBreakTable";
import ShiftMappingManager from "./late-deduction-settings/late-deduction-mapping/late-deduction-mappingComponents/ShiftMappingManager";
import TierAndRulesManagementPage from "./late-deduction-settings/late-deduction-TierAndRule/TierAndRulesmangementPage";
import ShiftSchedulePage from "./schedule-manager/schedule-manager-components/ShiftSchedulePage";
import LayoutSMDashboard from "./schedule-manager/schedule-manager-components/LayouSMDashboard";
import TimeShiftView from "./schedule-manager/schedule-manager-components/TimeShiftView";
import { Divide } from "lucide-react";

const TestPage = () => {
  const [data, setData] = useState([]);

  // Example placeholder loader
  // const loadData = async () => {
  //   try {
  //     // Later you can plug your own API here
  //     setData([]);
  //   } catch (error) {
  //     console.error("❌ Error loading data:", error);
  //   }
  // };

  // useEffect(() => {
  //   loadData();
  // }, []);

  return (
    <>

    <div className="w-full py-5">
      {/* Section title */}
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        View and Create Work Schedule
      </h3>

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


    <br />
    {/* <ShiftSchedulePage/> */}
    <br />
    {/* <LayoutSMDashboard/> */}
    </>
  );
};

export default TestPage;

// import { useEffect, useState } from 'react';
// import LeaveTypeTable from './leave/leaveComponents/LeaveTypeTable';
// import LeaveFormModal from './leave/leaveComponents/LeaveFormModal';
// import LeaveHeader from './leave/leavePage/leaveHeader';
// import LeaveRequestTable from './leave/leaveComponents/LeaveRequestTable';
// import LeaveTypeFormModal from './leave/leaveComponents/LeaveTypeFormModal';
// import EmployeeLeaveTable from './leave/employeeLeaveComponents/EmployeeLeaveTable';
// import LeaveBalanceList from './leave_balance/leave_balance_components/LeaveBalanceList';

// import {
//   fetchLeaveTypesAdmin,
//   deleteLeaveTypeAdmin,
//   createLeaveTypeAdmin,
//   updateLeaveTypeAdmin,
// } from './leave/leaveApi/useLeaveTypeAdminAPI';

// import {
//   fetchEmployeeLeaves,
//   deleteEmployeeLeave,
//   createEmployeeLeave,
//   updateEmployeeLeave,
// } from './leave/leaveApi/useEmployeeLeave';

// const LeavePage = () => {
//   const [leaveTypes, setLeaveTypes] = useState([]);
//   const [employeeLeaves, setEmployeeLeaves] = useState([]);
//   const [editTarget, setEditTarget] = useState(null);
//   const [formOpen, setFormOpen] = useState(false);
//   const [openLeaveTypeModal, setOpenLeaveTypeModal] = useState(false);

//   const loadLeaveTypes = async () => {
//     try {
//       const response = await fetchLeaveTypesAdmin();
//       if (Array.isArray(response.data)) {
//         setLeaveTypes(response.data);
//       } else {
//         console.error('Invalid leave type response format', response);
//       }
//     } catch (error) {
//       console.error('Error fetching leave types', error);
//     }
//   };

// const loadEmployeeLeaves = async () => {
//   try {
//     const data = await fetchEmployeeLeaves();
//     console.log("📦 Raw employee leaves response:", data); // Check what API actually returns

//     // If API returns { data: [...] }
//     if (data && Array.isArray(data)) {
//       setEmployeeLeaves(data);
//     } else if (data?.data && Array.isArray(data.data)) {
//       setEmployeeLeaves(data.data);
//     } else {
//       console.warn("⚠️ Employee leaves data not in expected format", data);
//       setEmployeeLeaves([]);
//     }
//   } catch (err) {
//     console.error('❌ Error fetching employee leaves', err);
//   }
// };


//   useEffect(() => {
//     loadLeaveTypes();
//     loadEmployeeLeaves();
//   }, []);

//   const handleEditLeaveType = (leaveType) => {
//     setEditTarget(leaveType);
//     setOpenLeaveTypeModal(true);
//   };

//   const handleDeleteLeaveType = async (id) => {
//     try {
//       await deleteLeaveTypeAdmin(id);
//       await loadLeaveTypes();
//     } catch (err) {
//       console.error('Failed to delete leave type', err);
//     }
//   };

//   const handleEditEmployeeLeave = (leave) => {
//     setEditTarget(leave);
//     setFormOpen(true);
//   };

//   const handleDeleteEmployeeLeave = async (id) => {
//     try {
//       await deleteEmployeeLeave(id);
//       await loadEmployeeLeaves();
//     } catch (err) {
//       console.error('Failed to delete employee leave', err);
//     }
//   };

//   const handleCreate = () => {
//     setEditTarget(null);
//     setFormOpen(true);
//   };

//   return (
//     <>

//       <LeaveHeader
//         onAdd={handleCreate}
//         onAddLeaveType={() => {
//           setEditTarget(null);
//           setOpenLeaveTypeModal(true);
//         }}
//       />

//       {/* Existing Leave Request Table */}
//       <LeaveRequestTable onEdit={(leaveRequest) => {
//         setEditTarget(leaveRequest);
//         setFormOpen(true);
//       }} />

//       {/* New Employee Leave Table */}
//       <EmployeeLeaveTable
//         employeeLeaves={employeeLeaves}
//         onEdit={handleEditEmployeeLeave}
//         onDelete={handleDeleteEmployeeLeave}
//       />

//       <LeaveTypeTable
//         leaveTypes={leaveTypes}
//         onEdit={handleEditLeaveType}
//         onDelete={handleDeleteLeaveType}
//       />

//       <LeaveFormModal
//         open={formOpen}
//         onClose={() => setFormOpen(false)}
//         onSave={loadEmployeeLeaves}
//         editData={editTarget}
//       />

//       <LeaveTypeFormModal
//         open={openLeaveTypeModal}
//         handleClose={() => {
//           setOpenLeaveTypeModal(false);
//           setEditTarget(null);
//         }}
//         selectedLeaveType={editTarget}
//         onSave={async (formData) => {
//           try {
//             const isEditing = !!editTarget;
//             const response = isEditing
//               ? await updateLeaveTypeAdmin(editTarget.leave_type_id, formData)
//               : await createLeaveTypeAdmin(formData);

//             if (response?.success) {
//               await loadLeaveTypes();
//             } else {
//               console.error('❌ Failed to save leave type:', response?.error || response);
//             }
//           } catch (err) {
//             console.error('❌ API error during save:', err);
//           } finally {
//             setOpenLeaveTypeModal(false);
//             setEditTarget(null);
//           }
//         }}
//       />
//     </>
//   );
// };

// export default LeavePage;
