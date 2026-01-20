import React, { useState, useMemo } from "react";
import useEmailAPI from "./hooks/useEmailAPI";
import { Plus, Mail, Trash2, Edit2, Filter } from "lucide-react";

export default function EmailCustomization() {
  const { emails = [], addEmail, updateEmail, deleteEmail } = useEmailAPI();
  const [newEmail, setNewEmail] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newActive, setNewActive] = useState("active");
  const [filterStatus, setFilterStatus] = useState("all"); // new filter state
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleAdd = () => {
    setSubmitAttempted(true);
    if (!newEmail.trim() || !newLabel.trim()) return;
    addEmail(newEmail.trim(), newLabel.trim(), newActive);
    setNewEmail("");
    setNewLabel("");
    setNewActive("active");
    setSubmitAttempted(false);
  };

  // keep your original filter logic (status is a string: "active"|"inactive")
  const filteredEmails = useMemo(() => {
    const byStatus = emails.filter((email) => {
      if (filterStatus === "all") return true;
      return email.is_active === filterStatus;
    });

    // Keep your custom sort: put id===1 first, otherwise ascending by id
    return byStatus.sort((a, b) =>
      a.id === 1 ? -1 : b.id === 1 ? 1 : a.id - b.id
    );
  }, [emails, filterStatus]);

  const canAdd = newEmail.trim() !== "" && newLabel.trim() !== "";

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl p-6 mx-auto bg-white border border-gray-200 shadow-xl rounded-2xl">
        {/* Header (removed duplicate Add button here) */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-indigo-700 sm:text-3xl">
            <Mail className="w-6 h-6" /> HR Email Customization
          </h1>

          {/* Only filter in header for larger screens */}
          <div className="items-center hidden gap-3 sm:flex">
            <div className="flex items-center gap-2 px-2 py-1 border border-gray-200 bg-gray-50 rounded-xl">
              <Filter className="w-4 h-4 text-indigo-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm bg-transparent outline-none"
                aria-label="Filter email status"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Add New Email (responsive) — single Add button kept here */}
        <div className="grid items-center grid-cols-1 gap-3 mb-4 md:grid-cols-4">
          <input
            type="email"
            placeholder="Enter HR Email (required)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={`p-3 border rounded-lg focus:ring-2 outline-none text-sm ${
              submitAttempted && !newEmail.trim()
                ? "border-red-400 ring-1 ring-red-200"
                : "border-gray-300 focus:ring-indigo-400"
            }`}
            aria-label="New email"
            required
          />

          <input
            type="text"
            placeholder="Enter Label (required)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className={`p-3 border rounded-lg focus:ring-2 outline-none text-sm ${
              submitAttempted && !newLabel.trim()
                ? "border-red-400 ring-1 ring-red-200"
                : "border-gray-300 focus:ring-indigo-400"
            }`}
            aria-label="New label"
            required
          />

          <div className="flex items-center gap-2">
            {/* <select
              value={newActive}
              onChange={(e) => setNewActive(e.target.value)}
              className="w-full p-3 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="New email status"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select> */}
          </div>

          {/* Add button — only one, disabled until required fields filled */}
          <div className="flex w-full gap-2">
            <div className="flex items-center flex-1 gap-2 px-2 py-1 border border-gray-200 sm:hidden bg-gray-50 rounded-xl">
              <Filter className="w-4 h-4 text-indigo-600" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-sm bg-transparent outline-none"
                aria-label="Filter email status"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium w-full sm:w-auto transition ${
                canAdd
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md"
                  : "bg-indigo-200 text-white cursor-not-allowed"
              }`}
              aria-label="Add email"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Inline validation message */}
        {submitAttempted && !canAdd && (
          <div className="mb-4 text-sm text-red-600">
            Please provide both Email and Label to add.
          </div>
        )}

        {/* Email list (table-free, compact, actions to the right) */}
        <div className="space-y-2">
          {filteredEmails.length === 0 ? (
            <div className="p-4 text-sm text-center text-gray-500 border border-gray-200 border-dashed rounded-lg">
              No emails found.
            </div>
          ) : (
            filteredEmails.map((email) => (
              <article
                key={email.id}
                className="flex items-center gap-4 px-3 py-3 transition bg-white border border-gray-200 rounded-lg shadow-sm sm:px-4 hover:shadow-md"
              >
                {/* Left: ID small badge (hidden on tiny screens) */}
                <div className="flex-shrink-0 w-10 text-center">
                  <div className="text-xs text-gray-500">ID</div>
                  <div className="mt-1 text-sm font-semibold text-gray-700">{email.id}</div>
                </div>

                {/* Main: label + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="truncate">
                      <div className="text-sm font-semibold text-gray-800 truncate">{email.label}</div>
                      <div className="text-xs text-gray-500 truncate">{email.hr_email}</div>
                    </div>

                    {/* Right area (status + actions) on larger screens */}
                    <div className="items-center hidden gap-3 ml-4 sm:flex">
                      <div>
                        {email.is_active === "active" ? (
                          <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateEmail(email.id, email.hr_email, email.label, email.is_active)
                          }
                          className="p-2 text-white bg-yellow-400 rounded-lg shadow-sm hover:bg-yellow-500"
                          aria-label={`Edit ${email.hr_email}`}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => deleteEmail(email.id)}
                          className="p-2 text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600"
                          aria-label={`Delete ${email.hr_email}`}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile view: status + actions stacked under main info, compact and right-aligned */}
                  <div className="flex items-center justify-between mt-2 sm:hidden">
                    <div>
                      {email.is_active === "active" ? (
                        <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateEmail(email.id, email.hr_email, email.label, email.is_active)
                        }
                        className="p-2 text-white bg-yellow-400 rounded-lg shadow-sm hover:bg-yellow-500"
                        aria-label={`Edit ${email.hr_email}`}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteEmail(email.id)}
                        className="p-2 text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600"
                        aria-label={`Delete ${email.hr_email}`}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}





// import React, { useState } from "react";
// import useEmailAPI from "./hooks/useEmailAPI";
// import { Plus, Mail, Trash2, Edit2, Filter  } from "lucide-react";

// export default function EmailCustomization() {
//   const { emails, addEmail, updateEmail, deleteEmail } = useEmailAPI();
//   const [newEmail, setNewEmail] = useState("");
//   const [newLabel, setNewLabel] = useState("");
//   const [newActive, setNewActive] = useState("active");
//   const [filterStatus, setFilterStatus] = useState("all"); // new filter state


//   const handleAdd = () => {
//     if (!newEmail.trim()) return;
//     addEmail(newEmail, newLabel || "HR Email", newActive);
//     setNewEmail("");
//     setNewLabel("");
//     setNewActive("active");
//   };

//   const filteredEmails = emails.filter((email) => {
//     if (filterStatus === "all") return true;
//     return email.is_active === filterStatus;
//   });


//   return (
//     <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100">
//       <div className="max-w-6xl p-8 mx-auto bg-white border border-gray-200 shadow-xl rounded-2xl">
//         <h1 className="flex items-center gap-2 mb-6 text-3xl font-bold text-indigo-700">
//           <Mail className="w-7 h-7" /> HR Email Customization
//         </h1>

//         {/* Add New Email */}
//         <div className="grid grid-cols-1 gap-3 mb-6 md:grid-cols-4">
//           <input
//             type="email"
//             placeholder="Enter HR Email"
//             value={newEmail}
//             onChange={(e) => setNewEmail(e.target.value)}
//             className="p-3 border border-gray-300 outline-none rounded-xl focus:ring-2 focus:ring-indigo-400"
//           />
//           <input
//             type="text"
//             placeholder="Enter Label"
//             value={newLabel}
//             onChange={(e) => setNewLabel(e.target.value)}
//             className="p-3 border border-gray-300 outline-none rounded-xl focus:ring-2 focus:ring-indigo-400"
//           />

//         {/* Filter */}
//         <div className="flex items-center justify-end gap-2 mb-4">
//           <Filter className="w-5 h-5 text-indigo-600" />
//           <select
//             value={filterStatus}
//             onChange={(e) => setFilterStatus(e.target.value)}
//             className="p-2 border border-gray-300 outline-none rounded-xl focus:ring-2 focus:ring-indigo-400"
//           >
//             <option value="all">All</option>
//             <option value="active">Active</option>
//             <option value="inactive">Inactive</option>
//           </select>
//         </div>

//           <button
//             onClick={handleAdd}
//             className="flex items-center justify-center gap-2 px-4 py-3 font-medium text-white transition-all bg-indigo-600 shadow-md rounded-xl hover:bg-indigo-700"
//           >
//             <Plus size={18} /> Add
//           </button>
//         </div>

//         {/* Email Table */}
//         <div className="overflow-x-auto border border-gray-200 shadow-sm rounded-xl">
//           <table className="w-full text-sm text-left border-collapse table-fixed">
//             <thead className="text-indigo-700 bg-indigo-50">
//               <tr>
//                 <th className="w-1/12 p-3 text-center border border-gray-300">ID</th>
//                 <th className="w-3/12 p-3 border border-gray-300">Label</th>
//                 <th className="w-4/12 p-3 border border-gray-300">Email</th>
//                 <th className="w-2/12 p-3 text-center border border-gray-300">Status</th>
//                 <th className="w-2/12 p-3 text-center border border-gray-300">Actions</th>
//               </tr>
//             </thead>
//          <tbody className="divide-y divide-gray-200">
//               {filteredEmails
//                 .sort((a, b) => (a.id === 1 ? -1 : b.id === 1 ? 1 : a.id - b.id))
//                 .map((email) => (
//                   <tr key={email.id} className="transition-colors hover:bg-gray-50">
//                     <td className="p-3 text-center border border-gray-300">{email.id}</td>
//                     <td className="p-3 font-medium text-gray-700 border border-gray-300">{email.label}</td>
//                     <td className="p-3 text-gray-600 border border-gray-300">{email.hr_email}</td>
//                     <td className="p-3 text-center border border-gray-300">
//                       {email.is_active === "active" ? (
//                         <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
//                           Active
//                         </span>
//                       ) : (
//                         <span className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
//                           Inactive
//                         </span>
//                       )}
//                     </td>
//                     <td className="p-3 text-center border border-gray-300">
//                       <div className="flex justify-center gap-2">
//                         <button
//                           onClick={() =>
//                             updateEmail(email.id, email.hr_email, email.label, email.is_active)
//                           }
//                           className="p-2 text-white bg-yellow-400 rounded-lg shadow-sm hover:bg-yellow-500"
//                         >
//                           <Edit2 size={16} />
//                         </button>
//                         <button
//                           onClick={() => deleteEmail(email.id)}
//                           className="p-2 text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600"
//                         >
//                           <Trash2 size={16} />
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }
