// PayrollSummary.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';

const PayrollSummary = ({ payroll, formatDate }) => {
  if (!payroll) return null;

  const totalDays = parseFloat(payroll.total_days) || 0;
  const totalOvertime = parseFloat(payroll.total_overtime_request) || 0;
  const [showLeaves, setShowLeaves] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);

  // ---- NEW: incentive state ----
  const [editingIncentive, setEditingIncentive] = useState(false);
  const [incentiveAmount, setIncentiveAmount] = useState(
    payroll?.total_incentives ? Number(payroll.total_incentives) : 0
  );
  const [incentiveRemarks, setIncentiveRemarks] = useState(
    payroll?.incentive_remarks || ""
  );
  const [savingIncentive, setSavingIncentive] = useState(false);

  // ---- NEW: retro state ----
  const [retroList, setRetroList] = useState([]); // pending+applied retro rows
  const [retroPendingTotal, setRetroPendingTotal] = useState(0);
  const [retroAppliedTotal, setRetroAppliedTotal] = useState(0);
  const [editingRetro, setEditingRetro] = useState(false);
  const [retroAmount, setRetroAmount] = useState("");
  const [retroDescription, setRetroDescription] = useState("");
  const [retroEffectiveDate, setRetroEffectiveDate] = useState(""); // <-- date picker state
  const [savingRetro, setSavingRetro] = useState(false);
  const [loadingRetro, setLoadingRetro] = useState(false);

  // ---- NEW: reward state ----
  const [editingReward, setEditingReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(
    payroll?.total_rewards ? Number(payroll.total_rewards) : 0
  );
  const [rewardDescription, setRewardDescription] = useState("");
  const [rewardList, setRewardList] = useState(Array.isArray(payroll?.rewards) ? payroll.rewards : []);
  const [rewardSaving, setRewardSaving] = useState(false);
  const [rewardTotal, setRewardTotal] = useState(Number(payroll?.total_rewards || 0));

  // ---- ELIGIBILITY GUARD: Regular AND at least 8 hours
  const eligibleForReward = (String(payroll.employee_type || "").toLowerCase() === "regular")
    && (Number(payroll.total_rendered_hours || 0) >= 8);

  // keep inputs in sync when payroll prop changes
  useEffect(() => {
    setIncentiveAmount(payroll?.total_incentives ? Number(payroll.total_incentives) : 0);
    setIncentiveRemarks(payroll?.incentive_remarks || "");
    // clear local retro inputs when payroll changes
    setRetroAmount("");
    setRetroDescription("");
    setRetroEffectiveDate("");
    // fetch retro rows for this employee/payroll cutoff
    fetchPendingRetro();

    // sync rewards from incoming payroll object
    setRewardList(Array.isArray(payroll?.rewards) ? payroll.rewards : []);
    setRewardTotal(Number(payroll?.total_rewards || 0));
    setRewardAmount(Number(payroll?.total_rewards || 0));
    setRewardDescription("");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payroll?.payroll_id, payroll?.total_incentives, payroll?.incentive_remarks, payroll?.total_rewards, payroll?.rewards]);

  // -------------------------------

  // fetch pending/applied retro adjustments for the employee (defensive)
  const fetchPendingRetro = async () => {
    if (!payroll?.employee_id) return;
    setLoadingRetro(true);
    try {
      const url = `${BASE_URL}/payroll/get_retro_for_employee.php`;
      const params = {
        employee_id: payroll.employee_id,
        date_until: payroll.date_until || null
      };
      const res = await axios.get(url, { params });
      const body = res.data ?? {};

      if (body.success) {
        const rows = Array.isArray(body.data) ? body.data : [];

        // compute totals if API provided them; otherwise compute locally
        const totalPending = typeof body.total_pending !== "undefined"
          ? Number(body.total_pending)
          : rows.reduce((s, r) => s + (r.status === "pending" ? (parseFloat(r.amount) || 0) : 0), 0);

        const totalApplied = typeof body.total_applied !== "undefined"
          ? Number(body.total_applied)
          : rows.reduce((s, r) => s + (r.status === "applied" ? (parseFloat(r.amount) || 0) : 0), 0);

        setRetroList(rows);
        setRetroPendingTotal(totalPending);
        setRetroAppliedTotal(totalApplied);
      } else {
        // fallback: read any retro fields embedded in payroll
        const fallbackRows = Array.isArray(payroll.retro_entries) ? payroll.retro_entries : [];
        const fallbackPending = parseFloat(payroll.total_retro_pending || payroll.total_retro || 0) || 0;
        const fallbackApplied = parseFloat(payroll.total_retro_applied || 0) || 0;

        setRetroList(fallbackRows);
        setRetroPendingTotal(fallbackPending);
        setRetroAppliedTotal(fallbackApplied);
      }
    } catch (err) {
      console.warn("Failed to fetch retro adjustments:", err);
      const fallbackRows = Array.isArray(payroll.retro_entries) ? payroll.retro_entries : [];
      const fallbackPending = parseFloat(payroll.total_retro_pending || payroll.total_retro || 0) || 0;
      const fallbackApplied = parseFloat(payroll.total_retro_applied || 0) || 0;
      setRetroList(fallbackRows);
      setRetroPendingTotal(fallbackPending);
      setRetroAppliedTotal(fallbackApplied);
    } finally {
      setLoadingRetro(false);
    }
  };

  // -------------------------------
  // incentive save handler (unchanged except safe dispatch)
  const saveIncentive = async () => {
    const parsed = Number(incentiveAmount) || 0;
    if (parsed < 0) {
      Swal.fire("Invalid amount", "Incentive cannot be negative.", "warning");
      return;
    }

    setSavingIncentive(true);
    Swal.fire({
      title: "Saving incentive...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const payload = {
        payroll_id: payroll.payroll_id,
        total_incentives: parsed,
        incentive_remarks: incentiveRemarks,
        payroll_type: payroll.payroll_type ?? null,
        contribution_deduction_type: payroll.contribution_deduction_type ?? null
      };

      const res = await axios.put(`${BASE_URL}/payroll/update_payroll.php`, payload, {
        headers: { "Content-Type": "application/json" }
      });

      const data = res.data ?? {};

      if (data.success) {
        Swal.fire("Saved", "Incentive saved successfully.", "success");

        // refresh payroll row in the app
        window.dispatchEvent(new CustomEvent("payroll:refresh", {
          detail: { employee_id: payroll.employee_id }
        }));

        setEditingIncentive(false);
      } else {
        Swal.fire("Failed", data.message || "Could not save incentive.", "error");
      }
    } catch (err) {
      console.error("Error saving incentive:", err);
      Swal.fire("Error", "Network or server error when saving incentive.", "error");
    } finally {
      setSavingIncentive(false);
    }
  };
  // -------------------------------------

  // ---- NEW: save reward handler (manual override / journal) ----
  const saveReward = async () => {
    // Front-end guard: ensure payroll is eligible
    if (!eligibleForReward) {
      Swal.fire("Not eligible", "Only Regular employees with at least 8 rendered hours can be awarded here.", "warning");
      return;
    }

    const parsed = Number(rewardAmount) || 0;
    if (parsed <= 0) {
      Swal.fire("Invalid amount", "Please enter a reward amount greater than zero.", "warning");
      return;
    }
    if (!rewardDescription || String(rewardDescription).trim().length < 3) {
      Swal.fire("Invalid description", "Please provide a short description for audit.", "warning");
      return;
    }

    setRewardSaving(true);
    Swal.fire({
      title: "Saving reward...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      // payload for apply_reward_journal.php (server should accept these fields)
      const payload = {
        employee_id: payroll.employee_id,
        amount: parsed,
        payroll_cutoff: payroll.date_until || null,
        reward_rule_id: null,
        description: String(rewardDescription).trim(),
        origin: "manual",
        created_by: null,
        payroll_id: payroll.payroll_id
      };

      const res = await axios.post(`${BASE_URL}/payroll/apply_reward_journal.php`, payload, {
        headers: { "Content-Type": "application/json" }
      });

      const data = res.data ?? {};

      if (data.success) {
        Swal.fire("Saved", "Reward journal entry saved.", "success");

        // optimistic local update: push new journal row into rewardList and update rewardTotal
        const newJournal = {
          journal_id: data.journal_id ?? null,
          payroll_id: payroll.payroll_id,
          employee_id: payroll.employee_id,
          reward_rule_id: null,
          amount: parsed,
          entry_date: new Date().toISOString(),
          payroll_cutoff: payroll.date_until || null,
          origin: "manual",
          description: payload.description,
          created_by: payload.created_by
        };

        setRewardList(prev => [newJournal, ...prev]);
        setRewardTotal(prev => Number((Number(prev || 0) + parsed).toFixed(2)));
        setEditingReward(false);
        setRewardDescription("");
        setRewardAmount(0);

        // notify list to refresh the single payroll row (will pick up authoritative total_rewards)
        window.dispatchEvent(new CustomEvent("payroll:refresh", {
          detail: { employee_id: payroll.employee_id }
        }));
      } else {
        Swal.fire("Failed", data.message || "Could not save reward.", "error");
      }
    } catch (err) {
      console.error("Error saving reward:", err);
      Swal.fire("Error", "Network or server error when saving reward.", "error");
    } finally {
      setRewardSaving(false);
    }
  };

  // ---- NEW: cancel a pending reward (if your backend supports cancellation you can wire this)
  const cancelReward = async (journal_id) => {
    // Minimal optimistic UI: ask user to cancel via backend if implemented.
    const ok = await Swal.fire({
      title: "Cancel reward?",
      text: "This will mark the reward as cancelled (if backend supports it).",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel",
    });
    if (!ok.isConfirmed) return;

    try {
      // If you have endpoint to cancel reward, call it here.
      // Fallback: refresh list and let admin cancel from server UI.
      window.dispatchEvent(new CustomEvent("payroll:refresh", {
        detail: { employee_id: payroll.employee_id }
      }));
      Swal.fire("Requested", "Cancel requested (check server-side implementation).", "success");
    } catch (err) {
      console.error("Failed to cancel reward:", err);
      Swal.fire("Error", "Network error while cancelling reward.", "error");
    }
  };
  // -------------------------------

  // ---- NEW: save retro handler ----
// ---- NEW: save retro handler (updated to match backend field names + response) ----
const saveRetro = async () => {
  // Allow positive or negative adjustments but disallow zero/empty
  const parsed = Number(retroAmount);
  if (!retroDescription || String(retroDescription).trim().length < 3) {
    Swal.fire("Invalid description", "Please provide a short description for audit.", "warning");
    return;
  }
  if (!retroAmount || isNaN(parsed) || parsed === 0) {
    Swal.fire("Invalid amount", "Please enter a non-zero amount for the retro adjustment.", "warning");
    return;
  }

  setSavingRetro(true);
  Swal.fire({
    title: "Saving retro adjustment...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // NOTE: we send the exact fields your PHP expects
    const payload = {
      payroll_id: payroll.payroll_id,
      retro_amount: parsed,
      retro_description: String(retroDescription).trim(),
      retro_effective_date: retroEffectiveDate || null,
      created_by: null // or pass a user id/string if available
    };

    const res = await axios.put(`${BASE_URL}/payroll/update_payroll.php`, payload, {
      headers: { "Content-Type": "application/json" }
    });

    const data = res.data ?? {};

    if (data.success) {
      Swal.fire("Saved", "Retro adjustment saved.", "success");

      // backend returns useful info inside data.data
      const resp = data.data || {};
      const insertedId = resp.retro_inserted_id ?? null;
      const wasApplied = !!resp.retro_applied;
      const backendPendingTotal = typeof resp.total_retro_pending !== "undefined"
        ? Number(resp.total_retro_pending)
        : null;

      // Build new retro entry using authoritative server info (mark applied if backend says applied)
      const newRetro = {
        retro_id: insertedId,
        employee_id: payroll.employee_id,
        payroll_id: payroll.payroll_id,
        amount: parsed,
        description: payload.retro_description,
        effective_date: payload.retro_effective_date,
        status: wasApplied ? "applied" : "pending",
        created_by: payload.created_by,
        applied_in_payroll_id: wasApplied ? payroll.payroll_id : null,
        applied_at: wasApplied ? new Date().toISOString() : null,
        entry_date: new Date().toISOString()
      };

      // Prepend to list and update totals based on backend signals if available
      setRetroList(prev => [newRetro, ...prev]);

      if (wasApplied) {
        // increment applied total locally (fallback if backend didn't return pending totals)
        setRetroAppliedTotal(prev => Number(((Number(prev || 0) + parsed)).toFixed(2)));
      } else {
        setRetroPendingTotal(prev => Number(((Number(prev || 0) + parsed)).toFixed(2)));
      }

      // If backend returned authoritative pending total, prefer it
      if (backendPendingTotal !== null) {
        setRetroPendingTotal(Number(backendPendingTotal));
      }

      // reset editor
      setEditingRetro(false);
      setRetroAmount("");
      setRetroDescription("");
      setRetroEffectiveDate("");

      // notify app to refresh authoritative payroll row
      window.dispatchEvent(new CustomEvent("payroll:refresh", {
        detail: { employee_id: payroll.employee_id }
      }));
    } else {
      Swal.fire("Failed", data.message || "Could not save retro adjustment.", "error");
    }
  } catch (err) {
    console.error("Error saving retro adjustment:", err);
    Swal.fire("Error", "Network or server error when saving retro adjustment.", "error");
  } finally {
    setSavingRetro(false);
  }
};


  // ---- NEW: delete retro (permanent) ----
  const deleteRetro = async (retro_id, status = "pending") => {
    // stronger warning when the row is already applied
    const appliedWarning = String(status).toLowerCase() === "applied"
      ? "This retro was already applied to payroll. Deleting it will permanently remove the record and may affect payroll history. Are you sure?"
      : "This will permanently delete the retro adjustment. Are you sure?";

    const ok = await Swal.fire({
      title: "Delete retro adjustment?",
      text: appliedWarning,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete permanently",
    });
    if (!ok.isConfirmed) return;

    try {
      // send force_delete true — server will delete row regardless of status if permitted
      const res = await axios.post(`${BASE_URL}/payroll/cancel_retro.php`, { retro_id, force_delete: true }, {
        headers: { "Content-Type": "application/json" }
      });

      const data = res.data ?? {};
      if (data.success) {
        Swal.fire("Deleted", data.message || "Retro entry deleted.", "success");

        // remove from local list if present
        setRetroList(prev => prev.filter(r => String(r.retro_id) !== String(retro_id)));

        // update totals from authoritative response if available, otherwise re-fetch
        if (typeof data.total_pending !== "undefined") {
          setRetroPendingTotal(Number(data.total_pending));
        }
        if (typeof data.total_applied !== "undefined") {
          setRetroAppliedTotal(Number(data.total_applied));
        }

        // conservative: re-fetch to ensure full sync
        fetchPendingRetro();

        window.dispatchEvent(new CustomEvent("payroll:refresh", {
          detail: { employee_id: payroll.employee_id }
        }));
      } else {
        // if server responded but flagged no support for force delete or failed, fallback to refresh
        window.dispatchEvent(new CustomEvent("payroll:refresh", {
          detail: { employee_id: payroll.employee_id }
        }));
        Swal.fire("Failed", data.message || "Could not delete retro adjustment.", "error");
      }
    } catch (err) {
      console.error("Failed to delete retro:", err);
      // fallback: still trigger refresh so server can reconcile
      window.dispatchEvent(new CustomEvent("payroll:refresh", {
        detail: { employee_id: payroll.employee_id }
      }));
      Swal.fire("Error", "Network error while deleting retro adjustment.", "error");
    }
  };

  // ✅ Calculate paid leave days
  const totalPaidLeave = Array.isArray(payroll.leaves)
    ? payroll.leaves
        .filter((leave) => leave.is_paid)
        .reduce((total, leave) => total + Number(leave.leave_days_cutoff || 0), 0)
    : 0;

  // holiday values from backend (safe fallbacks)
  const holidayList = Array.isArray(payroll.holidays) ? payroll.holidays : [];
  const totalHolidayCount = Number(payroll.holiday_count ?? holidayList.length ?? 0);
  const holidayTotalMultiplier = Number(payroll.holiday_total_default_multiplier ?? 0);

  // --- IMPORTANT CHANGE: include holiday days in the Total (Credit) calculation ---
  const totalEarning = (totalDays + totalOvertime + totalPaidLeave + totalHolidayCount).toFixed(2);

  // -------------------------------------
  return (
      <div className="w-full max-w-3xl p-6 mx-auto bg-white shadow-md rounded-2xl">
      <h2 className="pb-3 mb-4 text-xl font-semibold text-gray-800 border-b">
        Earnings Summary
      </h2>

      {/* Earnings Info */}
      <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        {/* Labels */}
        <div className="flex flex-col gap-2 font-medium text-gray-600">
          <span className="text-gray-500">Earning</span>
          <span>Total Reg. Days</span>
          <span>Total Rendered Hours</span>

          <span>Overtime</span>
          <span>Holiday</span>
        </div>

        {/* Values */}
        <div className="flex flex-col gap-2">
          <span className="text-gray-500">Days</span>
          <span>{payroll.total_days || '0.0'}</span>
          <span>{payroll.total_rendered_hours || '0.0'}</span>
          <span>{payroll.total_overtime_request || '0.0'}</span>

          {/* show holiday count and multiplier summary */}
          <span>
            {totalHolidayCount > 0 ? (
              <>
                <span className="font-semibold">{totalHolidayCount}</span>
                {holidayTotalMultiplier > 0 && (
                  <small className="ml-2 text-xs text-gray-500">({holidayTotalMultiplier.toFixed(2)}×)</small>
                )}
              </>
            ) : (
              <span className="text-gray-400">0</span>
            )}
          </span>
        </div>

        {/* Dates */}
        <div className="flex flex-col gap-3">
          <span className="font-medium text-gray-500">Period</span>

          {/* Date Range Timeline */}
          <div className="relative flex items-center justify-between px-2 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
            <div className="flex flex-col items-start">
              <span className="text-xs text-gray-500">From</span>
              <span>{formatDate(payroll.date_from)}</span>
            </div>

            {/* Timeline Line */}
            <div className="absolute w-px h-6 -translate-x-1/2 bg-gray-300 left-1/2" />

            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500">Until</span>
              <span>{formatDate(payroll.date_until)}</span>
            </div>
          </div>

          {/* Overtime Dates */}
          <div className="px-2 py-1 mt-1 text-xs text-gray-600 rounded-md bg-gray-50">
            <span className="block mb-1 font-medium text-gray-500">Overtime Dates</span>
            {payroll.overtime_dates?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {payroll.overtime_dates.map((date, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 rounded-full"
                  >
                    {date}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-gray-400">No Overtime</div>
            )}
          </div>
        </div>

      </div>

{/* Leave Summary */}
   {Array.isArray(payroll.leaves) && (
        <div className="mt-6">
          <button
            onClick={() => setShowLeaves(!showLeaves)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <span>Paid Leave Summary ({totalPaidLeave})</span>
            <span className={`transform transition-transform ${showLeaves ? "rotate-180" : "rotate-0"}`}>
              ▼
            </span>
          </button>

          {showLeaves && (
            <div className="p-3 mt-2 rounded-lg shadow-sm bg-gray-50">
              <div className="flex justify-between pb-2 mb-2 text-sm font-medium text-gray-800 border-b">
                <span>Total Paid Leave:</span>
                <span>{totalPaidLeave}</span>
              </div>

              {/* ✅ Scrollable container */}
              <div className="pr-1 space-y-2 overflow-y-auto max-h-40">
                {payroll.leaves
                  .filter((leave) => leave.is_paid)
                  .map((leave, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 text-xs text-gray-700 bg-white rounded-md shadow-sm sm:text-sm"
                    >
                      <span className="truncate">{leave.leave_type}</span>
                      <span className="font-medium">{leave.leave_days_cutoff}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

{/* Holiday Summary (NEW) */}
      {holidayList.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowHolidays(!showHolidays)}
            className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <span>Holiday Summary ({totalHolidayCount})</span>
            <span className={`transform transition-transform ${showHolidays ? "rotate-180" : "rotate-0"}`}>
              ▼
            </span>
          </button>

          {showHolidays && (
            <div className="p-3 mt-2 rounded-lg shadow-sm bg-gray-50">
              <div className="flex justify-between pb-2 mb-2 text-sm font-medium text-gray-800 border-b">
                <span>Total Holiday Days:</span>
                <span>{totalHolidayCount}</span>
              </div>

              {/* show multiplier total if present */}
              <div className="flex items-center justify-between pb-2 mb-2 text-sm text-gray-700">
                <span>Holiday Multiplier Total:</span>
                <span className="font-medium">{holidayTotalMultiplier.toFixed(2)}</span>
              </div>

              {/* Scrollable list of holidays */}
              <div className="pr-1 space-y-2 overflow-y-auto max-h-40">
                {holidayList.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 p-2 text-xs text-gray-700 bg-white rounded-md shadow-sm sm:text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{h.name}</span>
                      <span className="text-xs text-gray-500">{formatDate(h.holiday_date)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-3">
                        <span>Type: <strong className="ml-1">{h.holiday_type ?? 'Regular'}</strong></span>
                        <span>Recurring: <strong className="ml-1">{h.is_recurring ? 'Yes' : 'No'}</strong></span>
                      </div>

                      <div className="text-right">
                        <div>Default ×: <strong>{Number(h.default_multiplier || 1).toFixed(2)}</strong></div>
                        <div>OT ×: <strong>{h.ot_multiplier ? Number(h.ot_multiplier).toFixed(2) : '-'}</strong></div>
                      </div>
                    </div>

                    {h.extended_until && (
                      <div className="text-[11px] text-gray-500">
                        Extended Until: {formatDate(h.extended_until)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )} 

      {/* ------------------ NEW: Retro block ------------------ */}
      <div className="mt-6">
        {!editingRetro ? (
          <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
            <div>
              <div className="text-xs text-gray-500">Retro Adjustments</div>
              <div className="text-sm font-medium">
                <span className="mr-3">Pending: ₱{Number(retroPendingTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span>Applied: ₱{Number(retroAppliedTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-xs text-gray-500">
                {retroList.length > 0 ? `${retroList.length} adjustments (pending+applied)` : "No retro adjustments"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingRetro(true);
                }}
                className="px-3 py-1 text-xs text-white rounded bg-amber-600"
              >
                Add Retro
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2 rounded-lg bg-gray-50">
            <Box sx={{ width: '100%' }}>
              <Grid container direction="column" spacing={2}>
                <Grid item sx={{ width: '100%' }}>
                  <TextField
                    label="Amount (₱)"
                    type="number"
                    inputProps={{ step: "0.01" }}
                    value={retroAmount ?? ''}
                    onChange={(e) => setRetroAmount(e.target.value)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    aria-label="Retro amount"
                  />
                </Grid>

                <Grid item sx={{ width: '100%' }}>
                  <TextField
                    label="Description (required)"
                    value={retroDescription}
                    onChange={(e) => setRetroDescription(e.target.value)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="e.g. Retro pay for Sept rate change"
                    multiline
                    rows={2}
                    aria-label="Retro description"
                  />
                </Grid>

                {/* NEW: Effective Date picker */}
                <Grid item sx={{ width: '100%' }}>
                  <TextField
                    label="Effective Date (optional)"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={retroEffectiveDate || ''}
                    onChange={(e) => setRetroEffectiveDate(e.target.value)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    aria-label="Retro effective date"
                  />
                </Grid>
              </Grid>
            </Box>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setRetroAmount("");
                  setRetroDescription("");
                  setRetroEffectiveDate("");
                  setEditingRetro(false);
                }}
                disabled={savingRetro}
                className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded"
              >
                Cancel
              </button>

              <button
                onClick={saveRetro}
                disabled={savingRetro}
                className="px-3 py-1 text-xs text-white bg-green-600 rounded"
              >
                {savingRetro ? "Saving..." : "Save Retro"}
              </button>
            </div>
          </div>
        )}

        {/* Retro list (pending + applied) */}
        <div className="p-2 mt-2 bg-white rounded shadow-sm">
          {loadingRetro ? (
            <div className="text-xs text-gray-500">Loading retro adjustments…</div>
          ) : retroList.length > 0 ? (
            <div className="space-y-2">
              {retroList.map((r) => {
                const isPending = String(r.status).toLowerCase() === "pending";
                const isApplied = String(r.status).toLowerCase() === "applied";
                return (
                  <div key={r.retro_id} className="flex items-center justify-between p-2 text-xs rounded bg-gray-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{r.description}</div>
                        {isPending && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
                        )}
                        {isApplied && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-800">Applied</span>
                        )}
                      </div>
                      <div className="text-gray-500">
                        {r.effective_date ?? '-'} {r.applied_in_payroll_id ? ` • payroll #${r.applied_in_payroll_id}` : ''}
                      </div>
                      {isApplied && r.applied_at && (
                        <div className="text-[11px] text-gray-500">Applied at: {r.applied_at}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">₱{Number(r.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>

                      {/* Always show Delete (permanent). deleteRetro will send force_delete=true to backend */}
                      <button
                        onClick={() => deleteRetro(r.retro_id, r.status)}
                        className="px-2 py-1 text-[11px] text-red-600 bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400">No retro adjustments.</div>
          )}
        </div>
      </div>
      {/* ------------------ end retro block ------------------ */}

      {/* ------------------ NEW: Reward block ------------------ */}
      <div className="mt-6">
        {!editingReward ? (
          <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
            <div>
              <div className="text-xs text-gray-500">Allowance</div>
              <div className="text-sm font-medium">
                ₱{Number(rewardTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500">
                {Array.isArray(rewardList) && rewardList.length > 0 ? `${rewardList.length} journal entries` : "No reward journal entries"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingReward(true);
                }}
                // disabled/styled guard
                disabled={!eligibleForReward}
                title={!eligibleForReward ? 'Only Regular employees with at least 8 rendered hours are eligible' : 'Add reward'}
                className={`px-3 py-1 text-xs text-white rounded ${eligibleForReward ? 'bg-indigo-600' : 'bg-gray-300 cursor-not-allowed'}`}
              >
                Add Reward
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2 rounded-lg bg-gray-50">
            <Box sx={{ width: '100%' }}>
              <Grid container direction="column" spacing={2}>
                <Grid item sx={{ width: '100%' }}>
                  <TextField
                    label="Amount (₱)"
                    type="number"
                    inputProps={{ step: "0.01", min: 0 }}
                    value={rewardAmount ?? ''}
                    onChange={(e) => setRewardAmount(e.target.value)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    aria-label="Reward amount"
                  />
                </Grid>

                <Grid item sx={{ width: '100%' }}>
                  <TextField
                    label="Description (required)"
                    value={rewardDescription}
                    onChange={(e) => setRewardDescription(e.target.value)}
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="e.g. Reward for meeting hours"
                    multiline
                    rows={2}
                    aria-label="Reward description"
                  />
                </Grid>
              </Grid>
            </Box>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setRewardAmount(payroll?.total_rewards ? Number(payroll.total_rewards) : 0);
                  setRewardDescription("");
                  setEditingReward(false);
                }}
                disabled={rewardSaving}
                className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded"
              >
                Cancel
              </button>

              <button
                onClick={saveReward}
                disabled={rewardSaving || !eligibleForReward}
                title={!eligibleForReward ? 'Not eligible to save reward' : 'Save reward'}
                className={`px-3 py-1 text-xs text-white ${(!eligibleForReward || rewardSaving) ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600' } rounded`}
              >
                {rewardSaving ? "Saving..." : "Save Reward"}
              </button>
            </div>
          </div>
        )}

        {/* Reward list (journal entries) */}
        <div className="p-2 mt-2 bg-white rounded shadow-sm">
          {Array.isArray(rewardList) && rewardList.length > 0 ? (
            <div className="space-y-2">
              {rewardList.map((r, idx) => {
                const amount = Number(r.amount || r.applied_amount || 0);
                const desc = r.description || r.name || `Reward #${r.journal_id ?? idx}`;
                return (
                  <div key={r.journal_id ?? idx} className="flex items-center justify-between p-2 text-xs rounded bg-gray-50">
                    <div>
                      <div className="font-medium">{desc}</div>
                      <div className="text-gray-500 text-[11px]">
                        {r.entry_date ? formatDate(r.entry_date) : (r.payroll_cutoff ? formatDate(r.payroll_cutoff) : '-')}
                        {r.origin ? ` • ${r.origin}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">₱{amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <button onClick={() => cancelReward(r.journal_id)} className="px-2 py-1 text-[11px] text-red-600 bg-red-50 rounded">Cancel</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-400">No reward entries.</div>
          )}
        </div>
      </div>
      {/* ------------------ end reward block ------------------ */}

      {/* ------------------ NEW: Incentive block ------------------ */}
      <div className="mt-6">
        {!editingIncentive ? (
          <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
            <div>
              <div className="text-xs text-gray-500">Incentives</div>
              <div className="text-sm font-medium">
                ₱{(Number(payroll?.total_incentives) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500">{payroll?.incentive_remarks ? payroll.incentive_remarks : "No remarks"}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditingIncentive(true)}
                className="px-3 py-1 text-xs text-white bg-indigo-600 rounded"
              >
                Edit Incentive
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-2 rounded-lg bg-gray-50">
{/* Column layout to avoid overlapping */}
{/* --- Incentive inputs (MUI column, flexible & responsive) --- */}
<Box sx={{ width: '100%' }}>
  <Grid container direction="column" spacing={2}>
    <Grid item sx={{ width: '100%' }}>
      <TextField
        label="Amount"
        type="number"
        inputProps={{ step: "0.01", min: 0 }}
        value={incentiveAmount ?? ''}
        onChange={(e) => setIncentiveAmount(e.target.value)}
        fullWidth
        size="small"
        variant="outlined"
        aria-label="Incentive amount"
      />
    </Grid>

    <Grid item sx={{ width: '100%' }}>
      <TextField
        label="Remarks (optional)"
        value={incentiveRemarks}
        onChange={(e) => setIncentiveRemarks(e.target.value)}
        fullWidth
        size="small"
        variant="outlined"
        placeholder="e.g. Performance bonus"
        multiline
        rows={2}
        aria-label="Incentive remarks"
      />
    </Grid>
  </Grid>
</Box>


            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  // reset to incoming payroll values
                  setIncentiveAmount(payroll?.total_incentives ? Number(payroll.total_incentives) : 0);
                  setIncentiveRemarks(payroll?.incentive_remarks || "");
                  setEditingIncentive(false);
                }}
                disabled={savingIncentive}
                className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded"
              >
                Cancel
              </button>

              <button
                onClick={saveIncentive}
                disabled={savingIncentive}
                className="px-3 py-1 text-xs text-white bg-green-600 rounded"
              >
                {savingIncentive ? "Saving..." : "Save Incentive"}
              </button>
            </div>
          </div>
        )}
      </div>
      {/* ------------------ end incentive block ------------------ */}

      {/* Footer */}
      <div className="flex flex-col items-start justify-between pt-4 mt-6 border-t sm:flex-row sm:items-center">
        <span className="text-base font-semibold text-gray-800">
          Total (Credit)
        </span>
        <span className="mt-1 text-lg font-bold text-blue-600 sm:mt-0">
          {totalEarning}
        </span>
      </div>
    </div>
  );
};

export default PayrollSummary;

 



// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import Swal from "sweetalert2";
// import BASE_URL from "../../../backend/server/config";
// import Box from '@mui/material/Box';
// import Grid from '@mui/material/Grid';
// import TextField from '@mui/material/TextField';


// const PayrollSummary = ({ payroll, formatDate }) => {
//   if (!payroll) return null;

//   const totalDays = parseFloat(payroll.total_days) || 0;
//   const totalOvertime = parseFloat(payroll.total_overtime_request) || 0;
//   const [showLeaves, setShowLeaves] = useState(false);
//   const [showHolidays, setShowHolidays] = useState(false);

//   // ---- NEW: incentive state ----
//   const [editingIncentive, setEditingIncentive] = useState(false);
//   const [incentiveAmount, setIncentiveAmount] = useState(
//     payroll?.total_incentives ? Number(payroll.total_incentives) : 0
//   );
//   const [incentiveRemarks, setIncentiveRemarks] = useState(
//     payroll?.incentive_remarks || ""
//   );
//   const [savingIncentive, setSavingIncentive] = useState(false);

//   // ---- NEW: retro state ----
//   const [retroList, setRetroList] = useState([]); // pending+applied retro rows
//   const [retroPendingTotal, setRetroPendingTotal] = useState(0);
//   const [retroAppliedTotal, setRetroAppliedTotal] = useState(0);
//   const [editingRetro, setEditingRetro] = useState(false);
//   const [retroAmount, setRetroAmount] = useState("");
//   const [retroDescription, setRetroDescription] = useState("");
//   const [retroEffectiveDate, setRetroEffectiveDate] = useState(""); // <-- date picker state
//   const [savingRetro, setSavingRetro] = useState(false);
//   const [loadingRetro, setLoadingRetro] = useState(false);

//   // keep inputs in sync when payroll prop changes
//   useEffect(() => {
//     setIncentiveAmount(payroll?.total_incentives ? Number(payroll.total_incentives) : 0);
//     setIncentiveRemarks(payroll?.incentive_remarks || "");
//     // clear local retro inputs when payroll changes
//     setRetroAmount("");
//     setRetroDescription("");
//     setRetroEffectiveDate("");
//     // fetch retro rows for this employee/payroll cutoff
//     fetchPendingRetro();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [payroll?.payroll_id, payroll?.total_incentives, payroll?.incentive_remarks]);

//   // -------------------------------

//   // fetch pending/applied retro adjustments for the employee (defensive)
//   const fetchPendingRetro = async () => {
//     if (!payroll?.employee_id) return;
//     setLoadingRetro(true);
//     try {
//       const url = `${BASE_URL}/payroll/get_retro_for_employee.php`;
//       const params = {
//         employee_id: payroll.employee_id,
//         date_until: payroll.date_until || null
//       };
//       const res = await axios.get(url, { params });
//       const body = res.data ?? {};

//       if (body.success) {
//         const rows = Array.isArray(body.data) ? body.data : [];

//         // compute totals if API provided them; otherwise compute locally
//         const totalPending = typeof body.total_pending !== "undefined"
//           ? Number(body.total_pending)
//           : rows.reduce((s, r) => s + (r.status === "pending" ? (parseFloat(r.amount) || 0) : 0), 0);

//         const totalApplied = typeof body.total_applied !== "undefined"
//           ? Number(body.total_applied)
//           : rows.reduce((s, r) => s + (r.status === "applied" ? (parseFloat(r.amount) || 0) : 0), 0);

//         setRetroList(rows);
//         setRetroPendingTotal(totalPending);
//         setRetroAppliedTotal(totalApplied);
//       } else {
//         // fallback: read any retro fields embedded in payroll
//         const fallbackRows = Array.isArray(payroll.retro_entries) ? payroll.retro_entries : [];
//         const fallbackPending = parseFloat(payroll.total_retro_pending || payroll.total_retro || 0) || 0;
//         const fallbackApplied = parseFloat(payroll.total_retro_applied || 0) || 0;

//         setRetroList(fallbackRows);
//         setRetroPendingTotal(fallbackPending);
//         setRetroAppliedTotal(fallbackApplied);
//       }
//     } catch (err) {
//       console.warn("Failed to fetch retro adjustments:", err);
//       const fallbackRows = Array.isArray(payroll.retro_entries) ? payroll.retro_entries : [];
//       const fallbackPending = parseFloat(payroll.total_retro_pending || payroll.total_retro || 0) || 0;
//       const fallbackApplied = parseFloat(payroll.total_retro_applied || 0) || 0;
//       setRetroList(fallbackRows);
//       setRetroPendingTotal(fallbackPending);
//       setRetroAppliedTotal(fallbackApplied);
//     } finally {
//       setLoadingRetro(false);
//     }
//   };

//   // -------------------------------
//   // incentive save handler (unchanged except safe dispatch)
//   const saveIncentive = async () => {
//     const parsed = Number(incentiveAmount) || 0;
//     if (parsed < 0) {
//       Swal.fire("Invalid amount", "Incentive cannot be negative.", "warning");
//       return;
//     }

//     setSavingIncentive(true);
//     Swal.fire({
//       title: "Saving incentive...",
//       allowOutsideClick: false,
//       didOpen: () => Swal.showLoading()
//     });

//     try {
//       const payload = {
//         payroll_id: payroll.payroll_id,
//         total_incentives: parsed,
//         incentive_remarks: incentiveRemarks,
//         payroll_type: payroll.payroll_type ?? null,
//         contribution_deduction_type: payroll.contribution_deduction_type ?? null
//       };

//       const res = await axios.put(`${BASE_URL}/payroll/update_payroll.php`, payload, {
//         headers: { "Content-Type": "application/json" }
//       });

//       const data = res.data ?? {};

//       if (data.success) {
//         Swal.fire("Saved", "Incentive saved successfully.", "success");

//         // refresh payroll row in the app
//         window.dispatchEvent(new CustomEvent("payroll:refresh", {
//           detail: { employee_id: payroll.employee_id }
//         }));

//         setEditingIncentive(false);
//       } else {
//         Swal.fire("Failed", data.message || "Could not save incentive.", "error");
//       }
//     } catch (err) {
//       console.error("Error saving incentive:", err);
//       Swal.fire("Error", "Network or server error when saving incentive.", "error");
//     } finally {
//       setSavingIncentive(false);
//     }
//   };
//   // -------------------------------------

//   // ---- NEW: save retro handler ----
//   const saveRetro = async () => {
//     const parsed = Number(retroAmount) || 0;
//     if (parsed === 0) {
//       Swal.fire("Invalid amount", "Please enter a non-zero retro amount.", "warning");
//       return;
//     }
//     if (!retroDescription || String(retroDescription).trim().length < 3) {
//       Swal.fire("Invalid description", "Please provide a short description for audit.", "warning");
//       return;
//     }
//     // validate effective date (if provided)
//     if (retroEffectiveDate && isNaN(new Date(retroEffectiveDate).getTime())) {
//       Swal.fire("Invalid date", "Please provide a valid Effective Date (YYYY-MM-DD).", "warning");
//       return;
//     }

//     setSavingRetro(true);
//     Swal.fire({
//       title: "Saving retro adjustment...",
//       allowOutsideClick: false,
//       didOpen: () => Swal.showLoading()
//     });

//     try {
//       // We reuse update_payroll.php like incentives: backend accepts retro_amount & retro_description & retro_effective_date
//       const payload = {
//         payroll_id: payroll.payroll_id,
//         retro_amount: parsed,
//         retro_description: String(retroDescription).trim(),
//         retro_effective_date: retroEffectiveDate || null,
//         payroll_type: payroll.payroll_type ?? null,
//         contribution_deduction_type: payroll.contribution_deduction_type ?? null
//       };

//       const res = await axios.put(`${BASE_URL}/payroll/update_payroll.php`, payload, {
//         headers: { "Content-Type": "application/json" }
//       });

//       const data = res.data ?? {};

//       if (data.success) {
//         // If backend returned that retro was applied immediately, we expect the GET endpoint to include it.
//         Swal.fire("Saved", (data.data?.retro_applied ? "Retro saved and applied." : "Retro saved and queued."), "success");

//         // refresh payroll list / single payroll row
//         window.dispatchEvent(new CustomEvent("payroll:refresh", {
//           detail: { employee_id: payroll.employee_id }
//         }));

//         // reset local UI
//         setRetroAmount("");
//         setRetroDescription("");
//         setRetroEffectiveDate("");
//         setEditingRetro(false);

//         // refresh list (will show applied entries as well)
//         fetchPendingRetro();
//       } else {
//         Swal.fire("Failed", data.message || "Could not save retro.", "error");
//       }
//     } catch (err) {
//       console.error("Error saving retro:", err);
//       Swal.fire("Error", "Network or server error when saving retro.", "error");
//     } finally {
//       setSavingRetro(false);
//     }
//   };

//   // ---- NEW: cancel a pending retro (optimistic) ----
//   const cancelRetro = async (retro_id) => {
//     if (!retro_id) return;
//     const ok = await Swal.fire({
//       title: "Cancel retro?",
//       text: "This will mark the pending retro as cancelled.",
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, cancel",
//     });
//     if (!ok.isConfirmed) return;

//     try {
//       const res = await axios.put(`${BASE_URL}/payroll/update_payroll.php`, {
//         payroll_id: payroll.payroll_id,
//         cancel_retro_id: retro_id,
//         payroll_type: payroll.payroll_type ?? null,
//         contribution_deduction_type: payroll.contribution_deduction_type ?? null
//       }, {
//         headers: { "Content-Type": "application/json" }
//       });

//       const data = res.data ?? {};
//       if (data.success) {
//         Swal.fire("Cancelled", "Retro adjustment cancelled.", "success");
//         fetchPendingRetro();
//         window.dispatchEvent(new CustomEvent("payroll:refresh", {
//           detail: { employee_id: payroll.employee_id }
//         }));
//       } else {
//         Swal.fire("Failed", data.message || "Could not cancel retro.", "error");
//       }
//     } catch (err) {
//       console.error("Failed to cancel retro:", err);
//       Swal.fire("Error", "Network error while cancelling retro.", "error");
//     }
//   };

//   // -------------------------------

//   // ✅ Calculate paid leave days
//   const totalPaidLeave = Array.isArray(payroll.leaves)
//     ? payroll.leaves
//         .filter((leave) => leave.is_paid)
//         .reduce((total, leave) => total + Number(leave.leave_days_cutoff || 0), 0)
//     : 0;

//   // holiday values from backend (safe fallbacks)
//   const holidayList = Array.isArray(payroll.holidays) ? payroll.holidays : [];
//   const totalHolidayCount = Number(payroll.holiday_count ?? holidayList.length ?? 0);
//   const holidayTotalMultiplier = Number(payroll.holiday_total_default_multiplier ?? 0);

//   // --- IMPORTANT CHANGE: include holiday days in the Total (Credit) calculation ---
//   const totalEarning = (totalDays + totalOvertime + totalPaidLeave + totalHolidayCount).toFixed(2);

//   // -------------------------------------
//   return (
//       <div className="w-full max-w-3xl p-6 mx-auto bg-white shadow-md rounded-2xl">
//       <h2 className="pb-3 mb-4 text-xl font-semibold text-gray-800 border-b">
//         Earnings Summary
//       </h2>

//       {/* Earnings Info */}
//       <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
//         {/* Labels */}
//         <div className="flex flex-col gap-2 font-medium text-gray-600">
//           <span className="text-gray-500">Earning</span>
//           <span>Total Reg. Days</span>
//           <span>Total Rendered Hours</span>

//           <span>Overtime</span>
//           <span>Holiday</span>
//         </div>

//         {/* Values */}
//         <div className="flex flex-col gap-2">
//           <span className="text-gray-500">Days</span>
//           <span>{payroll.total_days || '0.0'}</span>
//           <span>{payroll.total_rendered_hours || '0.0'}</span>
//           <span>{payroll.total_overtime_request || '0.0'}</span>

//           {/* show holiday count and multiplier summary */}
//           <span>
//             {totalHolidayCount > 0 ? (
//               <>
//                 <span className="font-semibold">{totalHolidayCount}</span>
//                 {holidayTotalMultiplier > 0 && (
//                   <small className="ml-2 text-xs text-gray-500">({holidayTotalMultiplier.toFixed(2)}×)</small>
//                 )}
//               </>
//             ) : (
//               <span className="text-gray-400">0</span>
//             )}
//           </span>
//         </div>

//         {/* Dates */}
//         <div className="flex flex-col gap-3">
//           <span className="font-medium text-gray-500">Period</span>

//           {/* Date Range Timeline */}
//           <div className="relative flex items-center justify-between px-2 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
//             <div className="flex flex-col items-start">
//               <span className="text-xs text-gray-500">From</span>
//               <span>{formatDate(payroll.date_from)}</span>
//             </div>

//             {/* Timeline Line */}
//             <div className="absolute w-px h-6 -translate-x-1/2 bg-gray-300 left-1/2" />

//             <div className="flex flex-col items-end">
//               <span className="text-xs text-gray-500">Until</span>
//               <span>{formatDate(payroll.date_until)}</span>
//             </div>
//           </div>

//           {/* Overtime Dates */}
//           <div className="px-2 py-1 mt-1 text-xs text-gray-600 rounded-md bg-gray-50">
//             <span className="block mb-1 font-medium text-gray-500">Overtime Dates</span>
//             {payroll.overtime_dates?.length > 0 ? (
//               <div className="flex flex-wrap gap-2">
//                 {payroll.overtime_dates.map((date, idx) => (
//                   <span
//                     key={idx}
//                     className="px-2 py-1 text-[11px] font-medium bg-blue-100 text-blue-700 rounded-full"
//                   >
//                     {date}
//                   </span>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-gray-400">No Overtime</div>
//             )}
//           </div>
//         </div>

//       </div>

// {/* Leave Summary */}
//    {Array.isArray(payroll.leaves) && (
//         <div className="mt-6">
//           <button
//             onClick={() => setShowLeaves(!showLeaves)}
//             className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
//           >
//             <span>Paid Leave Summary ({totalPaidLeave})</span>
//             <span className={`transform transition-transform ${showLeaves ? "rotate-180" : "rotate-0"}`}>
//               ▼
//             </span>
//           </button>

//           {showLeaves && (
//             <div className="p-3 mt-2 rounded-lg shadow-sm bg-gray-50">
//               <div className="flex justify-between pb-2 mb-2 text-sm font-medium text-gray-800 border-b">
//                 <span>Total Paid Leave:</span>
//                 <span>{totalPaidLeave}</span>
//               </div>

//               {/* ✅ Scrollable container */}
//               <div className="pr-1 space-y-2 overflow-y-auto max-h-40">
//                 {payroll.leaves
//                   .filter((leave) => leave.is_paid)
//                   .map((leave, index) => (
//                     <div
//                       key={index}
//                       className="flex items-center justify-between p-2 text-xs text-gray-700 bg-white rounded-md shadow-sm sm:text-sm"
//                     >
//                       <span className="truncate">{leave.leave_type}</span>
//                       <span className="font-medium">{leave.leave_days_cutoff}</span>
//                     </div>
//                   ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

// {/* Holiday Summary (NEW) */}
//       {holidayList.length > 0 && (
//         <div className="mt-6">
//           <button
//             onClick={() => setShowHolidays(!showHolidays)}
//             className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
//           >
//             <span>Holiday Summary ({totalHolidayCount})</span>
//             <span className={`transform transition-transform ${showHolidays ? "rotate-180" : "rotate-0"}`}>
//               ▼
//             </span>
//           </button>

//           {showHolidays && (
//             <div className="p-3 mt-2 rounded-lg shadow-sm bg-gray-50">
//               <div className="flex justify-between pb-2 mb-2 text-sm font-medium text-gray-800 border-b">
//                 <span>Total Holiday Days:</span>
//                 <span>{totalHolidayCount}</span>
//               </div>

//               {/* show multiplier total if present */}
//               <div className="flex items-center justify-between pb-2 mb-2 text-sm text-gray-700">
//                 <span>Holiday Multiplier Total:</span>
//                 <span className="font-medium">{holidayTotalMultiplier.toFixed(2)}</span>
//               </div>

//               {/* Scrollable list of holidays */}
//               <div className="pr-1 space-y-2 overflow-y-auto max-h-40">
//                 {holidayList.map((h, idx) => (
//                   <div
//                     key={idx}
//                     className="flex flex-col gap-1 p-2 text-xs text-gray-700 bg-white rounded-md shadow-sm sm:text-sm"
//                   >
//                     <div className="flex items-center justify-between">
//                       <span className="font-medium truncate">{h.name}</span>
//                       <span className="text-xs text-gray-500">{formatDate(h.holiday_date)}</span>
//                     </div>

//                     <div className="flex items-center justify-between text-xs text-gray-600">
//                       <div className="flex items-center gap-3">
//                         <span>Type: <strong className="ml-1">{h.holiday_type ?? 'Regular'}</strong></span>
//                         <span>Recurring: <strong className="ml-1">{h.is_recurring ? 'Yes' : 'No'}</strong></span>
//                       </div>

//                       <div className="text-right">
//                         <div>Default ×: <strong>{Number(h.default_multiplier || 1).toFixed(2)}</strong></div>
//                         <div>OT ×: <strong>{h.ot_multiplier ? Number(h.ot_multiplier).toFixed(2) : '-'}</strong></div>
//                       </div>
//                     </div>

//                     {h.extended_until && (
//                       <div className="text-[11px] text-gray-500">
//                         Extended Until: {formatDate(h.extended_until)}
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ------------------ NEW: Retro block ------------------ */}
//       <div className="mt-6">
//         {!editingRetro ? (
//           <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
//             <div>
//               <div className="text-xs text-gray-500">Retro Adjustments</div>
//               <div className="text-sm font-medium">
//                 <span className="mr-3">Pending: ₱{Number(retroPendingTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
//                 <span>Applied: ₱{Number(retroAppliedTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
//               </div>
//               <div className="text-xs text-gray-500">
//                 {retroList.length > 0 ? `${retroList.length} adjustments (pending+applied)` : "No retro adjustments"}
//               </div>
//             </div>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => {
//                   setEditingRetro(true);
//                 }}
//                 className="px-3 py-1 text-xs text-white rounded bg-amber-600"
//               >
//                 Add Retro
//               </button>
//             </div>
//           </div>
//         ) : (
//           <div className="p-3 space-y-2 rounded-lg bg-gray-50">
//             <Box sx={{ width: '100%' }}>
//               <Grid container direction="column" spacing={2}>
//                 <Grid item sx={{ width: '100%' }}>
//                   <TextField
//                     label="Amount (₱)"
//                     type="number"
//                     inputProps={{ step: "0.01" }}
//                     value={retroAmount ?? ''}
//                     onChange={(e) => setRetroAmount(e.target.value)}
//                     fullWidth
//                     size="small"
//                     variant="outlined"
//                     aria-label="Retro amount"
//                   />
//                 </Grid>

//                 <Grid item sx={{ width: '100%' }}>
//                   <TextField
//                     label="Description (required)"
//                     value={retroDescription}
//                     onChange={(e) => setRetroDescription(e.target.value)}
//                     fullWidth
//                     size="small"
//                     variant="outlined"
//                     placeholder="e.g. Retro pay for Sept rate change"
//                     multiline
//                     rows={2}
//                     aria-label="Retro description"
//                   />
//                 </Grid>

//                 {/* NEW: Effective Date picker */}
//                 <Grid item sx={{ width: '100%' }}>
//                   <TextField
//                     label="Effective Date (optional)"
//                     type="date"
//                     InputLabelProps={{ shrink: true }}
//                     value={retroEffectiveDate || ''}
//                     onChange={(e) => setRetroEffectiveDate(e.target.value)}
//                     fullWidth
//                     size="small"
//                     variant="outlined"
//                     aria-label="Retro effective date"
//                   />
//                 </Grid>
//               </Grid>
//             </Box>

//             <div className="flex items-center justify-end gap-2">
//               <button
//                 onClick={() => {
//                   setRetroAmount("");
//                   setRetroDescription("");
//                   setRetroEffectiveDate("");
//                   setEditingRetro(false);
//                 }}
//                 disabled={savingRetro}
//                 className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded"
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={saveRetro}
//                 disabled={savingRetro}
//                 className="px-3 py-1 text-xs text-white bg-green-600 rounded"
//               >
//                 {savingRetro ? "Saving..." : "Save Retro"}
//               </button>
//             </div>
//           </div>
//         )}

//         {/* Retro list (pending + applied) */}
//         <div className="p-2 mt-2 bg-white rounded shadow-sm">
//           {loadingRetro ? (
//             <div className="text-xs text-gray-500">Loading retro adjustments…</div>
//           ) : retroList.length > 0 ? (
//             <div className="space-y-2">
//               {retroList.map((r) => {
//                 const isPending = String(r.status).toLowerCase() === "pending";
//                 const isApplied = String(r.status).toLowerCase() === "applied";
//                 return (
//                   <div key={r.retro_id} className="flex items-center justify-between p-2 text-xs rounded bg-gray-50">
//                     <div>
//                       <div className="flex items-center gap-2">
//                         <div className="font-medium">{r.description}</div>
//                         {isPending && (
//                           <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-yellow-100 text-yellow-800">Pending</span>
//                         )}
//                         {isApplied && (
//                           <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-800">Applied</span>
//                         )}
//                       </div>
//                       <div className="text-gray-500">
//                         {r.effective_date ?? '-'} {r.applied_in_payroll_id ? ` • payroll #${r.applied_in_payroll_id}` : ''}
//                       </div>
//                       {isApplied && r.applied_at && (
//                         <div className="text-[11px] text-gray-500">Applied at: {r.applied_at}</div>
//                       )}
//                     </div>
//                     <div className="flex items-center gap-3">
//                       <div className="font-semibold">₱{Number(r.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
//                       {isPending ? (
//                         <button onClick={() => cancelRetro(r.retro_id)} className="px-2 py-1 text-[11px] text-red-600 bg-red-50 rounded">Cancel</button>
//                       ) : (
//                         <div className="text-[11px] text-gray-400 px-2 py-1 rounded">—</div>
//                       )}
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           ) : (
//             <div className="text-xs text-gray-400">No retro adjustments.</div>
//           )}
//         </div>
//       </div>
//       {/* ------------------ end retro block ------------------ */}

//       {/* ------------------ NEW: Incentive block ------------------ */}
//       <div className="mt-6">
//         {!editingIncentive ? (
//           <div className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 rounded-lg bg-gray-50">
//             <div>
//               <div className="text-xs text-gray-500">Incentives</div>
//               <div className="text-sm font-medium">
//                 ₱{(Number(payroll?.total_incentives) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
//               </div>
//               <div className="text-xs text-gray-500">{payroll?.incentive_remarks ? payroll.incentive_remarks : "No remarks"}</div>
//             </div>

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => setEditingIncentive(true)}
//                 className="px-3 py-1 text-xs text-white bg-indigo-600 rounded"
//               >
//                 Edit Incentive
//               </button>
//             </div>
//           </div>
//         ) : (
//           <div className="p-3 space-y-2 rounded-lg bg-gray-50">
// {/* Column layout to avoid overlapping */}
// {/* --- Incentive inputs (MUI column, flexible & responsive) --- */}
// <Box sx={{ width: '100%' }}>
//   <Grid container direction="column" spacing={2}>
//     <Grid item sx={{ width: '100%' }}>
//       <TextField
//         label="Amount"
//         type="number"
//         inputProps={{ step: "0.01", min: 0 }}
//         value={incentiveAmount ?? ''}
//         onChange={(e) => setIncentiveAmount(e.target.value)}
//         fullWidth
//         size="small"
//         variant="outlined"
//         aria-label="Incentive amount"
//       />
//     </Grid>

//     <Grid item sx={{ width: '100%' }}>
//       <TextField
//         label="Remarks (optional)"
//         value={incentiveRemarks}
//         onChange={(e) => setIncentiveRemarks(e.target.value)}
//         fullWidth
//         size="small"
//         variant="outlined"
//         placeholder="e.g. Performance bonus"
//         multiline
//         rows={2}
//         aria-label="Incentive remarks"
//       />
//     </Grid>
//   </Grid>
// </Box>


//             <div className="flex items-center justify-end gap-2">
//               <button
//                 onClick={() => {
//                   // reset to incoming payroll values
//                   setIncentiveAmount(payroll?.total_incentives ? Number(payroll.total_incentives) : 0);
//                   setIncentiveRemarks(payroll?.incentive_remarks || "");
//                   setEditingIncentive(false);
//                 }}
//                 disabled={savingIncentive}
//                 className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded"
//               >
//                 Cancel
//               </button>

//               <button
//                 onClick={saveIncentive}
//                 disabled={savingIncentive}
//                 className="px-3 py-1 text-xs text-white bg-green-600 rounded"
//               >
//                 {savingIncentive ? "Saving..." : "Save Incentive"}
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//       {/* ------------------ end incentive block ------------------ */}

//       {/* Footer */}
//       <div className="flex flex-col items-start justify-between pt-4 mt-6 border-t sm:flex-row sm:items-center">
//         <span className="text-base font-semibold text-gray-800">
//           Total (Credit)
//         </span>
//         <span className="mt-1 text-lg font-bold text-blue-600 sm:mt-0">
//           {totalEarning}
//         </span>
//       </div>
//     </div>
//   );
// };

// export default PayrollSummary;


