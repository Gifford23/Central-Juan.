// RewardRulesModal.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import BASE_URL from "../../../backend/server/config";

// MUI (dialog container + small controls)
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";

/**
 * RewardRulesModal
 * - MUI Dialog container
 * - Inputs are simple HTML elements styled with Tailwind classes
 * - Behavior maps to your reward_rules table
 *
 * NOTE: This component expects the following backend endpoints (adjust if your routes differ):
 * - GET `${BASE_URL}/rewards/get_reward_rules.php`
 * - POST `${BASE_URL}/rewards/create_reward_rule.php`
 * - PUT  `${BASE_URL}/rewards/update_reward_rule.php`
 * - DELETE `${BASE_URL}/rewards/delete_reward_rule.php`
 * - (optional) GET `${BASE_URL}/rewards/get_departments.php`
 * - (optional) GET `${BASE_URL}/rewards/get_position.php`
 *
 * The form supports scoping rules to "all", a specific department, or a specific position.
 */

export default function RewardRulesModal({ open, onClose }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // reward_rule_id when editing

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [form, setForm] = useState({
    reward_rule_id: null,
    name: "",
    description: "",
    min_total_hours: "",
    min_daily_hours: "", // <-- added
    min_daily_hours_max: "", // <-- NEW: lower bound used for deduction ranges (optional)
    min_days_credited: "",
    payout_type: "fixed",
    payout_value: "",
    is_active: true,
    is_deduction: false, // <-- NEW: rule mode
    priority: 10,
    applies_to_employee_type: "",
    // NEW: scope and selected dept/position
    applies_scope: "all", // 'all' | 'department' | 'position'
    applies_to_department_id: "",
    applies_to_position_id: "",
  });

  // ensure SweetAlert2 appears above MUI Dialog
  useEffect(() => {
    const id = "swal2-top-style";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.innerHTML = `
        .swal2-container, .swal2-backdrop {
          z-index: 20000 !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // fetch rules sorted by priority asc
  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/rewards/get_reward_rules.php`);
      const data = res.data?.data ?? [];
      const normalized = (Array.isArray(data) ? data : []).map((r) => ({
        ...r,
        payout_value: r.payout_value ?? 0,
        min_total_hours: r.min_total_hours ?? null,
        min_daily_hours: r.min_daily_hours ?? null,
        min_daily_hours_max: r.min_daily_hours_max ?? null, // <-- normalize
        min_days_credited: r.min_days_credited ?? null,
        is_active: Number(r.is_active ?? r.active ?? 0) === 1,
        is_deduction: Number(r.is_deduction ?? 0) === 1, // <-- normalize
        applies_to_department_id: r.applies_to_department_id ?? null,
        applies_to_position_id: r.applies_to_position_id ?? null,
      })).sort((a, b) => (Number(a.priority ?? 9999) - Number(b.priority ?? 9999)));
      setRules(normalized);
    } catch (err) {
      console.error("Failed to fetch rules:", err);
      Swal.fire("Error", "Failed to load reward rules.", "error");
    } finally {
      setLoading(false);
    }
  };

  // fetch departments & positions for selects (simple endpoints)
  const fetchMeta = async () => {
    setLoadingMeta(true);
    try {
      // Try endpoints - adapt URLs if your actual path differs
      const [deptRes, posRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/rewards/get_departments.php`),
        axios.get(`${BASE_URL}/rewards/get_position.php`),
      ]);

      if (deptRes.status === "fulfilled" && Array.isArray(deptRes.value.data?.data)) {
        setDepartments(deptRes.value.data.data);
      } else if (deptRes.status === "fulfilled" && Array.isArray(deptRes.value.data)) {
        setDepartments(deptRes.value.data);
      } else {
        setDepartments([]);
      }

      if (posRes.status === "fulfilled" && Array.isArray(posRes.value.data?.data)) {
        setPositions(posRes.value.data.data);
      } else if (posRes.status === "fulfilled" && Array.isArray(posRes.value.data)) {
        setPositions(posRes.value.data);
      } else {
        setPositions([]);
      }
    } catch (err) {
      console.warn("Failed to fetch departments/positions (non-fatal):", err);
      setDepartments([]);
      setPositions([]);
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRules();
      fetchMeta();
    }
  }, [open]);

  const resetForm = () => {
    setForm({
      reward_rule_id: null,
      name: "",
      description: "",
      min_total_hours: "",
      min_daily_hours: "",
      min_daily_hours_max: "",
      min_days_credited: "",
      payout_type: "fixed",
      payout_value: "",
      is_active: true,
      is_deduction: false,
      priority: 10,
      applies_to_employee_type: "",
      applies_scope: "all",
      applies_to_department_id: "",
      applies_to_position_id: "",
    });
    setEditing(null);
  };

  // basic validation
  const isFormValid = () => {
    if (!form.name || !form.name.trim()) return false;
    const pv = form.payout_value === "" ? 0 : Number(form.payout_value);
    if (Number.isNaN(pv) || pv < 0) return false;
    if (form.payout_type === "percentage" && pv > 100) return false;
    const pr = Number(form.priority);
    if (Number.isNaN(pr) || !Number.isInteger(pr)) return false;

    if (form.applies_scope === "department" && (!form.applies_to_department_id || form.applies_to_department_id === "")) return false;
    if (form.applies_scope === "position" && (!form.applies_to_position_id || form.applies_to_position_id === "")) return false;

    // if provided, min_daily_hours_max must be numeric and >= 0 and <= 24
    if (form.min_daily_hours_max !== "" && form.min_daily_hours_max !== null) {
      const v = Number(form.min_daily_hours_max);
      if (Number.isNaN(v) || v < 0 || v > 24) return false;
    }

    // min_daily_hours if provided must be numeric and >=0 <=24
    if (form.min_daily_hours !== "" && form.min_daily_hours !== null) {
      const v2 = Number(form.min_daily_hours);
      if (Number.isNaN(v2) || v2 < 0 || v2 > 24) return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!isFormValid()) {
      Swal.fire("Invalid", "Please check required fields and numeric inputs (hours/percent).", "warning");
      return;
    }

    setSaving(true);
    Swal.fire({ title: "Saving...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // Determine applies_to_department_id / applies_to_position_id based on scope
    let applies_to_department_id = null;
    let applies_to_position_id = null;
    if (form.applies_scope === "department") {
      applies_to_department_id = form.applies_to_department_id || null;
    } else if (form.applies_scope === "position") {
      applies_to_position_id = form.applies_to_position_id || null;
    }

    const payload = {
      reward_rule_id: editing ? editing : null,
      name: (form.name || "").trim(),
      description: (form.description || "").trim() || null,
      min_total_hours: form.min_total_hours === "" ? null : Number(form.min_total_hours),
      min_daily_hours: form.min_daily_hours === "" ? null : Number(form.min_daily_hours),
      min_daily_hours_max: form.min_daily_hours_max === "" ? null : Number(form.min_daily_hours_max), // <-- NEW
      min_days_credited: form.min_days_credited === "" ? null : Number(form.min_days_credited),
      payout_type: form.payout_type,
      payout_value: Number(form.payout_value || 0),
      is_active: form.is_active ? 1 : 0,
      is_deduction: form.is_deduction ? 1 : 0, // <-- NEW
      priority: Number(form.priority || 10),
      applies_to_employee_type:
        (form.applies_to_employee_type || "").toString().trim() === "" ? null : (form.applies_to_employee_type || "").toString().trim(),
      // NEW fields that your DB expects (we set only according to scope)
      applies_to_department_id: applies_to_department_id,
      applies_to_position_id: applies_to_position_id,
    };

    try {
      let res;
      if (editing) {
        res = await axios.put(`${BASE_URL}/rewards/update_reward_rule.php`, payload, {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        res = await axios.post(`${BASE_URL}/rewards/create_reward_rule.php`, payload, {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (res.data?.success) {
        Swal.close();
        Swal.fire("Saved", editing ? "Rule updated." : "Rule created.", "success");
        resetForm();
        await fetchRules();
      } else {
        Swal.fire("Failed", res.data?.message || "Server rejected request.", "error");
      }
    } catch (err) {
      console.error("save error", err);
      Swal.fire("Error", "Network or server error while saving.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await Swal.fire({
      title: "Delete rule?",
      text: "This will permanently remove the rule. Proceed?",
      icon: "warning",
      showCancelButton: true,
    });
    if (!ok.isConfirmed) return;

    try {
      const res = await axios.delete(`${BASE_URL}/rewards/delete_reward_rule.php`, { data: { reward_rule_id: id } });
      if (res.data?.success) {
        Swal.fire("Deleted", "Rule removed.", "success");
        if (editing === id) resetForm();
        await fetchRules();
      } else {
        Swal.fire("Failed", res.data?.message || "Server error while deleting.", "error");
      }
    } catch (err) {
      console.error("delete error", err);
      Swal.fire("Error", "Network error while deleting.", "error");
    }
  };

  const startEdit = (r) => {
    setEditing(r.reward_rule_id);

    // determine scope from the returned row values
    let scope = "all";
    if (r.applies_to_department_id) scope = "department";
    else if (r.applies_to_position_id) scope = "position";

    setForm({
      reward_rule_id: r.reward_rule_id,
      name: r.name ?? "",
      description: r.description ?? "",
      min_total_hours: r.min_total_hours === null ? "" : String(r.min_total_hours),
      min_daily_hours: r.min_daily_hours === null ? "" : String(r.min_daily_hours),
      min_daily_hours_max: r.min_daily_hours_max === null ? "" : String(r.min_daily_hours_max), // <-- NEW
      min_days_credited: r.min_days_credited === null ? "" : String(r.min_days_credited),
      payout_type: r.payout_type ?? "fixed",
      payout_value: r.payout_value === null ? "" : String(r.payout_value),
      is_active: Boolean(r.is_active),
      is_deduction: Boolean(r.is_deduction), // <-- NEW
      priority: r.priority ?? 10,
      applies_to_employee_type: r.applies_to_employee_type ?? "",
      applies_scope: scope,
      applies_to_department_id: r.applies_to_department_id ?? "",
      applies_to_position_id: r.applies_to_position_id ?? "",
    });

    // ensure user sees the form area
    window.requestAnimationFrame(() => {
      const el = document.querySelector(".reward-rules-modal-top");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const payoutHint = () => {
    if (form.payout_type === "fixed") return "Fixed amount in PHP (e.g. 500).";
    if (form.payout_type === "per_hour") return "Amount per hour (PHP/hr).";
    return "Percentage of basic salary — enter 5 for 5% (max 100).";
  };

  const formatDisplayAmount = (r) => {
    const pv = Number(r.payout_value || 0);
    if (r.payout_type === "fixed") return `₱${pv.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (r.payout_type === "per_hour") return `₱${pv.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/hr`;
    return `${pv}%`;
  };

  // ---- Helper: resolve names and scope badges ----
  const getDeptName = (deptId) => {
    if (!deptId) return null;
    const d = departments.find((x) => String(x.department_id) === String(deptId) || String(x.id) === String(deptId));
    return d ? (d.department_name ?? d.name ?? deptId) : deptId;
  };

  const getPosName = (posId) => {
    if (!posId) return null;
    const p = positions.find((x) => String(x.position_id) === String(posId) || String(x.id) === String(posId));
    return p ? (p.position_name ?? p.name ?? posId) : posId;
  };

  const getScopeForRule = (r) => {
    if (r.applies_to_department_id) return "department";
    if (r.applies_to_position_id) return "position";
    return "all";
  };

  const renderScopeBadges = (r) => {
    const scope = getScopeForRule(r);
    const deptName = getDeptName(r.applies_to_department_id);
    const posName = getPosName(r.applies_to_position_id);

    // if scope === all -> show All badge (green) and show dept/pos as disabled (red)
    if (scope === "all") {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800">Applies to: All</div>
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Dept: not applied</div>
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Pos: not applied</div>
        </div>
      );
    }

    if (scope === "department") {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Applies to: not all</div>
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800">Dept: {deptName}</div>
          <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Pos: not applied</div>
        </div>
      );
    }

    // position
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Applies to: not all</div>
        <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">Dept: not applied</div>
        <div className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-800">Pos: {posName}</div>
      </div>
    );
  };
  // ---- end helpers ----

  return (
    <Dialog open={open} onClose={() => { resetForm(); onClose && onClose(); }} maxWidth="md" fullWidth>
      <DialogTitle>
        <div className="flex items-center justify-between">
          <Typography variant="h6">Reward Rules</Typography>
          <div className="flex items-center gap-2">
            <Tooltip title="Reload rules from server">
              <IconButton onClick={fetchRules} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button onClick={() => { resetForm(); fetchRules(); }} size="small" variant="outlined">Reset</Button>
          </div>
        </div>
      </DialogTitle>

      <DialogContent dividers>
        {/* FORM - tailwind styled inputs */}
        <div className="mb-4 space-y-4 reward-rules-modal-top">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rule Name <span className="text-red-500">*</span></label>
              <input
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Midmonth Attendance Reward"
              />
              <p className="mt-1 text-xs text-gray-500">Short, descriptive name (required).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Payout type</label>
              <select
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.payout_type}
                onChange={(e) => setForm({ ...form, payout_type: e.target.value })}
              >
                <option value="fixed">Fixed</option>
                <option value="per_hour">Per hour</option>
                <option value="percentage">Percentage</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">How the payout is calculated.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Payout value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.payout_value}
                onChange={(e) => setForm({ ...form, payout_value: e.target.value })}
                placeholder={form.payout_type === "percentage" ? "e.g. 5" : "e.g. 500"}
              />
              <p className="mt-1 text-xs text-gray-500">{payoutHint()}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Priority</label>
              <input
                type="number"
                step="1"
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">Lower number = higher priority.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Min daily hours</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.min_daily_hours}
                onChange={(e) => setForm({ ...form, min_daily_hours: e.target.value })}
                placeholder="e.g. 8.00 — leave blank to ignore"
              />
              <p className="mt-1 text-xs text-gray-500">Require each working day to have ≥ this many hours.</p>
            </div>
          </div>

          {/* NEW: Deduction toggle + min_daily_hours_max */}
          <div className="grid items-end grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_deduction}
                  onChange={(e) => setForm({ ...form, is_deduction: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Treat as deduction (penalty) instead of reward</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                When enabled, this rule will be considered a payroll-level deduction. Use <strong>Min daily hours</strong> and optionally the <strong>lower bound</strong> below to express a range (e.g. 0.00 &lt; hours &lt; 4.00).
              </p>
            </div>

            {/* <div>
              <label className="block text-sm font-medium text-gray-700">Min daily hours lower bound (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.min_daily_hours_max}
                onChange={(e) => setForm({ ...form, min_daily_hours_max: e.target.value })}
                placeholder="e.g. 0.00 — leave blank for 0.00"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional lower bound for the per-day range used by deduction rules. If left blank the lower bound is assumed 0.0.
              </p>
            </div> */}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={2}
              className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Optional short explanation for admins"
            />
            <p className="mt-1 text-xs text-gray-500">Optional.</p>
          </div>

          {/* Scope selection: All / Department / Position */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Applies to</label>
              <select
                className="block w-full px-3 py-2 mt-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.applies_scope}
                onChange={(e) => {
                  const scope = e.target.value;
                  setForm({
                    ...form,
                    applies_scope: scope,
                    // preserve when switching into the same scope, clear otherwise
                    applies_to_department_id: scope === "department" ? form.applies_to_department_id : "",
                    applies_to_position_id: scope === "position" ? form.applies_to_position_id : "",
                  });
                }}
              >
                <option value="all">All employees</option>
                <option value="department">Department</option>
                <option value="position">Position</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">Choose whether this rule applies to everyone, a department, or a position.</p>
            </div>

            {/* Department selection (green when enabled, red when disabled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <div className="relative">
                <select
                  disabled={form.applies_scope !== "department"}
                  className={`block w-full px-3 py-2 mt-1 rounded-md focus:outline-none focus:ring-2 ${
                    form.applies_scope === "department"
                      ? "border border-green-300 focus:ring-green-300"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                  value={form.applies_to_department_id}
                  onChange={(e) => setForm({ ...form, applies_to_department_id: e.target.value })}
                >
                  <option value="">— select department —</option>
                  {loadingMeta ? (
                    <option value="">Loading...</option>
                  ) : departments && departments.length > 0 ? (
                    departments.map((d) => (
                      <option key={d.department_id ?? d.id} value={d.department_id ?? d.id}>
                        {d.department_name ?? d.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No departments</option>
                  )}
                </select>
                {loadingMeta && form.applies_scope === "department" && (
                  <div className="absolute right-3 top-3"><CircularProgress size={16} /></div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Select department when scope = Department.</p>
            </div>

            {/* Position selection (green when enabled, red when disabled) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Position</label>
              <div className="relative">
                <select
                  disabled={form.applies_scope !== "position"}
                  className={`block w-full px-3 py-2 mt-1 rounded-md focus:outline-none focus:ring-2 ${
                    form.applies_scope === "position"
                      ? "border border-green-300 focus:ring-green-300"
                      : "border border-red-200 bg-red-50 text-red-700"
                  }`}
                  value={form.applies_to_position_id}
                  onChange={(e) => setForm({ ...form, applies_to_position_id: e.target.value })}
                >
                  <option value="">— select position —</option>
                  {loadingMeta ? (
                    <option value="">Loading...</option>
                  ) : positions && positions.length > 0 ? (
                    positions.map((p) => (
                      <option key={p.position_id ?? p.id} value={p.position_id ?? p.id}>
                        {p.position_name ?? p.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No positions</option>
                  )}
                </select>
                {loadingMeta && form.applies_scope === "position" && (
                  <div className="absolute right-3 top-3"><CircularProgress size={16} /></div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">Select position when scope = Position.</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!isFormValid() || saving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white ${(!isFormValid() || saving) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
              >
                {saving ? <CircularProgress size={16} color="inherit" /> : <><AddIcon fontSize="small" /> {editing ? "Update rule" : "Create rule"}</>}
              </button>

              {editing ? (
                <button onClick={resetForm} className="inline-flex items-center px-3 py-2 text-sm bg-white border rounded-md">Cancel</button>
              ) : (
                <button onClick={resetForm} className="inline-flex items-center px-3 py-2 text-sm text-gray-600 bg-white border rounded-md">Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* RULE LIST */}
        <div className="space-y-3">
          {loading ? (
            <Box className="flex justify-center py-8">
              <CircularProgress />
            </Box>
          ) : rules.length === 0 ? (
            <div className="py-4 text-sm text-center text-gray-500">No rules found</div>
          ) : (
            rules.map((r) => (
              <div
                key={r.reward_rule_id}
                className="flex items-start justify-between p-3 bg-white border rounded-lg hover:shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-gray-900 truncate">{r.name}</div>
                    <div className={`text-[11px] px-2 py-0.5 rounded-full ${r.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </div>

                    {/* NEW: deduction badge */}
                    {r.is_deduction && (
                      <div className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-800">Deduction</div>
                    )}
                  </div>

                  <div className="mt-1 text-xs text-gray-600">
                    {formatDisplayAmount(r)} • Priority: {r.priority}
                  </div>

                  <div className="mt-2 text-xs text-gray-500">
                    {r.applies_to_employee_type ? `Employee type: ${r.applies_to_employee_type} • ` : ""}
                    {r.description ? ` — ${r.description}` : ""}
                  </div>

                  {/* Render red/green scope badges */}
                  {renderScopeBadges(r)}

                  {r.min_total_hours || r.min_daily_hours || r.min_daily_hours_max || r.min_days_credited ? (
                    <div className="mt-2 text-xs text-gray-500">
                      {r.min_total_hours ? `Min hrs: ${r.min_total_hours} • ` : ""}
                      {r.min_daily_hours ? `Min daily hrs: ${r.min_daily_hours} • ` : ""}
                      {r.min_daily_hours_max ? `Lower bound: ${r.min_daily_hours_max} • ` : ""}
                      {r.min_days_credited ? `Min days: ${r.min_days_credited} • ` : ""}
                    </div>
                  ) : null}

                  {r.created_at && (
                    <div className="mt-1 text-xs text-gray-400">Created: {new Date(r.created_at).toLocaleString()}</div>
                  )}
                </div>

                <div className="flex items-start gap-1">
                  <Tooltip title="Edit this rule">
                    <IconButton size="small" onClick={() => startEdit(r)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="Delete rule">
                    <IconButton size="small" onClick={() => handleDelete(r.reward_rule_id)}>
                      <DeleteIcon color="error" fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>

      <DialogActions>
        <div className="flex items-center justify-between w-full px-3 py-2">
          <div className="text-xs text-gray-500">
            Showing {rules.length} rule{rules.length !== 1 ? "s" : ""} — priority: lower value = higher priority
          </div>
          <div>
            <Button variant="outlined" onClick={() => { resetForm(); onClose && onClose(); }}>Close</Button>
          </div>
        </div>
      </DialogActions>
    </Dialog>
  );
}

RewardRulesModal.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
};
