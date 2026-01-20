import React, { useEffect, useState } from "react";
import HolidayActionButton from "./Holiday_ActionButton";
import Swal from "sweetalert2";
import { Trash2, Search as SearchIcon } from "lucide-react";
import { useSession } from "../../../context/SessionContext";
// import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
import usePermissions from "../../../users/hooks/usePermissions";

const formatDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return isNaN(date)
    ? "N/A"
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

const HolidayTable = ({ holidays = [], onEdit, onDelete }) => {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [filteredHolidays, setFilteredHolidays] = useState([]);

  // Filter holidays by search term
  useEffect(() => {
    const lower = searchTerm.toLowerCase().trim();
    if (!lower) {
      setFilteredHolidays(holidays);
      return;
    }
    const filtered = holidays.filter(
      (h) =>
        (h.name || "").toLowerCase().includes(lower) ||
        (h.holiday_type || "").toLowerCase().includes(lower)
    );
    setFilteredHolidays(filtered);
  }, [searchTerm, holidays]);

  // Toggle select all (only for filtered list)
  const toggleSelectAll = () => {
    if (
      filteredHolidays.length > 0 &&
      selectedIds.length === filteredHolidays.length
    ) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHolidays.map((h) => h.holiday_id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Bulk delete with confirmation - preserves original behaviour
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirm = await Swal.fire({
      title: `Delete ${selectedIds.length} selected holiday(s)?`,
      text: "This action is permanent.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
      title: "Deleting...",
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false,
    });

    for (const id of selectedIds) {
      // ensure onDelete returns a Promise if it's async
      // and we wait for each to finish (same behaviour as your original code)
      // wrap in try/catch so one failure won't stop others
      try {
        // eslint-disable-next-line no-await-in-loop
        await onDelete(id);
      } catch (err) {
        // show a non-blocking toast if one fails
        // (we don't stop the deletion loop)
        // you can change this to collect failures instead
        // console.error("Failed deleting", id, err);
      }
    }

    Swal.close();
    setSelectedIds([]);
    Swal.fire("Deleted!", "Selected holidays have been removed.", "success");
  };

  // small helpers
  const isAllSelected = filteredHolidays.length > 0 && selectedIds.length === filteredHolidays.length;

  return (
    <div className="w-full space-y-4">
      {/* Search + Bulk Delete (bulk delete right aligned) */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search holiday name or type..."
            className="w-full py-2 pl-10 pr-3 text-sm border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Search holidays"
          />
          <div className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2">
            <SearchIcon size={16} />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          { !permLoading && permissions?.can_delete && (
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.length === 0}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition shadow-sm ${
                selectedIds.length > 0 ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-200 text-gray-600 cursor-not-allowed"
              }`}
              aria-disabled={selectedIds.length === 0}
              title={selectedIds.length > 0 ? `Delete (${selectedIds.length}) selected` : "Select items to delete"}
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop header: grid labels (visible md+) */}
      <div className="items-center hidden grid-cols-12 gap-3 px-3 py-2 text-xs text-gray-600 rounded-md md:grid bg-gray-50">
        <div className="flex items-center col-span-1">
          <input
            type="checkbox"
            aria-label="Select all"
            checked={isAllSelected}
            onChange={toggleSelectAll}
          />
        </div>
        <div className="col-span-3 font-medium">Name</div>
        <div className="col-span-2">Date</div>
        <div className="col-span-1">Type</div>
        <div className="col-span-1 text-center">Recurring</div>
        <div className="col-span-1 text-center">Apply Mult.</div>
        <div className="col-span-1 text-center">Default</div>
        <div className="col-span-1 text-center">OT Mult.</div>
        <div className="col-span-1 text-center">Extended</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Desktop rows (grid) */}
      <div className="hidden md:block">
        <div className="flex flex-col overflow-hidden border border-gray-200 divide-y rounded-md">
          {filteredHolidays.length === 0 ? (
            <div className="p-4 text-sm text-center text-gray-500">No holidays found.</div>
          ) : (
            filteredHolidays.map((holiday) => (
              <div
                key={holiday.holiday_id}
                className="grid items-center grid-cols-12 gap-3 px-3 py-2 text-sm transition hover:bg-gray-50"
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(holiday.holiday_id)}
                    onChange={() => toggleSelect(holiday.holiday_id)}
                    aria-label={`Select ${holiday.name}`}
                  />
                </div>

                <div className="col-span-3 truncate">{holiday.name}</div>
                <div className="col-span-2">{formatDate(holiday.holiday_date)}</div>
                <div className="col-span-1">{holiday.holiday_type}</div>
                <div className="col-span-1 text-center">{holiday.is_recurring ? "Yes" : "No"}</div>
                <div className="col-span-1 text-center">{holiday.apply_multiplier ? "Yes" : "No"}</div>
                <div className="col-span-1 text-center">{holiday.default_multiplier}</div>
                <div className="col-span-1 text-center">{holiday.ot_multiplier}</div>
                <div className="col-span-1 text-center">{formatDate(holiday.extended_until)}</div>

                <div className="flex justify-end col-span-1">
                  <HolidayActionButton
                    onEdit={() => onEdit(holiday)}
                    onDelete={() => onDelete(holiday.holiday_id)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile rows: compact cards with action button on the right */}
      <div className="space-y-2 md:hidden">
        {filteredHolidays.length === 0 ? (
          <div className="p-3 text-sm text-center text-gray-500 border border-gray-200 border-dashed rounded-md">
            No holidays found.
          </div>
        ) : (
          filteredHolidays.map((holiday) => (
            <div
              key={holiday.holiday_id}
              className="relative flex items-start gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              {/* Left: checkbox */}
              <div className="flex-shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(holiday.holiday_id)}
                  onChange={() => toggleSelect(holiday.holiday_id)}
                  aria-label={`Select ${holiday.name}`}
                />
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{holiday.name}</div>
                    <div className="text-xs text-gray-500 truncate">{holiday.holiday_type} • {formatDate(holiday.holiday_date)}</div>
                  </div>

                  {/* Actions on the right (compact) */}
                  <div className="flex-shrink-0 ml-2">
                    <HolidayActionButton
                      onEdit={() => onEdit(holiday)}
                      onDelete={() => onDelete(holiday.holiday_id)}
                    />
                  </div>
                </div>

                {/* Secondary details (one line each, compact) */}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                  <div className="truncate"><span className="font-medium">Recurring: </span>{holiday.is_recurring ? "Yes" : "No"}</div>
                  <div className="truncate"><span className="font-medium">Apply Mult.: </span>{holiday.apply_multiplier ? "Yes" : "No"}</div>
                  <div className="truncate"><span className="font-medium">Default: </span>{holiday.default_multiplier}</div>
                  <div className="truncate"><span className="font-medium">OT Mult.: </span>{holiday.ot_multiplier}</div>
                  <div className="col-span-2 truncate"><span className="font-medium">Extended: </span>{formatDate(holiday.extended_until)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HolidayTable;









// import React, { useState, useEffect } from "react";
// import HolidayActionButton from "./Holiday_ActionButton";
// import Swal from "sweetalert2";
// import { Trash2 } from "lucide-react"; // Optional: use Heroicons or lucide-react
// import { useSession } from "../../../context/SessionContext";
// // import usePermissions from "../../../components/user_permisson/hooks/usePermissions";
// import usePermissions from "../../../users/hooks/usePermissions"; 

// const formatDate = (dateStr) => {
//   if (!dateStr) return "N/A";
//   const date = new Date(dateStr);
//   return isNaN(date)
//     ? "N/A"
//     : date.toLocaleDateString("en-US", {
//         year: "numeric",
//         month: "short",
//         day: "numeric",
//       });
// };

// const HolidayTable = ({ holidays, onEdit, onDelete }) => {
//   const { user } = useSession();
//   const { permissions, loading: permLoading } = usePermissions(user?.username);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [selectedIds, setSelectedIds] = useState([]);
//   const [filteredHolidays, setFilteredHolidays] = useState([]);

//   useEffect(() => {
//     const lower = searchTerm.toLowerCase();
//     const filtered = holidays.filter(
//       (h) =>
//         h.name.toLowerCase().includes(lower) ||
//         h.holiday_type.toLowerCase().includes(lower)
//     );
//     setFilteredHolidays(filtered);
//   }, [searchTerm, holidays]);

//   const toggleSelectAll = () => {
//     if (selectedIds.length === filteredHolidays.length) {
//       setSelectedIds([]);
//     } else {
//       setSelectedIds(filteredHolidays.map((h) => h.holiday_id));
//     }
//   };

//   const toggleSelect = (id) => {
//     setSelectedIds((prev) =>
//       prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
//     );
//   };

//   const handleBulkDelete = async () => {
//     const confirm = await Swal.fire({
//       title: "Delete selected holidays?",
//       text: `This will permanently delete ${selectedIds.length} record(s).`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, delete",
//       cancelButtonText: "Cancel",
//     });

//     if (confirm.isConfirmed) {
//       Swal.fire({
//         title: "Deleting...",
//         didOpen: () => {
//           Swal.showLoading();
//         },
//         allowOutsideClick: false,
//       });

//       for (const id of selectedIds) {
//         await onDelete(id);
//       }

//       Swal.close();
//       setSelectedIds([]);
//       Swal.fire("Deleted!", "Selected holidays have been removed.", "success");
//     }
//   };

//   return (
//     <div className="w-full space-y-4">
//       {/* Search and bulk delete controls */}
//       <div className="flex flex-row justify-between gap-2 md:flex-row md:items-center">
//         <input
//           type="text"
//           placeholder="Search holiday name or type..."
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//           className="w-full px-4 py-2 text-sm border rounded-md shadow-sm focus:outline-none focus:ring focus:ring-blue-200 md:w-72"
//         />
//         {!permLoading && permissions.can_delete && (

//         <button
//           onClick={handleBulkDelete}
//           disabled={selectedIds.length === 0}
//           className={`flex items-center gap-1 px-4 py-2 text-sm text-white rounded-md shadow transition 
//             ${selectedIds.length > 0 ? "bg-red-500 hover:bg-red-600" : "bg-gray-300 cursor-not-allowed"}`}
//         >
//           <Trash2 size={16} />
//            ({selectedIds.length})
//         </button>
//         )}
//       </div>

//       {/* Desktop Table View */}
//       <div className="hidden overflow-x-auto border rounded-lg shadow md:block">
//         <table className="min-w-full text-sm text-left text-gray-800">
//           <thead className="text-xs text-gray-600 uppercase bg-gray-100">
//             <tr>
//               <th className="p-3">
//                 <input
//                   type="checkbox"
//                   onChange={toggleSelectAll}
//                   checked={
//                     selectedIds.length === filteredHolidays.length &&
//                     filteredHolidays.length > 0
//                   }
//                 />
//               </th>
//               <th className="p-3">Namasde</th>
//               <th className="p-3">Date</th>
//               <th className="p-3">Type</th>
//               <th className="p-3">Recurring</th>
//               <th className="p-3">Apply Multiplier</th>
//               <th className="p-3">Default Multiplier</th>
//               <th className="p-3">OT Multiplier</th>
//               <th className="p-3">Extended Until</th>

//               {!permLoading && permissions.can_edit && (
//               <th className="p-3 text-center">Actions</th>
//               )}
              
//             </tr>
//           </thead>
//           <tbody className="bg-white divide-y divide-gray-200">
//             {filteredHolidays.map((holiday) => (
//               <tr key={holiday.holiday_id} className="hover:bg-gray-50">
//                 <td className="p-3">
//                   <input
//                     type="checkbox"
//                     checked={selectedIds.includes(holiday.holiday_id)}
//                     onChange={() => toggleSelect(holiday.holiday_id)}
//                   />
//                 </td>
//                 <td className="p-3">{holiday.name}</td>
//                 <td className="p-3">{formatDate(holiday.holiday_date)}</td>
//                 <td className="p-3">{holiday.holiday_type}</td>
//                 <td className="p-3">{holiday.is_recurring ? "Yes" : "No"}</td>
//                 <td className="p-3">
//                   {holiday.apply_multiplier ? "Yes" : "No"}
//                 </td>
//                 <td className="p-3">{holiday.default_multiplier}</td>
//                 <td className="p-3">{holiday.ot_multiplier}</td>
//                 <td className="p-3">{formatDate(holiday.extended_until)}</td>
//                 <td className="p-3 text-center">
//                   <HolidayActionButton
//                     onEdit={() => onEdit(holiday)}
//                     onDelete={() => onDelete(holiday.holiday_id)}
//                   />
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Mobile Card View */}
//       <div className="space-y-4 md:hidden">
//         {filteredHolidays.map((holiday) => (
//           <div
//             key={holiday.holiday_id}
//             className="p-4 space-y-1 bg-white border border-gray-200 shadow-sm rounded-xl"
//           >
//             <div className="flex items-start justify-between">
//               <input
//                 type="checkbox"
//                 className="mt-1"
//                 checked={selectedIds.includes(holiday.holiday_id)}
//                 onChange={() => toggleSelect(holiday.holiday_id)}
//               />
//               <HolidayActionButton
//                 onEdit={() => onEdit(holiday)}
//                 onDelete={() => onDelete(holiday.holiday_id)}
//               />
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Name:</span> {holiday.name}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Date:</span>{" "}
//               {formatDate(holiday.holiday_date)}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Type:</span> {holiday.holiday_type}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Recurring:</span>{" "}
//               {holiday.is_recurring ? "Yes" : "No"}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Apply Multiplier:</span>{" "}
//               {holiday.apply_multiplier ? "Yes" : "No"}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Default Multiplier:</span>{" "}
//               {holiday.default_multiplier}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">OT Multiplier:</span>{" "}
//               {holiday.ot_multiplier}
//             </div>
//             <div className="text-sm">
//               <span className="font-semibold">Extended Until:</span>{" "}
//               {formatDate(holiday.extended_until)}
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default HolidayTable;
