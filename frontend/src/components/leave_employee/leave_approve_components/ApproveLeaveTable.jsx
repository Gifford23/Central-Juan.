import React, { useState } from "react";
import { useLeaves } from "../approved_leavehook/useApproveLeave";
import ApproveLeaveFormModal from "./ApproveLeaveFormModal";

export default function ApproveLeaveCards() {
  const { leaves, loading, updateLeave, addLeave } = useLeaves();
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  if (loading) return <p>Loading...</p>;

  // Function to format date
  const formatDate = (dateStr) => {
    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    };
    return new Date(dateStr).toLocaleDateString(undefined, options);
  };

  return (
    <div className="p-4">
      {/* Add button — kept exactly above the grid like you had, but improved styles and accessibility */}
      <div className="flex items-center justify-between gap-3 mb-6">
        {/* Left side reserved for potential heading or count in the future */}
        <div className="min-w-0">
          {/* optional heading (uncomment if you want): */}
          {/* <h2 className="text-xl font-semibold">Approved Leaves</h2> */}
        </div>

        {/* Add button (same place as before — above the grid) */}
        <button
          onClick={() => {
            setSelected(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          aria-label="Add leave"
          title="Add Leave"
        >
          <span className="text-lg leading-none">＋</span>
          <span className="whitespace-nowrap">Add Leave</span>
        </button>
      </div>

      {/* Responsive grid: 1 column on very small, 2 md, 3 lg, 4 xl (adjust as needed) */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.isArray(leaves) &&
          leaves.map((lv) => (
            <article
              key={lv.leave_id}
              role="article"
              tabIndex={0}
              className={`p-4 rounded-xl shadow-md border-l-4 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-200
                ${
                  lv.category === "Coming Leave"
                    ? "border-yellow-400 bg-yellow-50"
                    : lv.category === "On Leave"
                    ? "border-green-400 bg-green-50"
                    : "border-gray-400 bg-gray-50"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-gray-800 truncate">
                    {lv.first_name} {lv.last_name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 truncate">{lv.leave_name}</p>
                </div>

                <span
                  className={`px-2 py-1 text-xs font-bold rounded-full whitespace-nowrap ${
                    lv.category === "Coming Leave"
                      ? "bg-yellow-200 text-yellow-800"
                      : lv.category === "On Leave"
                      ? "bg-green-200 text-green-800"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {lv.category}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-medium">Dates:</span>{" "}
                  <span className="inline-block px-2 py-1 ml-2 text-indigo-800 bg-indigo-100 rounded">
                    {formatDate(lv.date_from)} → {formatDate(lv.date_until)}
                  </span>
                </p>

                <p>
                  <span className="font-medium">Total Days:</span>{" "}
                  <span className="ml-2 font-medium text-gray-800">{lv.total_days}</span>
                </p>

                <p>
                  <span className="font-medium">Status:</span>{" "}
                  <span className="ml-2 text-gray-700">{lv.status}</span>
                </p>

                <p className="text-sm font-medium">
                  Paid:{" "}
                  <span
                    className={`px-2 py-0.5 rounded text-sm font-semibold ${
                      Number(lv?.is_paid) === 1
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {Number(lv?.is_paid) === 1 ? "Yes" : "No"}
                  </span>
                </p>
              </div>

              {/* Edit button — full width to make it easy to tap on mobile */}
              <div className="mt-4">
                <button
                  onClick={() => {
                    setSelected(lv);
                    setOpen(true);
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-white transition bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  aria-label={`Edit leave for ${lv.first_name} ${lv.last_name}`}
                >
                  Edit
                </button>
              </div>
            </article>
          ))}
      </div>

      {/* Modal (unchanged behavior) */}
      {open && (
        <ApproveLeaveFormModal
          open={open}
          onClose={() => setOpen(false)}
          onSave={selected ? updateLeave : addLeave}
          selected={selected}
        />
      )}
    </div>
  );
}




// import React, { useState } from "react";
// import { useLeaves } from "../approved_leavehook/useApproveLeave";
// import ApproveLeaveFormModal from "./ApproveLeaveFormModal";

// export default function ApproveLeaveTable() {
//   const { leaves, loading, updateLeave, addLeave } = useLeaves();
//   const [selected, setSelected] = useState(null);
//   const [open, setOpen] = useState(false);

//   if (loading) return <p>Loading...</p>;

//   return (
//     <div className="p-4">
//       <button
//         onClick={() => {
//           setSelected(null);
//           setOpen(true);
//         }}
//         className="px-4 py-2 mb-4 text-white bg-blue-600 rounded-lg"
//       >
//         + Add Leave
//       </button>

//       <table className="w-full border rounded-lg">
//         <thead>
//           <tr className="bg-gray-100">
//             <th>Employee</th>
//             <th>Type</th>
//             <th>Dates</th>
//             <th>Total Days</th>
//             <th>Status</th>
//             <th>Category</th>
//             <th>Action</th>
//           </tr>
//         </thead>
//         <tbody>
//           {Array.isArray(leaves) && leaves.map((lv) => (
//             <tr
//               key={lv.leave_id}
//               className={
//                 lv.category === "Coming Leave"
//                   ? "bg-yellow-100"
//                   : lv.category === "On Leave"
//                   ? "bg-green-100"
//                   : "bg-gray-200"
//               }
//             >
//               <td>{lv.first_name} {lv.last_name}</td>
//               <td>{lv.leave_name}</td>
//               <td>{lv.date_from} → {lv.date_until}</td>
//               <td>{lv.total_days}</td>
//               <td>{lv.status}</td>
//               <td>{lv.category}</td>
//               <td>
//                 <button
//                   onClick={() => {
//                     setSelected(lv);
//                     setOpen(true);
//                   }}
//                   className="px-2 py-1 text-white bg-indigo-600 rounded"
//                 >
//                   Edit
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {open && (
//         <ApproveLeaveFormModal
//           open={open}
//           onClose={() => setOpen(false)}
//           onSave={selected ? updateLeave : addLeave}
//           selected={selected}
//         />
//       )}
//     </div>
//   );
// }
