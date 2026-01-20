
import React, { useState, useMemo } from "react";
import useUsers from "./hooks/useUsers";
import AccessModal from "./AccessModal";
import usePermissions from "../users/hooks/usePermissions";
import { useSession } from "../context/SessionContext";
import { RefreshCw, Search } from "lucide-react";

export default function Users() {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const { users, loading, error, refetch } = useUsers();

  const [accessUser, setAccessUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (!u.full_name || u.full_name.trim() === "-") return false;
        const query = search.toLowerCase();
        const matchSearch =
          u.full_name.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query);
        const matchStatus = statusFilter === "all" ? true : u.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [users, search, statusFilter]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-600">
        <span className="animate-pulse">Loading users...</span>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-64 font-medium text-red-600">
        Error: {error}
      </div>
    );

  const handleRefetchPreserveScroll = async () => {
    const scrollY = window.scrollY;
    await refetch();
    window.scrollTo(0, scrollY);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header & Filters */}
      <div className="sticky top-0 z-10 pb-3 mb-3 bg-white border-b border-gray-200">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
            👥 Users Management
          </h1>

          <div className="flex flex-col w-full gap-3 sm:flex-row sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search
                size={16}
                className="absolute text-gray-400 -translate-y-1/2 left-3 top-1/2"
              />
              <input
                type="text"
                placeholder="Search by name, username, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full py-2 pr-3 text-sm border rounded-lg outline-none pl-9 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>

            <button
              onClick={refetch}
              className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition bg-green-600 rounded-lg shadow hover:bg-green-700"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Desktop grid layout */}
      <div className="hidden overflow-hidden bg-white border border-gray-200 shadow-sm md:block rounded-xl">
        {/* Header row */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs font-semibold text-gray-600 uppercase bg-gray-50">
          <div className="col-span-3">Name</div>
          <div className="col-span-3">Employee ID</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* User rows */}
        {filteredUsers.length === 0 ? (
          <div className="px-6 py-4 text-sm text-center text-gray-500">
            No users found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <div
                key={u.user_id}
                className="grid items-center grid-cols-12 gap-4 px-4 py-3 text-sm transition hover:bg-gray-50"
              >
                <div className="col-span-3 font-medium text-gray-800 truncate">
                  {u.full_name || "-"}
                </div>
                <div className="col-span-3 text-gray-700 truncate">
                  {u.username}
                </div>
                <div className="col-span-2 text-gray-600 capitalize truncate">
                  {u.role}
                </div>
                <div className="col-span-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      u.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
                {!permLoading && permissions?.can_edit && (
                  <div className="flex justify-end col-span-2">
                    <button
                      onClick={() => setAccessUser(u)}
                      className="px-4 py-2 text-sm font-medium text-white transition bg-blue-600 rounded-lg shadow hover:bg-blue-700"
                    >
                      Edit Access
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile compact cards */}
      <div className="space-y-2 md:hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-4 text-sm text-center text-gray-500 border border-dashed rounded-lg">
            No users found.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <div
              key={u.user_id}
              className="flex items-center justify-between p-3 transition bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow"
            >
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">
                  {u.full_name}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  @{u.username} • {u.role}
                </div>
                <span
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    u.status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {u.status}
                </span>
              </div>

              {/* Action Button (right aligned) */}
              {!permLoading && permissions?.can_edit && (
                <button
                  onClick={() => setAccessUser(u)}
                  className="ml-3 shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg shadow-sm transition"
                >
                  Edit
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Access Modal */}
      {accessUser && (
        <AccessModal
          user={accessUser}
          onClose={() => {
            setAccessUser(null);
            handleRefetchPreserveScroll();
          }}
        />
      )}
    </div>
  );
}



// import React, { useState, useMemo } from "react";
// import useUsers from "./hooks/useUsers";
// import AccessModal from "./AccessModal";              // <-- new unified modal
// import usePermissions from "../users/hooks/usePermissions";
// import { useSession } from "../context/SessionContext";

// export default function Users() {
//   const { user } = useSession();
//   const { permissions, loading: permLoading } = usePermissions(user?.username); 

//   const { users, loading, error, refetch } = useUsers();

//   const [accessUser, setAccessUser] = useState(null); // unified modal user

//   // Filters
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("active");
//   const [scrollPosition, setScrollPosition] = useState(0);

//   const filteredUsers = useMemo(() => {
//     return users
//       .filter((u) => {
//         if (!u.full_name || u.full_name.trim() === "-") return false;

//         const query = search.toLowerCase();
//         const matchSearch =
//           u.full_name.toLowerCase().includes(query) ||
//           u.username.toLowerCase().includes(query) ||
//           u.role.toLowerCase().includes(query);

//         const matchStatus =
//           statusFilter === "all" ? true : u.status === statusFilter;

//         return matchSearch && matchStatus;
//       })
//       .sort((a, b) => a.username.localeCompare(b.username));
//   }, [users, search, statusFilter]);

//   if (loading)
//     return (
//       <div className="flex items-center justify-center h-64 text-gray-600">
//         <span className="animate-pulse">Loading users...</span>
//       </div>
//     );

//   if (error)
//     return (
//       <div className="flex items-center justify-center h-64 font-medium text-red-600">
//         Error: {error}
//       </div>
//     );

//   const handleRefetchPreserveScroll = async () => {
//     const scrollY = window.scrollY;
//     await refetch();
//     window.scrollTo(0, scrollY);
//   };

//   return (
//     <div className="p-4 sm:p-6">
//       {/* Header & Controls (kept unchanged) */}
//       <div className="flex flex-col items-start justify-between gap-4 mb-6 sm:flex-row sm:items-center">
//         <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">👥 Users Management</h1>
//         <div className="flex flex-col w-full gap-3 sm:flex-row sm:w-auto">
//           <input
//             type="text"
//             placeholder="Search by name, username or role..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full px-3 py-2 text-sm border rounded-lg outline-none sm:w-64 focus:ring-2 focus:ring-blue-500"
//           />
//           <select
//             value={statusFilter}
//             onChange={(e) => setStatusFilter(e.target.value)}
//             className="px-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="all">All Status</option>
//             <option value="active">Active </option>
//             <option value="disabled">Disabled </option>
//           </select>
//           <button
//             onClick={refetch}
//             className="px-4 py-2 text-sm font-medium text-white transition bg-green-600 rounded-lg shadow hover:bg-green-700"
//           >
//             Refresh
//           </button>
//         </div>
//       </div>

//       {/* Table */}
//       <div className="pb-12 overflow-x-auto bg-white border border-gray-200 shadow rounded-2xl">
//         <table className="min-w-full text-sm divide-y divide-gray-200 sm:text-base">
//           <thead className="bg-gray-50">
//             <tr>
//               <th className="px-4 py-3 font-semibold text-left text-gray-600 sm:px-6">Name</th>
//               <th className="px-4 py-3 font-semibold text-left text-gray-600 sm:px-6">Username</th>
//               <th className="px-4 py-3 font-semibold text-left text-gray-600 sm:px-6">Role</th>
//               <th className="px-4 py-3 font-semibold text-left text-gray-600 sm:px-6">Status</th>
//               {!permLoading && permissions.can_edit && (
//                 <th className="px-4 py-3 font-semibold text-left text-gray-600 sm:px-6">Actions</th>
//               )}
//             </tr>
//           </thead>

//           <tbody className="divide-y divide-gray-100">
//             {filteredUsers.map((u) => (
//               <tr key={u.user_id} className="transition-colors hover:bg-gray-50">
//                 <td className="px-4 py-3 font-medium text-left text-gray-800 sm:px-6">{u.full_name || "-"}</td>
//                 <td className="px-4 py-3 font-medium text-left text-gray-800 sm:px-6">{u.username}</td>
//                 <td className="px-4 py-3 text-left text-gray-600 capitalize sm:px-6">{u.role}</td>
//                 <td className="px-4 py-3 text-left sm:px-6">
//                   <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{u.status}</span>
//                 </td>

//                 {!permLoading && permissions.can_edit && (
//                   <td className="px-4 py-3 text-left sm:px-6">
//                     <div className="flex gap-2">
//                       <button
//                         className="px-3 py-2 text-xs font-medium text-white transition bg-blue-600 rounded-lg shadow sm:px-4 hover:bg-blue-700 sm:text-sm"
//                         onClick={() => setAccessUser(u)}
//                       >
//                         Edit Access
//                       </button>

//                       {/* previously "Edit Menu Access" button — now the same unified modal */}
//                       {/* <button
//                         className="px-3 py-2 text-xs font-medium text-white transition bg-purple-600 rounded-lg shadow sm:px-4 hover:bg-purple-700 sm:text-sm"
//                         onClick={() => setAccessUser(u)}
//                       >
//                         Edit Menu
//                       </button> */}
//                     </div>
//                   </td>
//                 )}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Unified modal */}
//       {accessUser && (
//         <AccessModal
//           user={accessUser}
//           onClose={() => {
//             setAccessUser(null);
//             handleRefetchPreserveScroll();
//           }}
//         />
//       )}
//     </div>
//   );
// }
