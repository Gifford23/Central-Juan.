import React, { useState } from "react";
import useRolesUsers from "./hooks/useRoles";
import RoleModal from "./components/RoleModal";

export default function RoleManager() {
  const { roles, loading, addRole, updateRole, deleteRole } = useRolesUsers();
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [search, setSearch] = useState("");

  // 🔎 Filter roles (case-insensitive)
  const filteredRoles = roles.filter((role) =>
    role.role_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto mt-10 bg-white rounded-xl shadow p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Roles</h2>

        <button
          onClick={() => {
            setEditRole(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
        >
          + Add Role
        </button>
      </div>

      {/* Search box */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search roles..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 pb-12">
        <table className="w-full">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="p-3 text-left">Role Name</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {loading ? (
              <tr>
                <td colSpan="2" className="p-3 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredRoles.length === 0 ? (
              <tr>
                <td colSpan="2" className="p-3 text-center text-gray-500">
                  No roles found
                </td>
              </tr>
            ) : (
              filteredRoles.map((role, idx) => (
                <tr
                  key={role.role_id}
                  className={`${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } border-t`}
                >
                  <td className="p-3 font-medium">{role.role_name}</td>
                    <td className="p-3 flex items-center justify-end gap-2">                    <button
                      onClick={() => {
                        setEditRole(role);
                        setModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this role?")) {
                          deleteRole(role.role_id);
                        }
                      }}
                      className="px-3 py-1.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <RoleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editRole}
        onSave={(name) => {
          if (editRole) {
            updateRole(editRole.role_id, name);
          } else {
            addRole(name);
          }
          setModalOpen(false);
        }}
      />
    </div>
  );
}
