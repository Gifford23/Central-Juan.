import { useState } from "react";
import { CalendarCog, Printer, LogOut, MoreVertical, Logs  } from "lucide-react";
import { Tooltip } from "react-tooltip";
import usePermissions from "../../users/hooks/usePermissions"; 
import { useSession } from "../../context/SessionContext";
 
export default function ActionButtons({ onEdit, onPrint, onLog }) {
  const { user } = useSession();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const { permissions, loading } = usePermissions(user?.username);
 
  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  if (loading) {
    return <p className="text-sm text-gray-500">Loading permissions...</p>;
  }

  if (!permissions) {
    return <p className="text-sm text-red-500">No permissions found</p>;
  }

  return (
    <div className="relative flex items-center justify-end w-full sm:gap-3 sm:w-fit">
      {/* Desktop: full buttons */}
      {/*Payroll period edit button*/}
      <div className="hidden gap-2 sm:flex">
        {permissions.can_edit_payroll_date && (
          <button
            onClick={onEdit}
            aria-label="Edit Payroll"
            data-tooltip-id="edit-tooltip"
            data-tooltip-content="Edit Payroll Date"
            className="flex items-center justify-center w-10 h-10 transition rounded-lg hover:scale-95 employee-newheaderbuttons-solid"
          >
            <CalendarCog size={22} />
          </button>
        )}

        {permissions.can_print_payroll && (
          <button
            onClick={onPrint}
            aria-label="Print Payroll"
            data-tooltip-id="print-tooltip"
            data-tooltip-content="Print Payroll"
            className="flex items-center justify-center w-10 h-10 transition border rounded-lg hover:scale-95 employee-newheaderbuttons-outline"
          >
            <Printer size={22} />
          </button>
        )}

        {permissions.can_payroll_logs && (
          <button
            onClick={onLog}
            aria-label="View Logs"
            data-tooltip-id="log-tooltip"
            data-tooltip-content="View Payroll Logs"
            className="flex items-center justify-center w-10 h-10 transition border rounded-lg hover:scale-95 employee-newheaderbuttons-outline"
          >
            <Logs size={22} />
          </button>
        )}
      </div>

      {/* Mobile: dropdown toggle */}
      <div className="sm:hidden">
        <button
          onClick={toggleDropdown}
          className="flex items-center justify-center w-10 h-10 transition rounded-lg hover:scale-95 employee-newheaderbuttons-solid"
          aria-label="Toggle Actions"
        >
          <MoreVertical size={22} />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 z-10 w-40 p-2 mt-2 space-y-2 bg-white rounded-lg shadow-xl">
            {permissions.can_edit_payroll_date && (
              <button
                onClick={onEdit}
                aria-label="Edit Payroll"
                className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100"
              >
                <CalendarCog size={18} /> Edit
              </button>
            )}

            {permissions.can_print_payroll && (
              <button
                onClick={onPrint}
                aria-label="Print Payroll"
                className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100"
              >
                <Printer size={18} /> Print
              </button>
            )}

            {permissions.can_payroll_logs && (
              <button
                onClick={onLog}
                aria-label="View Logs"
                className="flex items-center w-full gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100"
              >
                <LogOut size={18} /> Logs
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tooltips */}
      <Tooltip id="edit-tooltip" />
      <Tooltip id="print-tooltip" />
      <Tooltip id="log-tooltip" />
    </div>
  );
}



// // components/payroll/ActionButtons.jsx
// import { CalendarCog, Printer, Logs } from 'lucide-react';
// import { Tooltip } from 'react-tooltip';

// export default function ActionButtons({ userRole, onEdit, onPrint, onLog }) {
//   return (
//     <div className="flex flex-row gap-x-3 w-fit">
//       {userRole === 'ADMIN' && (
//         <button
//           className="items-center w-10 h-10 rounded-lg cursor-pointer hover:scale-95 employee-newheaderbuttons-solid"
//           onClick={onEdit}
//         >
//           <CalendarCog size={25} fontWeight={20} />
//         </button>
//       )}
//       <button
//         className="items-center w-10 h-10 border rounded-lg cursor-pointer hover:scale-95 employee-newheaderbuttons-outline"
//         onClick={onPrint}
//       >
//         <Printer size={23} />
//         <Tooltip id="Sprint" />
//       </button>
//       <button
//         className="items-center w-10 h-10 border rounded-lg cursor-pointer hover:scale-95 employee-newheaderbuttons-outline"
//         onClick={onLog}
//       >
//         <Logs size={23} />
//       </button>
//     </div>
//   );
// }
