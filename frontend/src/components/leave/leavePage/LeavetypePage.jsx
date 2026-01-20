import { useEffect, useState } from "react";
import LeaveTypeTable from "../leaveComponents/LeaveTypeTable";
import LeaveTypeFormModal from "../leaveComponents/LeaveTypeFormModal";
import usePermissions from "../../../users/hooks/usePermissions"; 
import { useSession } from "../../../context/SessionContext";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
import {
  fetchLeaveTypesAdmin,
  deleteLeaveTypeAdmin,
  createLeaveTypeAdmin,
  updateLeaveTypeAdmin,
} from "../leaveApi/useLeaveTypeAdminAPI";
//  const breadcrumbItems = [
//     // { label: 'Payroll Dashboard', path: '/payrolldashboard' },
//     { label: 'Leave Types', path: '/LeaveTypePage' },
//     { label: 'Overtime', path: '/overtime' },
//     { label: 'Holidays', path: '/holidays' },
//     { label: 'Leave Balance', path: '/LeaveBalancePage' },
//     { label: 'Work Time Settings', path: '/WorkTimeSettings' },
//  ];



const LeaveTypePage = () => {
   const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username); 

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [editTarget, setEditTarget] = useState(null);
  const [openLeaveTypeModal, setOpenLeaveTypeModal] = useState(false);

const breadcrumbItems = [
  !permLoading && permissions?.leave_type && { label: 'Leave Types', path: '/LeaveTypePage' },
  !permLoading && permissions?.overtime && { label: 'Overtime', path: '/overtime' },
  !permLoading && permissions?.holiday && { label: 'Holidays', path: '/holidays' },
  !permLoading && permissions?.leave_balances && { label: 'Leave Balance', path: '/LeaveBalancePage' },
  !permLoading && permissions?.schedule_settings && { label: 'Work Time Settings', path: '/WorkTimeSettings' },
].filter(Boolean); // remove any falsy (unauthorized) entries
 
// const breadcrumbItems = [
//     !permLoading && permissions?.employee_list && { key: "dashboard", label: "Employee Lists", path: "/employees" },
//     !permLoading && permissions?.department && { key: "employees", label: "Departments", path: "/department" },
//     !permLoading && permissions?.branches && { key: "branches", label: "Branches", path: "/branches" },
//     !permLoading && permissions?.branches && { key: "branches", label: "Branches", path: "/branches" },
//     !permLoading && permissions?.branches && { key: "branches", label: "Branches", path: "/branches" },

//   ].filter(Boolean);
  
  const loadLeaveTypes = async () => {
    try {
      const response = await fetchLeaveTypesAdmin();
      if (Array.isArray(response.data)) {
        setLeaveTypes(response.data);
      } else {
        console.error("Invalid leave type response format", response);
      }
    } catch (error) {
      console.error("Error fetching leave types", error);
    }
  };

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const handleEditLeaveType = (leaveType) => {
    setEditTarget(leaveType);
    setOpenLeaveTypeModal(true);
  };

  const handleDeleteLeaveType = async (id) => {
    try {
      await deleteLeaveTypeAdmin(id);
      await loadLeaveTypes();
    } catch (err) {
      console.error("Failed to delete leave type", err);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
          <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
            <span className='text-2xl font-semibold'>Leave Types</span>
              {/* <div className="hidden md:block"> */}
                <Breadcrumbs items={breadcrumbItems} />
              {/* </div> */}
            </div>
      {!permLoading && permissions?.can_add && (
        <button
          onClick={() => {
            setEditTarget(null);
            setOpenLeaveTypeModal(true);
          }}
          className="px-4 py-2 text-white bg-blue-500 rounded-lg shadow hover:bg-blue-600"
        >
          + Add Leave Type
        </button>
        )}

      </div>

      <LeaveTypeTable
        leaveTypes={leaveTypes}
        onEdit={handleEditLeaveType}
        onDelete={handleDeleteLeaveType}
      />

      <LeaveTypeFormModal
        open={openLeaveTypeModal}
        handleClose={() => {
          setOpenLeaveTypeModal(false);
          setEditTarget(null);
        }}
        selectedLeaveType={editTarget}
        onSave={async (formData) => {
          try {
            const isEditing = !!editTarget;
            const response = isEditing
              ? await updateLeaveTypeAdmin(editTarget.leave_type_id, formData)
              : await createLeaveTypeAdmin(formData);

            if (response?.success) {
              await loadLeaveTypes();
            } else {
              console.error(
                "❌ Failed to save leave type:",
                response?.error || response
              );
            }
          } catch (err) {
            console.error("❌ API error during save:", err);
          } finally {
            setOpenLeaveTypeModal(false);
            setEditTarget(null);
          }
        }}
      />
    </div>
  );
};

export default LeaveTypePage;
