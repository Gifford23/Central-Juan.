// CommissionPerEmployee.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";

// PHP peso formatter (NO variable called peso)
const formatPHP = (val) =>
  `₱ ${Number(val || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function CommissionPerEmployee() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  // payroll periods
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  // filters
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // edit state
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingMap, setUpdatingMap] = useState({});

  /* -------------------- FETCH PAYROLL PERIOD HISTORY -------------------- */
  const fetchPeriods = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/commission_per_employee/commission_date.php`
      );
      if (res.data?.success) {
        setPeriods(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setPeriods([]);
    }
  };

  /* -------------------- FETCH COMMISSION LIST -------------------- */
  const fetchData = async (opts = {}) => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (opts.fromDate) params.date_from = opts.fromDate;
      if (opts.toDate) params.date_until = opts.toDate;
      if (opts.q) params.q = opts.q;

      const res = await axios.get(
        `${BASE_URL}/commission_per_employee/commission.php`,
        { params }
      );

      if (res.data?.success) {
        setRows(res.data.data || []);
      } else {
        setRows([]);
        setError(res.data?.message || "No data found");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load commission records");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- INITIAL LOAD -------------------- */
  useEffect(() => {
    fetchPeriods();
    fetchData();
  }, []);

  /* -------------------- SEARCH FILTER -------------------- */
  const filteredRows = useMemo(() => {
    if (!query) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.employee_id || "").toLowerCase().includes(q) ||
        String(r.payroll_id || "").includes(q)
    );
  }, [rows, query]);

  /* -------------------- COMMISSION BASED TOGGLE -------------------- */
  const toggleCommissionBased = async (row) => {
    const newVal =
      String(row.commission_based).toLowerCase() === "yes" ? "no" : "yes";

    const confirm = await Swal.fire({
      title: "Change Commission Based?",
      text: `${row.name}: ${row.commission_based} → ${newVal}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
    });

    if (!confirm.isConfirmed) return;

    setUpdatingMap((m) => ({ ...m, [row.payroll_id]: true }));

    try {
      await axios.put(
        `${BASE_URL}/commission_per_employee/update_commission_based.php`,
        {
          payroll_id: row.payroll_id,
          employee_id: row.employee_id,
          commission_based: newVal,
        }
      );

      setRows((prev) =>
        prev.map((r) =>
          r.payroll_id === row.payroll_id
            ? { ...r, commission_based: newVal }
            : r
        )
      );

      Swal.fire("Updated!", "", "success");
    } catch {
      Swal.fire("Failed", "Update failed", "error");
    } finally {
      setUpdatingMap((m) => {
        const c = { ...m };
        delete c[row.payroll_id];
        return c;
      });
    }
  };

  /* -------------------- APPLY FILTER -------------------- */
  const handleApply = () => {
    if (selectedPeriodId) {
      const p = periods.find((x) => String(x.id) === selectedPeriodId);
      if (p) {
        fetchData({ fromDate: p.date_from, toDate: p.date_until, q: query });
        return;
      }
    }
    fetchData({ fromDate, toDate, q: query });
  };

  /* -------------------- RESET -------------------- */
  const handleReset = () => {
    setQuery("");
    setFromDate("");
    setToDate("");
    setSelectedPeriodId("");
    fetchData();
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <span>Loading…</span>
      </div>
    );
  }

  /* -------------------- UI -------------------- */
  return (
    <div className="p-4">
      <h2 className="font-bold text-lg mb-3">Commission Per Employee</h2>

      {/* Filters */}
      <div className="bg-white border rounded p-3 mb-4 flex flex-wrap gap-3">
        <input
          className="border px-3 py-2 rounded text-sm w-64"
          placeholder="Search employee / payroll"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <select
          className="border px-2 py-2 rounded text-sm"
          value={selectedPeriodId}
          onChange={(e) => {
            setSelectedPeriodId(e.target.value);
            const p = periods.find((x) => String(x.id) === e.target.value);
            if (p) {
              setFromDate(p.date_from);
              setToDate(p.date_until);
            }
          }}
        >
          <option value="">— Payroll History —</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.date_from} → {p.date_until}
            </option>
          ))}
        </select>

        <input
          type="date"
          className="border px-2 py-1 rounded text-sm"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setSelectedPeriodId("");
          }}
        />

        <input
          type="date"
          className="border px-2 py-1 rounded text-sm"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setSelectedPeriodId("");
          }}
        />

        <button
          onClick={handleApply}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-sm"
        >
          Apply
        </button>

        <button
          onClick={handleReset}
          className="border px-3 py-1 rounded text-sm"
        >
          Reset
        </button>
      </div>

      {/* Rows */}
      {filteredRows.map((row) => {
        const isYes =
          String(row.commission_based).toLowerCase() === "yes";

        return (
          <div
            key={row.payroll_id}
            className="bg-white border rounded p-3 mb-3 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{row.name}</div>
              <div className="text-xs text-gray-500">
                {row.employee_id} | Payroll #{row.payroll_id}
              </div>
              <div className="text-xs text-gray-500">
                {row.date_from} → {row.date_until}
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-green-600">
                {formatPHP(row.matched_commission)}
              </div>

              <button
                onClick={() => toggleCommissionBased(row)}
                disabled={updatingMap[row.payroll_id]}
                className={`mt-1 px-3 py-1 rounded text-xs font-semibold ${
                  isYes
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {isYes ? "YES" : "NO"}
              </button>
            </div>
          </div>
        );
      })}

      {filteredRows.length === 0 && (
        <div className="text-sm text-gray-500">No records found.</div>
      )}
    </div>
  );
}
