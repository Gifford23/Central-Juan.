// src/pages/leave/leaveComponents/LeaveHeader.jsx
import AddLeaveButton from "../leaveComponents/AddLeaveButton";
import AddLeaveTypeButton from "../leaveComponents/AddLeaveTypeButton";
import usePermissions from "../../../users/hooks/usePermissions";
import { useSession } from "../../../context/SessionContext";
const LeaveHeader = ({ onAdd, onAddLeaveType }) => {
    const { user } = useSession();
    const { permissions, loading: permLoading } = usePermissions(user?.username); 

  if (permLoading) {
    return <p className="text-gray-500 text-sm">Loading permissions...</p>;
  }

  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">Leave Types</h2>

      {permissions?.can_add && (
        <>
          <AddLeaveButton onClick={onAdd} />
          <AddLeaveTypeButton onClick={onAddLeaveType} />
        </>
      )}

    </div>

  );
};


export default LeaveHeader;
