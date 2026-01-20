// DeductionTemplate.jsx (with LoanDetails moved)
import React, { useState, useEffect, useMemo } from 'react';
import useLoanSkipAPI from '../../components/loan/loan_hooks/useLoanSkipAPI';
import { Banknote, ShieldCheck, Landmark } from 'lucide-react';
import { Typography } from "@mui/material";
import ContributionOverrideModal from './ContributionOverrideModal';
import ContributionTypeSelector from './ContributionTypeSelector';
import LoanJournalEntriesTable from "../payrollComponents/payrollJournalEntry";
import LoanDetailsMultiApply from './LoanDetailsMultiApply';

function DeductionTemplate({ payroll, onSaved  }) {
  if (!payroll) return null;

  const { skipRequests } = useLoanSkipAPI();
  const employeeId = payroll.employee_id;
  const cutoffDate = new Date(payroll.date_until);

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideModalType, setOverrideModalType] = useState('pagibig');
  const [overrideCurrentAmount, setOverrideCurrentAmount] = useState(0);
  const [overrideCurrentEnabled, setOverrideCurrentEnabled] = useState(0);
  const [localPayroll, setLocalPayroll] = useState(payroll);
  const [loanDeductionActual, setLoanDeductionActual] = useState(
    parseFloat(payroll.loan_deduction_actual) || 0
  );
  const loanDeductionApplied = parseFloat(payroll.loan_deduction_actual) || 0;

  const [loanDeduction, setLoanDeduction] = useState(
    parseFloat(payroll.loan_deduction_actual) || 0
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalPayroll(payroll);
    setLoanDeductionActual(parseFloat(payroll.loan_deduction_actual) || 0);
  }, [payroll]);

  const openOverride = (type, currentAmount = 0) => {
    setOverrideModalType(type);
    setOverrideCurrentAmount(currentAmount);

    let enabled = 0;
    if (type === 'philhealth') enabled = localPayroll.philhealth_override_enabled ? 1 : 0;
    else if (type === 'sss') enabled = localPayroll.sss_override_enabled ? 1 : 0;
    else enabled = localPayroll.pagibig_override_enabled ? 1 : 0;

    setOverrideCurrentEnabled(enabled);
    setOverrideModalOpen(true);
  };

  const closeOverride = () => {
    setOverrideModalOpen(false);
    setOverrideModalType('pagibig');
    setOverrideCurrentAmount(0);
    setOverrideCurrentEnabled(0);
  };

  const dayOfCutoff = cutoffDate.getDate();
  const isSecondCutoff = dayOfCutoff >= 20;

  // const hasSkipLoan = skipRequests.some(
  //   (req) =>
  //     req.employee_id === employeeId &&
  //     req.payroll_cutoff === localPayroll.date_until &&
  //     req.status === 'approved'
  // );
  const hasSkipLoan = skipRequests.some(
    (req) =>
      req.employee_id === payroll.employee_id &&
      req.payroll_cutoff === payroll.date_until &&
      req.status === 'approved'
  );

  const deductionType = localPayroll.contribution_deduction_type || "semi-monthly";

  const philhealth = parseFloat(localPayroll.philhealth_employee_share) || 0;
  const sss = parseFloat(localPayroll.sss_employee_share) || 0;
  const pagibig = parseFloat(localPayroll.pagibig_employee_share) || 0;
  const caDeduction = parseFloat(localPayroll.ca_deduction) || 0;

  const displayedPhilhealth =
    deductionType === "semi-monthly" ? philhealth / 2 : isSecondCutoff ? philhealth : 0;

  const displayedSSS =
    deductionType === "semi-monthly" ? sss / 2 : isSecondCutoff ? sss : 0;

  const displayedPagibig =
    deductionType === "semi-monthly" ? pagibig / 2 : isSecondCutoff ? pagibig : 0;

  // new: government contributions subtotal
  const govSubtotal = Number((displayedPhilhealth + displayedSSS + displayedPagibig).toFixed(2));

  const totalDeduction = (
    displayedPhilhealth + displayedSSS + displayedPagibig +
    loanDeductionActual + caDeduction 
  ).toFixed(2);

  return (
    <div className="w-full max-w-full mx-auto overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
      {/* ================= Government Contributions ================= */}
      <div className="px-5 py-4 border-b bg-gray-50">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-gray-700 uppercase">
            Government Contributions
          </h3>
          <div className="text-xs italic text-gray-500">Click Override to edit contribution</div>
        </div>

        {(deductionType === "semi-monthly" || isSecondCutoff) ? (
          <div className="mt-3 space-y-2">
            {/* SSS */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>SSS</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">₱{displayedSSS.toFixed(2)}</span>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 
                             rounded-lg shadow-sm transition-all hover:bg-blue-100 hover:shadow-md 
                             active:scale-95"
                  onClick={() => openOverride('sss', sss)}
                >
                  Override
                </button>
              </div>
            </div>

            {/* Pag-IBIG */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-pink-500" />
                <span>Pag-IBIG</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">₱{displayedPagibig.toFixed(2)}</span>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-pink-600 bg-pink-50 border border-pink-200 
                             rounded-lg shadow-sm transition-all hover:bg-pink-100 hover:shadow-md 
                             active:scale-95"
                  onClick={() => openOverride('pagibig', pagibig)}
                >
                  Override
                </button>
              </div>
            </div>

            {/* PhilHealth */}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>PhilHealth</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">₱{displayedPhilhealth.toFixed(2)}</span>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 
                             rounded-lg shadow-sm transition-all hover:bg-green-100 hover:shadow-md 
                             active:scale-95"
                  onClick={() => openOverride('philhealth', philhealth)}
                >
                  Override
                </button>
              </div>
            </div>

            {/* Government subtotal row */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm font-medium text-gray-700">Government contributions subtotal</div>
              <div className="text-sm font-bold text-gray-800">₱{govSubtotal.toFixed(2)}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-sm italic text-gray-500">
            Contributions shown only on 2nd cutoff (20th to end of month).
          </div>
        )}

        <div className="mt-2 text-xs italic text-right text-gray-500">
          Basis: {deductionType}
        </div>
      </div>

      {/* ================= Other Deductions ================= */}
      <div className="px-5 py-4 bg-white">
        <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-700 uppercase">
          Other Deductions
        </h3>

          {/* ✅ Loan Info & Manual Deduction placed here */}
          <div className="mt-4">
            <LoanDetailsMultiApply
              loans={localPayroll.loans || []}
              payroll={localPayroll}
              employee_id={localPayroll.employee_id}
              onApplied={(total, appliedLoanIds) => {
                // update parent payroll's loan deduction, refresh UI, or call backend
                setLoanDeductionActual(total);
                if (onSaved) onSaved(total);
                // optionally dispatch event to refresh payroll list:
                window.dispatchEvent(new CustomEvent('payroll:refresh', { detail: { employee_id: localPayroll.employee_id } }));
              }}
            />

          </div>

        <div className="pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-indigo-500" />
              <span>Loan Deduction</span>
            </div>
            <span className={`font-medium ${hasSkipLoan ? 'text-red-500' : 'text-gray-700'}`}>
              ₱{loanDeductionActual.toFixed(2)} {hasSkipLoan ? '(Skipped)' : ''}
            </span>
          </div>
        </div>

        <div className="flex justify-between pt-3 mt-4 text-base font-semibold border-t">
          <span className="text-gray-800">Total Deduction</span>
          <span className="text-blue-600">₱{totalDeduction}</span>
        </div>
      </div>

      {/* ================= Loan Journal ================= */}
      <div className="px-5 py-4 border-t bg-gray-50">
        <LoanJournalEntriesTable
          employee_id={localPayroll.employee_id}
          payroll={{ date_from: localPayroll.date_from, date_until: localPayroll.date_until }}
          initialLoans={Array.isArray(localPayroll.loans) ? localPayroll.loans : []}
          loan_ids={Array.isArray(localPayroll.loans) ? localPayroll.loans.map(l => l.loan_id) : []}
          showLoanSelector={true}
          onUpdateLoanDeduction={(total) => {
            setLoanDeductionActual(total);
            if (onSaved) onSaved(total);
          }}
        />
      </div>

      {/* ================= Override Modal ================= */}
      <ContributionOverrideModal
        isOpen={overrideModalOpen}
        onClose={closeOverride}
        employeeId={employeeId}
        contributionType={overrideModalType}
        currentAmount={overrideCurrentAmount}
        currentIsEnabled={overrideCurrentEnabled}
        onSaved={(res) => {
          setLocalPayroll((prev) => {
            const updated = { ...prev };
            if (overrideModalType === "sss") {
              updated.sss_employee_share = res.override_employee_share;
              updated.sss_override_enabled = res.is_override_enabled;
            } else if (overrideModalType === "philhealth") {
              updated.philhealth_employee_share = res.override_employee_share;
              updated.philhealth_override_enabled = res.is_override_enabled;
            } else if (overrideModalType === "pagibig") {
              updated.pagibig_employee_share = res.override_employee_share;
              updated.pagibig_override_enabled = res.is_override_enabled;
            }
            return updated;
          });
        }}
      />
    </div>
  );
}

/* ✅ LoanDetails stays inline */

function LoanDetailsList({ loans = [], payroll = {}, initialAppliedAmount = 0, onChange }) {
  // 1) only active loans: balance > 0
  const activeLoans = useMemo(
    () =>
      (loans || []).filter((l) => {
        const bal = parseFloat(l.balance || 0);
        return bal > 0;
      }),
    [loans]
  );

  // Preselect all active loans
  const [selected, setSelected] = useState(() => {
    const map = {};
    (activeLoans || []).forEach((l) => (map[l.loan_id] = true));
    return map;
  });

  // Re-sync selected if loans change
  useEffect(() => {
    const map = {};
    activeLoans.forEach((l) => (map[l.loan_id] = true));
    setSelected(map);
  }, [activeLoans.length]); // only length change triggers reselect (safe)

  // helper: currency formatting
  const formatPeso = (val) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(Number(val || 0));

  // helper: compute per-loan scheduled deduction for this payroll cut
  const perLoanScheduled = (loan) => {
    const payable = parseFloat(loan.final_loan_deduction ?? loan.payable_per_term ?? 0) || 0;
    const sched = (loan.deduction_schedule || "").toLowerCase(); // 'monthly','semi-monthly','current-payroll'
    const payrollType = (payroll.contribution_deduction_type || "").toLowerCase(); // 'semi-monthly' or 'monthly'

    // Logic (best-effort guess):
    // - if schedule === 'current-payroll' => pay once (use payable)
    // - if schedule === 'monthly' :
    //     if payrollType === 'semi-monthly' -> show 0 for 1st cut? This is ambiguous.
    //     We'll assume monthly means apply only on 2nd cutoff (so if payrollType === 'semi-monthly' and this is not 2nd cutoff => 0).
    // - if schedule === 'semi-monthly' => per payroll = payable / 2 if payable represents monthly
    // Note: If your `payable_per_term` is already per-pay-period, adjust accordingly.
    let amount = payable;

    if (sched === "current-payroll") {
      amount = payable;
    } else if (sched === "monthly") {
      // apply on second cutoff if payroll is semi-monthly, else regular amount
      if (payrollType === "semi-monthly") {
        // determine cutoff day if available
        const cutoffDate = payroll.date_until ? new Date(payroll.date_until) : null;
        const day = cutoffDate ? cutoffDate.getDate() : 31;
        const isSecond = day >= 20;
        amount = isSecond ? payable : 0;
      } else {
        amount = payable;
      }
    } else if (sched === "semi-monthly") {
      // assume payable is monthly term -> divide by 2 for per-payroll
      amount = payrollType === "semi-monthly" ? payable / 2 : payable;
    } else {
      amount = payable;
    }

    // never be more than remaining balance
    const bal = parseFloat(loan.balance || 0);
    if (amount > bal) amount = bal;

    return Number(amount.toFixed(2));
  };

  // compute totals
  const computed = useMemo(() => {
    let total = 0;
    const items = activeLoans.map((loan) => {
      const scheduled = perLoanScheduled(loan);
      const isSelected = !!selected[loan.loan_id];
      const included = isSelected ? scheduled : 0;
      if (isSelected) total += included;
      return {
        loan,
        scheduled,
        included,
        isSelected,
      };
    });
    return { items, total: Number(total.toFixed(2)) };
  }, [activeLoans, selected, payroll.date_until, payroll.contribution_deduction_type]);

  // notify parent whenever total changes
  useEffect(() => {
    if (onChange) {
      onChange(computed.total, computed.items.filter(i => i.isSelected).map(i => i.loan.loan_id));
    }
  }, [computed.total]); // eslint-disable-line

  // toggle select
  const toggle = (loan_id) => {
    setSelected((prev) => {
      const next = { ...prev, [loan_id]: !prev[loan_id] };
      return next;
    });
  };

  if (!activeLoans.length) {
    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
        <div className="text-sm text-gray-600">No active loans to deduct.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* stacked list */}
      {computed.items.map(({ loan, scheduled, included, isSelected }) => (
        <div key={loan.loan_id} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(loan.loan_id)}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {loan.loan_type?.toUpperCase() || "Loan"} {loan.loan_reference_no ? `— ${loan.loan_reference_no}` : ""}
              </div>
              <div className="text-xs text-gray-500">
                {loan.description ? loan.description : `Loan #${loan.loan_id}`} • Remaining: <span className="font-medium">{formatPeso(loan.balance)}</span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Schedule: <span className="capitalize">{loan.deduction_schedule}</span> • Terms: {loan.terms ?? "-"}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-700">Scheduled</div>
            <div className="text-lg font-semibold text-blue-600">{formatPeso(scheduled)}</div>
            <div className="mt-1 text-xs text-gray-500">Included: {isSelected ? formatPeso(included) : formatPeso(0)}</div>
          </div>
        </div>
      ))}

      {/* totals */}
      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
        <div className="text-sm text-gray-600">Save to apply sub total</div>
        <div className="text-lg font-bold text-indigo-600">{formatPeso(computed.total)}</div>
      </div>
    </div>
  );
}

// function LoanDetails({ localLoans, loanDeductionActual }) {
//   const firstLoan = localLoans.length > 0 ? localLoans[0] : null;
//   if (!firstLoan) return null;

//   const originalBalance = parseFloat(firstLoan.balance) || 0;
//   const deduction = parseFloat(loanDeductionActual || 0);
//   const updatedBalance = (originalBalance - deduction).toFixed(2);

//   // helper for formatting with commas
//   const formatPeso = (val) =>
//     new Intl.NumberFormat("en-PH", {
//       style: "currency",
//       currency: "PHP",
//       minimumFractionDigits: 2,
//     }).format(val);

//   return (
//     <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
//       <p className="mb-3 text-sm font-semibold text-gray-800">
//         Loan Info & Manual Deduction
//       </p>

//       <div className="space-y-2 text-[13px] text-gray-700">
//         <div className="flex justify-between">
//           <span className="font-medium">Loan Amount</span>
//           <span>{formatPeso(firstLoan.loan_amount)}</span>
//         </div>

//         <div className="flex justify-between">
//           <span className="font-medium">Schedule</span>
//           <span className="capitalize">{firstLoan.deduction_schedule}</span>
//         </div>

//         <div className="flex justify-between">
//           <span className="font-medium">Payable term </span>
//           <span>{firstLoan.final_loan_deduction || firstLoan.payable_per_term}</span>
//         </div>

//         {/* Amount Paid */}
//         <div className="flex justify-between pt-2">
//           <span className="font-medium text-gray-800">Amount Paid</span>
//           <span className="font-semibold text-red-500">{formatPeso(deduction)}</span>
//         </div>

//         {/* Balance with calculation breakdown */}
//         <div className="pt-2 mt-1 border-t">
//           <div className="flex justify-between text-sm">
//             <span className="font-bold text-gray-800">Balance</span>
//             <span className="font-bold text-blue-600">{formatPeso(updatedBalance)}</span>
//           </div>
//           <p className="text-xs text-right text-gray-500">
//             {formatPeso(originalBalance)} –{" "}
//             <span className="text-red-500">{formatPeso(deduction)}</span> (deductions) ={" "}
//             <span className="text-blue-600">{formatPeso(updatedBalance)}</span>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }


 
export default DeductionTemplate;




// import React from 'react';
// import useLoanSkipAPI from '../../components/loan/loan_hooks/useLoanSkipAPI';
// import { Banknote, ShieldCheck, Landmark, XCircle } from 'lucide-react';

// function DeductionTemplate({ payroll }) {
//   if (!payroll) return null;

//   const { skipRequests } = useLoanSkipAPI();

//   const employeeId = payroll.employee_id;
//   const cutoffDate = payroll.date_until;

//   const hasSkipLoan = skipRequests.some(
//     (req) =>
//       req.employee_id === employeeId &&
//       req.payroll_cutoff === cutoffDate &&
//       req.status === 'approved'
//   );

//   const philhealth = parseFloat(payroll.philhealth_employee_share) || 0;
//   const sss = parseFloat(payroll.sss_employee_share) || 0;
//   const pagibig = parseFloat(payroll.pagibig_employee_share) || 0;
//   const caDeduction = parseFloat(payroll.ca_deduction) || 0;
//   const loanDeduction = parseFloat(payroll.loan_deduction_applied) || 0;

//   const totalDeduction = (
//     philhealth + sss + pagibig + loanDeduction + caDeduction
//   ).toFixed(2);

//   return (
//     <div className="w-full max-w-full mx-auto overflow-hidden bg-white border border-gray-200 shadow-sm rounded-2xl">
//       <div className="px-5 py-4 border-b bg-gray-50">
//         <h3 className="text-sm font-semibold tracking-wide text-gray-700 uppercase">
//           Government Contributions
//         </h3>
//         <div className="mt-3 space-y-2">
//           <div className="flex items-center justify-between text-sm text-gray-600">
//             <div className="flex items-center gap-2">
//               <ShieldCheck className="w-4 h-4 text-blue-500" />
//               <span>SSS</span>
//             </div>
//             <span className="font-medium text-gray-700">₱{sss.toFixed(2)}</span>
//           </div>
//           <div className="flex items-center justify-between text-sm text-gray-600">
//             <div className="flex items-center gap-2">
//               <Landmark className="w-4 h-4 text-pink-500" />
//               <span>Pag-IBIG</span>
//             </div>
//             <span className="font-medium text-gray-700">₱{pagibig.toFixed(2)}</span>
//           </div>
//           <div className="flex items-center justify-between text-sm text-gray-600">
//             <div className="flex items-center gap-2">
//               <ShieldCheck className="w-4 h-4 text-green-500" />
//               <span>PhilHealth</span>
//             </div>
//             <span className="font-medium text-gray-700">₱{philhealth.toFixed(2)}</span>
//           </div>
//         </div>
//       </div>

//       <div className="px-5 py-4 bg-white">
//         <h3 className="mb-3 text-sm font-semibold tracking-wide text-gray-700 uppercase">
//           Other Deductions
//         </h3>
//         <div className="space-y-2">
//           <div className="flex items-center justify-between text-sm text-gray-600">
//             <div className="flex items-center gap-2">
//               <Banknote className="w-4 h-4 text-indigo-500" />
//               <span>Loan Deduction</span>
//             </div>
//             <span
//               className={`font-medium ${
//                 hasSkipLoan ? 'text-red-500' : 'text-gray-700'
//               }`}
//             >
//               ₱{loanDeduction.toFixed(2)} {hasSkipLoan ? '(Skipped)' : ''}
//             </span>
//           </div>
//           {/* <div className="flex items-center justify-between text-sm text-gray-600">
//             <div className="flex items-center gap-2">
//               <XCircle className="w-4 h-4 text-yellow-500" />
//               <span>Cash Advance</span>
//             </div>
//             <span className="font-medium text-gray-700">₱{caDeduction.toFixed(2)}</span>
//           </div> */}
//         </div>

//         <div className="flex justify-between pt-3 mt-4 text-base font-semibold border-t">
//           <span className="text-gray-800">Total Deduction</span>
//           <span className="text-blue-600">₱{totalDeduction}</span>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default DeductionTemplate;