import React from "react";
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions"; 

const HolidayActionButton = ({ onEdit, onDelete }) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  return (
    <div className="flex gap-2">
      
    {!permLoading && permissions.can_edit && (
      <button onClick={onEdit} className="px-2 py-1 text-xs text-white bg-yellow-400 rounded">Edit</button>
    )}

    {!permLoading && permissions.can_delete && (
      <button onClick={onDelete} className="px-2 py-1 text-xs text-white bg-red-500 rounded">Delete</button>
    )}

    </div>
  );
};

export default HolidayActionButton;


