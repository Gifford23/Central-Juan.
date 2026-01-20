// BiometricsUsersList.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BASE_URL from "../../../backend/server/config";

/**
 * BiometricsUsersList.jsx
 * - Uses department_name / position_name derived from API (or fallback maps)
 * - Accepts either full image URLs or stored filenames
 * - Falls back to initials when image missing or fails to load
 * - Filters are context-aware: each dropdown's options are derived from items
 *   after applying the other active filters (cascading filters).
 */

export default function BiometricsUsersList() {
  const [items, setItems] = useState([]);
  const [departmentsMap, setDepartmentsMap] = useState({});
  const [positionsMap, setPositionsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [department, setDepartment] = useState("all"); // selected department_id
  const [position, setPosition] = useState("all"); // selected position_id
  const [status, setStatus] = useState("active"); // default active

  // modal
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUserId, setNewUserId] = useState("");

  // toast
  const [toast, setToast] = useState(null);

  // track images that failed to load so we can show initials instead
  const [failedImages, setFailedImages] = useState({});

  useEffect(() => {
    fetchAll();
    fetchDepartments();
    fetchPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------- API FETCHERS --------------------- */
  async function fetchDepartments() {
    try {
      const r = await axios.get(`${BASE_URL}/departments/get_departments.php`);
      if (r.data && r.data.success && Array.isArray(r.data.departments)) {
        const map = {};
        r.data.departments.forEach((d) => {
          map[d.department_id] = d.department_name;
        });
        setDepartmentsMap(map);
      }
    } catch (err) {
      console.warn("fetchDepartments error", err);
    }
  }

  async function fetchPositions() {
    try {
      const r = await axios.get(`${BASE_URL}/positions/get_positions.php`);
      if (r.data && r.data.success && Array.isArray(r.data.positions)) {
        const map = {};
        r.data.positions.forEach((p) => {
          map[p.position_id] = p.position_name;
        });
        setPositionsMap(map);
      }
    } catch (err) {
      console.warn("fetchPositions error", err);
    }
  }

  async function fetchAll() {
    setLoading(true);
    setError("");
    try {
      const resp = await axios.get(
        `${BASE_URL}/biomentrics/get_biometrics_employees.php`,
        { timeout: 15000 }
      );

      if (!resp.data) throw new Error("Empty response from server");
      if (!resp.data.success) throw new Error(resp.data.error || "Server returned success:false");

      const raw = resp.data.data || [];

      const rows = raw
        .map((r) => ({
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          branch_id: r.branch_id,
          branch_name: r.branch_name,
          department_id: r.department_id,
          department_name: r.department_name, // may be present from backend
          position_id: r.position_id,
          position_name: r.position_name,
          // map employee_status from either property (your API sometimes uses `status`)
          employee_status: r.employee_status ?? r.status ?? null,
          image: r.image || null,

          user: r.user || null,
          user_id: r.user ? String(r.user.user_id) : null,
          username: r.user ? r.user.username : null,
          user_role: r.user ? r.user.role : null,
          user_status: r.user ? r.user.status : null,
        }))
        .filter((r) => r.user !== null);

      // stable ascending by employee_id (string)
      rows.sort((a, b) => (a.employee_id || "").localeCompare(b.employee_id || ""));
      setItems(rows);
    } catch (err) {
      console.error("fetchAll error", err);
      setError("Failed to load biometrics users.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  /* --------------------- CONTEXT-AWARE FILTER OPTION BUILDERS --------------------- */

  // helper: apply other filters (used to compute dropdown options).
  // We pass booleans to indicate which filter to SKIP when building options.
  function filterItemsForOptions({ skipBranch = false, skipDepartment = false, skipPosition = false, skipSearch = false }) {
    return items.filter((it) => {
      // search (skip if asked)
      if (!skipSearch && search.trim()) {
        const q = search.trim().toLowerCase();
        const empId = (it.employee_id || "").toLowerCase();
        const empName = (it.employee_name || "").toLowerCase();
        const uId = (it.user_id || "").toLowerCase();
        const uname = (it.username || "").toLowerCase();
        if (!(empId.includes(q) || empName.includes(q) || uId.includes(q) || uname.includes(q))) return false;
      }
      // branch (skip if asked)
      if (!skipBranch && branch !== "all" && String(it.branch_id) !== String(branch)) return false;
      // department (skip if asked)
      if (!skipDepartment && department !== "all" && String(it.department_id) !== String(department)) return false;
      // position (skip if asked)
      if (!skipPosition && position !== "all" && String(it.position_id) !== String(position)) return false;
      // status (we always apply status because we don't provide a UI to change its options)
      if (status !== "all" && String(it.employee_status) !== String(status)) return false;

      return true;
    });
  }

  // Branch options derived from items but respecting other active filters (skip branch itself)
  const availableBranches = useMemo(() => {
    const list = filterItemsForOptions({ skipBranch: true, skipSearch: false, skipDepartment: false, skipPosition: false });
    const s = new Map();
    list.forEach((i) => {
      if (i.branch_id) {
        const key = `${i.branch_id}`;
        if (!s.has(key)) s.set(key, { id: i.branch_id, name: i.branch_name || i.branch_id });
      }
    });
    return Array.from(s.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [items, search, branch, department, position, status]);

  // Department options derived from items but respecting other active filters (skip department itself)
  const availableDepartments = useMemo(() => {
    const list = filterItemsForOptions({ skipDepartment: true, skipSearch: false, skipBranch: false, skipPosition: false });
    const s = new Map();
    list.forEach((i) => {
      if (i.department_id) {
        const name = i.department_name || departmentsMap[i.department_id] || i.department_id;
        s.set(i.department_id, { id: i.department_id, name });
      }
    });
    return Array.from(s.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [items, search, branch, department, position, status, departmentsMap]);

  // Position options derived from items but respecting other active filters (skip position itself)
  const availablePositions = useMemo(() => {
    const list = filterItemsForOptions({ skipPosition: true, skipSearch: false, skipBranch: false, skipDepartment: false });
    const s = new Map();
    list.forEach((i) => {
      if (i.position_id) {
        const name = i.position_name || positionsMap[i.position_id] || i.position_id;
        s.set(i.position_id, { id: i.position_id, name });
      }
    });
    return Array.from(s.values()).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }, [items, search, branch, department, position, status, positionsMap]);

  // Keep the 'all' fallback variable (for other uses)
  const allDepartments = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (i.department_id) {
        const name = i.department_name || departmentsMap[i.department_id] || i.department_id;
        map.set(i.department_id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, departmentsMap]);

  const allPositions = useMemo(() => {
    const map = new Map();
    items.forEach((i) => {
      if (i.position_id) {
        const name = i.position_name || positionsMap[i.position_id] || i.position_id;
        map.set(i.position_id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items, positionsMap]);

  /* --------------------- DISPLAYED LIST (FILTER + SEARCH) --------------------- */

  const displayed = useMemo(() => {
    let list = [...items];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((it) => {
        const empId = (it.employee_id || "").toLowerCase();
        const empName = (it.employee_name || "").toLowerCase();
        const uId = (it.user_id || "").toLowerCase();
        const uname = (it.username || "").toLowerCase();
        return empId.includes(q) || empName.includes(q) || uId.includes(q) || uname.includes(q);
      });
    }

    if (branch !== "all") list = list.filter((it) => String(it.branch_id) === String(branch));
    if (department !== "all") list = list.filter((it) => String(it.department_id) === String(department));
    if (position !== "all") list = list.filter((it) => String(it.position_id) === String(position));
    if (status !== "all") list = list.filter((it) => String(it.employee_status) === String(status));

    return list;
  }, [items, search, branch, department, position, status]);

  /* --------------------- KEEP FILTER VALUES VALID --------------------- */

  // If a selection becomes invalid (not present in available options) reset it to "all".
  useEffect(() => {
    if (branch !== "all" && !availableBranches.some((b) => String(b.id) === String(branch))) {
      setBranch("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableBranches]);

  useEffect(() => {
    if (department !== "all" && !availableDepartments.some((d) => String(d.id) === String(department))) {
      setDepartment("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDepartments]);

  useEffect(() => {
    if (position !== "all" && !availablePositions.some((p) => String(p.id) === String(position))) {
      setPosition("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePositions]);

  /* --------------------- EDIT ID (MODAL) --------------------- */

  function openEdit(i) {
    setEditingUserId(i.user_id);
    setNewUserId(i.user_id);
    setShowModal(true);
  }

  async function saveEdit() {
    if (!newUserId.trim()) {
      showToast("error", "User ID cannot be empty");
      return;
    }
    setSaving(true);
    try {
      const resp = await axios.post(
        `${BASE_URL}/biomentrics/update_biometrics_user_id.php`,
        { old_user_id: editingUserId, new_user_id: newUserId },
        { timeout: 10000 }
      );

      if (resp.data && resp.data.success) {
        showToast("success", "Biometrics User ID updated");
        setShowModal(false);
        setEditingUserId(null);
        setNewUserId("");
        await fetchAll();
      } else {
        showToast("error", resp.data?.error || "Update failed");
      }
    } catch (err) {
      console.error("saveEdit error", err);
      showToast("error", "Server error while updating");
    } finally {
      setSaving(false);
    }
  }

  /* --------------------- UTILITIES --------------------- */

  function clearFilters() {
    setSearch("");
    setBranch("all");
    setDepartment("all");
    setPosition("all");
    setStatus("active");
  }

  function showToast(type, text, ms = 3000) {
    setToast({ type, text });
    setTimeout(() => setToast(null), ms);
  }

  function badgeColorForStatus(s) {
    if (!s) return "bg-gray-100 text-gray-800";
    const t = s.toLowerCase();
    if (t === "active") return "bg-green-100 text-green-800";
    if (t === "inactive") return "bg-yellow-100 text-yellow-800";
    if (t === "disabled") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  }

  function initials(name) {
    if (!name) return "NA";
    return name
      .split(" ")
      .map((n) => n[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  /* helper: build image src (full url or appended path) */
  function imageSrc(it) {
    if (!it || !it.image) return null;
    const val = String(it.image).trim();
    if (val.startsWith("http://") || val.startsWith("https://")) return val;
    // whatever you used previously for uploads - keep compatibility
    return `${BASE_URL}/employees/uploads/${val}`;
  }

  /* --------------------- RENDER --------------------- */

  return (
    <div className="p-6 w-full ">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Biometrics · Employees</h1>
          <p className="text-sm text-slate-500 mt-1">Manage biometrics user IDs and link with employees.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={fetchAll}
            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md text-sm"
            title="Refresh list"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"><path d="M21 12a9 9 0 10-3.2 6.6" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Refresh
          </button>

          <button
            onClick={clearFilters}
            className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            title="Clear filters (resets to active employees only)"
          >
            Clear Filters
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <input
            placeholder="Search by employee name, employee id, or user id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-200"
          />

          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="all">All Branches</option>
            {availableBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name || b.id}</option>
            ))}
          </select>

          <select value={department} onChange={(e) => setDepartment(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="all">All Departments</option>
            {availableDepartments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select value={position} onChange={(e) => setPosition(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="all">All Positions</option>
            {availablePositions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            {/* <option value="disabled">Disabled</option> */}
          </select>

          <div className="hidden lg:flex items-center justify-end">
            <span className="text-sm text-slate-500">Showing <b className="text-slate-700">{displayed.length}</b> results</span>
          </div>
        </div>
      </div>

      {/* Content: skeleton when loading */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="animate-pulse bg-white p-4 rounded-xl shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/5 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-red-700 bg-red-100 p-3 rounded">{error}</div>
      ) : (
        <>
          {displayed.length === 0 ? (
            <div className="text-slate-600 p-4 bg-white rounded-xl shadow">No employees match the filters.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayed.map((it) => (
                <div key={`${it.employee_id}_${it.user_id}`} className="bg-white rounded-2xl p-4 shadow hover:shadow-lg transition">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      {imageSrc(it) && !failedImages[it.employee_id] ? (
                        <img
                          src={imageSrc(it)}
                          alt={it.employee_name}
                          className="w-14 h-14 rounded-full object-cover shadow"
                          onError={(e) => {
                            // mark this employee's image as failed so we show initials instead
                            setFailedImages(prev => ({ ...prev, [it.employee_id]: true }));
                            e.target.onerror = null;
                            // hide broken image
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-300 text-white flex items-center justify-center text-lg font-semibold shadow">
                          {initials(it.employee_name)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-slate-900">{it.employee_name || it.employee_id}</div>
                          <div className="text-sm text-slate-500 mt-1">Employee ID: <span className="font-mono text-slate-700">{it.employee_id}</span></div>
                        </div>

                        <div className="text-right">
                          <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm ${badgeColorForStatus(it.employee_status)}`}>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" fill="currentColor" />
                            </svg>
                            <span className="font-medium">{it.employee_status}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-slate-600 flex flex-wrap gap-3">
                        <div>Branch: <b className="text-slate-800">{it.branch_name || "—"}</b></div>
                        <div>Dept: <b className="text-slate-800">{it.department_name || departmentsMap[it.department_id] || it.department_id || "—"}</b></div>
                        <div>Position: <b className="text-slate-800">{it.position_name || positionsMap[it.position_id] || it.position_id || "—"}</b></div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-500">Biometrics User ID</div>
                          <div className="font-mono text-lg text-slate-900">{it.user_id}</div>
                          <div className="text-sm text-slate-500">{it.username}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(it)}
                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                          >
                            Edit Biometrics ID
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal (animated blur) */}
      {showModal && (
        <div
          aria-modal="true"
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(10,11,12,0.35)", backdropFilter: "blur(6px)" }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300"
            style={{ animation: "modalIn 220ms cubic-bezier(.2,.9,.2,1)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Edit Biometrics User ID</h3>
                <p className="text-sm text-slate-500 mt-1">Change the user ID used by the biometric device (only updates users.user_id).</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setEditingUserId(null); setNewUserId(""); }}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mb-3">
              <label className="block text-sm text-slate-600 mb-1">Old ID</label>
              <div className="px-3 py-2 bg-slate-50 rounded text-slate-800 font-mono">{editingUserId}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-600 mb-1">New Biometrics User ID</label>
              <input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-200"
                placeholder="Enter new user ID"
                aria-label="New Biometrics User ID"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowModal(false); setEditingUserId(null); setNewUserId(""); }}
                className="px-4 py-2 rounded-md bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                onClick={saveEdit}
                disabled={saving}
                className={`px-4 py-2 rounded-md text-white ${saving ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 bottom-6 z-50 p-4 rounded-lg shadow-lg border ${toast.type === "success" ? "bg-green-50 border-green-200" : toast.type === "error" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
          <div className="text-sm font-medium" style={{ color: toast.type === "success" ? "#065f46" : toast.type === "error" ? "#7f1d1d" : "#0f172a" }}>
            {toast.text}
          </div>
        </div>
      )}

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(.995); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
