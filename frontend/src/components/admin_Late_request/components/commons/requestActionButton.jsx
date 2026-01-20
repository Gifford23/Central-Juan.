import React from 'react';
import { Trash2, CalendarArrowUp, CalendarArrowDown } from 'lucide-react';
import Checkbox from '@mui/material/Checkbox';
import usePermissions from "../../../../users/hooks/usePermissions";
import { useSession } from "../../../../context/SessionContext";

const RequestActions = ({
  onSelectAll,
  isAllSelected,
  onDeleteSelected,
  isDeleteDisabled,
  sortAscending,
  onToggleSort,
}) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username); 
	
  return (
    <div className="flex flex-row items-center justify-between mb-4">
      {/* Select All */}
      <div className="flex items-center space-x-2">
        <Checkbox
          onChange={onSelectAll}
          checked={isAllSelected}
          color="primary"
        />
        <span className="font-medium text-gray-700">Select All</span>
      </div>

        <div className="flex flex-row ml-auto gap-x-4">
            
                    {!permLoading && permissions?.can_delete && (

        <button
          className="items-center w-10 h-10 border rounded-lg cursor-pointer employee-newheaderbuttons-outline place-items-center hover:transition hover:duration-400 hover:ease-out hover:scale-95"
          onClick={onDeleteSelected}
          disabled={isDeleteDisabled}
        >
          <Trash2 size={23} />
        </button>
                    )}

      <div className="w-[2px] my-1 rounded bg-black"/>

      {/* Grouped Actions */}
      <div className="flex overflow-hidden border divide-x divide-blue-900 rounded-lg w-fit">

        {/* Sort Ascending */}
        <button
          onClick={() => onToggleSort(true)}
          className={`w-10 h-10 flex items-center justify-center transition
            ${sortAscending ? 'bg-blue-900 text-white' : 'bg-white text-blue-900'}
          `}
          title="Sort Ascending"
        >
          <CalendarArrowUp size={22} />
        </button>

        {/* Sort Descending */}
        <button
          onClick={() => onToggleSort(false)}
          className={`w-10 h-10 flex items-center justify-center transition
            ${!sortAscending ? 'bg-blue-900 text-white' : 'bg-white text-blue-900'}
          `}
          title="Sort Descending"
        >
          <CalendarArrowDown size={22} />
        </button>
      </div>
     </div>
    </div>
  );
};

export default RequestActions;
