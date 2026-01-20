// components/Branches.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import BASE_URL from "../../../backend/server/config"; // adjust if needed
import BranchModal from "./branchModal";
import { useBranches } from "./hooks/useBranches";
import Swal from "sweetalert2";
import Avatar from "../Avatar";
import AssignEmployeeModal from "./AssignEmployeeModal";
import { useNavigate } from "react-router-dom";
import { Printer, Trash2, Search, Plus, AlignJustify, Grid3x3, UserRoundX, Users, Briefcase, Building2 } from "lucide-react";
import Tabs from "../breadcrumbs/Tabs";
import { useSession } from '../../context/SessionContext';
import Breadcrumbs from "../breadcrumbs/Breadcrumbs";
import usePermissions from "../../users/hooks/usePermissions";
/**
 * Branches.jsx - integrated with AssignEmployeeModal
 * - Optimistic UI updates when assigning employees
 * - Background re-sync via provided fetch functions
 */

export default function Branches() {
  const {
    branches,
    loading,
    fetchBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    employeesMap,
    loadingEmployeesMap,
    errorEmployeesMap,
    fetchEmployeesForBranch,
  } = useBranches();
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  // local state mirrors hook-provided data so we can update optimistically
  const [localBranches, setLocalBranches] = useState([]);
  const [localEmployeesMap, setLocalEmployeesMap] = useState({});

  // UI state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [query, setQuery] = useState("");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedBranchForAssign, setSelectedBranchForAssign] = useState(null);
  const navigate = useNavigate();

  const [selectedByBranch, setSelectedByBranch] = useState({});

  // sync localBranches with hook branches
  useEffect(() => {
    setLocalBranches(Array.isArray(branches) ? branches : []);
  }, [branches]);

  // merge authoritative employee lists into local map (preserve optimistic entries unless replaced)
  useEffect(() => {
    setLocalEmployeesMap((prev) => {
      const merged = { ...(prev || {}) };
      Object.keys(employeesMap || {}).forEach((k) => {
        merged[k] = employeesMap[k];
      });
      return merged;
    });
  }, [employeesMap]);

  const openCreate = () => {
    setEditingBranch(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEdit = (b) => {
    setEditingBranch(b);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const breadcrumbItems = [
    !permLoading && permissions?.employee_list && { key: "dashboard", label: "Employee Lists", path: "/employees" },
    !permLoading && permissions?.department && { key: "employees", label: "Departments", path: "/department" },
    !permLoading && permissions?.branches && { key: "branches", label: "Branches", path: "/branches" },
  ].filter(Boolean);


  const handleSubmit = async (form) => {
    try {
      if (isEditing) {
        await updateBranch(form);
        Swal.fire("Success", "Branch updated", "success");
      } else {
        await createBranch(form);
        Swal.fire("Success", "Branch created", "success");
      }
      setIsModalOpen(false);
      // refresh authoritative data
      await fetchBranches();
    } catch (err) {
      Swal.fire("Error", err.message || "Operation failed", "error");
    }
  };

  const handleDelete = async (branch_id) => {
    const r = await Swal.fire({
      title: "Delete branch?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
    });
    if (!r.isConfirmed) return;
    try {
      await deleteBranch(branch_id);
      Swal.fire("Deleted", "Branch deleted", "success");
      await fetchBranches();
    } catch (err) {
      Swal.fire("Error", err.message || "Delete failed", "error");
    }
  };

  const toggleEmployees = async (branch_id) => {
    const isOpen = !!expanded[branch_id];
    setExpanded((p) => ({ ...p, [branch_id]: !isOpen }));

    if (!isOpen && !localEmployeesMap[branch_id]) {
      await fetchEmployeesForBranch(branch_id);
    }
  };

  // selection helpers
  const toggleSelectForBranch = (branchId, employeeId) => {
    setSelectedByBranch((prev) => {
      const next = { ...(prev || {}) };
      const existing = new Set(next[branchId] || []);
      if (existing.has(employeeId)) existing.delete(employeeId);
      else existing.add(employeeId);
      next[branchId] = existing;
      return next;
    });
  };

  const toggleSelectAllForBranch = (branchId, employeesList) => {
    setSelectedByBranch((prev) => {
      const next = { ...(prev || {}) };
      const existing = new Set(next[branchId] || []);
      const total = (employeesList || []).map((e) => e.employee_id);
      const allSelected = total.length > 0 && total.every((id) => existing.has(id));
      if (allSelected) {
        next[branchId] = new Set();
      } else {
        next[branchId] = new Set(total);
      }
      return next;
    });
  };

  // optimistic local removals
  const removeEmployeeFromLocal = (branchId, employeeId) => {
    setLocalEmployeesMap((prev) => {
      const next = { ...(prev || {}) };
      const list = Array.isArray(next[branchId]) ? [...next[branchId]] : [];
      next[branchId] = list.filter((e) => e.employee_id !== employeeId);
      return next;
    });
  };

  const removeEmployeesFromLocal = (branchId, employeeIds) => {
    const setIds = new Set(employeeIds);
    setLocalEmployeesMap((prev) => {
      const next = { ...(prev || {}) };
      const list = Array.isArray(next[branchId]) ? [...next[branchId]] : [];
      next[branchId] = list.filter((e) => !setIds.has(e.employee_id));
      return next;
    });
  };

  // single unassign (optimistic + background refresh)
  const handleUnassign = async (employee_id, branch_id) => {
    const confirm = await Swal.fire({
      title: "Unassign employee?",
      text: "This will remove the employee from the branch (branch_id will be cleared).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Unassign",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await axios.post(`${BASE_URL}/branches/unassign_employee.php`, {
        employee_id,
        branch_id,
      });

      if (res.data?.success) {
        // optimistic removal
        removeEmployeeFromLocal(branch_id, employee_id);
        Swal.fire({ title: "Unassigned", text: "Employee removed from the branch.", icon: "success", timer: 900, showConfirmButton: false });

        // background sync
        (async () => {
          try {
            if (typeof fetchEmployeesForBranch === "function") await fetchEmployeesForBranch(branch_id);
            if (typeof fetchBranches === "function") await fetchBranches();
          } catch (err) {
            console.error("Background refresh failed after unassign:", err);
          }
        })();
      } else {
        throw new Error(res.data?.message || "Unassign failed");
      }
    } catch (err) {
      console.error("Unassign failed", err);
      Swal.fire("Error", err.message || "Failed to unassign employee", "error");
    }
  };

  // bulk unassign (optimistic + background sync)
  const bulkUnassignForBranch = async (branchId) => {
    const toUnassign = Array.from(selectedByBranch[branchId] || []);
    if (toUnassign.length === 0) {
      Swal.fire("No selection", "Please select employees to unassign.", "info");
      return;
    }

    const r = await Swal.fire({
      title: `Unassign ${toUnassign.length} employee${toUnassign.length > 1 ? "s" : ""}?`,
      text: "This will remove their branch assignment.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Unassign",
    });
    if (!r.isConfirmed) return;

    try {
      const res = await axios.post(`${BASE_URL}/branches/unassign_employee.php`, {
        employee_id: toUnassign,
        branch_id: branchId,
      });

      if (res.data?.success) {
        // optimistic removal and clear selection
        removeEmployeesFromLocal(branchId, toUnassign);
        setSelectedByBranch((prev) => ({ ...(prev || {}), [branchId]: new Set() }));
        Swal.fire({ title: "Unassigned", text: "Employees removed from the branch.", icon: "success", timer: 900, showConfirmButton: false });

        // background refresh
        (async () => {
          try {
            if (typeof fetchEmployeesForBranch === "function") await fetchEmployeesForBranch(branchId);
            if (typeof fetchBranches === "function") await fetchBranches();
          } catch (err) {
            console.error("Background refresh failed after bulk unassign:", err);
          }
        })();
      } else {
        throw new Error(res.data?.message || "Unassign failed");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", err.message || "Bulk unassign failed", "error");
    }
  };

  // Called when AssignEmployeeModal closes and indicates changes.
  // assignedArg can be an object (single) or array of objects (multiple).
  const handleAssignModalClose = async (didChange, assignedArg) => {
    const branch = selectedBranchForAssign;
    setAssignModalOpen(false);

    if (!didChange) {
      setSelectedBranchForAssign(null);
      return;
    }

    // normalize assigned list
    let assignedArr = [];
    if (!assignedArg) {
      // if modal didn't return details, fallback to background fetch
      try {
        if (typeof fetchEmployeesForBranch === "function") await fetchEmployeesForBranch(branch.branch_id);
        if (typeof fetchBranches === "function") await fetchBranches();
      } catch (err) {
        console.error("Refresh failed after assign:", err);
      } finally {
        setSelectedBranchForAssign(null);
      }
      return;
    }

    if (Array.isArray(assignedArg)) assignedArr = assignedArg;
    else assignedArr = [assignedArg];

    // Each assigned item should minimally contain employee_id and optionally other fields.
    // We'll optimistically add them to localEmployeesMap[branch.branch_id] and remove from other branches.
    setLocalEmployeesMap((prev) => {
      const next = { ...(prev || {}) };

      // remove assigned employees from any branch they were in previously
      const assignedIds = new Set(assignedArr.map((a) => a.employee_id));
      Object.keys(next).forEach((bk) => {
        if (!Array.isArray(next[bk])) return;
        next[bk] = next[bk].filter((emp) => !assignedIds.has(emp.employee_id));
      });

      // ensure target branch array exists
      const targetId = branch?.branch_id;
      const existing = Array.isArray(next[targetId]) ? [...next[targetId]] : [];

      // add assigned employees to start of the list if not already present
      assignedArr.forEach((a) => {
        const already = existing.find((x) => x.employee_id === a.employee_id);
        if (!already) {
          // build a normalized employee object (keep fields you may have)
          const normalized = {
            employee_id: a.employee_id,
            first_name: a.first_name || a.full_name?.split?.(" ")?.[0] || "",
            last_name: a.last_name || "",
            full_name: a.full_name || `${a.first_name || ""} ${a.last_name || ""}`.trim(),
            email: a.email || "",
            image: a.image || a.avatar || "",
            department_name: a.department_name || a.department || "",
            position_name: a.position_name || a.position || "",
            status: a.status || "active",
            branch_id: targetId,
            branch_name: branch?.name || "",
          };
          existing.unshift(normalized);
        }
      });

      next[targetId] = existing;
      return next;
    });

    // also update localBranches if you want branch-level counters or other visible fields updated
    setLocalBranches((prev) => {
      return (prev || []).map((b) => {
        if (!assignedArr || assignedArr.length === 0) return b;
        if (b.branch_id === branch.branch_id) {
          // incrementally update nothing else — count is derived from localEmployeesMap
          return b;
        }
        // if employee was moved out from other branch, we leave as-is (count will come from localEmployeesMap)
        return b;
      });
    });

    // background sync (do not block UI)
    (async () => {
      try {
        if (typeof fetchEmployeesForBranch === "function") await fetchEmployeesForBranch(branch.branch_id);
        if (typeof fetchBranches === "function") await fetchBranches();
      } catch (err) {
        console.error("Background refresh failed after assign:", err);
      } finally {
        setSelectedBranchForAssign(null);
      }
    })();
  };

  // filter localBranches by query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return localBranches;
    return localBranches.filter((b) => {
      return (
        String(b.branch_id).includes(q) ||
        (b.name || "").toLowerCase().includes(q) ||
        (b.address || "").toLowerCase().includes(q) ||
        (b.phone || "").toLowerCase().includes(q)
      );
    });
  }, [localBranches, query]);

  const tabs = useMemo(
  () => [
    {
      key: "employees",
      label: "Employee List",
      sublabel: "View & Manage Employees",
      icon: Users,
      onClick: () => navigate("/employees"),
    },
    {
      key: "departments",
      label: "Departments",
      sublabel: "Manage Employee Departments",
      icon: Briefcase,
      onClick: () => navigate("/department"),
    },
    {
      key: "branches",
      label: "Branch",
      sublabel: "Manage Branches",
      icon: Building2,
      onClick: () => navigate("/branches"),
    },
  ],
  [navigate]
);

  return (
    <div className="container flex w-full gap-y-4">
      <div>
      <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className='text-2xl font-semibold'>Branches</span>
        {/* <Breadcrumbs items={[{ label: 'Employee Dashboard', path: '/employeedashboard' }, { label: 'Employees' }]} /> */}
            <div className="hidden sm:block">
              <Breadcrumbs items={breadcrumbItems} />
            </div>      </div>

<div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-5">
          <div className="relative w-full sm:w-72 ">
            <input
              type="search"
              placeholder="Search branches by name, id, address or phone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
            />
            <svg
              className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M10.5 18A7.5 7.5 0 1010.5 3a7.5 7.5 0 000 15z" />
            </svg>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={fetchBranches}
              className="px-3 py-2 bg-white border rounded-lg shadow-sm hover:bg-slate-50 text-sm"
              title="Refresh"
            >
              Refresh
            </button>

            <button
              onClick={openCreate}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 text-sm"
            >
              + Add Branch
            </button>
          </div>
        </div>
      </div> 

      <div className="space-y-4 pb-15">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading branches…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">No branches found.</div>
        ) : (
          filtered.map((b) => {
            const empList = Array.isArray(localEmployeesMap[b.branch_id]) ? localEmployeesMap[b.branch_id] : localEmployeesMap[b.branch_id] || [];
            const empCount = Array.isArray(empList) ? empList.length : empList ? 0 : null;
            const isOpen = !!expanded[b.branch_id];

            return (
              <div key={b.branch_id} className="bg-white rounded-lg shadow-sm overflow-hidden ring-1 ring-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-12 h-12 rounded-md bg-indigo-50 text-indigo-700 font-semibold text-lg flex-shrink-0">
                      {b.name ? b.name.split(" ").map((s) => s[0]).slice(0, 2).join('') : String(b.branch_id)}
                    </div>

                    <div className="min-w-0">
                      <div className="text-md sm:text-lg font-medium text-slate-800 truncate">{b.name}</div>
                      <div className="text-sm text-slate-500 truncate">{b.address || "No address"}</div>
                      <div className="text-xs text-slate-400 mt-1">ID: <span className="font-mono">{b.branch_id}</span></div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center sm:justify-end gap-2 w-full sm:w-auto">
                    <div className="text-sm text-slate-500 text-left sm:text-right mb-2 sm:mb-0">
                      <div className="text-xs text-slate-400 mt-1">
                        Phone Number: <span className="font-medium text-slate-700">{b.phone || "—"}</span>
                      </div>
                      {/* <div className="font-medium text-slate-700">Phone Number: {b.phone || "—"}</div> */}
                      <div className="text-xs text-slate-400 mt-1">
                        Manager: <span className="font-medium text-slate-700">{b.assigned_employee_id || "—"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-700 text-center self-center">
                        {empCount === null ? "?" : `${empCount} employee${empCount === 1 ? "" : "s"}`}
                      </div>

                      <button
                        onClick={() => toggleEmployees(b.branch_id)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm shadow hover:bg-indigo-700"
                      >
                        {isOpen ? "Hide employees" : "View employees"}
                      </button>

                      <button
                        onClick={() => { setSelectedBranchForAssign(b); setAssignModalOpen(true); }}
                        className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                      >
                        Assign
                      </button>

                      <button
                        onClick={() => openEdit(b)}
                        className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600"
                        title="Edit branch"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(b.branch_id)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                        title="Delete branch"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`transition-all duration-200 ease-in-out overflow-hidden bg-slate-50 ${isOpen ? "max-h-[2000px] py-4" : "max-h-0"}`}>
                  <div className="px-4 sm:px-6">
                    {loadingEmployeesMap[b.branch_id] ? (
                      <div className="py-6 text-center text-slate-500">Loading employees…</div>
                    ) : errorEmployeesMap[b.branch_id] ? (
                      <div className="py-4 text-red-600">{errorEmployeesMap[b.branch_id]}</div>
                    ) : !empList || empList.length === 0 ? (
                      <div className="py-4 text-slate-600">No employees assigned to this branch.</div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
                        {/* Left: count */}
                            <div className="flex items-center gap-3 order-1">
                                <div className="text-sm text-slate-600">
                                {empList.length} employee{empList.length !== 1 ? "s" : ""}
                                </div>
                            </div>

                        {/* Center: instruction — centered on larger screens, stacked on mobile */}
                            <div className="order-3 sm:order-2 w-full sm:w-auto">
                                <div className="text-sm text-slate-600 font-bold text-center sm:text-left">
                                Click the box to toggle selection
                                </div>
                            </div>

                            {/* Right: controls (buttons) */}
                            <div className="flex items-center gap-2 order-2 sm:order-3">
                                <button
                                onClick={() => toggleSelectAllForBranch(b.branch_id, empList)}
                                className="px-3 py-1 bg-slate-100 text-sm rounded"
                                title="Select / Deselect all visible"
                                >
                                Toggle Select All
                                </button>

                                <button
                                onClick={() => bulkUnassignForBranch(b.branch_id)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                                title="Unassign selected employees"
                                >
                                Unassign selected
                                </button>
                            </div>
                        </div>


                        <div className="grid gap-3">
                          {empList.map((emp) => {
                            const isChecked = (selectedByBranch[b.branch_id] && selectedByBranch[b.branch_id].has(emp.employee_id)) || false;

                            return (
                              <div key={emp.employee_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border rounded p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectForBranch(b.branch_id, emp.employee_id)}
                                    className="w-4 h-4"
                                  />

                                  <Avatar
                                    src={emp.image}
                                    name={emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim()}
                                    sizeClass="w-10 h-10 sm:w-12 sm:h-12"
                                    status={emp.status}
                                  />
                                  <div className="min-w-0">
                                    <div className="font-medium text-slate-800 truncate">{emp.full_name || `${emp.first_name} ${emp.last_name}`}</div>
                                    <div className="text-sm text-slate-500 truncate">{emp.email || emp.contact_number || "—"}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="text-sm text-slate-600 text-left sm:text-right">
                                    <div>{emp.department_name || emp.department_id || "-"}</div>
                                    <div className="text-xs text-slate-400">{emp.position_name || emp.position_id || "-"}</div>
                                  </div>

                                  <button
                                    onClick={() => handleUnassign(emp.employee_id, b.branch_id)}
                                    className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded text-sm hover:bg-red-100"
                                    title="Unassign from this branch"
                                  >
                                    Unassign
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <BranchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingBranch}
          isEditing={isEditing}
        />
      )}

      {assignModalOpen && (
        <AssignEmployeeModal
          isOpen={assignModalOpen}
          onClose={handleAssignModalClose}
          branch={selectedBranchForAssign}
        />
      )}
    </div>
  );
}
