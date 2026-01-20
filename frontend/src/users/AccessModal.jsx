// AccessModal.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import BASE_URL from "../../backend/server/config";
import { PERMISSION_GROUPS } from "./userAccessComponents/permissions";
import PermissionGroup from "./userAccessComponents/PermissionGroup";
import ConfirmPopup from "./userAccessComponents/ConfirmPopup";

// PROTECTED - do not change these imports (kept as you requested)
import useRoles from "../authentication/useRoles";
import useUserAccess from "./hooks/useUserAccess";
import FeedIcon from '@mui/icons-material/Feed';

// role-management hook (role list + add/update/delete) — keep this import
import useRolesUsers from "../components/user_role_lists/hooks/useRoles";

import Swal from "sweetalert2";
import {
  Home,
  UsersRound,
  Calendar,
  DollarSign,
  Component,
  List,
  Fingerprint,
  MailCheck,
  HandCoins,
  Smartphone,
  Users,
  Lock,
  Settings,
  Logs,
  FileText 
} from "lucide-react";

/* ---------------------------
   CONFIG: menus (and fields)
   --------------------------- */

const MENU_FIELDS = [
  "dashboard",
  "employees",
  "attendance",
  "dtr",
  "payroll",
  "utilities",
  "requests",
  // "users",
  "biometrics",
  "email_customization",
  "contributions",
  // "menu_access",
  "time_in_out",
  "users_management",
  "reset_password",
  "logs"
];
const COMMON_ACCESS_KEY = "common_access";

const MENU_CONFIG = {
  dashboard: { label: "Dashboard", icon: Home },
  employees: { label: "Employees", icon: UsersRound },
  attendance: { label: "Attendance", icon: Calendar },
  dtr: { label: "Employee DTR", icon: FileText  },

  payroll: { label: "Payroll", icon: DollarSign },
  utilities: { label: "Settings", icon: Settings },
  requests: { label: "Requests", icon: List },
  biometrics: { label: "Biometrics", icon: Fingerprint },
  email_customization: { label: "Email Customization", icon: MailCheck },
  contributions: { label: "Contributions", icon: HandCoins },
  menu_access: { label: "Menu Access", icon: List },
  time_in_out: { label: "Time In/Out", icon: Smartphone },
  users_management: { label: "Users Management", icon: Users },
  reset_password: { label: "Reset Password", icon: Lock },
  logs: { label: "Logs", icon: Logs },
};

const MENU_PERMISSIONS_MAP = {
  employees: "Employee Access",
  attendance: "Attendance Access",
  payroll: "Payroll Access",
  utilities: "Utilities Access",
  requests: "Employee Requests Access",
  users_management: "User Management Access",
};

const PERMISSION_KEYS = Object.values(PERMISSION_GROUPS).flatMap((g) =>
  Object.keys(g)
);

/* ---------------------------
   Helpers
   --------------------------- */

function normalizeAccess(menuData = {}, userData = {}, defaultUser = {}) {
  const norm = {};

  MENU_FIELDS.forEach((m) => {
    norm[m] = menuData[m] === "yes" || userData[m] === "yes" ? "yes" : "no";
  });

  PERMISSION_KEYS.forEach((p) => {
    norm[p] = userData[p] === "yes" || menuData[p] === "yes" ? "yes" : "no";
  });

  norm.role = userData.role || menuData.role || defaultUser.role || "";
  norm.status = userData.status || menuData.status || defaultUser.status || "active";

  return norm;
}

function buildMenuPayloadFromAccess(access) {
  const payload = { username: access.username || "" };
  MENU_FIELDS.forEach((m) => {
    payload[m] = access[m] === "yes" ? "yes" : "no";
  });
  return payload;
}

function buildPermissionsPayloadFromAccess(access) {
  const permissions = {};
  PERMISSION_KEYS.forEach((p) => {
    permissions[p] = access[p] === "yes" ? "yes" : "no";
  });

  return {
    username: access.username || "",
    role: access.role || "",
    status: access.status || "active",
    permissions,
  };
}

/* ---------------------------
   Component
   --------------------------- */

export default function AccessModal({ user, onClose }) {
  // call protected hooks (kept exactly as required)
  // Note: we call the imported auth hook but store its result under a different name
  const authRolesResult = useRoles && typeof useRoles === "function" ? useRoles() : {};
  // user access hook
  const { getUserAccess, saveUserAccess, saveMenuAccess, loading: uaLoading } = useUserAccess();

  // role-management hook (the hook at src/components/user_role_lists/hooks/useRoles.jsx)
  // destructure with distinct names to avoid collisions
  const {
    roles: rolesFromHook = [],
    loading: rolesLoadingFromHook = false,
    addRole,
    updateRole,
    deleteRole
  } = useRolesUsers();

  const menuOptions = MENU_FIELDS;

  /* ---------------------------
     Local state
     --------------------------- */
  const [access, setAccess] = useState({});
  const [originalAccess, setOriginalAccess] = useState({});
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState(null);

  // roles displayed in select (local copy so we can optimistic-update)
  const [localRoles, setLocalRoles] = useState([]);

  // modal + add-role state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  // focus ref for modal input
  const addInputRef = useRef(null);
  useEffect(() => {
    if (showAddModal && addInputRef.current) {
      // small delay to allow modal to mount
      setTimeout(() => addInputRef.current.focus(), 50);
    }
  }, [showAddModal]);

  // sync roles from hook -> localRoles
  useEffect(() => {
    if (Array.isArray(rolesFromHook)) setLocalRoles(rolesFromHook);
  }, [rolesFromHook]);

  // Fetch both menu access and user access, then normalize
  useEffect(() => {
    if (!user?.username) return;
    let mounted = true;

    const fetch = async () => {
      setFetching(true);
      try {
        const menuPromise = axios.get(
          `${BASE_URL}/users/menu/getMenuAccess.php?username=${encodeURIComponent(
            user.username
          )}`
        );
        const userPromise = getUserAccess(user.username); // returns { success, data }

        const [menuResp, userResp] = await Promise.all([menuPromise, userPromise]);
        const menuData = menuResp?.data || {};
        const userData = userResp?.success ? userResp.data : {};

        const normalized = normalizeAccess(menuData, userData, user);
        normalized.username = user.username;

        if (!mounted) return;
        setAccess(normalized);
        setOriginalAccess(normalized);

        setSelectedMenu(COMMON_ACCESS_KEY);
      } catch (err) {
        console.error("AccessModal fetch error:", err);
      } finally {
        if (mounted) setFetching(false);
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.username]);

  // toggle either a menu key or a permission key
  const toggleAccess = (key) => {
    setAccess((prev) => {
      const next = { ...prev };
      const isMenuKey = MENU_FIELDS.includes(key);

      if (isMenuKey) {
        const newVal = prev[key] === "yes" ? "no" : "yes";
        next[key] = newVal;

        const groupName = MENU_PERMISSIONS_MAP[key];
        if (groupName && newVal === "no") {
          Object.keys(PERMISSION_GROUPS[groupName]).forEach((child) => {
            next[child] = "no";
          });
        } else if (groupName && newVal === "yes" && !selectedMenu) {
          setSelectedMenu(key);
        }
      } else {
        next[key] = prev[key] === "yes" ? "no" : "yes";
      }

      return next;
    });
  };

  // Build diff (for ConfirmPopup) using PERMISSION_GROUPS
  const newlyAddedPermissions = Object.entries(PERMISSION_GROUPS).flatMap(
    ([group, perms]) =>
      Object.entries(perms)
        .filter(([key]) => (originalAccess[key] || "no") === "no" && access[key] === "yes")
        .map(([key, label]) => ({ group, label }))
  );

  const removedPermissions = Object.entries(PERMISSION_GROUPS).flatMap(
    ([group, perms]) =>
      Object.entries(perms)
        .filter(([key]) => (originalAccess[key] || "no") === "yes" && access[key] === "no")
        .map(([key, label]) => ({ group, label }))
  );

  // One-click save: update both permissions and menu access
  const handleSave = async () => {
    setLoading(true);
    try {
      const menus = {};
      menuOptions.forEach((m) => {
        menus[m] = access[m] === "yes" ? "yes" : "no";
      });

      const permissions = {};
      PERMISSION_KEYS.forEach((p) => {
        permissions[p] = access[p] === "yes" ? "yes" : "no";
      });

      const payload = {
        username: user.username,
        role: access.role,
        status: access.status,
        menus,
        permissions,
      };

      const res = await axios.post(
        `${BASE_URL}/users/update_access.php`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      if (res.data.success) {
        Swal.fire({ icon: "success", title: "Access updated", timer: 1000, showConfirmButton: false });
        onClose();
      } else {
        Swal.fire({ icon: "warning", title: res.data.message || "Failed to update access" });
      }
    } catch (err) {
      console.error("Save error:", err);
      Swal.fire({ icon: "error", title: "Error saving access" });
    } finally {
      setLoading(false);
    }
  };

  // Add role handler using modal (optimistic update + rollback on error)
  const handleAddRole = async () => {
    const name = (newRoleName || "").trim();
    if (!name) {
      Swal.fire({ icon: "warning", title: "Role name cannot be empty" });
      return;
    }

    // if already exists locally - select and close modal
    if (localRoles.some((r) => r.role_name === name)) {
      setAccess((prev) => ({ ...prev, role: name }));
      setShowAddModal(false);
      setNewRoleName("");
      return;
    }

    setAddingRole(true);
    try {
      // optimistic UI
      setLocalRoles((prev) => [...prev, { role_name: name }]);
      setAccess((prev) => ({ ...prev, role: name }));

      // persist via hook
      if (typeof addRole === "function") {
        await addRole(name);
      } else {
        // fallback: try to call backend directly if hook missing
        await axios.post(`${BASE_URL}/user_role_lists/add_role.php`, { role_name: name });
      }

      Swal.fire({ icon: "success", title: "Role added", timer: 900, showConfirmButton: false });
      setShowAddModal(false);
      setNewRoleName("");
    } catch (err) {
      console.error("Failed to add role:", err);
      Swal.fire({ icon: "error", title: "Failed to add role" });
      // rollback optimistic update
      setLocalRoles((prev) => prev.filter((r) => r.role_name !== name));
      setAccess((prev) => ({ ...prev, role: "" }));
    } finally {
      setAddingRole(false);
    }
  };

  // Early return if no user
  if (!user) return null;

  /* --------------------------
     RENDER
     -------------------------- */
  return (
    <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
      <div className="bg-white rounded-2xl shadow-lg w-[92%] max-w-[1100px] h-[92vh] overflow-hidden flex flex-col sm:flex-row">
        {/* Left: Menu list (desktop only) */}
        <div className="hidden sm:block w-72 border-r bg-gray-50 p-4 overflow-y-auto h-full">
          <h3 className="text-lg font-semibold mb-3">Menu Access</h3>

          {fetching ? (
            <div className="text-gray-500">Loading menus...</div>
          ) : (
            <div className="space-y-2">
              <div
                onClick={() => setSelectedMenu(COMMON_ACCESS_KEY)}
                className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                  selectedMenu === COMMON_ACCESS_KEY ? "bg-white shadow-sm" : "hover:bg-gray-100"
                }`}
              >
                <Lock size={18} className="text-gray-600" />
                <div className="text-sm font-medium">General Access</div>
              </div>

              {menuOptions.map((key) => {
                const { label, icon: Icon = List } = MENU_CONFIG[key] || {};
                const checked = access[key] === "yes";
                const isSelected = selectedMenu === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedMenu(key)}
                    className={`flex items-center justify-between gap-2 p-2 rounded cursor-pointer ${
                      isSelected ? "bg-white shadow-sm" : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon size={18} className="text-gray-600" />}
                      <div>
                        <div className="text-sm font-medium">{label || key}</div>
                        <div className="text-xs text-gray-500">{checked ? "Enabled" : "Disabled"}</div>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleAccess(key);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Role / Status / Permissions */}
        <div className="w-full sm:flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex flex-col sm:flex-row sm:items-center gap-1">
              <span>Edit Access</span>
              <span className="text-blue-600 sm:ml-2">{user.username}</span>
              <span className="text-gray-500 font-medium sm:ml-2">({user.full_name})</span>
            </h2>
            <div className="hidden sm:block text-sm text-gray-500">Manage menus & permissions</div>
          </div>

          {/* Mobile-only tab bar */}
          <div className="sm:hidden flex gap-2 overflow-x-auto mt-4 border-b pb-2">
            <div
              onClick={() => setSelectedMenu(COMMON_ACCESS_KEY)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-t cursor-pointer ${
                selectedMenu === COMMON_ACCESS_KEY ? "bg-white border border-b-0" : "bg-gray-100"
              }`}
            >
              <span>Common</span>
            </div>

            {menuOptions.map((key) => {
              const { label } = MENU_CONFIG[key] || {};
              const checked = access[key] === "yes";
              const isSelected = selectedMenu === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedMenu(key)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-t cursor-pointer ${
                    isSelected ? "bg-white border border-b-0" : "bg-gray-100"
                  }`}
                >
                  <span>{label || key}</span>

                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleAccess(key);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4"
                  />
                </div>
              );
            })}
          </div>

          {/* Permissions content */}
          <div className="mt-6 space-y-6">
            {selectedMenu === COMMON_ACCESS_KEY ? (
              <div className="space-y-4">
                {/* Role & Status */}
                {/* Role + Add (modal) & Status — nicer UI */}
                <div className="grid" style={{ gridTemplateColumns: "1fr auto 1fr", gap: "1rem", alignItems: "start" }}>
                  {/* Left: Role select + Add (button opens modal) */}
                  <div>
                    <label className="block mb-2 font-medium text-sm">Role</label>

                    <div className="flex items-center">
                      <select
                        value={access.role || ""}
                        onChange={(e) => setAccess((p) => ({ ...p, role: e.target.value }))}
                        className="flex-1 appearance-none border border-gray-300 rounded-l-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        aria-label="Select role"
                      >
                        {rolesLoadingFromHook ? (
                          <option>Loading roles...</option>
                        ) : (
                          <>
                            <option value="">-- Select role --</option>
                            {localRoles.map((r) => (
                              <option key={r.role_name} value={r.role_name}>
                                {r.role_name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        title="Add role"
                        className="ml-2 inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-white text-sm font-medium shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-300 transition"
                      >

                        <span className="leading-none">+ Add role</span>
                      </button>
                    </div>

                    <p className="mt-2 text-xs text-gray-500">Choose a role for this user or add a new one.</p>
                  </div>

                  {/* Center: visual separator */}
                  <div className="flex items-center justify-center">
                    <div className="h-full w-px bg-transparent" aria-hidden></div>
                  </div>

                  {/* Right: Status */}
                  <div>
                    <label className="block mb-2 font-medium text-sm">Status</label>
                    <select
                      value={access.status || "active"}
                      onChange={(e) => setAccess((p) => ({ ...p, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      aria-label="Select status"
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Inactive</option>
                    </select>

                    <p className="mt-2 text-xs text-gray-500">Set user active or inactive</p>
                  </div>
                </div>

                {/* Common Permissions */}
                <PermissionGroup
                  group="Common Access"
                  perms={PERMISSION_GROUPS["Common Access"]}
                  permissions={access}
                  togglePermission={toggleAccess}
                />
              </div>
            ) : selectedMenu ? (
              access[selectedMenu] === "yes" ? (
                MENU_PERMISSIONS_MAP[selectedMenu] ? (
                  <PermissionGroup
                    group={MENU_PERMISSIONS_MAP[selectedMenu]}
                    perms={PERMISSION_GROUPS[MENU_PERMISSIONS_MAP[selectedMenu]]}
                    permissions={access}
                    togglePermission={toggleAccess}
                  />
                ) : (
                  <div className="text-sm text-gray-600">
                    {MENU_CONFIG[selectedMenu]?.label || selectedMenu} has no permissions defined.
                  </div>
                )
              ) : (
                <div className="text-sm text-gray-500">
                  {MENU_CONFIG[selectedMenu]?.label || selectedMenu} is disabled. Toggle it to enable permissions.
                </div>
              )
            ) : (
              <div className="text-sm text-gray-500">Select a menu to edit permissions.</div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
            <button
              disabled={isSaving || uaLoading}
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {isSaving || uaLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirm popup */}
      {showConfirm && (
        <ConfirmPopup
          newlyAddedPermissions={newlyAddedPermissions}
          removedPermissions={removedPermissions}
          onCancel={() => setShowConfirm(false)}
          onConfirm={() => {
            setShowConfirm(false);
            handleSave();
          }}
          loading={isSaving || uaLoading}
        />
      )}

      {/* Add Role Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!addingRole) {
                setShowAddModal(false);
                setNewRoleName("");
              }
            }}
            aria-hidden
          />
          <div className="relative z-50 w-full max-w-md mx-4 bg-white rounded-lg shadow-lg p-5">
            <h3 className="text-lg font-semibold mb-3">Add Role</h3>

            <label className="block text-sm font-medium text-gray-700 mb-2">Role name</label>
            <input
              ref={addInputRef}
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddRole();
                }
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="e.g. Manager"
              aria-label="New role name"
            />

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setShowAddModal(false); setNewRoleName(""); }}
                disabled={addingRole}
                className="px-4 py-2 rounded border border-gray-300 text-sm bg-white hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={handleAddRole}
                disabled={addingRole}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
              >
                {addingRole ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                  </svg>
                ) : null}
                <span>{addingRole ? "Saving…" : "Save"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
