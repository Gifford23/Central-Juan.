// BreakTimeTable.jsx
import React, { useState } from "react";
import Swal from "sweetalert2";
import { useFetchBreakTimes, useDeleteBreakTime } from "../break-timeHooks/useBreakTimeAPI";
import BreakTimeFormModal from "./BreakTimeModal";
import BreakTimeDetails from "./BreakTimeDetails";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const BreakTimeTable = () => {
  const { data: breaks, loading, refetch } = useFetchBreakTimes();
  const { remove } = useDeleteBreakTime();

  const [selectedBreak, setSelectedBreak] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // helper to show SweetAlert with z-index fix so it appears above MUI Dialogs
  const showSwal = (opts = {}) => {
    return Swal.fire({
      ...opts,
      didOpen: () => {
        try {
          const container = document.querySelector(".swal2-container");
          const popup = document.querySelector(".swal2-popup");
          if (container) container.style.zIndex = "2000";
          if (popup) popup.style.zIndex = "2001";
        } catch (err) {
          // ignore
        }
        if (typeof opts.didOpen === "function") {
          try {
            opts.didOpen();
          } catch (e) {
            // swallow user errors
          }
        }
      },
    });
  };

  const handleDelete = async (id) => {
    // confirm using SweetAlert2
    const confirmation = await showSwal({
      title: "Delete break?",
      text: "This action cannot be undone. Do you want to delete this break?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    try {
      const res = await remove(id);
      if (res?.success) {
        // show success toast and refetch
        await showSwal({
          icon: "success",
          title: "Break deleted",
          showConfirmButton: false,
          timer: 1200,
        });
        await refetch();
      } else {
        await showSwal({
          icon: "error",
          title: "Error deleting break",
          text: res?.message || res?.error || "Unknown error",
        });
      }
    } catch (err) {
      await showSwal({
        icon: "error",
        title: "Error deleting break",
        text: err?.message || String(err) || "Unknown error",
      });
    }
  };

  // called when modal saved (create or update) to refresh list & close modal
  const handleSaved = async () => {
    await refetch();
    setShowForm(false);
    setSelectedBreak(null);
  };

  if (loading) return <p className="p-4 text-gray-600">Loading breaks...</p>;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Break Times</h2>
        <button
          onClick={() => {
            setSelectedBreak(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <AddIcon fontSize="small" />
          <span> Add Break</span>
        </button>
      </div>

      {(!breaks || breaks.length === 0) ? (
        <div className="p-6 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500">No breaks found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {breaks.map((b) => (
            <div
              key={b.id}
              className="flex flex-col justify-between p-4 transition bg-white rounded-lg shadow hover:shadow-md"
              role="region"
              aria-labelledby={`break-${b.id}-title`}
            >
              <div>
                <h3 id={`break-${b.id}-title`} className="mb-2 text-lg font-semibold">
                  {b.break_name}
                </h3>

                <div className="space-y-1 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Start: </span>
                    <span>{b.break_start}</span>
                  </div>
                  <div>
                    <span className="font-medium">End: </span>
                    <span>{b.break_end}</span>
                  </div>
                  <div>
                    <span className="font-medium">Minutes: </span>
                    <span>{b.break_minutes}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-4">
                {/* <Tooltip title="View">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedBreak(b);
                      setShowDetails(true);
                    }}
                    aria-label={`view break ${b.break_name}`}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip> */}

                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedBreak(b);
                      setShowForm(true);
                    }}
                    aria-label={`edit break ${b.break_name}`}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(b.id)}
                    aria-label={`delete break ${b.break_name}`}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <BreakTimeFormModal
          breakData={selectedBreak}
          onClose={() => {
            setShowForm(false);
            setSelectedBreak(null);
          }}
          onSaved={handleSaved} // <-- get notified after save so we can refetch
        />
      )}

      {showDetails && (
        <BreakTimeDetails
          breakData={selectedBreak}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};

export default BreakTimeTable;




// import React, { useState } from "react";
// import { useFetchBreakTimes, useDeleteBreakTime } from "../break-timeHooks/useBreakTimeAPI";
// import BreakTimeFormModal from "./BreakTimeModal";
// import BreakTimeDetails from "./BreakTimeDetails";

// import IconButton from "@mui/material/IconButton";
// import Tooltip from "@mui/material/Tooltip";
// import AddIcon from "@mui/icons-material/Add";
// import VisibilityIcon from "@mui/icons-material/Visibility";
// import EditIcon from "@mui/icons-material/Edit";
// import DeleteIcon from "@mui/icons-material/Delete";

// const BreakTimeTable = () => {
//   const { data: breaks, loading } = useFetchBreakTimes();
//   const { remove } = useDeleteBreakTime();

//   const [selectedBreak, setSelectedBreak] = useState(null);
//   const [showForm, setShowForm] = useState(false);
//   const [showDetails, setShowDetails] = useState(false);

//   const handleDelete = async (id) => {
//     if (window.confirm("Are you sure you want to delete this break?")) {
//       await remove(id);
//       // keep behavior consistent with original (simple reload)
//       window.location.reload(); // later: replace with a refetch from the hook
//     }
//   };

//   if (loading) return <p className="p-4 text-gray-600">Loading breaks...</p>;

//   return (
//     <div className="p-4">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-xl font-bold">Break Times</h2>
//         <button
//           onClick={() => {
//             setSelectedBreak(null);
//             setShowForm(true);
//           }}
//           className="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
//         >
//           <AddIcon fontSize="small" />
//           <span> Add Break</span>
//         </button>
//       </div>

//       {(!breaks || breaks.length === 0) ? (
//         <div className="p-6 bg-white rounded-lg shadow-sm">
//           <p className="text-gray-500">No breaks found.</p>
//         </div>
//       ) : (
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//           {breaks.map((b) => (
//             <div
//               key={b.id}
//               className="flex flex-col justify-between p-4 transition bg-white rounded-lg shadow hover:shadow-md"
//               role="region"
//               aria-labelledby={`break-${b.id}-title`}
//             >
//               <div>
//                 <h3 id={`break-${b.id}-title`} className="mb-2 text-lg font-semibold">
//                   {b.break_name}
//                 </h3>

//                 <div className="space-y-1 text-sm text-gray-600">
//                   <div>
//                     <span className="font-medium">Start: </span>
//                     <span>{b.break_start}</span>
//                   </div>
//                   <div>
//                     <span className="font-medium">End: </span>
//                     <span>{b.break_end}</span>
//                   </div>
//                   <div>
//                     <span className="font-medium">Minutes: </span>
//                     <span>{b.break_minutes}</span>
//                   </div>
//                 </div>
//               </div>

//               <div className="flex items-center justify-end gap-2 mt-4">
//                 <Tooltip title="View">
//                   <IconButton
//                     size="small"
//                     onClick={() => {
//                       setSelectedBreak(b);
//                       setShowDetails(true);
//                     }}
//                     aria-label={`view break ${b.break_name}`}
//                   >
//                     <VisibilityIcon />
//                   </IconButton>
//                 </Tooltip>

//                 <Tooltip title="Edit">
//                   <IconButton
//                     size="small"
//                     onClick={() => {
//                       setSelectedBreak(b);
//                       setShowForm(true);
//                     }}
//                     aria-label={`edit break ${b.break_name}`}
//                   >
//                     <EditIcon />
//                   </IconButton>
//                 </Tooltip>

//                 <Tooltip title="Delete">
//                   <IconButton
//                     size="small"
//                     onClick={() => handleDelete(b.id)}
//                     aria-label={`delete break ${b.break_name}`}
//                   >
//                     <DeleteIcon />
//                   </IconButton>
//                 </Tooltip>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {showForm && (
//         <BreakTimeFormModal
//           breakData={selectedBreak}
//           onClose={() => setShowForm(false)}
//         />
//       )}

//       {showDetails && (
//         <BreakTimeDetails
//           breakData={selectedBreak}
//           onClose={() => setShowDetails(false)}
//         />
//       )}
//     </div>
//   );
// };

// export default BreakTimeTable;


