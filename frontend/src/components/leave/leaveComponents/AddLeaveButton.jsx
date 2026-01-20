// src/pages/leave/leaveComponents/AddLeaveButton.jsx
import usePermissions from "../../../users/hooks/usePermissions";
import { useSession } from "../../../context/SessionContext";

const AddLeaveButton = ({ onClick }) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  if (permLoading) {
    return <p className="text-gray-500 text-sm">Loading permissions...</p>;
  }

  // ✅ Wrap conditional JSX inside fragment
  return (
    <>
      {permissions?.employee_list && (
        <button
          onClick={onClick}
          className="px-4 py-2 text-white transition bg-blue-500 rounded hover:bg-blue-600"
        >
          + Add Leave
        </button>
      )}
    </>
  );
};

export default AddLeaveButton;
