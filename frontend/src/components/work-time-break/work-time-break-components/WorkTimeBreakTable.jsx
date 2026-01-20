// src/components/WorkTimeBreakUI/WorkTimeBreakTable.jsx
import React, { useState } from "react";
import { useFetchWorkTimeBreaks, useDeleteWorkTimeBreak } from "../work-time-breakhooks/useWorkTimeBreak";
import AssignBreakModal from "./AssignBreakModal";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";

const WorkTimeBreakTable = ({ workTimeId = null }) => {
  // Load mappings (filtered by shift if workTimeId is provided)
  const { data: mappings, loading, setData } = useFetchWorkTimeBreaks(workTimeId);
  const { remove, loading: deleteLoading } = useDeleteWorkTimeBreak();

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Delete handler
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this mapping?")) return;
    const result = await remove(id);
    if (result && result.success) {
      setData((prev) => prev.filter((m) => m.mapping_id !== id));
    } else {
      alert(result?.message || "Failed to delete mapping");
    }
  };

  if (loading) return <p className="p-4 text-gray-600">Loading mappings...</p>;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* Header: stacks on very small screens, inline on sm+ */}
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Work Time Break Mappings</h2>
          <p className="mt-1 text-xs text-gray-500">Assign breaks to shifts and manage mappings.</p>
        </div>

        {/* Assign button: full width on xs (stacked), auto width on sm+ */}
        <div className="w-full sm:w-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Assign break"
          >
            <AddIcon fontSize="small" />
            <span>Assign Break</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {(!mappings || mappings.length === 0) ? (
        <div className="py-6 text-center">
          <p className="mb-3 text-sm text-gray-500">No breaks assigned yet.</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            aria-label="Assign break"
          >
            <AddIcon fontSize="small" />
            Assign Break
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {mappings.map((m) => (
            <div
              key={m.mapping_id}
              className="flex flex-col justify-between min-w-0 p-3 border rounded-md sm:flex-row sm:items-center bg-gray-50"
              role="group"
              aria-label={`Mapping ${m.break_name} for ${m.shift_name}`}
            >
              {/* Info block: min-w-0 + truncate to avoid overflow */}
              <div className="min-w-0 mb-2 sm:mb-0">
                <div className="mb-1 text-xs text-gray-600">
                  <span className="font-medium">Shift: </span>
                  <span className="truncate inline-block max-w-[220px]" title={m.shift_name}>{m.shift_name}</span>
                </div>

                <div
                  className="text-sm sm:text-base font-semibold text-gray-800 truncate max-w-[240px]"
                  title={m.break_name}
                >
                  {m.break_name}
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  <time>{m.break_start}</time> <span className="mx-1">—</span> <time>{m.break_end}</time>
                </div>
              </div>

              {/* Action block */}
              <div className="flex items-center gap-2">
                <Tooltip title="Remove mapping">
                  <span>
                    <IconButton
                      onClick={() => handleDelete(m.mapping_id)}
                      disabled={deleteLoading}
                      aria-label={`remove mapping for ${m.break_name}`}
                      size="small"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for assigning new break */}
      {isModalOpen && (
        <AssignBreakModal
          workTimeId={workTimeId}   // use the prop
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newMapping) => {
            // Update state optimistically and close modal
            setData((prev) => [...(prev || []), newMapping]);
            setIsModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default WorkTimeBreakTable;




// // src/components/WorkTimeBreakUI/WorkTimeBreakTable.jsx
// import React, { useState } from "react";
// import { useFetchWorkTimeBreaks, useDeleteWorkTimeBreak } from "../work-time-breakhooks/useWorkTimeBreak";
// import AssignBreakModal from "./AssignBreakModal";

// const WorkTimeBreakTable = ({ workTimeId = null }) => {
//   // ✅ Load mappings (filtered by shift if workTimeId is provided)
//   const { data: mappings, loading, setData } = useFetchWorkTimeBreaks(workTimeId);
//   const { remove, loading: deleteLoading } = useDeleteWorkTimeBreak();

//   const [isModalOpen, setIsModalOpen] = useState(false);

//   // ✅ Delete handler
//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to remove this mapping?")) return;
//     const result = await remove(id);
//     if (result.success) {
//       setData((prev) => prev.filter((m) => m.mapping_id !== id));
//     } else {
//       alert(result.message || "Failed to delete mapping");
//     }
//   };

//   if (loading) return <p>Loading mappings...</p>;

//   return (
//     <div className="p-4 bg-white rounded-lg shadow">
//       <div className="flex items-center justify-between mb-3">
//         <h2 className="text-lg font-semibold">Work Time Break Mappings</h2>
//         <button
//           onClick={() => setIsModalOpen(true)}
//           className="px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700"
//         >
//           ➕ Assign Break
//         </button>
//       </div>

//       {mappings.length === 0 ? (
//         <p className="text-gray-500">No breaks assigned yet.</p>
//       ) : (
//         <table className="w-full text-sm border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="p-2 border">Shift</th>
//               <th className="p-2 border">Break Name</th>
//               <th className="p-2 border">Start</th>
//               <th className="p-2 border">End</th>
//               <th className="p-2 border">Action</th>
//             </tr>
//           </thead>
//           <tbody>
//             {mappings.map((m) => (
//               <tr key={m.mapping_id}>
//                 <td className="p-2 border">{m.shift_name}</td>
//                 <td className="p-2 border">{m.break_name}</td>
//                 <td className="p-2 border">{m.break_start}</td>
//                 <td className="p-2 border">{m.break_end}</td>
//                 <td className="p-2 text-center border">
//                   <button
//                     onClick={() => handleDelete(m.mapping_id)}
//                     disabled={deleteLoading}
//                     className="px-2 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50 disabled:opacity-50"
//                   >
//                     ❌ Remove
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}

//       {/* Modal for assigning new break */}
// {isModalOpen && (
//   <AssignBreakModal
//     workTimeId={workTimeId}   // ✅ use the prop
//     onClose={() => setIsModalOpen(false)}
//     onSuccess={(newMapping) => {
//       // Update state optimistically
//       setData((prev) => [...prev, newMapping]);
//     }}
//   />
// )}
//     </div>
//   );
// };

// export default WorkTimeBreakTable;
