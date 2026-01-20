// src/components/thirteenth/ThirteenthEmployeeList.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  fetchTmEntriesAPI,
  bulkCreateTmEntriesAPI,
  setEmployeeModeAPI,
  fetchEmployeesAPI,
  fetchTmDeductionsAPI,
  createTmDeductionAPI,
  deleteTmDeductionAPI,
} from "../payrollApi/thirteenthMonthAPI";
import { printThirteenthSlips } from "./ThirteenthSlip"; // optional helper — keep if available

/**
 * ThirteenthEmployeeList.jsx
 *
 * - Apply override deductions to computed 13th month display & aggregates.
 * - Per-employee: show only the post-deduction amount when deductions exist.
 *   - red styling if there are deductions (post amount)
 *   - green styling if no deductions (pre amount shown as final)
 * - Hover tooltip shows deduction breakdown when deductions exist.
 */

/* ---------------------------
   Small UI components
   --------------------------- */

function Modal({ open, onClose, title, className = "", children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto md:items-center">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <div className={`relative bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-auto p-4 z-10 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button className="text-gray-600" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MonthCard({ monthIndex, value, onChange }) {
  return (
    <div className="flex flex-col gap-2 p-2 border rounded bg-gray-50 min-w-[110px]">
      <div className="text-sm font-medium text-gray-700">Month {monthIndex}</div>
      <input
        type="number"
        step="0.01"
        value={value ?? ""}
        onChange={(e) => onChange(monthIndex, e.target.value === "" ? "" : Number(e.target.value))}
        className="w-full px-2 py-1 text-sm border rounded"
        placeholder="₱ 0.00"
      />
    </div>
  );
}

function SemiMonthlyRow({ monthIndex, valueA, valueB, onChangeA, onChangeB }) {
  const monthlyTotal = Number(valueA || 0) + Number(valueB || 0);
  return (
    <div className="flex flex-col gap-2 p-2 border rounded bg-gray-50 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 text-sm font-medium text-gray-700">{monthIndex}</div>
        <div className="flex gap-2">
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">1st cut</label>
            <input
              type="number"
              step="0.01"
              value={valueA ?? ""}
              onChange={(e) => onChangeA(monthIndex, e.target.value === "" ? "" : Number(e.target.value))}
              className="w-24 px-2 py-1 text-sm border rounded"
              placeholder="₱ 0.00"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs text-gray-500">2nd cut</label>
            <input
              type="number"
              step="0.01"
              value={valueB ?? ""}
              onChange={(e) => onChangeB(monthIndex, e.target.value === "" ? "" : Number(e.target.value))}
              className="w-24 px-2 py-1 text-sm border rounded"
              placeholder="₱ 0.00"
            />
          </div>
        </div>
      </div>

      <div className="mt-2 text-right md:mt-0">
        <div className="text-xs text-gray-500">Monthly total</div>
        <div className="font-medium">₱ {monthlyTotal.toFixed(2)}</div>
      </div>
    </div>
  );
}

/* ---------------------------
   Helpers
   --------------------------- */

const fmt = (n) => {
  if (typeof n !== "number" || Number.isNaN(n)) return "₱ 0.00";
  return `₱ ${n.toFixed(2)}`;
};

const buildDeductionTooltip = (deductions = [], thBefore = 0) => {
  if (!deductions || deductions.length === 0) return "";
  // Show each deduction as "desc — ₱X" (percent show % and computed amount)
  const lines = deductions.map((d) => {
    if (d.type === "fixed") return `${d.description}: ₱ ${Number(d.amount || 0).toFixed(2)}`;
    // percent: compute applied amount on pre-thirteenth (thBefore)
    const applied = Math.round(((Number(d.amount || 0) / 100) * thBefore) * 100) / 100;
    return `${d.description}: ${Number(d.amount).toFixed(2)}% (₱ ${applied.toFixed(2)})`;
  });
  return lines.join("\n");
};

/* ---------------------------
   Main component
   --------------------------- */

export default function ThirteenthEmployeeList({ year, search, globalMode }) {
  const [employees, setEmployees] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [entriesCache, setEntriesCache] = useState({});
  const [deductionsCache, setDeductionsCache] = useState({}); // { employee_id: [deductions...] }
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("active");

  // selection
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectAllChecked, setSelectAllChecked] = useState(false);

  // editor modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // deductions modal
  const [deductionOpen, setDeductionOpen] = useState(false);
  const [deductionTarget, setDeductionTarget] = useState(null);

  // local mode overrides
  const [modeOverrides, setModeOverrides] = useState({});

  const getEmpMode = (emp) => {
    if (!emp) return globalMode || "semi_monthly";
    if (modeOverrides[emp.employee_id]) return modeOverrides[emp.employee_id];
    if (emp.mode) return emp.mode;
    if (emp.employee_mode) return emp.employee_mode;
    if (emp.tm_mode) return emp.tm_mode;
    if (emp.thirteenth_mode) return emp.thirteenth_mode;
    if (globalMode) return globalMode;
    return "semi_monthly";
  };

  // fetch entries + employees + deductions
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadAll = async () => {
      try {
        // employees
        const empRes = await fetchEmployeesAPI({ status });
        const emps = empRes && empRes.success ? empRes.data : Array.isArray(empRes) ? empRes : [];
        if (!mounted) return;
        setEmployees(emps);

        // entries
        const entryRes = await fetchTmEntriesAPI({ calendar_year: year });
        const entries = entryRes && entryRes.success && Array.isArray(entryRes.data) ? entryRes.data : Array.isArray(entryRes) ? entryRes : [];
        if (!mounted) return;
        setAllEntries(entries);

        const grouped = entries.reduce((acc, item) => {
          const id = item.employee_id;
          if (!acc[id]) acc[id] = [];
          acc[id].push(item);
          return acc;
        }, {});
        setEntriesCache(grouped);

        // deductions: fetch per employee (parallel)
        const dedMap = {};
        await Promise.all(
          emps.map(async (e) => {
            try {
              const r = await fetchTmDeductionsAPI({ employee_id: e.employee_id, calendar_year: year });
              dedMap[e.employee_id] = r && r.success ? (r.data || []) : (Array.isArray(r) ? r : []);
            } catch (err) {
              dedMap[e.employee_id] = [];
            }
          })
        );
        if (!mounted) return;
        setDeductionsCache(dedMap);

        // reset selection
        setSelectedIds(new Set());
        setSelectAllChecked(false);
      } catch (err) {
        console.error("Failed to load employees/entries/deductions", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadAll();
    return () => { mounted = false; };
  }, [year, status]);

  // helper: fetch deductions for single employee (used to refresh after add/delete)
  const fetchDeductionsFor = async (employee_id) => {
    try {
      const r = await fetchTmDeductionsAPI({ employee_id, calendar_year: year });
      const arr = r && r.success ? (r.data || []) : (Array.isArray(r) ? r : []);
      setDeductionsCache((p) => ({ ...p, [employee_id]: arr }));
      return arr;
    } catch (err) {
      console.error("fetchDeductionsFor failed", err);
      setDeductionsCache((p) => ({ ...p, [employee_id]: [] }));
      return [];
    }
  };

  const visibleEmployees = useMemo(() => {
    const q = search?.trim().toLowerCase() || "";
    if (!q) return employees;
    return employees.filter((e) => {
      const name = `${e.first_name} ${e.last_name} ${e.employee_id} ${e.department_id ?? ""} ${e.position_id ?? ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [employees, search]);

  // compute summary: now applies deductions (fixed + percent) to the 13th month
  const computeSummary = (empOrId) => {
    let employee_id = typeof empOrId === "string" || typeof empOrId === "number" ? String(empOrId) : empOrId.employee_id;
    const arr = entriesCache[employee_id] ?? [];
    const sum = arr.reduce((s, item) => s + Number(item.gross_amount || 0), 0);
    const thirteenthBefore = Math.round((sum / 12) * 100) / 100;

    const dedArr = deductionsCache[employee_id] ?? [];
    let fixedSum = 0, percentSum = 0;
    (dedArr || []).forEach((d) => {
      if (d.type === "fixed") fixedSum += Number(d.amount || 0);
      else if (d.type === "percent") percentSum += Number(d.amount || 0);
    });
    const percentAmount = Math.round((percentSum / 100) * thirteenthBefore * 100) / 100;
    const totalDeduction = Math.round((fixedSum + percentAmount) * 100) / 100;
    const thirteenthAfter = Math.round((thirteenthBefore - totalDeduction) * 100) / 100;

    return { sum, thirteenthBefore, fixedSum, percentSum, percentAmount, totalDeduction, thirteenthAfter, entries: arr, deductions: dedArr };
  };

  const aggregateTotals = useMemo(() => {
    let totalGross = 0;
    let totalThirteenth = 0;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return { totalGross: 0, totalThirteenth: 0 };
    for (const id of ids) {
      const arr = entriesCache[id] ?? [];
      const sum = arr.reduce((s, item) => s + Number(item.gross_amount || 0), 0);
      const thBefore = Math.round((sum / 12) * 100) / 100;
      const dedArr = deductionsCache[id] ?? [];
      let fixedSum = 0, percentSum = 0;
      (dedArr || []).forEach((d) => {
        if (d.type === "fixed") fixedSum += Number(d.amount || 0);
        else if (d.type === "percent") percentSum += Number(d.amount || 0);
      });
      const percentAmount = Math.round((percentSum / 100) * thBefore * 100) / 100;
      const totalDeduction = Math.round((fixedSum + percentAmount) * 100) / 100;
      const thAfter = Math.round((thBefore - totalDeduction) * 100) / 100;

      totalGross += sum;
      totalThirteenth += thAfter;
    }
    return { totalGross, totalThirteenth };
  }, [selectedIds, entriesCache, deductionsCache]);

  const openEditor = (employee) => {
    setSelectedEmployee(employee);
    setEditorOpen(true);
  };

  const openDeductions = (employee) => {
    setDeductionTarget(employee);
    setDeductionOpen(true);
  };

  const toggleSelect = (employee_id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employee_id)) next.delete(employee_id);
      else next.add(employee_id);
      setSelectAllChecked(false);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectAllChecked) {
      setSelectedIds(new Set());
      setSelectAllChecked(false);
    } else {
      const ids = new Set(visibleEmployees.map((e) => e.employee_id));
      setSelectedIds(ids);
      setSelectAllChecked(true);
    }
  };

  // save entries bulk
  const saveEntriesForEmployee = async (employee_id, valuesMap, mode) => {
    const slots = mode === "monthly" ? 12 : 24;
    const nowUser = "web-admin";
    const existingList = entriesCache[employee_id] || [];
    const entries = [];
    for (let i = 1; i <= slots; i++) {
      const existing = existingList.find((r) => Number(r.period_index) === i);
      entries.push({
        employee_id,
        calendar_year: year,
        mode,
        period_index: i,
        period_start: existing ? existing.period_start : "",
        period_end: existing ? existing.period_end : "",
        gross_amount: Number(valuesMap[i] || 0).toFixed(2),
        notes: existing ? existing.notes : null,
        created_by: nowUser,
      });
    }

    const res = await bulkCreateTmEntriesAPI({ entries });
    if (res && res.success) {
      const updated = entries.map((e) => ({ entry_id: null, ...e }));
      setEntriesCache((p) => ({ ...p, [employee_id]: updated }));
      return { success: true };
    } else {
      console.error("saveEntriesForEmployee failed", res);
      return { success: false, error: res };
    }
  };

  // optimistic mode override
  const handleSetEmployeeMode = async (employee_id, newMode) => {
    setModeOverrides((p) => ({ ...p, [employee_id]: newMode }));
    setEmployees((prev) => prev.map((e) => (e.employee_id === employee_id ? { ...e, mode: newMode, employee_mode: newMode } : e)));
    setSelectedEmployee((prev) => (prev && prev.employee_id === employee_id ? { ...prev, mode: newMode, employee_mode: newMode } : prev));

    try {
      const res = await setEmployeeModeAPI({ employee_id, mode: newMode, effective_from: null, effective_to: null });
      if (res && res.success) return { success: true };
      setModeOverrides((p) => { const next = { ...p }; delete next[employee_id]; return next; });
      console.log("Failed to persist mode on server:", res);
      return { success: false, error: res };
    } catch (err) {
      setModeOverrides((p) => { const next = { ...p }; delete next[employee_id]; return next; });
      console.error("handleSetEmployeeMode error:", err);
      alert("Failed to save employee mode. See console.");
      return { success: false, error: err };
    }
  };

  const handlePrintSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { alert("Please select at least one employee to print."); return; }
    await printThirteenthSlips(ids, year);
  };

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="mb-1 text-lg font-semibold">Employees</h2>
          <p className="text-sm text-gray-500">All employees for year <strong>{year}</strong></p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 mt-2">
            <div>
              <div className="text-xs text-gray-500">Combined year total gross (selected)</div>
              <div className="font-medium">₱ {loading ? "-" : aggregateTotals.totalGross.toFixed(2)}</div>
            </div>

            <div className="px-3 py-2 text-sm font-semibold text-center text-green-700 bg-green-100 border border-green-300 rounded-lg shadow-sm md:text-left">
              <div className="text-xs text-green-500">Combined 13th month total (selected)</div>
              <div className="font-medium text-green-500">₱ {loading ? "-" : aggregateTotals.totalThirteenth.toFixed(2)}</div>
            </div>
          </div>

          <label className="text-sm">Show:</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-1 border rounded" title="Filter employees by status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>

          <div className="flex items-center gap-2">
            <button onClick={handleSelectAll} className="px-3 py-1 text-sm border rounded bg-gray-50 hover:bg-gray-100" title="Select/unselect visible employees">
              {selectAllChecked ? "Unselect All" : "Select All"}
            </button>

            <button
              onClick={handlePrintSelected}
              className={`px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 ${selectedIds.size === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
              disabled={selectedIds.size === 0}
              title="Print selected employees' 13th month slips"
            >
              Print Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      </div>

      {/* Employee list */}
      {loading ? (
        <div className="p-6 text-center bg-white rounded shadow">Loading...</div>
      ) : visibleEmployees.length === 0 ? (
        <div className="p-6 text-center bg-white rounded shadow">No employees found.</div>
      ) : (
        <div className="space-y-3">
          {visibleEmployees.map((emp) => {
            const summary = computeSummary(emp);
            const empMode = getEmpMode(emp);
            const isChecked = selectedIds.has(emp.employee_id);

            // decide display: if totalDeduction > 0 show only 'after' amount in red and tooltip; otherwise green final
            const hasDeduction = (summary.totalDeduction || 0) > 0;
            const tooltip = hasDeduction ? buildDeductionTooltip(summary.deductions, summary.thirteenthBefore) : "";

            return (
              <div key={emp.employee_id} className="flex flex-col gap-3 p-3 bg-white rounded shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(emp.employee_id)}
                    className="mt-1"
                    aria-label={`Select ${emp.first_name} ${emp.last_name}`}
                  />
                  <div>
                    <div className="text-sm font-medium">{emp.first_name} {emp.last_name}</div>
                    <div className="text-xs text-gray-500">{emp.employee_id} • {emp.department_id ?? emp.position_id ?? ""}</div>
                  </div>
                </div>

                <div className="flex flex-col flex-1 gap-3 md:flex-row md:items-center md:justify-end">
                  <div className="text-sm">
                    <div className="text-xs text-gray-500">Year total gross</div>
                    <div className="font-medium">₱ {summary.sum.toFixed(2)}</div>
                  </div>

                  {/* ---------------------
                      13th month display (updated)
                      - show only post-deduction if deductions exist (red)
                      - show pre amount in green if no deduction
                      - tooltip on hover showing breakdown when deductions exist
                      --------------------- */}
                  <div className="flex flex-col items-start text-sm md:items-center" title={tooltip}>
                    <div className="text-xs text-gray-500">13th month</div>

                    {hasDeduction ? (
                      <div
                        className="mt-0.5 px-2 py-1 rounded text-sm font-semibold text-red-700 bg-red-50 border border-red-100"
                        // native tooltip is sufficient; keep title above
                        role="note"
                        aria-label={`13th after deductions ${fmt(summary.thirteenthAfter)}`}
                      >
                        {fmt(summary.thirteenthAfter)}
                      </div>
                    ) : (
                      <div className="mt-0.5 px-2 py-1 rounded text-sm font-semibold text-green-700 bg-green-50 border border-green-100">
                        {fmt(summary.thirteenthBefore)}
                      </div>
                    )}
                    {/* show small hint icon when deductions exist */}
                    {hasDeduction && (
                      <div className="mt-1 text-xs text-gray-500">hover to view </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${emp.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {emp.status ?? "active"}
                    </span>

                    <select
                      value={empMode}
                      onChange={(e) => handleSetEmployeeMode(emp.employee_id, e.target.value)}
                      className="px-2 py-1 text-xs border rounded"
                      title="Employee mode override"
                    >
                      <option value="semi_monthly">Semi-monthly (24)</option>
                      <option value="monthly">Monthly (12)</option>
                    </select>

                    <button onClick={() => openEditor(emp)} className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700">
                      Edit
                    </button>

                    <button onClick={() => openDeductions(emp)} className="px-3 py-1 text-sm border rounded bg-yellow-50 hover:bg-yellow-100">
                      Deductions
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal (periods only) */}
      <Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={`Edit periods — ${selectedEmployee?.first_name || ""} ${selectedEmployee?.last_name || ""}`} className="max-w-4xl">
        {selectedEmployee ? (
          <EditorPane
            employee={selectedEmployee}
            year={year}
            entries={entriesCache[selectedEmployee.employee_id] || []}
            mode={getEmpMode(selectedEmployee)}
            onSave={async (valuesMap) => {
              const r = await saveEntriesForEmployee(selectedEmployee.employee_id, valuesMap, getEmpMode(selectedEmployee));
              if (r.success) {
                alert("Saved");
                setEditorOpen(false);
              } else {
                alert("Save failed");
              }
            }}
            onClose={() => setEditorOpen(false)}
          />
        ) : (
          <div>Loading employee...</div>
        )}
      </Modal>

      {/* Deductions Modal (separate) */}
      <Modal open={deductionOpen} onClose={() => setDeductionOpen(false)} title={`Override deductions — ${deductionTarget?.first_name || ""} ${deductionTarget?.last_name || ""}`}>
        {deductionTarget ? (
          <DeductionsPane
            employee={deductionTarget}
            year={year}
            onClose={() => setDeductionOpen(false)}
            onChanged={(empId) => fetchDeductionsFor(empId)} // refresh parent cache after changes
            existing={deductionsCache[deductionTarget.employee_id] || []}
          />
        ) : (
          <div>Loading...</div>
        )}
      </Modal>
    </div>
  );
}

/* ---------------------------
   EditorPane - inside modal (period inputs only)
   --------------------------- */
function EditorPane({ employee, year, entries = [], mode = "semi_monthly", onSave, onClose }) {
  const slots = mode === "monthly" ? 12 : 24;

  const buildInitialMap = () => {
    const map = {};
    for (let i = 1; i <= slots; i++) map[i] = 0;
    entries.forEach((r) => {
      const idx = Number(r.period_index);
      if (!isNaN(idx) && idx >= 1 && idx <= slots) map[idx] = Number(r.gross_amount || 0);
    });
    return map;
  };

  const [valuesMap, setValuesMap] = useState(buildInitialMap);
  useEffect(() => { setValuesMap(buildInitialMap()); /* eslint-disable-next-line */ }, [entries, mode]);

  const monthToPeriods = (monthIndex) => [2 * monthIndex - 1, 2 * monthIndex];

  const handleMonthlyChange = (monthIndex, value) => setValuesMap((p) => ({ ...p, [monthIndex]: Number(value || 0) }));
  const handleSemiChange = (monthIndex, which, value) => {
    const [pA, pB] = monthToPeriods(monthIndex);
    const key = which === "A" ? pA : pB;
    setValuesMap((p) => ({ ...p, [key]: Number(value || 0) }));
  };

  const computeTotals = () => {
    const total = mode === "monthly"
      ? Array.from({ length: 12 }, (_, i) => Number(valuesMap[i + 1] || 0)).reduce((a, b) => a + b, 0)
      : Array.from({ length: 24 }, (_, i) => Number(valuesMap[i + 1] || 0)).reduce((a, b) => a + b, 0);
    const thirteenth = Math.round((total / 12) * 100) / 100;
    return { total, thirteenth };
  };

  const { total, thirteenth } = computeTotals();

  const handleSaveClick = async () => {
    try {
      await onSave(valuesMap);
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium">{employee.first_name} {employee.last_name}</div>
          <div className="text-xs text-gray-500">{employee.employee_id} • {year} • {mode === "monthly" ? "12 months" : "Semi-monthly (24 cuts)"}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-500">Total for year</div>
          <div className="font-semibold">₱ {total.toFixed(2)}</div>
          <div className="mt-1 text-xs text-gray-500">13th month (before)</div>
          <div className="font-semibold">₱ {thirteenth.toFixed(2)}</div>
        </div>
      </div>

      {mode === "monthly" ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => <MonthCard key={i+1} monthIndex={i+1} value={valuesMap[i+1]} onChange={handleMonthlyChange} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: 12 }, (_, i) => {
            const mi = i + 1;
            const [pA, pB] = monthToPeriods(mi);
            return (
              <SemiMonthlyRow key={mi} monthIndex={mi} valueA={valuesMap[pA]} valueB={valuesMap[pB]} onChangeA={(m, v) => handleSemiChange(m, "A", v)} onChangeB={(m, v) => handleSemiChange(m, "B", v)} />
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
        <button onClick={handleSaveClick} className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700">Save entries</button>
      </div>
    </div>
  );
}

/* ---------------------------
   DeductionsPane - separate modal
   - lists existing deductions for employee/year
   - create new deduction (fixed | percent)
   - delete deduction
   - calls parent onChanged(empId) after create/delete to refresh parent cache
   --------------------------- */
function DeductionsPane({ employee, year, onClose, onChanged = () => {}, existing = [] }) {
  const [deductions, setDeductions] = useState(existing || []);
  const [loading, setLoading] = useState(false);
  const [newDed, setNewDed] = useState({ description: "", type: "fixed", amount: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchTmDeductionsAPI({ employee_id: employee.employee_id, calendar_year: year });
      const arr = res && res.success ? (res.data || []) : (Array.isArray(res) ? res : []);
      setDeductions(arr);
    } catch (err) {
      console.error("fetch deductions failed", err);
      setDeductions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [employee, year]);

  const handleAdd = async () => {
    if (!newDed.description || newDed.amount === "") { alert("Provide description and amount"); return; }
    setSaving(true);
    try {
      const payload = {
        employee_id: employee.employee_id,
        calendar_year: year,
        description: newDed.description,
        type: newDed.type,
        amount: Number(newDed.amount),
        created_by: "web-admin",
      };
      const res = await createTmDeductionAPI(payload);
      if (res && res.success) {
        await load();
        setNewDed({ description: "", type: "fixed", amount: "" });
        onChanged(employee.employee_id); // notify parent to refresh cache
      } else {
        console.error("create deduction failed", res);
        alert("Failed to add deduction");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to add deduction");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deduction_id) => {
    if (!window.confirm("Delete this deduction?")) return;
    try {
      const res = await deleteTmDeductionAPI({ deduction_id });
      if (res && res.success) {
        await load();
        onChanged(employee.employee_id); // notify parent
      } else {
        console.error("delete failed", res);
        alert("Delete failed");
      }
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">{employee.first_name} {employee.last_name}</div>
        <div className="text-xs text-gray-500">{employee.employee_id} • {year}</div>
      </div>

      <div className="p-3 border rounded bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Override Deductions</div>
          <div className="text-xs text-gray-500">Applied after 13th-month computation</div>
        </div>

        {loading ? <div>Loading...</div> : (
          deductions.length === 0 ? <div className="text-sm text-gray-500">No override deductions.</div> :
          <div className="space-y-2">
            {deductions.map((d) => (
              <div key={d.deduction_id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{d.description}</div>
                  <div className="text-xs text-gray-500">{d.type === "fixed" ? `₱ ${Number(d.amount).toFixed(2)}` : `${Number(d.amount).toFixed(2)}%`}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(d.deduction_id)} className="px-2 py-1 text-xs text-white bg-red-600 rounded">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 mt-3 md:grid-cols-4">
          <input value={newDed.description} onChange={(e) => setNewDed((s) => ({ ...s, description: e.target.value }))} placeholder="Description" className="col-span-2 px-2 py-1 border rounded" />
          <select value={newDed.type} onChange={(e) => setNewDed((s) => ({ ...s, type: e.target.value }))} className="px-2 py-1 border rounded">
            <option value="fixed">Fixed amount</option>
            <option value="percent">Percent of 13th</option>
          </select>
          <input value={newDed.amount} onChange={(e) => setNewDed((s) => ({ ...s, amount: e.target.value }))} placeholder="Amount" className="px-2 py-1 border rounded" />
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
          <button onClick={handleAdd} disabled={saving} className="px-3 py-1 text-white bg-indigo-600 rounded">{saving ? "Saving..." : "Add deduction"}</button>
        </div>
      </div>
    </div>
  );
}



// // src/components/thirteenth/ThirteenthEmployeeList.jsx
// import React, { useEffect, useMemo, useState } from "react";
// import {
//   fetchTmEntriesAPI,
//   bulkCreateTmEntriesAPI,
//   setEmployeeModeAPI,
//   fetchEmployeesAPI,
// } from "../payrollApi/thirteenthMonthAPI";
// import { printThirteenthSlips } from "./ThirteenthSlip"; // optional helper

// /**
//  * ThirteenthEmployeeList.jsx
//  *
//  * - Fix: resolves mode priority correctly and updates UI optimistically when changing mode
//  * - Responsive editor modal, monthly/semi-monthly handling remains same
//  */

// /* ---------------------------
//    Small UI components
//    --------------------------- */

// function Modal({ open, onClose, title, children }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto md:items-center">
//       <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
//       <div className="relative bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-auto p-4 z-10">
//         <div className="flex items-center justify-between mb-3">
//           <h3 className="text-lg font-semibold">{title}</h3>
//           <button className="text-gray-600" onClick={onClose}>
//             Close
//           </button>
//         </div>
//         {children}
//       </div>
//     </div>
//   );
// }

// /* MonthCard used for monthly mode */
// function MonthCard({ monthIndex, value, onChange }) {
//   return (
//     <div className="flex flex-col gap-2 p-3 border rounded bg-gray-50 min-w-[120px]">
//       <div className="text-sm font-medium text-gray-700">Month {monthIndex}</div>
//       <input
//         type="number"
//         step="0.01"
//         value={value ?? ""}
//         onChange={(e) => onChange(monthIndex, e.target.value === "" ? "" : Number(e.target.value))}
//         className="w-full px-2 py-1 border rounded"
//         placeholder="₱ 0.00"
//       />
//     </div>
//   );
// }

// /* SemiMonthlyRow: shows month label + two inputs (A & B) and monthly total */
// function SemiMonthlyRow({ monthIndex, valueA, valueB, onChangeA, onChangeB }) {
//   const monthlyTotal = Number(valueA || 0) + Number(valueB || 0);
//   return (
//     <div className="flex flex-col gap-2 p-3 border rounded bg-gray-50 md:flex-row md:items-center md:justify-between">
//       <div className="flex items-center gap-3">
//         <div className="w-10 text-sm font-medium text-gray-700">{monthIndex}</div>
//         <div className="flex gap-2">
//           <div className="flex flex-col">
//             <label className="text-xs text-gray-500">1st cut</label>
//             <input
//               type="number"
//               step="0.01"
//               value={valueA ?? ""}
//               onChange={(e) => onChangeA(monthIndex, e.target.value === "" ? "" : Number(e.target.value))}
//               className="px-2 py-1 border rounded w-28"
//               placeholder="₱ 0.00"
//             />
//           </div>
//           <div className="flex flex-col">
//             <label className="text-xs text-gray-500">2nd cut</label>
//             <input
//               type="number"
//               step="0.01"
//               value={valueB ?? ""}
//               onChange={(e) => onChangeB(monthIndex, e.target.value === "" ? "" : Number(e.target.value))}
//               className="px-2 py-1 border rounded w-28"
//               placeholder="₱ 0.00"
//             />
//           </div>
//         </div>
//       </div>

//       <div className="mt-2 text-right md:mt-0">
//         <div className="text-xs text-gray-500">Monthly total</div>
//         <div className="font-medium">₱ {monthlyTotal.toFixed(2)}</div>
//       </div>
//     </div>
//   );
// }

// /* ---------------------------
//    Main component
//    --------------------------- */

// export default function ThirteenthEmployeeList({ year, search, globalMode }) {
//   const [employees, setEmployees] = useState([]);
//   const [allEntries, setAllEntries] = useState([]); // raw entries for year
//   const [entriesCache, setEntriesCache] = useState({}); // grouped by employee_id
//   const [loading, setLoading] = useState(true);

//   // status filter: active | inactive | all
//   const [status, setStatus] = useState("active");

//   // selection state
//   const [selectedIds, setSelectedIds] = useState(() => new Set());
//   const [selectAllChecked, setSelectAllChecked] = useState(false);

//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modeOverrides, setModeOverrides] = useState({}); // local override cache (employee_id -> mode)

//   // Helper: resolve employee mode with good priority
//   const getEmpMode = (emp) => {
//     if (!emp) return globalMode || "semi_monthly";
//     // 1) explicit override set in UI
//     if (modeOverrides[emp.employee_id]) return modeOverrides[emp.employee_id];
//     // 2) common server-side fields - check a few likely keys
//     if (emp.mode) return emp.mode;
//     if (emp.employee_mode) return emp.employee_mode;
//     if (emp.tm_mode) return emp.tm_mode;
//     if (emp.thirteenth_mode) return emp.thirteenth_mode;
//     // 3) fallback to globalMode
//     if (globalMode) return globalMode;
//     return "semi_monthly";
//   };

//   // Load all employees + all entries for the year in one shot (re-run when year or status changes)
//   useEffect(() => {
//     let mounted = true;
//     setLoading(true);

//     const loadAll = async () => {
//       try {
//         const empRes = await fetchEmployeesAPI({ status });
//         const emps = empRes && empRes.success ? empRes.data : Array.isArray(empRes) ? empRes : [];
//         if (!mounted) return;
//         setEmployees(emps);

//         const entryRes = await fetchTmEntriesAPI({ calendar_year: year });
//         const entries = entryRes && entryRes.success && Array.isArray(entryRes.data) ? entryRes.data : Array.isArray(entryRes) ? entryRes : [];
//         if (!mounted) return;
//         setAllEntries(entries);

//         const grouped = entries.reduce((acc, item) => {
//           const id = item.employee_id;
//           if (!acc[id]) acc[id] = [];
//           acc[id].push(item);
//           return acc;
//         }, {});
//         setEntriesCache(grouped);

//         // reset selection when list refreshes
//         setSelectedIds(new Set());
//         setSelectAllChecked(false);
//       } catch (err) {
//         console.error("Failed to load employees/entries", err);
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     };

//     loadAll();
//     return () => {
//       mounted = false;
//     };
//   }, [year, status]);

//   // filter employees by search (client-side)
//   const visibleEmployees = useMemo(() => {
//     const q = search?.trim().toLowerCase() || "";
//     if (!q) return employees;
//     return employees.filter((e) => {
//       const name = `${e.first_name} ${e.last_name} ${e.employee_id} ${e.department_id ?? ""} ${e.position_id ?? ""}`.toLowerCase();
//       return name.includes(q);
//     });
//   }, [employees, search]);

//   // compute total & 13th month for an employee from entriesCache
//   const computeSummary = (emp) => {
//     const arr = entriesCache[emp.employee_id] ?? [];
//     const sum = arr.reduce((s, item) => s + Number(item.gross_amount || 0), 0);
//     const thirteenth = Math.round((sum / 12) * 100) / 100;
//     return { sum, thirteenth, entries: arr };
//   };

//   const openEditor = (employee) => {
//     setSelectedEmployee(employee);
//     setModalOpen(true);
//   };

//   // selection handlers
//   const toggleSelect = (employee_id) => {
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(employee_id)) next.delete(employee_id);
//       else next.add(employee_id);
//       // if user toggles manually, turn off "select all" indicator
//       setSelectAllChecked(false);
//       return next;
//     });
//   };

//   const handleSelectAll = () => {
//     if (selectAllChecked) {
//       // uncheck all
//       setSelectedIds(new Set());
//       setSelectAllChecked(false);
//     } else {
//       // check visible employees only
//       const ids = new Set(visibleEmployees.map((e) => e.employee_id));
//       setSelectedIds(ids);
//       setSelectAllChecked(true);
//     }
//   };

//   // Save entries for an employee (bulk upsert) - expects values keyed by period_index (1..12 OR 1..24)
//   const saveEntriesForEmployee = async (employee_id, valuesMap, mode) => {
//     const slots = mode === "monthly" ? 12 : 24;
//     const nowUser = "web-admin";
//     const existingList = entriesCache[employee_id] || [];

//     const entries = [];
//     for (let i = 1; i <= slots; i++) {
//       const existing = existingList.find((r) => Number(r.period_index) === i);
//       entries.push({
//         employee_id,
//         calendar_year: year,
//         mode,
//         period_index: i,
//         period_start: existing ? existing.period_start : "",
//         period_end: existing ? existing.period_end : "",
//         gross_amount: Number(valuesMap[i] || 0).toFixed(2),
//         notes: existing ? existing.notes : null,
//         created_by: nowUser,
//       });
//     }

//     const res = await bulkCreateTmEntriesAPI({ entries });
//     if (res && res.success) {
//       // update local cache for immediate UI feedback
//       const updated = entries.map((e) => ({ entry_id: null, ...e }));
//       setEntriesCache((p) => ({ ...p, [employee_id]: updated }));
//       return { success: true };
//     } else {
//       console.error("saveEntriesForEmployee failed", res);
//       return { success: false, error: res };
//     }
//   };

//   // Set per-employee mode override (saves to backend) - optimistic UI update
//   const handleSetEmployeeMode = async (employee_id, newMode) => {
//     // Optimistic UI update: update employees list and modeOverrides immediately
//     setModeOverrides((p) => ({ ...p, [employee_id]: newMode }));
//     setEmployees((prev) =>
//       prev.map((e) => (e.employee_id === employee_id ? { ...e, mode: newMode, employee_mode: newMode } : e))
//     );
//     // also update selectedEmployee if it matches
//     setSelectedEmployee((prev) => (prev && prev.employee_id === employee_id ? { ...prev, mode: newMode, employee_mode: newMode } : prev));

//     try {
//       const res = await setEmployeeModeAPI({ employee_id, mode: newMode, effective_from: null, effective_to: null });
//       if (res && res.success) {
//         // success: nothing else to do (we already updated)
//         return { success: true };
//       } else {
//         // rollback on backend failure
//         // remove override and restore employee.mode from server (best effort)
//         setModeOverrides((p) => {
//           const next = { ...p };
//           delete next[employee_id];
//           return next;
//         });
//         // try to revert employee.mode to previous value if available from server response (not always present)
//         console.log("Failed to persist mode on server:", res);
//         return { success: false, error: res };
//       }
//     } catch (err) {
//       // rollback on network error
//       setModeOverrides((p) => {
//         const next = { ...p };
//         delete next[employee_id];
//         return next;
//       });
//       console.error("handleSetEmployeeMode error:", err);
//       alert("Failed to save employee mode. See console.");
//       return { success: false, error: err };
//     }
//   };

//   // Trigger printing for selected employees (uses ThirteenthSlip helper)
//   const handlePrintSelected = async () => {
//     const ids = Array.from(selectedIds);
//     if (ids.length === 0) {
//       alert("Please select at least one employee to print.");
//       return;
//     }
//     await printThirteenthSlips(ids, year);
//   };

//   return (
//     <div className="space-y-4">
//       {/* Top controls */}
//       <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
//         <div>
//           <h2 className="mb-1 text-lg font-semibold">Employees</h2>
//           <p className="text-sm text-gray-500">
//             All employees for year <strong>{year}</strong>
//           </p>
//         </div>

//         <div className="flex items-center gap-3">
//           <label className="text-sm">Show:</label>
//           <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-1 border rounded" title="Filter employees by status">
//             <option value="active">Active</option>
//             <option value="inactive">Inactive</option>
//             <option value="all">All</option>
//           </select>

//           <div className="flex items-center gap-2">
//             <button onClick={handleSelectAll} className="px-3 py-1 text-sm border rounded bg-gray-50 hover:bg-gray-100" title="Select/unselect visible employees">
//               {selectAllChecked ? "Unselect All" : "Select All"}
//             </button>

//             <button
//               onClick={handlePrintSelected}
//               className={`px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 ${selectedIds.size === 0 ? "opacity-60 cursor-not-allowed" : ""}`}
//               disabled={selectedIds.size === 0}
//               title="Print selected employees' 13th month slips"
//             >
//               Print Selected ({selectedIds.size})
//             </button>
//           </div>
//         </div>
//       </div>

//       {loading ? (
//         <div className="p-6 text-center bg-white rounded shadow">Loading...</div>
//       ) : visibleEmployees.length === 0 ? (
//         <div className="p-6 text-center bg-white rounded shadow">No employees found.</div>
//       ) : (
//         <div className="space-y-3">
//           {visibleEmployees.map((emp) => {
//             const { sum, thirteenth } = computeSummary(emp);
//             const empMode = getEmpMode(emp);
//             const isChecked = selectedIds.has(emp.employee_id);

//             return (
//               <div key={emp.employee_id} className="flex flex-col gap-4 p-4 bg-white rounded shadow-sm md:flex-row md:items-center md:justify-between">
//                 <div className="flex items-start gap-4">
//                   <input
//                     type="checkbox"
//                     checked={isChecked}
//                     onChange={() => toggleSelect(emp.employee_id)}
//                     className="mt-1"
//                     aria-label={`Select ${emp.first_name} ${emp.last_name}`}
//                   />
//                   <div>
//                     <div className="text-sm font-medium">
//                       {emp.first_name} {emp.last_name}
//                     </div>
//                     <div className="text-xs text-gray-500">
//                       {emp.employee_id} • {emp.department_id ?? emp.position_id ?? ""}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex flex-col flex-1 gap-4 md:flex-row md:items-center md:justify-end">
//                   <div className="text-sm">
//                     <div className="text-xs text-gray-500">Year total gross</div>
//                     <div className="font-medium">₱ {sum.toFixed(2)}</div>
//                   </div>

//                   <div className="text-sm">
//                     <div className="text-xs text-gray-500">13th month</div>
//                     <div className="font-medium">₱ {thirteenth.toFixed(2)}</div>
//                   </div>

//                   <div className="flex items-center gap-2">
//                     <span className={`px-2 py-1 text-xs rounded ${emp.status === "inactive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
//                       {emp.status ?? "active"}
//                     </span>

//                     <select
//                       value={empMode}
//                       onChange={(e) => handleSetEmployeeMode(emp.employee_id, e.target.value)}
//                       className="px-2 py-1 text-xs border rounded"
//                       title="Employee mode override"
//                     >
//                       <option value="semi_monthly">Semi-monthly (24)</option>
//                       <option value="monthly">Monthly (12)</option>
//                     </select>

//                     <button onClick={() => openEditor(emp)} className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700">
//                       Edit
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Editor Modal */}
//       <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Edit periods — ${selectedEmployee?.first_name || ""} ${selectedEmployee?.last_name || ""}`}>
//         {selectedEmployee ? (
//           <EditorPane
//             employee={selectedEmployee}
//             year={year}
//             entries={entriesCache[selectedEmployee.employee_id] || []}
//             mode={getEmpMode(selectedEmployee)}
//             onSave={async (valuesMap) => {
//               const r = await saveEntriesForEmployee(selectedEmployee.employee_id, valuesMap, getEmpMode(selectedEmployee));
//               if (r.success) {
//                 alert("Saved");
//                 setModalOpen(false);
//               } else {
//                 alert("Save failed");
//               }
//             }}
//             onClose={() => {
//               setModalOpen(false);
//             }}
//           />
//         ) : (
//           <div>Loading employee...</div>
//         )}
//       </Modal>
//     </div>
//   );
// }

// /* ---------------------------
//    EditorPane - inside modal
//    --------------------------- */
// function EditorPane({ employee, year, entries = [], mode = "semi_monthly", onSave, onClose }) {
//   // We'll build a valuesMap keyed by period_index (1..12 or 1..24)
//   // For monthly mode: keys 1..12
//   // For semi_monthly mode: keys 1..24 (two per month)
//   const slots = mode === "monthly" ? 12 : 24;

//   // Init valuesMap from entries array
//   const buildInitialMap = () => {
//     const map = {};
//     // initialize all keys
//     for (let i = 1; i <= slots; i++) map[i] = 0;
//     entries.forEach((r) => {
//       const idx = Number(r.period_index);
//       if (!isNaN(idx) && idx >= 1 && idx <= slots) {
//         map[idx] = Number(r.gross_amount || 0);
//       }
//     });
//     return map;
//   };

//   const [valuesMap, setValuesMap] = useState(buildInitialMap);

//   // refresh when entries or mode changes
//   useEffect(() => {
//     setValuesMap(buildInitialMap());
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [entries, mode]);

//   // Helpers for semi-monthly: map month -> period indices
//   const monthToPeriods = (monthIndex) => [2 * monthIndex - 1, 2 * monthIndex];

//   // Handlers to update valuesMap
//   const handleMonthlyChange = (monthIndex, value) => {
//     // monthly mode: monthIndex maps to periodIndex = monthIndex
//     setValuesMap((p) => ({ ...p, [monthIndex]: Number(value || 0) }));
//   };

//   const handleSemiChange = (monthIndex, which, value) => {
//     // which: 'A' -> first cut (2*month-1), 'B' -> second cut (2*month)
//     const [pA, pB] = monthToPeriods(monthIndex);
//     const key = which === "A" ? pA : pB;
//     setValuesMap((p) => ({ ...p, [key]: Number(value || 0) }));
//   };

//   // Compute totals
//   const computeTotals = () => {
//     if (mode === "monthly") {
//       const total = Array.from({ length: 12 }, (_, i) => Number(valuesMap[i + 1] || 0)).reduce((a, b) => a + b, 0);
//       return { total, thirteenth: Math.round((total / 12) * 100) / 100 };
//     } else {
//       const total = Array.from({ length: 24 }, (_, i) => Number(valuesMap[i + 1] || 0)).reduce((a, b) => a + b, 0);
//       return { total, thirteenth: Math.round((total / 12) * 100) / 100 };
//     }
//   };

//   const { total, thirteenth } = computeTotals();
//   const savingDisabled = false;

//   // Prepare payload for saving:
//   // onSave(valuesMap) expects parent to call saveEntriesForEmployee with employee_id & mode
//   const handleSaveClick = async () => {
//     try {
//       await onSave(valuesMap);
//       // parent handles close/notification
//     } catch (err) {
//       console.error(err);
//       alert("Save failed");
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
//         <div>
//           <div className="text-sm font-medium">
//             {employee.first_name} {employee.last_name}
//           </div>
//           <div className="text-xs text-gray-500">{employee.employee_id} • {year} • {mode === "monthly" ? "12 months" : "Semi-monthly (24 cuts)"}</div>
//         </div>

//         <div className="text-right">
//           <div className="text-xs text-gray-500">Total for year</div>
//           <div className="font-semibold">₱ {total.toFixed(2)}</div>
//           <div className="mt-1 text-xs text-gray-500">13th month</div>
//           <div className="font-semibold">₱ {thirteenth.toFixed(2)}</div>
//         </div>
//       </div>

//       {/* Grid of inputs */}
//       {mode === "monthly" ? (
//         // Monthly: show 12 cards in a responsive grid
//         <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
//           {Array.from({ length: 12 }, (_, i) => {
//             const monthIndex = i + 1;
//             return (
//               <div key={monthIndex}>
//                 <MonthCard monthIndex={monthIndex} value={valuesMap[monthIndex]} onChange={(m, val) => handleMonthlyChange(m, val)} />
//               </div>
//             );
//           })}
//         </div>
//       ) : (
//         // Semi-monthly: show 12 rows; each row has two inputs
//         <div className="space-y-2">
//           {Array.from({ length: 12 }, (_, i) => {
//             const monthIndex = i + 1;
//             const [pA, pB] = monthToPeriods(monthIndex);
//             return (
//               <SemiMonthlyRow key={monthIndex} monthIndex={monthIndex} valueA={valuesMap[pA]} valueB={valuesMap[pB]} onChangeA={(m, val) => handleSemiChange(m, "A", val)} onChangeB={(m, val) => handleSemiChange(m, "B", val)} />
//             );
//           })}
//         </div>
//       )}

//       <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
//         <div className="text-sm text-gray-600">
//           <div>Tip: For semi-monthly employees, each month total = first cut + second cut.</div>
//         </div>

//         <div className="flex gap-3 mt-2 md:mt-0">
//           <button onClick={onClose} className="px-3 py-1 border rounded">
//             Cancel
//           </button>
//           <button onClick={handleSaveClick} disabled={savingDisabled} className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-60">
//             Save entries
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
