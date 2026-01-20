// LoanDetailsMultiApply.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import useLoanJournalAPI from "../../components/loan/loan_hooks/useLoanJournalAPI";
import useLoanAPI from "../../components/loan/loan_hooks/useLoanAPI";
import { Check, X } from "lucide-react";

/**
 * LoanDetailsMultiApply
 *
 * Props:
 *  - loans: array of loan objects (can be full objects coming from payroll.loans)
 *  - payroll: payroll object (used to determine cutoff / default entry_date and deduction type)
 *  - employee_id: optional override employee id
 *  - onApplied(total, appliedLoanIds): callback called after successful apply
 */
export default function LoanDetailsMultiApply({
  loans = [],
  payroll = {},
  employee_id = null,
  onApplied = () => {},
}) {
  const { createJournalEntry } = useLoanJournalAPI();
  const { fetchLoans } = useLoanAPI();

  // Active loans only (balance > 0)
  const activeLoans = useMemo(
    () => (Array.isArray(loans) ? loans.filter((l) => parseFloat(l.balance || 0) > 0) : []),
    [loans]
  );

  // Selected map: loan_id => boolean
  const [selected, setSelected] = useState(() =>
    activeLoans.reduce((acc, l) => ((acc[l.loan_id] = true), acc), {})
  );

  // overrideAmounts: loan_id => string (input)
  const [overrideAmounts, setOverrideAmounts] = useState(() =>
    activeLoans.reduce((acc, l) => {
      acc[l.loan_id] = ""; // empty means "use scheduled"
      return acc;
    }, {})
  );

  // entry date (default to payroll cutoff end)
  const defaultEntryDate = payroll?.date_until ? payroll.date_until.split?.(" ")[0] ?? payroll.date_until : new Date().toISOString().slice(0, 10);
  const [entryDate, setEntryDate] = useState(defaultEntryDate);

  // Re-sync when loans change
  useEffect(() => {
    const sel = {};
    const ov = {};
    activeLoans.forEach((l) => {
      sel[l.loan_id] = true;
      ov[l.loan_id] = "";
    });
    setSelected(sel);
    setOverrideAmounts(ov);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLoans.length]);

  // helper: currency formatting
  const formatPeso = (val) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(Number(val || 0));

  // compute scheduled amount (kept similar logic to your original)
  const perLoanScheduled = (loan) => {
    const payable = parseFloat(loan.final_loan_deduction ?? loan.payable_per_term ?? 0) || 0;
    const sched = (loan.deduction_schedule || "").toLowerCase();
    const payrollType = (payroll.contribution_deduction_type || "").toLowerCase();

    let amount = payable;
    if (sched === "current-payroll") amount = payable;
    else if (sched === "monthly") {
      if (payrollType === "semi-monthly") {
        const cutoffDate = payroll.date_until ? new Date(payroll.date_until) : null;
        const day = cutoffDate ? cutoffDate.getDate() : 31;
        amount = day >= 20 ? payable : 0;
      } else amount = payable;
    } else if (sched === "semi-monthly") {
      amount = payrollType === "semi-monthly" ? payable / 2 : payable;
    } else amount = payable;

    const bal = parseFloat(loan.balance || 0);
    if (amount > bal) amount = bal;
    return Number(amount.toFixed(2));
  };

  // compute included amounts for UI and total
  const computed = useMemo(() => {
    let total = 0;
    const items = activeLoans.map((loan) => {
      const scheduled = perLoanScheduled(loan);
      const ovRaw = overrideAmounts[loan.loan_id];
      const overrideVal = ovRaw === "" || ovRaw === null ? null : Number(ovRaw || 0);
      // if override provided and numeric, use it; otherwise use scheduled
      let used = overrideVal !== null && !isNaN(overrideVal) ? overrideVal : scheduled;
      // clamp to balance
      const bal = parseFloat(loan.balance || 0);
      if (used > bal) used = bal;
      used = Number((used || 0).toFixed(2));
      const isSelected = !!selected[loan.loan_id];
      const included = isSelected ? used : 0;
      if (isSelected) total += included;
      return { loan, scheduled, overrideVal, used, included, isSelected };
    });
    return { items, total: Number(total.toFixed(2)) };
  }, [activeLoans, overrideAmounts, selected, payroll.date_until, payroll.contribution_deduction_type]);

  // toggle select single loan
  const toggle = (loan_id) => setSelected((p) => ({ ...p, [loan_id]: !p[loan_id] }));

  // toggle select all / none
  const toggleAll = () => {
    const allSelected = activeLoans.every((l) => selected[l.loan_id]);
    const next = {};
    activeLoans.forEach((l) => (next[l.loan_id] = !allSelected));
    setSelected(next);
  };

  // change override amount input
  const onOverrideChange = (loan_id, val) => {
    // allow only numbers and dot
    const cleaned = val.replace(/[^\d.]/g, "");
    setOverrideAmounts((p) => ({ ...p, [loan_id]: cleaned }));
  };

  // compose description for journal entry
  const makeDescription = (loan) => {
    const parts = [];
    if (loan.loan_type) parts.push(loan.loan_type.toUpperCase());
    if (loan.description) parts.push(loan.description);
    else if (loan.loan_reference_no) parts.push(loan.loan_reference_no);
    else parts.push(`Loan #${loan.loan_id}`);
    return parts.join(" - ");
  };

  // Apply selected loans: create journal entry per selected loan
  const handleApplySelected = async () => {
    // pick selected loan items
    const toApply = computed.items.filter((it) => it.isSelected && it.used > 0);

    if (!toApply.length) {
      Swal.fire({ icon: "warning", title: "No loans selected", text: "Select at least one loan with an amount greater than 0." });
      return;
    }

    // Validate entry date
    if (!entryDate) {
      Swal.fire({ icon: "warning", title: "Date required", text: "Please pick an entry date." });
      return;
    }

    // Confirm
    const payloadSummary = toApply.map((t) => `${t.loan.loan_type?.toUpperCase() || "LOAN"} #${t.loan.loan_id}: ${formatPeso(t.used)}`).join("<br/>");
    const confirm = await Swal.fire({
      title: "Apply loan deductions?",
      html: `<div style="text-align:left">${payloadSummary}</div><p class="mt-3">This will create one journal payment entry per loan.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, apply",
      focusConfirm: false,
      width: 600,
    });

    if (!confirm.isConfirmed) return;

    // show loading
    Swal.fire({ title: "Applying...", html: "Please wait", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let successCount = 0;
    const appliedIds = [];
    let totalApplied = 0;
    try {
      for (const item of toApply) {
        const loan = item.loan;
        const amount = item.used;
        const payload = {
          loan_id: Number(loan.loan_id),
          employee_id: employee_id || loan.employee_id || payroll.employee_id || null,
          entry_type: "credit",
          amount,
          description: makeDescription(loan),
          entry_date: entryDate,
          origin: "payroll_auto", // optional meta
        };

        // call hook createJournalEntry
        const res = await createJournalEntry(payload);
        // some backends wrap result differently; check common cases:
        const ok = res && (res.success || res.created || res.journal || res.journal_id || (res.data && res.data.success));
        if (ok) {
          successCount++;
          appliedIds.push(loan.loan_id);
          totalApplied += amount;
        } else {
          // If a single one fails, still continue but show warning later
          console.warn("createJournalEntry failed for loan", loan.loan_id, res);
        }
      }

      // refresh loans list (to pick updated balances)
      try { await fetchLoans(); } catch (e) { console.warn("fetchLoans failed after apply:", e); }

      Swal.close();
      if (successCount === toApply.length) {
        Swal.fire({ icon: "success", title: "Applied", html: `${successCount} loan entries applied.`, timer: 1700 });
      } else if (successCount > 0) {
        Swal.fire({ icon: "warning", title: "Partial success", html: `${successCount} applied, ${toApply.length - successCount} failed.`, timer: 2400 });
      } else {
        Swal.fire({ icon: "error", title: "Failed", text: "No entries were applied." });
      }

      // call parent callback
      onApplied(Number(totalApplied.toFixed(2)), appliedIds);

      // optionally clear overrides / selections? We'll keep selections but clear override inputs for applied ones
      setOverrideAmounts((prev) => {
        const next = { ...prev };
        appliedIds.forEach((id) => { next[id] = ""; });
        return next;
      });
    } catch (err) {
      Swal.close();
      console.error("Apply error", err);
      Swal.fire({ icon: "error", title: "Error", text: "Failed while applying loan deductions." });
    }
  };

  // UI
  return (
    <div className="space-y-4">
      {/* header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-800">Loan Deductions</h4>
          <div className="text-xs text-gray-500">Select loans to include in this payroll cutoff and optionally override amounts.</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleAll}
            className="px-3 py-1 text-xs font-medium border rounded bg-gray-50 hover:bg-gray-100"
            title="Toggle select all"
          >
            Toggle All
          </button>

          <button
            onClick={handleApplySelected}
            className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
            title="Apply selected loans as journal entries"
          >
            <Check size={14} /> Save
          </button>
        </div>
      </div>

      {/* date row */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-600">Entry date:</label>
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="p-2 text-sm border rounded" />
        <div className="text-xs text-gray-500">Default: payroll cutoff end</div>
      </div>

      {/* loans list */}
      <div className="space-y-3">
        {computed.items.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 border rounded bg-gray-50">No active loans to deduct.</div>
        ) : (
          computed.items.map(({ loan, scheduled, overrideVal, used, included, isSelected }) => (
            <div key={loan.loan_id} className="flex items-center justify-between gap-4 p-3 bg-white border rounded shadow-sm">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={!!isSelected} onChange={() => toggle(loan.loan_id)} className="mt-1" />
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {loan.loan_type?.toUpperCase() || "LOAN"} {loan.loan_reference_no ? `— ${loan.loan_reference_no}` : `#${loan.loan_id}`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {loan.description || `Loan #${loan.loan_id}`} • Remaining: <span className="font-medium">{formatPeso(loan.balance)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    Schedule: <span className="capitalize">{loan.deduction_schedule}</span> • Terms: {loan.terms ?? "-"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-xs text-right text-gray-500">
                  <div>Scheduled</div>
                  <div className="font-semibold">{formatPeso(scheduled)}</div>
                </div>

                {/* override input */}
                <div className="flex flex-col items-end">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Override (optional)"
                    value={overrideAmounts[loan.loan_id] ?? ""}
                    onChange={(e) => onOverrideChange(loan.loan_id, e.target.value)}
                    className="p-2 text-sm text-right border rounded w-28"
                    disabled={!isSelected}
                  />
                  <div className="mt-1 text-xs text-gray-500">Used: <span className="font-medium">{formatPeso(used)}</span></div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* subtotal */}
      <div className="flex items-center justify-between p-3 border rounded bg-gray-50">
        <div className="text-sm text-gray-700">Click save to apply loan deduction</div>
        <div className="text-lg font-semibold text-indigo-600">{formatPeso(computed.total)}</div>
      </div>
    </div>
  );
}
