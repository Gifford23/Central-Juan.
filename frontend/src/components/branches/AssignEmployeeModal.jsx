// components/AssignEmployeeModal.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import BASE_URL from "../../../backend/server/config"; // adjust if needed
import Swal from "sweetalert2";
import Avatar from "../Avatar";
import { useBranches } from "./hooks/useBranches";

/**
 * AssignEmployeeModal (multi-select/group select)
 * - Avatar listbox with checkboxes
 * - search (debounced), unassigned-only toggle, excludes inactive employees
 * - keyboard navigation: ArrowUp/Down, Enter toggles selection
 * - bulk assign: sends one request per selected employee, shows summary
 *
 * Optimistic UI behavior:
 * - When an employee is successfully assigned we immediately remove them from the modal list
 *   so the user sees the change without needing a manual page reload.
 * - After done, we call onClose(true, successes) so parent can update its UI and/or re-fetch.
 *
 * Props:
 * - isOpen (bool)
 * - onClose(didChange:boolean, assignedEmployeeOrArray?:object|object[])
 * - branch { branch_id, name }
 */
export default function AssignEmployeeModal({ isOpen, onClose, branch }) {
  const { fetchEmployeesForBranch } = useBranches();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // selection state: selectedSet contains employee_ids (group selection)
  const [selectedSet, setSelectedSet] = useState(() => new Set());
  // focused single id for preview / details; kept in sync with selection toggles
  const [focusedId, setFocusedId] = useState(null);

  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // keyboard / listbox state
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    fetchEmployees();
    setSelectedSet(new Set());
    setFocusedId(null);
    setSearch("");
    setDebouncedSearch("");
    setUnassignedOnly(true);
    setActiveIndex(-1);
  }, [isOpen]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/branches/get_all.php`);
      if (res.data?.success) {
        const activeOnly = (res.data.data || [])
          .filter((e) => String(e.status || "").toLowerCase() !== "inactive")
          .map((e) => {
            if (!e.full_name) e.full_name = `${e.first_name || ""} ${e.last_name || ""}`.trim();
            return e;
          });
        setEmployees(activeOnly);
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error("Failed to fetch employees", err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // filtered list (search + unassignedOnly). ensures inactive are excluded again
  const filtered = useMemo(() => {
    const q = debouncedSearch || "";
    let list = (employees || []).filter((e) => String(e.status || "").toLowerCase() !== "inactive");

    if (unassignedOnly) {
      list = list.filter(
        (emp) =>
          !emp.branch_id ||
          String(emp.branch_id).trim() === "" ||
          String(emp.branch_id) === "0"
      );
    }

    if (!q) return list;

    return list.filter((emp) => {
      const full = (emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`).toLowerCase();
      return (
        full.includes(q) ||
        (emp.email || "").toLowerCase().includes(q) ||
        (emp.employee_id || "").toLowerCase().includes(q)
      );
    });
  }, [employees, debouncedSearch, unassignedOnly]);

  // rendering cap
  const MAX_RENDER = 1500;
  const willShowLimited = filtered.length > MAX_RENDER;
  const renderedOptions = willShowLimited ? filtered.slice(0, MAX_RENDER) : filtered;

  // sync activeIndex when focus or renderedOptions change
  useEffect(() => {
    if (focusedId) {
      const idx = renderedOptions.findIndex((e) => e.employee_id === focusedId);
      setActiveIndex(idx >= 0 ? idx : -1);
    } else {
      setActiveIndex((i) => (i >= renderedOptions.length ? renderedOptions.length - 1 : i));
    }
  }, [focusedId, renderedOptions]);

  // scroll active item into view
  useEffect(() => {
    if (activeIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeIndex]);

  // toggle selection helper
  const toggleSelect = (empId) => {
    setSelectedSet((prev) => {
      const copy = new Set(prev);
      if (copy.has(empId)) copy.delete(empId);
      else copy.add(empId);
      return copy;
    });
    setFocusedId(empId);
  };

  const clearSelection = () => {
    setSelectedSet(new Set());
    setFocusedId(null);
  };

  // keyboard navigation: ArrowUp/Down, Enter toggles selection, Home/End
  const handleKeyDown = (e) => {
    if (!renderedOptions || renderedOptions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, renderedOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && renderedOptions[activeIndex]) {
        toggleSelect(renderedOptions[activeIndex].employee_id);
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(renderedOptions.length - 1);
    }
  };

  // remove assigned employees from local list (optimistic)
  const removeAssignedLocally = (assignedIds) => {
    const setAssigned = new Set(assignedIds.map((a) => (typeof a === "string" ? a : a.employee_id)));
    setEmployees((prev) => (prev || []).filter((e) => !setAssigned.has(e.employee_id)));
    setSelectedSet((prev) => {
      const copy = new Set(prev);
      assignedIds.forEach((a) => copy.delete(typeof a === "string" ? a : a.employee_id));
      return copy;
    });
    if (focusedId && setAssigned.has(focusedId)) setFocusedId(null);
  };

  // bulk assign: do sequential POST calls for each selected employee
  const handleAssign = async (e) => {
    e?.preventDefault();
    const toAssign = Array.from(selectedSet);
    if (toAssign.length === 0 && focusedId) toAssign.push(focusedId);
    if (toAssign.length === 0) {
      Swal.fire("Pick employee(s)", "Please select at least one employee to assign.", "warning");
      return;
    }

    setAssigning(true);
    const successes = [];
    const failures = [];

    // iterate sequentially to avoid server throttling; you can parallelize if your server supports it
    for (let i = 0; i < toAssign.length; i++) {
      const empId = toAssign[i];
      try {
        const payload = { branch_id: branch.branch_id, employee_id: empId };
        const res = await axios.post(`${BASE_URL}/branches/assign_employee.php`, payload);
        if (res.data?.success) {
          // find employee metadata (if present) and produce a minimal assigned object
          const assignedEmployee = (employees.find((x) => x.employee_id === empId) || { employee_id: empId });
          assignedEmployee.branch_id = branch.branch_id;
          assignedEmployee.branch_name = branch.name || "";
          successes.push(assignedEmployee);

          // remove the employee from the modal list immediately (optimistic UI)
          removeAssignedLocally([assignedEmployee]);
        } else {
          failures.push({ employee_id: empId, message: res.data?.message || "Assign failed" });
        }
      } catch (err) {
        failures.push({ employee_id: empId, message: err.message || "Request error" });
      }
    }

    setAssigning(false);

    if (successes.length > 0) {
      // show summary toast
      Swal.fire("Done", `Assigned ${successes.length} employee${successes.length > 1 ? "s" : ""}${failures.length ? `; ${failures.length} failed` : ""}.`, "success");

      // notify parent with assigned employees so parent can update its UI immediately (and/or re-fetch)
      onClose(true, successes.length === 1 ? successes[0] : successes);
      return;
    }

    // if none succeeded
    Swal.fire("No assignments", `All attempts failed (${failures.length}). See console for details.`, "error");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/40 p-4 overflow-auto">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow p-5 mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold">Assign employee to: {branch?.name || `Branch ${branch?.branch_id}`} Branch</h3>
            {/* <div className="text-sm text-slate-600">{branch?.name || `Branch ${branch?.branch_id}`}</div> */}
          </div>
          <button onClick={() => onClose(false)} className="text-slate-500 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={handleAssign} className="space-y-4">
          {/* controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <div className="flex-1 min-w-0">
              <input
                type="search"
                placeholder="Type to filter name / email / id..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 text-sm"
              />
              <div className="text-xs text-slate-400 mt-1">
                {loading ? "Loading…" : `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`}
                {willShowLimited ? ` — showing first ${MAX_RENDER}, refine search` : ""}
              </div>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unassignedOnly}
                  onChange={(e) => setUnassignedOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                Unassigned only
              </label>

              <div className="flex gap-2">
                {/* <button type="button" onClick={() => { clearSelection(); }} className="px-3 py-1 text-sm bg-gray-100 rounded">Cleaasdasdr</button>
                <div className="px-3 py-1 text-sm bg-slate-50 rounded text-slate-600">{selectedSet.size} selected</div> */}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* listbox */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Pick Employee (click row to toggle)</label>

              <div
                ref={listRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                role="listbox"
                aria-label="Employees"
                className="border rounded-lg overflow-auto h-96 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {loading ? (
                  <div className="p-4 text-center text-slate-500">Loading employees…</div>
                ) : renderedOptions.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">No employees found</div>
                ) : (
                  renderedOptions.map((emp, idx) => {
                    const isChecked = selectedSet.has(emp.employee_id);
                    const isActive = activeIndex === idx;
                    const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || emp.employee_id;
                    return (
                      <div
                        key={emp.employee_id}
                        data-idx={idx}
                        role="option"
                        aria-selected={isChecked}
                        onClick={() => toggleSelect(emp.employee_id)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
                          ${isChecked ? "bg-indigo-50" : isActive ? "bg-slate-50" : "bg-white"}
                          hover:bg-slate-50`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(ev) => {
                            ev.stopPropagation();
                            toggleSelect(emp.employee_id);
                          }}
                          className="w-4 h-4"
                        />

                        <Avatar
                          src={emp.image}
                          name={name}
                          sizeClass="w-10 h-10"
                          status={emp.status}
                          className="flex-shrink-0"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-slate-800 truncate">{name}</div>
                            <div className="text-xs text-slate-400 ml-2">{emp.employee_id}</div>
                          </div>
                          <div className="text-xs text-slate-500 truncate">{emp.email || emp.contact_number || "—"}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {emp.branch_id ? `Current: ${emp.branch_name || emp.branch_id}` : "Unassigned"}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {willShowLimited && (
                  <div className="p-3 text-sm text-slate-500">...and more — please narrow your search</div>
                )}
              </div>
            </div>

            {/* preview / group summary */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-2 invisible md:visible">Preview</label>
              <div className="border rounded-lg p-4 bg-white h-full flex flex-col">
                {selectedSet.size <= 1 ? (
                  // single preview: if one selected show detailed preview (or focused)
                  (() => {
                    const idToShow = selectedSet.size === 1 ? Array.from(selectedSet)[0] : focusedId;
                    if (!idToShow) {
                      return <div className="w-full text-center text-sm text-slate-500 py-6">Select an employee to preview</div>;
                    }
                    const emp = renderedOptions.find((x) => x.employee_id === idToShow) || employees.find((x) => x.employee_id === idToShow);
                    if (!emp) return <div className="text-sm text-slate-500">Employee not found</div>;
                    const fullname = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
                    return (
                      <>
                        <div className="flex items-start gap-3">
                          <Avatar src={emp.image} name={fullname} sizeClass="w-12 h-12" status={emp.status} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-800 truncate">{fullname || emp.employee_id}</div>
                            <div className="text-xs text-slate-500 truncate">{emp.email || emp.contact_number || "—"}</div>
                            <div className="mt-2 text-xs text-slate-600">
                              <div><span className="text-slate-400">ID:</span> <span className="font-mono">{emp.employee_id}</span></div>
                              <div><span className="text-slate-400">Dept:</span> {emp.department_name || emp.department_id || "-"}</div>
                              <div><span className="text-slate-400">Position:</span> {emp.position_name || emp.position_id || "-"}</div>
                              <div><span className="text-slate-400">Branch:</span> {emp.branch_name || (emp.branch_id ? emp.branch_id : "Unassigned")}</div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          {/* <button
                            type="button"
                            onClick={() => {
                              // toggle inclusion in set (for single preview)
                              toggleSelect(emp.employee_id);
                            }}
                            className="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
                          >
                            {selectedSet.has(emp.employee_id) ? "Remove" : "Select"}
                          </button>
                          <a
                            className="px-3 py-2 bg-white border rounded text-sm hover:bg-slate-50"
                            href={emp.email ? `mailto:${emp.email}` : "#"}
                          >
                            Email
                          </a> */}
                        </div>
                      </>
                    );
                  })()
                ) : (
                  // group preview
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex -space-x-2">
                        {Array.from(selectedSet).slice(0, 3).map((id) => {
                          const emp = employees.find((e) => e.employee_id === id) || { employee_id: id };
                          const name = emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim();
                          return (
                            <div key={id} className="w-10 h-10 rounded-full overflow-hidden border bg-slate-50">
                              <Avatar src={emp.image} name={name} sizeClass="w-10 h-10" />
                            </div>
                          );
                        })}
                        {selectedSet.size > 5 && (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-600 border">+{selectedSet.size - 3}</div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{selectedSet.size} selected</div>
                        {/* <div className="text-xs text-slate-500">Ready to assign to this branch</div> */}
                      </div>
                    </div>
                      <div className="pb-2">
                        {/* <div className="text-sm font-semibold">{selectedSet.size} selected</div> */}
                        <div className="text-xs text-slate-500">Ready to assign to this branch</div>
                      </div>
                    <div className="flex gap-2 mb-2">
                      {/* <button
                        type="button"
                        onClick={() => handleAssign()}
                        className="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
                        disabled={assigning}
                      >
                        {assigning ? "Assigning..." : `Assign ${selectedSet.size}`}
                      </button> */}
                      <button
                        type="button"
                        onClick={() => clearSelection()}
                        className="px-3 py-2 bg-white border rounded text-sm"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="text-xs text-slate-500">You can also click rows to add/remove individuals.</div>
                  </>
                )}

                {/* <div className="mt-auto text-xs text-slate-400 pt-3">Tip: Up/Down to navigate, Enter to toggle selection</div> */}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="flex justify-end gap-2 pt-12">
            <button type="button" onClick={() => onClose(false)} className="px-3 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={assigning} className="px-4 py-2 bg-indigo-600 text-white rounded">
              {assigning ? "Assigning..." : (selectedSet.size > 1 ? `Assign ${selectedSet.size}` : "Assign")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
