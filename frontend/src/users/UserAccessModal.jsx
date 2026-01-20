// UserAccessModal.jsx
import React, { useState, useEffect } from "react";
import useUserAccess from "./hooks/useUserAccess";
import { PERMISSION_GROUPS } from "./userAccessComponents/permissions";
import PermissionGroup from "./userAccessComponents/PermissionGroup";
import ConfirmPopup from "./userAccessComponents/ConfirmPopup";
import useRoles from "../authentication/useRoles"; // dynamic roles

export default function UserAccessModal({ user, onClose }) {
  const { saveUserAccess, getUserAccess, loading } = useUserAccess();
  const [role, setRole] = useState(user?.role || "");
  const [status, setStatus] = useState(user?.status || "");
  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const [fetching, setFetching] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const { roles, loading: rolesLoading } = useRoles();

  useEffect(() => {
    const fetchAccess = async () => {
      if (!user) return;
      setFetching(true);

      const res = await getUserAccess(user.username);

      if (res.success) {
        setRole(res.data.role || "");
        setStatus(res.data.status || "");

        const perms = {};
        Object.values(PERMISSION_GROUPS).forEach((group) => {
          Object.keys(group).forEach((p) => {
            perms[p] = res.data[p] === "yes" ? "yes" : "no";
          });
        });

        setPermissions(perms);
        setOriginalPermissions(perms);
      } else {
        alert(res.message);
      }
      setFetching(false);
    };
    fetchAccess();
  }, [user]);

  const togglePermission = (perm) => {
    setPermissions((prev) => ({
      ...prev,
      [perm]: prev[perm] === "yes" ? "no" : "yes",
    }));
  };

  const handleSave = async () => {
    const payload = {
      username: user.username,
      role: role || user.role,
      status: status || user.status,
      permissions,
    };

    const result = await saveUserAccess(payload);
    if (result.success) {
      onClose();
    } else {
      alert(result.message);
    }
  };

  // Diff checker
  const newlyAddedPermissions = Object.entries(PERMISSION_GROUPS).flatMap(
    ([group, perms]) =>
      Object.entries(perms)
        .filter(
          ([key]) =>
            originalPermissions[key] === "no" && permissions[key] === "yes"
        )
        .map(([key, label]) => ({ group, label }))
  );

  const removedPermissions = Object.entries(PERMISSION_GROUPS).flatMap(
    ([group, perms]) =>
      Object.entries(perms)
        .filter(
          ([key]) =>
            originalPermissions[key] === "yes" && permissions[key] === "no"
        )
        .map(([key, label]) => ({ group, label }))
  );

  if (!user) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-2xl shadow-lg w-[800px] max-w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Edit Permissions for{" "}
          <span className="text-blue-600">
            {user.username} {user.role ? `(${user.role})` : ""}
          </span>
        </h3>

        {fetching ? (
          <p className="text-gray-500">Loading access...</p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setShowConfirm(true);
            }}
          >
            {/* Role */}
            <div className="mb-4">
              <label className="block mb-1 font-medium">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border rounded p-2 text-sm sm:text-base"
                >
                  {rolesLoading ? (
                    <option>Loading roles...</option>
                  ) : (
                    roles.map((r) => (
                      <option key={r.role_name} value={r.role_name}>
                        {r.role_name}
                      </option>
                    ))
                  )}
                </select>
            </div>

            {/* Status */}
            <div className="mb-6">
              <label className="block mb-1 font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border rounded p-2 text-sm sm:text-base"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Permissions */}
            <div className="space-y-6">
              {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                <PermissionGroup
                  key={group}
                  group={group}
                  perms={perms}
                  permissions={permissions}
                  togglePermission={togglePermission}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-3 sm:px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm sm:text-base"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 sm:px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white shadow text-sm sm:text-base"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}
      </div>

      {showConfirm && (
        <ConfirmPopup
          newlyAddedPermissions={newlyAddedPermissions}
          removedPermissions={removedPermissions}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleSave}
          loading={loading}
        />
      )}
    </div>
  );
}
