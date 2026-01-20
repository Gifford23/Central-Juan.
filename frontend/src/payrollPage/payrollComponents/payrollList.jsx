// PayrollList.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PayrollDropdownButton from "../payrollComponents/payrollDropdownButton";
import PayrollLayoutDropdown from "../payrollLayout/payrollLayoutDropdown";
import EmployeeTypeBadge from "../../components/employees/employeeComponents/EmployeeTypebadge";
import useLoanSkipAPI from "../../components/loan/loan_hooks/useLoanSkipAPI";
import usePermissions from "../../users/hooks/usePermissions";
import { useSession } from "../../context/SessionContext";
import { fetchEmployeePayrollAPI, fetchPayrollsAPI, updateEmployeeTypeAPI  } from "../payrollApi/payrollapi";
import Swal from "sweetalert2";
import BASE_URL from "../../../backend/server/config";
import axios from "axios"; // added for allowance fetch
import CommissionBasedBadge from "../../components/employees/employeeComponents/CommissionBasedBadge";
import Snowfall from "react-snowfall";
import { VariableSizeList as List } from "react-window";
import { UserRound } from "lucide-react";

/**
 * PayrollList - virtualized + loading overlay version
 *
 * This version shows the payroll layout (previously a per-row dropdown)
 * inside a modal instead of inline. Commission modal also rendered at top-level
 * (to avoid virtualized-row mount issues).
 */

// small helper to format amounts as PHP
const formatPHP = (num) =>
  `₱${Number(num || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PayrollList({
  data,
  loading,
  selected,
  onSelectAll,
  onSelect,
  formatDate,
  onNetSalaryChange // Add this prop
}) {
  const { user } = useSession();
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  const { skipRequests } = useLoanSkipAPI();

  // constants
  const BASE_ROW_HEIGHT = 340; // fixed row height now (modal won't expand row)
  // (EXTRA_OPEN_HEIGHT removed since modal does not affect row height)

  // local states
  const [commissionLoading, setCommissionLoading] = useState({});
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

  // NEW: layout modal state (replaces inline dropdown)
  const [layoutModalOpen, setLayoutModalOpen] = useState(false);
  const [layoutModalPayroll, setLayoutModalPayroll] = useState(null);

  const [popupMessage, setPopupMessage] = useState(null);

  // local payroll list for instant updates & re-render
  const [payrollList, setPayrollList] = useState(Array.isArray(data) ? data : []);

  // IMPORTANT: ensure we apply incoming `data` first, so allowance merge won't get overwritten.
  useEffect(() => {
    setPayrollList(Array.isArray(data) ? data : []);
  }, [data]);

  // list ref for react-window
  const listRef = useRef(null);

  // -------------------------
  // helpers and existing logic kept mostly intact
  // -------------------------
  const parseJournals = (maybe) => {
    if (!maybe) return [];
    if (Array.isArray(maybe)) return maybe;
    try {
      return JSON.parse(maybe);
    } catch (e) {
      return [];
    }
  };

  const sumPayrollJournalCredits = (payroll) => {
    if (!payroll) return 0;
    const possiblePayrollJournals =
      payroll.journal_entries ??
      payroll.loan_journal_entries ??
      payroll.journals ??
      payroll.loan_journals ??
      payroll.journalEntries ??
      payroll.journals_raw ??
      null;

    const payrollJ = parseJournals(possiblePayrollJournals);

    const embedded = [];
    if (Array.isArray(payroll.loans)) {
      payroll.loans.forEach((ln) => {
        const lnJ =
          ln.journal_entries ??
          ln.loan_journal_entries ??
          ln.journals ??
          ln.loan_journals ??
          ln.journalEntries ??
          null;
        const arr = parseJournals(lnJ);
        if (Array.isArray(arr) && arr.length) {
          const normalized = arr.map((j) => {
            if (j && (j.loan_id ?? j.loanId ?? j._loan_id ?? j.legacy_loan_id)) return j;
            return { ...j, loan_id: ln.loan_id ?? ln.id ?? null };
          });
          embedded.push(...normalized);
        }
      });
    }

    const combined = [];
    if (Array.isArray(payrollJ) && payrollJ.length) combined.push(...payrollJ);
    if (embedded.length) combined.push(...embedded);

    if (!combined.length) return 0;

    const from = payroll.date_from ? new Date(payroll.date_from).setHours(0,0,0,0) : null;
    const until = payroll.date_until ? new Date(payroll.date_until).setHours(23,59,59,999) : null;

    let sum = 0;
    for (const j of combined) {
      if (!j) continue;
      const entryType = (j.entry_type ?? j.type ?? "").toString().toLowerCase();
      if (entryType !== "credit") continue;

      const jd = j.entry_date ?? j.created_at ?? j.date ?? null;
      const cutoffCandidate = j.payroll_cutoff ?? jd;
      if (!cutoffCandidate) continue;

      const t = new Date(cutoffCandidate).getTime();
      if (isNaN(t)) continue;
      if ((from !== null && t < from) || (until !== null && t > until)) continue;

      const amt = parseFloat(j.amount ?? j.value ?? j.amt ?? 0) || 0;
      sum += amt;
    }
    return Number(sum.toFixed(2));
  };

  const getHolidayCount = (payroll) => {
    const employeeTypeNormalized = String(payroll?.employee_type || "").toLowerCase();
    const isProjectBased =
      employeeTypeNormalized.includes("project") ||
      employeeTypeNormalized === "project-based" ||
      employeeTypeNormalized === "project base" ||
      employeeTypeNormalized === "projectbase";

    const holidayCountRaw = Number(
      payroll?.holiday_count ??
      (Array.isArray(payroll?.holidays) ? payroll.holidays.length : 0) ??
      0
    ) || 0;

    return isProjectBased ? 0 : holidayCountRaw;
  };

  const getTotalCreditDays = (payroll) => {
    const totalDays = parseFloat(payroll?.total_days) || 0;
    const overtimeDays = parseFloat(payroll?.total_overtime_request) || 0;
    const holidayCount = getHolidayCount(payroll);

    let paidLeaves = 0;
    if (Array.isArray(payroll?.leaves)) {
      payroll.leaves.forEach(lv => {
        const isPaid =
          lv?.is_paid === 1 ||
          lv?.is_paid === true ||
          String(lv?.is_paid).toLowerCase() === "1" ||
          String(lv?.is_paid).toLowerCase() === "true";

        if (!isPaid) return;

        const days = (typeof lv.leave_days_cutoff !== "undefined")
          ? parseFloat(lv.leave_days_cutoff || 0)
          : (typeof lv.total_days !== "undefined" ? parseFloat(lv.total_days || 0) : 0);

        paidLeaves += (isNaN(days) ? 0 : days);
      });
    }

    return totalDays + overtimeDays + holidayCount + paidLeaves;
  };

  // --- Commission / employee type update handlers (kept intact) ---
  const handleEmployeeTypeChange = async (employee_id, newType, oldType, employeeName) => {
    setPayrollList((prev) =>
      prev.map((p) => (p.employee_id === employee_id ? { ...p, employee_type: newType } : p))
    );

    try {
      const resp = await fetch(`${BASE_URL}/employeesSide/update_employee.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id,
          employee_type: newType,
          current_user: user,
        }),
      });

      const data = await resp.json();

      if (data.status === "success" || data.success) {
        Swal.fire({
          icon: "success",
          title: "Employee Updated",
          html: `<b>${employeeName}</b><br/>Type changed: ${oldType} → ${newType}`,
          showConfirmButton: false,
          timer: 1700,
        });

        if (data.payroll) {
          setPayrollList(prev => prev.map(p => p.payroll_id === data.payroll.payroll_id ? { ...p, ...data.payroll } : p));
        }
      } else {
        setPayrollList((prev) =>
          prev.map((p) => (p.employee_id === employee_id ? { ...p, employee_type: oldType } : p))
        );

        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: data.message || "Something went wrong when updating employee type.",
        });
      }
    } catch (err) {
      setPayrollList((prev) =>
        prev.map((p) => (p.employee_id === employee_id ? { ...p, employee_type: oldType } : p))
      );

      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: "Failed to update employee type. Please check your connection.",
      });

      console.error("Update employee type failed:", err);
    }
  };

  const openCommissionModal = (payroll) => {
    setSelectedPayroll({
      ...payroll,
      total_commission: payroll.total_commission ?? 0,
    });
    setCommissionModalOpen(true);
  };

  const closeCommissionModal = () => {
    setCommissionModalOpen(false);
    setSelectedPayroll(null);
  };

  const handleCommissionBasedChange = async (
    payroll_id,
    employee_id,
    newValue,
    oldValue,
    employeeName,
    date_from,
    date_until,
    currentCommission // optional
  ) => {
    const normalizedNew = newValue === "yes" ? "yes" : "no";
    const normalizedOld =
      String(oldValue).toLowerCase() === "yes" ||
      oldValue === 1 ||
      oldValue === true
        ? "yes"
        : "no";

    setPayrollList((prev) =>
      prev.map((p) =>
        p.payroll_id === payroll_id
          ? { ...p, commission_based: normalizedNew }
          : p
      )
    );

    try {
      const resp = await fetch(`${BASE_URL}/payroll/update_commission_based.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payroll_id,
          employee_id,
          commission_based: normalizedNew,
          total_commission: normalizedNew === "yes" ? (currentCommission ?? null) : 0,
          date_from,
          date_until,
          current_user: user,
        }),
      });

      const ct = resp.headers.get("content-type") || "";
      const body = ct.includes("application/json") ? await resp.json() : await resp.text();

      if (!resp.ok) {
        console.error("commission update failed", resp.status, body);
        throw new Error((body && body.message) ? body.message : `HTTP ${resp.status}`);
      }

      if (body && (body.status === "success" || body.success)) {
        Swal.fire({
          icon: "success",
          title: "Updated",
          html: `<b>${employeeName}</b><br/>Commission: ${normalizedOld} → ${normalizedNew}`,
          showConfirmButton: false,
          timer: 1400,
        });

        if (body.payroll && body.payroll.payroll_id) {
          setPayrollList(prev => prev.map(p => p.payroll_id === body.payroll.payroll_id ? { ...p, ...body.payroll } : p));
        }
      } else {
        throw new Error(body?.message || "Update failed");
      }
    } catch (err) {
      setPayrollList((prev) =>
        prev.map((p) =>
          p.payroll_id === payroll_id ? { ...p, commission_based: normalizedOld } : p
        )
      );

      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Unable to update commission-based status.",
      });

      console.error("commission_based update error:", err);
    }
  };

  const handleCommissionAmountSave = async (payroll_id, employee_id, amount, date_from, date_until, payrollName) => {
    const numeric = parseFloat(amount) || 0;

    setPayrollList(prev => prev.map(p => p.payroll_id === payroll_id ? { ...p, total_commission: numeric } : p));

    try {
      const resp = await fetch(`${BASE_URL}/payroll/update_commission_based.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payroll_id,
          employee_id,
          commission_based: "yes",
          total_commission: numeric,
          date_from,
          date_until,
          current_user: user,
        }),
      });

      const ct = resp.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await resp.json() : null;

      if (!resp.ok || !(data && (data.status === "success" || data.success))) {
        console.error("commission amount save failed", resp.status, data);
        throw new Error(data?.message || `HTTP ${resp.status}`);
      }

      Swal.fire({
        icon: "success",
        title: "Commission Saved",
        html: `<b>${payrollName}</b><br/>₱${numeric.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        showConfirmButton: false,
        timer: 1200,
      });

      if (data.payroll && data.payroll.payroll_id) {
        setPayrollList(prev => prev.map(p => p.payroll_id === data.payroll.payroll_id ? { ...p, ...data.payroll } : p));
      }
    } catch (err) {
      setPayrollList(prev => prev.map(p => p.payroll_id === payroll_id ? { ...p, total_commission: p.total_commission ?? 0 } : p));

      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text: "Unable to save commission amount.",
      });

      console.error("commission amount save error:", err);
    }
  };

  // Fetch allowance_journal for the shown payroll rows and merge into payrollList
  useEffect(() => {
    const fetchAndMergeAllowances = async () => {
      if (!data || data.length === 0) return;
      try {
        const payrollIds = data.map(p => p.payroll_id).filter(Boolean);
        if (payrollIds.length === 0) return;

        const res = await axios.post(`${BASE_URL}/payroll/get_allowances_for_payrolls.php`, {
          payroll_ids: payrollIds
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        if (res.data && res.data.success) {
          const grouped = res.data.data || {};

          setPayrollList(prev => prev.map(p => {
            const pid = p.payroll_id;
            const allowances = grouped[pid] ?? grouped[String(pid)] ?? [];
            const total_allowances = (Array.isArray(allowances) ? allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0) : 0);
            return {
              ...p,
              allowances,
              total_allowances
            };
          }));
        } else {
          console.warn('get_allowances_for_payrolls_failed', res.data);
        }
      } catch (err) {
        console.error('Failed to fetch allowances for payrolls', err);
      }
    };

    fetchAndMergeAllowances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // --- Helpers used inside rendering kept as-is (rewardAppliesToPayroll, updateLoanDeduction) ---
  const updateLoanDeduction = (payrollId, newDeduction) => {
    setPayrollList((prev) =>
      prev.map((p) =>
        p.payroll_id === payrollId
          ? { ...p, loan_deduction_actual: newDeduction }
          : p
      )
    );
  };

  const rewardAppliesToPayroll = (reward, payroll) => {
    if ((!reward || (reward.applies_to_department_id === null || reward.applies_to_department_id === undefined || reward.applies_to_department_id === "")) &&
        (!reward || (reward.applies_to_position_id === null || reward.applies_to_position_id === undefined || reward.applies_to_position_id === ""))) {
      return { applies: true, reason: "all" };
    }
    if (reward && reward.applies_to_position_id && payroll.position_id && String(reward.applies_to_position_id) === String(payroll.position_id)) {
      return { applies: true, reason: "position" };
    }
    if (reward && reward.applies_to_department_id) {
      if (payroll.department_id && String(reward.applies_to_department_id) === String(payroll.department_id)) {
        return { applies: true, reason: "department" };
      }
      if ((payroll.department_name && String(reward.applies_to_department_id) === String(payroll.department_name)) ||
          (payroll.department && String(reward.applies_to_department_id) === String(payroll.department))) {
        return { applies: true, reason: "department" };
      }
    }
    return { applies: false, reason: "no-match" };
  };

  // Calculate and pass total net salary of selected payrolls to parent
  useEffect(() => {
    if (!onNetSalaryChange || selected.length === 0) {
      if (onNetSalaryChange) onNetSalaryChange(0);
      return;
    }

    const totalNetSalary = payrollList
      .filter(p => selected.includes(p.payroll_id))
      .reduce((sum, payroll) => {
        let journalLoanSum = sumPayrollJournalCredits(payroll);
        let loanDeductionApplied = journalLoanSum > 0
          ? journalLoanSum
          : (parseFloat(payroll.loan_deduction) || parseFloat(payroll.loan_deduction_actual) || 0);

        const philhealth = parseFloat(payroll.philhealth_employee_share) || 0;
        const sss = parseFloat(payroll.sss_employee_share) || 0;
        const pagibig = parseFloat(payroll.pagibig_employee_share) || 0;

        const deductionType = payroll.contribution_deduction_type;
        const isSemiMonthly = deductionType === "semi-monthly";
        const dateUntil = payroll.date_until ? new Date(payroll.date_until).getDate() : 0;

        let displayedPhilhealth = 0, displayedSSS = 0, displayedPagibig = 0;

        if (isSemiMonthly) {
          displayedPhilhealth = philhealth / 2;
          displayedSSS = sss / 2;
          displayedPagibig = pagibig / 2;
        } else {
          if (dateUntil >= 20) {
            displayedPhilhealth = philhealth;
            displayedSSS = sss;
            displayedPagibig = pagibig;
          }
        }

        const dailyRate = parseFloat(payroll.basic_salary) || 0;
        const totalCreditDays = getTotalCreditDays(payroll);
        const baseGross = dailyRate * totalCreditDays;

        let allowanceTotal = 0;
        if (payroll.total_allowances !== undefined && payroll.total_allowances !== null) {
          allowanceTotal = parseFloat(payroll.total_allowances) || 0;
        } else if (Array.isArray(payroll.allowances)) {
          allowanceTotal = payroll.allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0);
        }

        const incentiveAmount = parseFloat(payroll.total_incentives) || 0;
        const retroApplied = parseFloat(payroll.total_retro_applied) || 0;

        let rewardTotal = 0;
        if (typeof payroll.total_rewards !== "undefined" && payroll.total_rewards !== null) {
          rewardTotal = parseFloat(payroll.total_rewards) || 0;
        } else if (Array.isArray(payroll.rewards)) {
          rewardTotal = payroll.rewards.reduce((s, r) => s + (parseFloat(r.amount ?? r.applied_amount ?? 0) || 0), 0);
        }

        const deductionOneoff = parseFloat(payroll.deduction_oneoff) || 0;
        const othersNet = rewardTotal - deductionOneoff;

        const commissionAmount = parseFloat(payroll.total_commission) || 0;
        const commissionBased = (() => {
          const v = payroll?.commission_based;
          if (v === true) return true;
          if (v === 1 || v === "1") return true;
          const s = String(v ?? "").toLowerCase().trim();
          return s === "yes" || s === "true";
        })();

        const effectiveBaseGross = (commissionBased && commissionAmount > baseGross) ? commissionAmount : baseGross;

        const grossSalaryWithAllowancesAndExtras = effectiveBaseGross + allowanceTotal + incentiveAmount + retroApplied + othersNet;

        const hasLateSalaryRecord = payroll.salary_type === "monthly" && (
          (payroll.total_salary_after_late !== undefined && payroll.total_salary_after_late !== null && parseFloat(payroll.total_salary_after_late) > 0) ||
          (payroll.half_month_salary !== undefined && payroll.half_month_salary !== null && parseFloat(payroll.half_month_salary) > 0)
        );

        const lateDeduction = parseFloat(payroll.late_deduction) || 0;

        if (hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0) {
          displayedPhilhealth = displayedPhilhealth / 2;
          displayedSSS = displayedSSS / 2;
          displayedPagibig = displayedPagibig / 2;
        }

        let totalDeduction = displayedPhilhealth + displayedSSS + displayedPagibig + loanDeductionApplied;
        if (payroll.salary_type === "monthly") {
          totalDeduction += lateDeduction;
        }

        const grossToUse = (hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0)
          ? (parseFloat(payroll.half_month_salary) || 0)
          : grossSalaryWithAllowancesAndExtras;

        let netSalary = grossToUse - totalDeduction;

        return sum + Number(netSalary.toFixed(2));
      }, 0);

    onNetSalaryChange(totalNetSalary);
  }, [payrollList, selected, onNetSalaryChange]);

  // blink highlight state (optional)
  const [blinkPayrollId, setBlinkPayrollId] = useState(null);

  // ------------------------------------------------------------------------
  // Row height getter for react-window - fixed now since modal doesn't expand rows
  const getItemSize = useCallback((index) => {
    return BASE_ROW_HEIGHT;
  }, [payrollList]);

  // compute list height (cap reasonable)
  const windowHeight = typeof window !== "undefined" ? window.innerHeight : 900;
  const listHeight = Math.min(Math.max(windowHeight - 240, 300), 1000); // between 300 and 1000

  // Action: open layout modal
  const openLayoutModal = (payroll) => {
    setLayoutModalPayroll(payroll);
    setLayoutModalOpen(true);

    // optional: ensure react-window visible area recalculation (not necessary for modal)
    setTimeout(() => {
      if (listRef.current) listRef.current.resetAfterIndex(0, true);
    }, 0);
  };

  const closeLayoutModal = () => {
    setLayoutModalOpen(false);
    setLayoutModalPayroll(null);
  };

  // render a single virtualized row
  const Row = ({ index, style }) => {
    const payroll = payrollList[index];
    if (!payroll) return null;

    // local calculations (copied from original row mapping code)
    let journalLoanSum = sumPayrollJournalCredits(payroll);
    const loanDeductionApplied = journalLoanSum > 0
      ? journalLoanSum
      : (parseFloat(payroll.loan_deduction) || parseFloat(payroll.loan_deduction_actual) || 0);

    const hasSkipLoan = skipRequests.some(
      (request) =>
        request.loan_id === payroll.loan_id && request.status === "approved"
    );

    const commissionBased = (() => {
      const v = payroll?.commission_based;
      if (v === true) return true;
      if (v === 1 || v === "1") return true;
      const s = String(v ?? "").toLowerCase().trim();
      return s === "yes" || s === "true";
    })();

    const deductionType = payroll.contribution_deduction_type;
    const isSemiMonthly = deductionType === "semi-monthly";
    const dateUntil = payroll.date_until ? new Date(payroll.date_until).getDate() : 0;

    const philhealth = parseFloat(payroll.philhealth_employee_share) || 0;
    const sss = parseFloat(payroll.sss_employee_share) || 0;
    const pagibig = parseFloat(payroll.pagibig_employee_share) || 0;

    const dailyRate = parseFloat(payroll.basic_salary) || 0;
    const totalCreditDaysForGross = getTotalCreditDays(payroll);
    const baseGross = dailyRate * totalCreditDaysForGross;

    let allowanceTotal = 0;
    if (payroll.total_allowances !== undefined && payroll.total_allowances !== null) {
      allowanceTotal = parseFloat(payroll.total_allowances) || 0;
    } else if (Array.isArray(payroll.allowances)) {
      allowanceTotal = payroll.allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0);
    }

    const incentiveAmount = parseFloat(payroll.total_incentives) || 0;
    const retroApplied = parseFloat(payroll.total_retro_applied) || 0;

    let rewardTotal = 0;
    if (typeof payroll.total_rewards !== "undefined" && payroll.total_rewards !== null) {
      rewardTotal = parseFloat(payroll.total_rewards) || 0;
    } else if (Array.isArray(payroll.rewards)) {
      rewardTotal = payroll.rewards.reduce((s, r) => s + (parseFloat(r.amount ?? r.applied_amount ?? 0) || 0), 0);
    }

    const deductionOneoff = parseFloat(payroll.deduction_oneoff) || 0;
    const othersNet = rewardTotal - deductionOneoff;

    const commissionAmount = parseFloat(payroll.total_commission) || 0;
    const commissionOverridesBase = commissionBased && commissionAmount > baseGross;
    const effectiveBaseGross = commissionOverridesBase ? commissionAmount : baseGross;

    const grossSalaryWithAllowancesAndExtras = effectiveBaseGross + allowanceTotal + incentiveAmount + retroApplied + othersNet;

    let displayedPhilhealth = 0;
    let displayedSSS = 0;
    let displayedPagibig = 0;

    if (isSemiMonthly) {
      displayedPhilhealth = philhealth / 2;
      displayedSSS = sss / 2;
      displayedPagibig = pagibig / 2;
    } else {
      if (dateUntil >= 20) {
        displayedPhilhealth = philhealth;
        displayedSSS = sss;
        displayedPagibig = pagibig;
      } else {
        displayedPhilhealth = 0;
        displayedSSS = 0;
        displayedPagibig = 0;
      }
    }

    const hasLateSalaryRecord = payroll.salary_type === "monthly" && (
      (payroll.total_salary_after_late !== undefined && payroll.total_salary_after_late !== null && parseFloat(payroll.total_salary_after_late) > 0) ||
      (payroll.half_month_salary !== undefined && payroll.half_month_salary !== null && parseFloat(payroll.half_month_salary) > 0)
    );

    const lateDeduction = parseFloat(payroll.late_deduction) || 0;

    let adjPhilhealth = displayedPhilhealth;
    let adjSSS = displayedSSS;
    let adjPagibig = displayedPagibig;
    if (hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0) {
      adjPhilhealth = displayedPhilhealth / 2;
      adjSSS = displayedSSS / 2;
      adjPagibig = displayedPagibig / 2;
    }

    let totalDeduction = adjPhilhealth + adjSSS + adjPagibig + loanDeductionApplied;
    if (payroll.salary_type === "monthly") {
      totalDeduction += lateDeduction;
    }

    const computedNetSalary = (grossSalaryWithAllowancesAndExtras - totalDeduction);

    const employeeTypeNormalized = String(payroll.employee_type || "").toLowerCase();
    const isProjectBased = employeeTypeNormalized.includes("project") || employeeTypeNormalized === "project-based" || employeeTypeNormalized === "project base" || employeeTypeNormalized === "projectbase";
    const holidayCountRaw = Number(payroll.holiday_count ?? (Array.isArray(payroll.holidays) ? payroll.holidays.length : 0)) || 0;
    const holidayCount = isProjectBased ? 0 : holidayCountRaw;

    const totalCreditDays = getTotalCreditDays(payroll);
    const totalCreditStr = totalCreditDays.toFixed(2);
    const grossSalaryStr = Number(baseGross).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const grossInclStr = Number(grossSalaryWithAllowancesAndExtras).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const commissionStr = Number(commissionAmount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const isBlink = blinkPayrollId && blinkPayrollId === payroll.employee_id;
    const blinkStyle = isBlink ? { backgroundColor: "rgba(34,197,94,0.12)" } : undefined;

    const grossToUseForDisplayAndCalc = (hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0)
      ? (parseFloat(payroll.half_month_salary) || 0)
      : grossSalaryWithAllowancesAndExtras;

    const displayedNetValue = Number((grossToUseForDisplayAndCalc - totalDeduction).toFixed(2));

    const rewardEligibility = payroll.rewards_eligibility ?? null;
    const rewardEligible = rewardEligibility ? !!rewardEligibility.eligible : (rewardTotal > 0);
    const rewardReason = rewardEligibility?.reason ?? null;
    const rewardType = rewardEligibility?.type ?? null;
    const rewardThreshold = rewardEligibility?.threshold ?? null;

    return (
      <div style={style} className="px-2">
        <div
          key={payroll.payroll_id}
          className="flex flex-col gap-4 px-4 py-4 bg-white border border-gray-200 rounded-lg shadow-sm lg:grid lg:grid-cols-6 hover:shadow-md"
          style={blinkStyle}
        >
          {/* Checkbox */}
          <div className="flex items-start justify-end pt-1 lg:justify-center">
            <input
              type="checkbox"
              checked={selected.includes(payroll.payroll_id)}
              onChange={() => onSelect(payroll.payroll_id)}
              className="w-5 h-5"
            />
          </div>

          {/* Employee Details */}
          <div>
            <div className="font-semibold text-gray-800">{payroll.name}</div>
            <div className="text-xs text-gray-600">Employee ID: {payroll.employee_id}</div>
            <div className="text-xs text-gray-600">Payroll ID: {payroll.payroll_id}</div>
            <div className="mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${payroll.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {payroll.status}
              </span>
            </div>

            <div className="mt-1">
              <EmployeeTypeBadge
                type={payroll.employee_type}
                editable
                onChange={(newType) =>
                  handleEmployeeTypeChange(
                    payroll.employee_id,
                    newType,
                    payroll.employee_type,
                    payroll.name
                  )
                }
              />
            </div>

            {/* Commission Based */}
            <div className="mt-2">
              <label className="block text-[11px] text-gray-500 mb-1">Commission Based</label>

              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-2 w-[180px]">
                  <CommissionBasedBadge
                    value={payroll.commission_based}
                    editable
                    className="w-full"
                    onChange={(newValue) =>
                      handleCommissionBasedChange(
                        payroll.payroll_id,
                        payroll.employee_id,
                        newValue,
                        payroll.commission_based,
                        payroll.name,
                        payroll.date_from,
                        payroll.date_until,
                        payroll.total_commission
                      )
                    }
                  />

                  {(String(payroll.commission_based).toLowerCase() === "yes" ||
                    payroll.commission_based === 1 ||
                    payroll.payroll_based === true) && (
                    <button
                      onClick={() => openCommissionModal(payroll)}
                      className="w-full px-3 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                    >
                      Edit Commission
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Days */}
          <div>
            <div className="flex justify-between pb-1 mb-1 text-xs text-gray-500 border-b">
              <span>{formatDate(payroll.date_from)}</span>
              <span>{formatDate(payroll.date_until)}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Total Days:</span>
              <span className="font-medium">{payroll.total_days}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Total Rendered Hours:</span>
              <span className="font-medium">{payroll.total_rendered_hours}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-700">
              <span>Overtime:</span>
              <span className="font-medium">{payroll.total_overtime_request}</span>
            </div>

            {/* Leaves display */}
            <div className="mt-1 text-xs text-gray-700">
              {Array.isArray(payroll.leaves) && payroll.leaves.length > 0 ? (
                <div className="space-y-1">
                  <div className="text-[11px] text-gray-500">Leaves:</div>
                  {payroll.leaves.map((lv, idx) => {
                    const leaveName = lv.leave_type ?? lv.leave_name ?? lv.name ?? "Leave";
                    const leaveDays = (typeof lv.leave_days_cutoff !== "undefined")
                      ? parseFloat(lv.leave_days_cutoff || 0)
                      : (typeof lv.total_days !== "undefined" ? parseFloat(lv.total_days || 0) : 0);

                    return (
                      <div key={`leave-${idx}`} className="flex justify-between">
                        <span className="truncate" title={leaveName}>{leaveName}</span>
                        <span className="font-medium">{Number(leaveDays).toFixed(2)} day{leaveDays !== 1 ? "s" : ""}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-gray-400">No leaves</div>
              )}
            </div>

            <div className="flex items-center justify-between mt-1">
              <div>
                {holidayCount > 0 ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">H ×{holidayCount}</span>
                ) : (
                  <span className="text-xs text-gray-400">No holidays</span>
                )}
              </div>
              <div style={{ minWidth: 120 }} />
            </div>

            <div className="flex flex-col text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <span>Total Credit:</span>
                <span className="font-semibold text-green-600">{totalCreditStr}</span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs">Incentive:</span>
                <span className="font-semibold text-green-600">{formatPHP(incentiveAmount)}</span>
              </div>

              <div className="flex flex-col mt-1 space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="flex items-center w-full min-w-0 md:items-center md:w-auto md:flex-1">
                  <span className={`text-xs ${othersNet >= 0 ? "text-green-700" : "text-red-700"}`}>Others:</span>
                  <div className="flex-1 min-w-0 ml-2">
                    {(
                      (Array.isArray(payroll.rewards) && payroll.rewards.length > 0) ||
                      (deductionOneoff > 0)
                    ) ? (
                      <div className="flex items-center min-w-0 gap-2">
                        {Array.isArray(payroll.rewards) && payroll.rewards.slice(0,2).map((rw, idx) => {
                          const title = (rw.description || rw.name || rw.title || `Reward ${idx+1}`).toString();
                          const applyInfo = rewardAppliesToPayroll(rw, payroll);
                          const pillClass = applyInfo.applies ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100";
                          return (
                            <div key={`r-${idx}`} className={`flex items-center gap-2 px-2 py-0.5 text-[11px] rounded-md border ${pillClass} truncate`} title={`${title} — ${applyInfo.reason}`}>
                              <div className={`w-2 h-2 rounded-full ${applyInfo.applies ? "bg-green-600" : "bg-red-600"}`} />
                              <div className="truncate">{title}</div>
                            </div>
                          );
                        })}
                        {deductionOneoff > 0 && (
                          <div className="flex items-center gap-2 px-2 py-0.5 text-[11px] rounded-md border bg-red-50 text-red-700 border-red-100 truncate">
                            <div className="w-2 h-2 bg-red-600 rounded-full" />
                            <div className="truncate">Deduction {formatPHP(deductionOneoff)}</div>
                          </div>
                        )}
                        {Array.isArray(payroll.rewards) && payroll.rewards.length > 2 && <div className="text-[11px] text-gray-400">…</div>}
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400">No others</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end w-full space-x-2 md:w-auto">
                  <div className="text-right min-w-[110px]">
                    <div className={`font-semibold ${othersNet >= 0 ? "text-green-600" : "text-red-500"} text-sm`}>
                      <span className="mr-1">{othersNet >= 0 ? "+" : "-"}</span>{formatPHP(Math.abs(othersNet))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs">Retro:</span>
                <span className="font-semibold text-green-600">{formatPHP(retroApplied)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Base Pay:</span>
                <span className="font-semibold ">₱{payroll.basic_salary}</span>
              </div>
            </div>

            {payroll.salary_type === "monthly" && (
              <div className="pt-2 mt-2 text-xs text-gray-700 border-t">
                <div className="flex justify-between">
                  <span>Basic Pay</span>
                  <span className="font-medium text-green-600">₱{payroll.half_month_salary || "0.00"}</span>
                </div>
              </div>
            )}

            {!permLoading && permissions?.can_view && !hasLateSalaryRecord && (
              <div className="flex flex-col gap-1 mt-2 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span>Gross (base):</span>
                  <span className={`font-semibold ${commissionOverridesBase ? "line-through text-gray-400" : "text-green-600"}`}>₱ {grossSalaryStr}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-700">
                  <span>Commission:</span>
                  <span className={`font-semibold ${commissionOverridesBase ? "text-indigo-600" : "text-green-600"}`}>₱ {commissionStr}</span>
                </div>

                <div className="flex justify-between text-[11px] mt-1">
                  <span className="text-gray-500">Commission Based:</span>
                  <span className={`font-semibold ${commissionBased ? "text-indigo-600" : "text-gray-500"}`}>{commissionBased ? "Yes" : "No"}</span>
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  <div className="font-medium">Allowances:</div>
                  { Array.isArray(payroll.allowances) && payroll.allowances.length > 0 ? (
                    payroll.allowances.map((a) => (
                      <div key={a.journal_id || `${a.allowance_id}-${a.applied_amount}`} className="flex justify-between">
                        <span>{a.allowance_name || 'Allowance'}</span>
                        <span className="font-semibold text-green-600">
                          ₱{(parseFloat(a.applied_amount) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between">
                      <span>Total allowances:</span>
                      <span className="font-semibold text-green-600">₱{allowanceTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ) }
                </div>

                <div className="flex justify-between">
                  <span className="font-medium">Gross w(ALL/INC/RTA/REW):</span>
                  <span className="font-semibold text-green-600">₱{grossInclStr}</span>
                </div>
              </div>
            )}
          </div>

          {/* Deductions */}
          <div className="space-y-1 text-xs text-gray-700">
            <div className="flex justify-between">
              <span>SSS:</span>
              <span>{(hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0 ? (displayedSSS/2) : displayedSSS).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pag-IBIG:</span>
              <span>{(hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0 ? (displayedPagibig/2) : displayedPagibig).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>PhilHealth:</span>
              <span>{(hasLateSalaryRecord && parseFloat(payroll.half_month_salary) > 0 ? (displayedPhilhealth/2) : displayedPhilhealth).toFixed(2)}</span>
            </div>

            {payroll.salary_type === "monthly" && (
              <div>
                <div className="flex justify-between">
                  <span>Total Late Hours:</span>
                  <span className="font-medium text-red-600">{payroll.total_late_hours || "0.00"} hrs</span>
                </div>
                <div className="flex justify-between">
                  <span>Absent/Late Deduction:</span>
                  <span className="font-medium text-red-600">₱{payroll.late_deduction || "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross Pay</span>
                  <span className="font-medium text-green-600">₱{payroll.total_salary_after_late || "0.00"}</span>
                </div>
              </div>
            )}

            {!permLoading && permissions?.can_view && (
              <div className="flex justify-between">
                <span className="font-medium text-gray-800">Loan Deduction:</span>
                <span className={`font-medium ${hasSkipLoan ? "text-red-500" : "text-gray-700"}`}>₱{loanDeductionApplied.toFixed(2)} {hasSkipLoan ? "(Skipped)" : ""}</span>
              </div>
            )}

            {!permLoading && permissions?.can_view && (
              <div className="flex justify-between font-semibold text-red-600">
                <span>Total Deduction:</span>
                <span>₱{totalDeduction.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-xs text-gray-700">
            {!permLoading && permissions?.can_view && (
              <div className="flex justify-between">
                <span>Net Salary:</span>
                <span className="font-semibold text-green-600">₱{Number(displayedNetValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>

          {/* Action Dropdown -> now opens modal */}
          <div className="flex justify-end">
            <PayrollDropdownButton
              onToggle={() => openLayoutModal(payroll)}
              payrollId={payroll.payroll_id}
              onDeductionUpdate={(newDeduction) => updateLoanDeduction(payroll.payroll_id, newDeduction)}
            />
          </div>

        </div>
      </div>
    );
  };

  // Loading skeleton component
  const Skeleton = () => {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 bg-white border rounded-lg animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded" />
              <div className="flex-1">
                <div className="w-3/4 h-4 mb-2 bg-gray-200 rounded" />
                <div className="w-1/2 h-3 bg-gray-200 rounded" />
              </div>
            </div>
            <div className="flex gap-4 mt-3">
              <div className="w-1/3 h-3 bg-gray-200 rounded" />
              <div className="w-1/3 h-3 bg-gray-200 rounded" />
              <div className="w-1/6 h-3 bg-gray-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Final render
  return (
    <div className="mt-6">
      {/* Header row */}
      <div className="items-center hidden grid-cols-6 gap-4 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 border-b md:grid">
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            onChange={onSelectAll}
            checked={
              (() => {
                const activeCount = (data || []).filter(p => String(p.status).toLowerCase() === "active").length;
                if (activeCount === 0) return false;
                const activeIds = (data || []).filter(p => String(p.status).toLowerCase() === "active").map(p => p.payroll_id);
                return activeIds.length > 0 && activeIds.every(id => selected.includes(id));
              })()
            }
          />
        </div>
        <div>Employee Details</div>
        <div>Days</div>
        <div>Deductions</div>
        <div>Total</div>
        <div></div>
      </div>

      {/* Loading overlay + skeletons */}
      <div className="relative">
        {loading && (
          <>
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80">
              <div className="flex flex-col items-center gap-3">
                <svg className="w-12 h-12 animate-spin" viewBox="0 0 50 50" aria-hidden="true">
                  <circle cx="25" cy="25" r="20" fill="none" strokeWidth="5" stroke="currentColor" strokeOpacity="0.15" />
                  <path d="M45 25a20 20 0 0 1-20 20" fill="none" strokeWidth="5" stroke="currentColor" strokeLinecap="round" />
                </svg>
                <div className="text-sm text-gray-600">Loading payrolls…</div>
              </div>
            </div>

            <div className="pt-4">
              <Skeleton />
            </div>
          </>
        )}

        {!loading && (!Array.isArray(payrollList) || payrollList.length === 0) && (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-gray-500">
            <UserRound size={36} className="text-gray-300" />
            <div className="text-sm">No payrolls found.</div>
          </div>
        )}

        {/* Virtualized list */}
        {!loading && Array.isArray(payrollList) && payrollList.length > 0 && (
          <div style={{ width: "100%", height: listHeight }}>
            <List
              height={listHeight}
              itemCount={payrollList.length}
              itemSize={getItemSize}
              width="100%"
              ref={listRef}
              overscanCount={4}
            >
              {Row}
            </List>
          </div>
        )}
      </div>

      {/* ---------- LAYOUT MODAL (replaces inline dropdown) ---------- */}
      {layoutModalOpen && layoutModalPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeLayoutModal}
          />
          <div className="relative p-6 bg-white shadow-xl rounded-2xl h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Payroll Details</h2>
                <p className="text-xs text-gray-500">{layoutModalPayroll.name} — {formatDate(layoutModalPayroll.date_from)} → {formatDate(layoutModalPayroll.date_until)}</p>
              </div>
              <div>
                <button onClick={closeLayoutModal} className="px-3 py-1 text-sm text-gray-600 border rounded-full hover:bg-gray-50">Close</button>
              </div>
            </div>
            <div className="max-h-[80vh] overflow-auto">
              <PayrollLayoutDropdown
              selectedPayroll={layoutModalPayroll}
              formatDate={formatDate}
              onDeductionUpdate={(newDeduction) => {
                // update parent payroll list immediately
                if (layoutModalPayroll && layoutModalPayroll.payroll_id) {
                  updateLoanDeduction(layoutModalPayroll.payroll_id, newDeduction);
                }
              }}
            />
            </div>

          </div>
        </div>
      )}

      {/* ---------- COMMISSION MODAL (moved to top-level so virtualized rows won't hide it) ---------- */}
      {commissionModalOpen && selectedPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white w-[420px] rounded-2xl shadow-xl p-6 relative">

            {/* Header */}
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Edit Commission</h2>
              <p className="text-xs text-gray-500">{selectedPayroll.name}</p>
              <p className="text-xs text-gray-400">{selectedPayroll.date_from} → {selectedPayroll.date_until}</p>
            </div>

            {/* Input */}
            <div className="mb-5">
              <label className="block mb-1 text-xs text-gray-500">Commission Amount</label>

              <div className="flex items-center gap-2">
                <span className="px-3 py-2 text-sm border rounded-full bg-gray-50">₱</span>

                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={selectedPayroll.total_commission}
                  onChange={(e) =>
                    setSelectedPayroll(prev => ({
                      ...prev,
                      total_commission: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 text-sm border rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={closeCommissionModal}
                className="px-4 py-2 text-sm text-gray-600 border rounded-full hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  handleCommissionAmountSave(
                    selectedPayroll.payroll_id,
                    selectedPayroll.employee_id,
                    selectedPayroll.total_commission,
                    selectedPayroll.date_from,
                    selectedPayroll.date_until,
                    selectedPayroll.name
                  );
                  closeCommissionModal();
                }}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-700"
              >
                Save
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
