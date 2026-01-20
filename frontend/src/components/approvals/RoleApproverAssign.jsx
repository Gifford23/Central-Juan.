import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import { useSession } from "../../context/SessionContext";

export default function RoleApproverAssign() {
  // session (may be undefined in some contexts; handle defensively)
  let session = {};
  try {
    session = useSession() || {};
  } catch (e) {
    session = {};
  }
  const user = session.user || {};

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingIds, setSavingIds] = useState(new Set());
  const [error, setError] = useState(null);

  // fetch roles + approver mapping
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get(`${BASE_URL}/user_role_lists/get_role_approver_levels.php`, { timeout: 20000 });
        if (res.data?.success && Array.isArray(res.data.data)) {
          if (!mounted) return;
          // normalize
          const arr = res.data.data.map((r) => ({
            role_id: r.role_id?.toString(),
            role_name: r.role_name || r.name || `Role ${r.role_id}`,
            approver_level: r.approver_level === null || r.approver_level === undefined ? null : Number(r.approver_level),
            updated_by: r.updated_by ?? null,
            updated_by_name: r.updated_by_name ?? null,
            updated_at: r.updated_at ?? null
          }));
          setRoles(arr);
        } else {
          throw new Error(res.data?.message || "Invalid response");
        }
      } catch (err) {
        console.error("Failed to load roles", err);
        if (!mounted) return;
        setError(err?.response?.data?.message || err.message || "Failed to load roles");
        Swal.fire("Error", err?.response?.data?.message || err.message || "Failed to load roles", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const handleChange = (roleId, value) => {
    setRoles((prev) => prev.map(r => r.role_id === roleId ? { ...r, approver_level: value === "none" ? null : Number(value) } : r));
  };

  const saveRole = async (role) => {
    const roleId = Number(role.role_id);
    setSavingIds((s) => new Set([...s, roleId]));
    try {
      const payload = {
        role_id: roleId,
        approver_level: role.approver_level === null ? null : Number(role.approver_level),
        // prefer to send id + name for clarity
        updated_by_id: (user?.user_id || user?.id || user?.email || null),
        updated_by_name: (user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.email || null)
      };

      const res = await axios.post(`${BASE_URL}/user_role_lists/set_role_approver_level.php`, payload, { headers: { "Content-Type": "application/json" }, timeout: 20000 });

      if (res.data?.success) {
        // If server returned the updated row in data, merge it back to state
        if (res.data?.data && typeof res.data.data === 'object') {
          setRoles((prev) => prev.map(r => (String(r.role_id) === String(res.data.data.role_id) ? {
            ...r,
            approver_level: res.data.data.approver_level === null || res.data.data.approver_level === undefined ? null : Number(res.data.data.approver_level),
            updated_by: res.data.data.updated_by ?? r.updated_by,
            updated_by_name: res.data.data.updated_by_name ?? r.updated_by_name,
            updated_at: res.data.data.updated_at ?? r.updated_at
          } : r)));
        } else {
          // fallback: refresh list
          const fresh = await axios.get(`${BASE_URL}/user_role_lists/get_role_approver_levels.php`, { timeout: 20000 });
          if (fresh.data?.success && Array.isArray(fresh.data.data)) setRoles(fresh.data.data.map((r) => ({
            role_id: r.role_id?.toString(),
            role_name: r.role_name || r.name || `Role ${r.role_id}`,
            approver_level: r.approver_level === null || r.approver_level === undefined ? null : Number(r.approver_level),
            updated_by: r.updated_by ?? null,
            updated_by_name: r.updated_by_name ?? null,
            updated_at: r.updated_at ?? null
          })));
        }

        Swal.fire("Saved", res.data.message || "Approver level saved.", "success");
      } else {
        Swal.fire("Error", res.data?.message || "Failed to save", "error");
      }
    } catch (err) {
      console.error("Save role failed", err);
      Swal.fire("Error", err?.response?.data?.message || err.message || "Failed to save", "error");
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(roleId);
        return next;
      });
    }
  };

  if (loading) return <div className="p-4 text-sm text-gray-600">Loading roles…</div>;

  return (
    <div className="p-4">
      <h3 className="text-xl font-semibold mb-4">Assign Approver Level to Roles</h3>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-100 text-red-700 rounded">{error}</div>
      )}

      <div className="space-y-2">
        {roles.map((r) => {
          const isSaving = savingIds.has(Number(r.role_id));
          return (
            <div key={r.role_id} className="flex items-center gap-3 p-3 border rounded-md bg-white">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.role_name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  role_id: {r.role_id}
                  {r.updated_at ? ` • last updated ${String(r.updated_at)}` : null}
                  {(r.updated_by_name || r.updated_by) ? (
                    <span className="block">Updated by: <span className="font-medium">{r.updated_by_name || r.updated_by}</span></span>
                  ) : null}
                </div>
              </div>

              <select
                value={r.approver_level === null ? "none" : String(r.approver_level)}
                onChange={(e) => handleChange(r.role_id, e.target.value)}
                className="p-2 border rounded-md"
                disabled={isSaving}
              >
                <option value="none">None</option>
                <option value="1">Level 1 approver</option>
                <option value="2">Level 2 approver</option>
              </select>

              <button
                onClick={() => saveRole(r)}
                disabled={isSaving}
                className={`px-3 py-2 text-white rounded-md ${isSaving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
