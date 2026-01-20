// src/components/thirteenth/ThirteenthDashboard.jsx
import React, { useEffect, useState } from "react";
import {
  fetchTmConfigAPI,
  updateTmConfigAPI,
  computeAllEmployeesAPI,
} from "../payrollApi/thirteenthMonthAPI"; // ensure this path matches your file structure
import ThirteenthEmployeeList from "../thirteenthComponents/ThirteenthEmpyeeList"; // list component in same folder

/**
 * ThirteenthDashboard
 * - Top-level page for 13th-month admin
 * - Controls: year selector, global mode (monthly / semi_monthly), bulk compute
 * - Renders ThirteenthEmployeeList (separate file)
 */
export default function ThirteenthDashboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [config, setConfig] = useState({ default_mode: "semi_monthly", cutoff_assignment: "period_end" });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // load global config on mount
    setLoadingConfig(true);
    fetchTmConfigAPI()
      .then((res) => {
        // API returns { success: true, data: {...} } or raw data depending on backend
        if (res && res.success) setConfig(res.data || res);
        else if (res && !res.success && res.default_mode) setConfig(res);
      })
      .catch((err) => console.error("Failed to load 13th-month config", err))
      .finally(() => setLoadingConfig(false));
  }, []);

  const handleModeToggle = async () => {
    // toggle between monthly and semi_monthly (local optimistic update + backend update)
    const newMode = config.default_mode === "semi_monthly" ? "monthly" : "semi_monthly";
    const payload = { ...config, default_mode: newMode, updated_by: "web-admin" };

    // optimistic UI change
    setConfig((p) => ({ ...p, default_mode: newMode }));

    try {
      await updateTmConfigAPI(payload);
    } catch (err) {
      console.error("Failed to update config", err);
      // revert on error
      setConfig((p) => ({ ...p, default_mode: p.default_mode === "semi_monthly" ? "monthly" : "semi_monthly" }));
      alert("Failed to save global mode. Check console for details.");
    }
  };

  const handleBulkCompute = async () => {
    if (!window.confirm(`Compute 13th-month for ALL employees for ${year}?`)) return;
    setBulkRunning(true);
    try {
      const res = await computeAllEmployeesAPI({ calendar_year: year });
      if (res && res.success) {
        alert(`Bulk compute complete: ${res.message || "OK"}`);
      } else {
        // show basic message — developer can inspect console for details
        alert("Bulk compute completed with warnings or errors. See console.");
        console.log("bulk compute result:", res);
      }
    } catch (err) {
      console.error("Bulk compute error", err);
      alert("Bulk compute failed. See console.");
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">13th Month Dashboard</h1>
          <p className="text-sm text-gray-600">Manual entry & summary for employee 13th month pay</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Year:
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-2 py-1 border rounded"
            >
              {Array.from({ length: 6 }).map((_, i) => {
                const y = currentYear - 2 + i;
                return (
                  <option key={y} value={y}>{y}</option>
                );
              })}
            </select>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-sm">Mode:</span>
            <button
              onClick={handleModeToggle}
              className="px-3 py-1 text-sm bg-white border rounded shadow-sm hover:bg-gray-50"
              title="Toggle global default mode"
            >
              {loadingConfig ? "Loading..." : config.default_mode === "semi_monthly" ? "Semi-monthly (24 slots)" : "Monthly (12 slots)"}
            </button>
          </div>

          <button
            onClick={handleBulkCompute}
            disabled={bulkRunning}
            className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-60"
          >
            {bulkRunning ? "Running..." : "Bulk Compute All"}
          </button>
        </div>
      </header>

      <div className="p-4 bg-white rounded shadow-sm">
        <label className="block mb-2 text-sm">Search employees</label>
        <input
          className="w-full px-3 py-2 border rounded"
          placeholder="Search by name, ID or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Employee list component */}
      <ThirteenthEmployeeList year={year} search={search} globalMode={config.default_mode} />
    </div>
  );
}
