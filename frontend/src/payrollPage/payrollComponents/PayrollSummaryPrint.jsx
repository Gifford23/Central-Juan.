// payrollComponents/PayrollSummary.jsx
import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import useLoanSkipAPI from "../../components/loan/loan_hooks/useLoanSkipAPI"; // to determine skipped loans
import ExcelJS from "exceljs";
import exportXLSX from "./exportXLSX";
import { fmtNumber, escapeHtml, coalesce } from "./helper";

/* NOTE: CSV export removed as requested. */

export default function PayrollSummary(props) {
  var open = props.open;
  var onClose = props.onClose;
  var payrolls = props.payrolls || [];

  const [enriched, setEnriched] = useState([]);
  const loanSkipHook = useLoanSkipAPI();
  const skipRequests = (loanSkipHook && loanSkipHook.skipRequests) ? loanSkipHook.skipRequests : [];

  // === Grid column definitions ===
  var colDefs = [
    "minmax(180px, 1fr)", // Employee (flexible)
    "minmax(72px, max-content)", // Base
    "minmax(72px, max-content)", // Allow
    "minmax(72px, max-content)", // Inc
    "minmax(72px, max-content)", // Retro
    "minmax(72px, max-content)", // Others (was Rew)
    "minmax(90px, max-content)", // Gross
    "minmax(72px, max-content)", // HalfGross
    "minmax(72px, max-content)", // AfterLate
    "minmax(72px, max-content)", // Late
    "minmax(72px, max-content)", // SSS
    "minmax(72px, max-content)", // PhilHealth
    "minmax(72px, max-content)", // Pag-IBIG
    "minmax(72px, max-content)", // Loan
    "minmax(72px, max-content)", // PayrollJ
    "minmax(90px, max-content)", // Total Ded
    "minmax(110px, max-content)", // Net
    "minmax(90px, max-content)", // Type
    "minmax(90px, max-content)", // Status
    "minmax(120px, max-content)", // Dept
    "minmax(64px, max-content)", // Days
    "minmax(64px, max-content)", // OT
    "minmax(64px, max-content)", // Leaves (NEW)
    "minmax(64px, max-content)", // Hrs
    "minmax(64px, max-content)", // Holidays
    "minmax(64px, max-content)"  // Total Credit (NEW)
  ];
  var gridTemplate = colDefs.join(" ");

  /* ---------- NEW: dynamic grid template + gap based on data length ---------- */
  const dynamicGrid = useMemo(() => {
    const samples = (Array.isArray(enriched) && enriched.length) ? enriched : (Array.isArray(payrolls) ? payrolls : []);

    const headersForMeasure = [
      "Employee","Base","Allow","Inc","Retro","Others","Gross","HalfGross","AfterLate","Late",
      "SSS","PhilHealth","Pag-IBIG","Loan","PayrollJ","Total Ded","Net","Type","Status","Dept",
      "Days","OT","Leaves","Hrs","Holidays","Total Credit"
    ];

    const extractors = [
      p => p && (p.name || p.display_name || "") || "",
      p => p && (String(p.basic_salary || p.daily_rate || "")) || "",
      p => p && (String(p.total_allowances || (p.allowances ? p.allowances.length : ""))) || "",
      p => p && String(p.total_incentives || "") || "",
      p => p && String(p.total_retro_applied || "") || "",
      // switch to measuring 'others_net' instead of total_rewards
      p => p && String(p.others_net ?? p.total_rewards ?? "") || "",
      p => p && String(p.gross_computed || p.total_salary_raw || p.backend_gross || "") || "",
      p => p && String(p.half_month_salary || "") || "",
      p => p && String(p.total_salary_after_late || "") || "",
      p => p && String(p.late_deduction || "") || "",
      p => p && String(p.adjustedSSS || p.displayedSSS || p.sss || "") || "",
      p => p && String(p.adjustedPhilhealth || p.displayedPhilhealth || p.philhealth || "") || "",
      p => p && String(p.adjustedPagibig || p.displayedPagibig || p.pagibig || "") || "",
      p => p && (Array.isArray(p.loans) ? String(p.loans.length) : String(p.loan_deduction_actual || "")) || "",
      p => p && String(p.payroll_level_journal_credit_sum || "") || "",
      p => p && String(p.total_deductions_raw || "") || "",
      p => p && String(p.net_pay_raw || "") || "",
      p => p && String(p.employee_type || "") || "",
      p => p && String(p.status || "") || "",
      p => p && String(p.department_name || p.department || "") || "",
      p => p && String(p.total_days || "") || "",
      p => p && String(p.total_overtime_request || p.total_overtime || "") || "",
      p => p && String(p.paid_leaves_days || p.paid_leaves || "") || "",
      p => p && String(p.total_rendered_hours || p.rendered_hours || "") || "",
      p => p && String(p.holiday_count || "") || "",
      p => p && String(p.total_credit || "") || ""
    ];

    const defaultMin = [180,72,72,72,72,72,90,72,72,72,72,72,72,72,72,90,110,90,90,120,64,64,64,64,64,64];
    const defaultMax = [420,120,120,120,120,120,160,120,120,120,120,120,120,120,120,160,220,140,140,200,96,96,96,96,96,96];

    const maxLens = headersForMeasure.map((h, idx) => {
      let maxLen = String(h || "").length;
      for (let i = 0; i < samples.length; i++) {
        try {
          const v = String(extractors[idx](samples[i]) || "");
          if (v.length > maxLen) maxLen = v.length;
        } catch (e) {}
      }
      return maxLen;
    });

    const pxFor = maxLens.map((len, idx) => {
      const approx = Math.ceil(len * 7 + 20);
      const minPx = defaultMin[idx] || 60;
      const maxPx = defaultMax[idx] || 300;
      return Math.max(minPx, Math.min(approx, maxPx));
    });

    const parts = pxFor.map((px, idx) => {
      if (idx === 0) return `minmax(${px}px, 1fr)`;
      return `minmax(${px}px, max-content)`;
    });

    const empLen = maxLens[0] || 10;
    const gridGapPx = Math.max(6, Math.min(18, 6 + Math.round((empLen - 10) / 8)));

    return { template: parts.join(" "), gap: gridGapPx };
  }, [enriched, payrolls]);

  /* ------------------------------------------------------------------------- */

  useEffect(function () {
    if (!open) return;
    if (!Array.isArray(payrolls)) { setEnriched([]); return; }

    const toDayStart = function (d) { if (!d) return null; var dt = new Date(d); dt.setHours(0,0,0,0); return dt.getTime(); };
    const toDayEnd = function (d) { if (!d) return null; var dt = new Date(d); dt.setHours(23,59,59,999); return dt.getTime(); };
    const parseJournals = function (maybe) { if (!maybe) return []; if (Array.isArray(maybe)) return maybe; try { return JSON.parse(maybe); } catch (e) { return []; } };

    var sumCreditEntries = function (arr, payrollFrom, payrollUntil) {
      arr = Array.isArray(arr) ? arr : [];
      var fromT = toDayStart(payrollFrom);
      var untilT = toDayEnd(payrollUntil);
      var s = 0;
      for (var i = 0; i < arr.length; i++) {
        var j = arr[i];
        if (!j) continue;
        var entryType = (j.entry_type || j.type || "").toString().toLowerCase();
        if (entryType !== "credit") continue;
        var jd = j.entry_date || j.created_at || j.date || null;
        if (!jd) continue;
        var jt = new Date(jd).getTime();
        if ((fromT !== null && jt < fromT) || (untilT !== null && jt > untilT)) continue;
        var amt = parseFloat(j.amount || j.value || j.amt || 0) || 0;
        s += amt;
      }
      return Number(s.toFixed(2));
    };

    var sumPayrollLevelJournalCredits = function (payroll) {
      var payrollJ = parseJournals(
        payroll && (payroll.journal_entries || payroll.journals || payroll.payroll_journal_entries || payroll.journals_raw || payroll.payroll_journals) || []
      );
      return sumCreditEntries(payrollJ, payroll && payroll.date_from, payroll && payroll.date_until);
    };

    var computeLoansAndLoanJournalSums = function (loans, payrollFrom, payrollUntil) {
      loans = Array.isArray(loans) ? loans : [];
      var totalLoanJournal = 0;
      var enrichedLoans = loans.map(function (l) {
        var loanJ = parseJournals(l && (l.journal_entries || l.journals || l.loan_journal_entries || l.loan_journals) || []);
        var journal_sum_this_cut = sumCreditEntries(loanJ, payrollFrom, payrollUntil);
        var deduction_actual_backend = Number(coalesce(l && l.deduction_actual, l && l.deduction, l && l.deduction_amount, 0)) || 0;
        var deduction_actual_final = journal_sum_this_cut > 0 ? Number(journal_sum_this_cut.toFixed(2)) : Number(deduction_actual_backend.toFixed(2));
        totalLoanJournal += journal_sum_this_cut;
        var copy = Object.assign({}, l);
        copy.journal_sum_this_cut = journal_sum_this_cut;
        copy.deduction_actual_final = deduction_actual_final;
        return copy;
      });
      return { enrichedLoans: enrichedLoans, totalLoanJournal: Number(totalLoanJournal.toFixed(2)) };
    };

    var computeAllowanceTotal = function (payroll) {
      if (!payroll) return 0;
      var ta = payroll.total_allowances;
      if (ta !== undefined && ta !== null) return Number(ta) || 0;
      var arr = Array.isArray(payroll.allowances) ? payroll.allowances : [];
      return arr.reduce(function (s, a) { return s + (parseFloat(a && (a.applied_amount || a.amount || a.value) || 0) || 0); }, 0);
    };

    var computeRewardTotal = function (payroll) {
      if (!payroll) return 0;
      var tr = payroll.total_rewards;
      if (tr !== undefined && tr !== null) return Number(tr) || 0;
      var arr = Array.isArray(payroll.rewards) ? payroll.rewards : [];
      return arr.reduce(function (s, r) { return s + (parseFloat(r && (r.amount || r.applied_amount || r.value) || 0) || 0); }, 0);
    };

    // ---------- START: helper to compute final government contributions ----------
    var computeFinalGovContribs = function (rawPhil, rawSss, rawPagibig, contribution_deduction_type, dateUntil, hasHalfMonthRecord, halfMonthSalary) {
      var isSemiMonthly = String(contribution_deduction_type || "").toLowerCase() === "semi-monthly";
      var useHalfRecord = !!hasHalfMonthRecord && Number(halfMonthSalary || 0) > 0;

      // If it's semi-monthly OR it's a half-month run => half the raw (single rule)
      if (isSemiMonthly || useHalfRecord) {
        return {
          phil: Number((Number(rawPhil || 0) / 2.0).toFixed(2)),
          sss:  Number((Number(rawSss || 0) / 2.0).toFixed(2)),
          pag:  Number((Number(rawPagibig || 0) / 2.0).toFixed(2))
        };
      }

      // If payroll ends on/after 20th, use full amounts
      if (!isNaN(Number(dateUntil)) && Number(dateUntil) >= 20) {
        return {
          phil: Number(Number(rawPhil || 0).toFixed(2)),
          sss:  Number(Number(rawSss || 0).toFixed(2)),
          pag:  Number(Number(rawPagibig || 0).toFixed(2))
        };
      }

      // Otherwise no contribution for this run
      return { phil: 0, sss: 0, pag: 0 };
    };
    // ---------- END: helper ----------

    var out = payrolls.map(function (payroll) {
      var payrollFrom = payroll && payroll.date_from;
      var payrollUntil = payroll && payroll.date_until;

      // ---- START: Fix salary-type / base selection logic ----
      var salaryType = String(coalesce(payroll && payroll.salary_type, "")).toLowerCase();
      var monthlyRate = Number(coalesce(payroll && payroll.monthly_rate, 0)) || 0;

      // Always capture the daily base if provided (this is the true daily rate)
      var basic_daily_salary = Number(coalesce(payroll && payroll.basic_salary, payroll && payroll.daily_rate, 0)) || 0;

      // basic_salary variable used later for computations: for monthly employees prefer monthlyRate (so it's explicit),
      // for daily employees use the daily base.
      var basic_salary = (salaryType === "monthly" && monthlyRate > 0) ? Number(monthlyRate) : basic_daily_salary;

      var total_days = Number(coalesce(payroll && payroll.total_days, 0)) || 0;
      var total_overtime_request = Number(coalesce(payroll && payroll.total_overtime_request, payroll && payroll.total_overtime, 0)) || 0;
      var total_rendered_hours = Number(coalesce(payroll && payroll.total_rendered_hours, payroll && payroll.rendered_hours, 0)) || 0;

      // ---- START: Normalized overtime handling (KEEP OT RAW as requested) ----
      var workHoursPerDay = Number(coalesce(payroll && payroll.work_hours_per_day, payroll && payroll.work_hours, 8)) || 8;
      var rawOvertime = Number(total_overtime_request || 0);
      // IMPORTANT: OT must remain raw — do NOT convert to days. Preserve rawOvertime.
      var overtimeDays = rawOvertime;
      // ---- END: Normalized overtime handling ----

      // Compute base_gross depending on salary type:
      // - monthly: use half-month salary as the canonical "base" for this payroll (backend usually provides half_month_salary)
      // - daily: use daily basic_salary * (worked days + OT (RAW) )
      var half_month_salary_backend = Number(coalesce(payroll && payroll.half_month_salary, 0)) || 0;

      var base_gross;
      if (salaryType === "monthly" && half_month_salary_backend > 0) {
        base_gross = Number(half_month_salary_backend);
      } else {
        base_gross = Number((basic_daily_salary * (total_days + overtimeDays)) || 0);
      }

      var total_allowances = Number(computeAllowanceTotal(payroll) || 0);
      var total_incentives = Number(coalesce(payroll && payroll.total_incentives, payroll && payroll.incentives_total, payroll && payroll.incentive_amount, 0)) || 0;
      var total_retro_applied = Number(coalesce(payroll && payroll.total_retro_applied, payroll && payroll.retro_applied, 0)) || 0;
      var total_rewards = Number(computeRewardTotal(payroll) || 0);

      // read one-off payroll deduction if provided
      var deduction_oneoff = Number(coalesce(payroll && payroll.deduction_oneoff, payroll && payroll.deduction_oneoff_amount, 0)) || 0;
      var deduction_oneoff_details = payroll && payroll.deduction_oneoff_details ? payroll.deduction_oneoff_details : null;

      var backendGross = Number(coalesce(payroll && payroll.total_salary_raw, payroll && payroll.total_salary, 0)) || 0;

      // compute others_net = rewards - oneoff deduction
      var others_net = Number((total_rewards - deduction_oneoff).toFixed(2));

      var gross_components = {
        base_gross: Number(base_gross.toFixed(2)),
        allowances: Number(total_allowances.toFixed(2)),
        incentives: Number(total_incentives.toFixed(2)),
        retro: Number(total_retro_applied.toFixed(2)),
        // NOTE: store 'others' (rewards minus one-off deduction)
        others: Number(others_net.toFixed(2)),
        // keep original rewards too if needed downstream
        rewards: Number(total_rewards.toFixed(2))
      };
      var gross_computed = Number((gross_components.base_gross + gross_components.allowances + gross_components.incentives + gross_components.retro + gross_components.others).toFixed(2));

      // ---- START: SALARY_TYPE LOGIC (client-side mirroring of payroll.php behaviour) ----
      var totalLateHoursBackend = Number(coalesce(payroll && payroll.total_late_hours, payroll && payroll.total_late_hours, 0)) || 0;

      var daily_rate_for_late = 0;
      var half_month_salary_calc = 0;

      if (monthlyRate > 0 && salaryType === "monthly") {
        var annual_salary = monthlyRate * 12.0;
        daily_rate_for_late = annual_salary / 365.0;
        half_month_salary_calc = monthlyRate / 2.0;
      } else {
        // ensure we use the true daily base for late calculations (basic_daily_salary)
        daily_rate_for_late = basic_daily_salary;
        if (payroll && payroll.total_salary && Number(payroll.total_salary) > 0) {
          half_month_salary_calc = Number(payroll.total_salary);
        } else {
          half_month_salary_calc = basic_daily_salary * Number(total_days || 0);
        }
      }

      var hourly_rate_for_late = (daily_rate_for_late > 0) ? (daily_rate_for_late / 8.0) : 0.0;
      var late_deduction_calc = Number((hourly_rate_for_late * totalLateHoursBackend).toFixed(2));

      var total_salary_after_late_calc = Math.max(half_month_salary_calc - late_deduction_calc, 0.0);

      var half_month_salary = 0;
      var total_salary_after_late = 0;
      var late_deduction = 0;

      if (salaryType === "monthly" && monthlyRate > 0) {
        half_month_salary = Number(half_month_salary_calc.toFixed(2));
        late_deduction = Number(late_deduction_calc.toFixed(2));
        total_salary_after_late = Number(total_salary_after_late_calc.toFixed(2));
      } else {
        half_month_salary = Number(half_month_salary_calc.toFixed(2));
        late_deduction = Number(late_deduction_calc.toFixed(2));
        total_salary_after_late = Number(total_salary_after_late_calc.toFixed(2));
      }

      // ---- END: SALARY_TYPE LOGIC ----

      // --- ADJUST base_gross FOR MONTHLY: preserve daily base and set effective base for calculations
      try {
        // keep original daily computation for auditing/display
        const base_gross_daily = Number((basic_daily_salary * (total_days + overtimeDays)) || 0);
        // effective base (what calculations use) defaults to daily
        let base_gross_effective = base_gross_daily;

        if (String(salaryType).toLowerCase() === "monthly" && Number(half_month_salary) > 0) {
          base_gross_effective = Number(Number(half_month_salary).toFixed(2));
        } else {
          base_gross_effective = Number(base_gross_daily.toFixed(2));
        }

        // update gross_components: keep daily value and set effective base_gross used by gross_computed
        if (gross_components) {
          gross_components.base_gross_daily = Number(base_gross_daily.toFixed(2)); // preserve original daily computation
          gross_components.base_gross = Number(base_gross_effective.toFixed(2));   // effective base (monthly half or daily)
          gross_computed = Number((gross_components.base_gross + gross_components.allowances + gross_components.incentives + gross_components.retro + gross_components.others).toFixed(2));
        }
      } catch (e) {
        // fail safe: leave previous values if something unexpected happens
      }
      // --- end adjust ---

      var contribution_deduction_type = coalesce(payroll && payroll.contribution_deduction_type, payroll && payroll.contribution_type, "");
      var isSemiMonthly = String(contribution_deduction_type).toLowerCase() === "semi-monthly";
      var dateUntil = payroll && payroll.date_until ? new Date(payroll.date_until).getDate() : 0;

      var raw_philhealth = Number(coalesce(payroll && payroll.philhealth_employee_share, payroll && payroll.philhealth, 0)) || 0;
      var raw_sss = Number(coalesce(payroll && payroll.sss_employee_share, payroll && payroll.sss, 0)) || 0;
      var raw_pagibig = Number(coalesce(payroll && payroll.pagibig_employee_share, payroll && payroll.pagibig, 0)) || 0;

      // keep raw displayed values for auditing
      var displayedPhilhealth = Number(raw_philhealth.toFixed(2));
      var displayedSSS = Number(raw_sss.toFixed(2));
      var displayedPagibig = Number(raw_pagibig.toFixed(2));

      // determine whether this is a half-month record (monthly with half_month_salary > 0)
      var hasHalfMonthRecord = (String(salaryType).toLowerCase() === "monthly" && Number(half_month_salary) > 0);

      // compute final adjusted contributions using a single source-of-truth helper
      var finalGC = computeFinalGovContribs(raw_philhealth, raw_sss, raw_pagibig, contribution_deduction_type, dateUntil, hasHalfMonthRecord, half_month_salary);

      var adjPhilhealth = Number(finalGC.phil || 0);
      var adjSSS = Number(finalGC.sss || 0);
      var adjPagibig = Number(finalGC.pag || 0);

      var loansArray = Array.isArray(payroll && payroll.loans) ? payroll.loans : [];
      var loanComputation = computeLoansAndLoanJournalSums(loansArray, payrollFrom, payrollUntil);
      var enrichedLoans = loanComputation.enrichedLoans;
      var totalLoanJournal = loanComputation.totalLoanJournal;

      var payroll_level_journal_credit_sum = Number(sumPayrollLevelJournalCredits(payroll) || 0);
      var combined_journal_credit_sum = Number((payroll_level_journal_credit_sum + totalLoanJournal).toFixed(2));
      var fallbackPayrollLoan = Number(parseFloat(coalesce(payroll && payroll.loan_deduction_actual, payroll && payroll.loan_deduction, payroll && payroll.loan_deduction_applied, 0)) || 0);
      var loan_deduction_actual = combined_journal_credit_sum > 0 ? combined_journal_credit_sum : fallbackPayrollLoan;

      var hasSkipLoan = loansArray.some(function (l) {
        var loanIdCandidates = [l && l.loan_id, l && l.id, l && l._loan_id, l && l.legacy_loan_id].filter(Boolean);
        return skipRequests.some(function (req) {
          var matchId = loanIdCandidates.some(function (id) { return String(id) === String(req && req.loan_id); });
          return matchId && String(req && req.status).toLowerCase() === "approved";
        });
      });

      // ---------- FIX: avoid double-counting statutory contributions ----------
      var backendTotalDeductionsRaw = Number(coalesce(payroll && payroll.total_deductions_raw, payroll && payroll.total_deductions, 0)) || 0;

      var loanActualNumeric = Number(loan_deduction_actual || 0) || 0;
      var sssNumeric = Number(adjSSS || 0) || 0;
      var phicNumeric = Number(adjPhilhealth || 0) || 0;
      var hdmfNumeric = Number(adjPagibig || 0) || 0;

      // ---------- IMPORTANT CHANGE: Only include Loan + Gov contributions (+ Late for monthly) in Total Ded ----------
      // We intentionally exclude "others" and any other miscellaneous backend deduction lines from Total Ded.
      // computedOtherCharges is set to zero and baselineDeductions built from loanActualNumeric + adjusted gov shares.
      var computedOtherCharges = 0; // intentionally ignore other backend deduction lines per requirement

      var baselineDeductions = Number((loanActualNumeric + sssNumeric + phicNumeric + hdmfNumeric + computedOtherCharges).toFixed(2));

      // ---------- CHANGE: include late_deduction into total_deductions for monthly payrolls ----------
      var totalDeductionsForCalc = baselineDeductions;
      if (salaryType === "monthly") {
        totalDeductionsForCalc = Number((baselineDeductions + Number(late_deduction || 0)).toFixed(2));
      }

      // ---------- NOTE: we DO NOT compute net here yet because gross_computed may be recalculated below (total_credit override).
      // we will compute net after the final gross_computed value is settled.
      // ----------

      var canonical_total_salary_raw = Number(gross_computed.toFixed(2));

      var holidaysArray = Array.isArray(payroll && payroll.holidays) ? payroll.holidays : (payroll && payroll.holidays ? payroll.holidays : []);
      var holiday_count = Number(coalesce(payroll && payroll.holiday_count, (Array.isArray(holidaysArray) ? holidaysArray.length : 0), 0)) || 0;

      var employeeTypeNormalized = String(coalesce(payroll && payroll.employee_type, "")).toLowerCase();
      var isProjectBased = employeeTypeNormalized.indexOf("project") !== -1 || employeeTypeNormalized === "project-based" || employeeTypeNormalized === "project base" || employeeTypeNormalized === "projectbase";
      var holiday_count_for_credit = isProjectBased ? 0 : holiday_count;

      // ---------- NEW: compute paid_leaves_days (sum of paid leaves overlapping the payroll)
      var paid_leaves_days = 0;
      try {
        if (Array.isArray(payroll && payroll.leaves) && payroll.leaves.length) {
          payroll.leaves.forEach(function (lv) {
            var isPaid =
              lv?.is_paid === 1 ||
              lv?.is_paid === true ||
              String(lv?.is_paid).toLowerCase() === "1" ||
              String(lv?.is_paid).toLowerCase() === "true";

            if (!isPaid) return;
            var days = (typeof lv.leave_days_cutoff !== "undefined")
              ? parseFloat(lv.leave_days_cutoff || 0)
              : (typeof lv.total_days !== "undefined" ? parseFloat(lv.total_days || 0) : 0);
            if (!Number.isNaN(days)) paid_leaves_days += Number(days);
          });
        }
      } catch (e) {
        paid_leaves_days = 0;
      }
      paid_leaves_days = Number(paid_leaves_days.toFixed(2));
      // -------------------------------------------------------------------------

      // ---------- NEW: compute total_credit (Days + OT RAW + Holidays + PaidLeaves)
      // For monthly salary_type we show '---' in the UI. Keep numeric total_credit as null (so totals use 0).
      var total_credit = null;
      if (String(salaryType).toLowerCase() !== "monthly") {
        // NOTE: OT must remain raw — use rawOvertime (same units as total_overtime_request)
        total_credit = Number((Number(total_days) + Number(rawOvertime) + Number(holiday_count_for_credit) + Number(paid_leaves_days)).toFixed(2));
      }
      // ----------------------------------------------------------------------

      // ---------- NEW: Adjust base_gross to use Total Credit * Base (daily) when total_credit is numeric ----------
      // Keep previous monthly behaviour when total_credit is null (monthly rows show '---' and base_gross remains half_month or computed daily)
      try {
        // base used for multiplication should be the true daily base (basic_daily_salary)
        if (total_credit !== null && !Number.isNaN(Number(total_credit))) {
          // compute base_gross as (total_credit * basic_daily_salary)
          var base_from_total_credit = Number((Number(total_credit) * Number(basic_daily_salary)).toFixed(2));
          // override gross_components.base_gross with this value
          if (gross_components) {
            gross_components.base_gross = base_from_total_credit;
          }
        } else {
          // keep existing effective base (already set above in adjust block)
          // nothing to do here
        }
        // recompute gross_computed after possible override
        gross_computed = Number(((gross_components && gross_components.base_gross) || 0)
          + (gross_components && gross_components.allowances || 0)
          + (gross_components && gross_components.incentives || 0)
          + (gross_components && gross_components.retro || 0)
          + (gross_components && gross_components.others || 0)
        ).toFixed(2) * 1;
        gross_computed = Number(gross_computed.toFixed ? gross_computed.toFixed(2) : gross_computed);
      } catch (e) {
        // fail safe: don't crash — keep previous gross_computed
      }
      // ----------------------------------------------------------------------

      // ---------- NOW compute net using the FINAL gross_computed and FINAL totalDeductionsForCalc ----------
      var net_pay_raw = Number((Number(gross_computed || 0) - Number(totalDeductionsForCalc || 0)).toFixed(2));
      if (Number.isNaN(net_pay_raw)) net_pay_raw = 0;
      // ----------------------------------------------------------------------

      var enrichedRow = Object.assign({}, payroll, {
        // expose the true daily base as basic_salary for clarity (frontend convention)
        basic_salary: Number(basic_daily_salary.toFixed(2)),
        total_days: Number(total_days.toFixed(2)),
        total_overtime_request: Number(total_overtime_request.toFixed(2)),
        total_rendered_hours: Number(total_rendered_hours.toFixed(2)),
        total_incentives: Number(total_incentives.toFixed(2)),
        total_retro_applied: Number(total_retro_applied.toFixed(2)),
        // keep original total_rewards for compatibility
        total_rewards: Number(total_rewards.toFixed(2)),
        // add deduction_oneoff and others_net
        deduction_oneoff: Number(deduction_oneoff.toFixed(2)),
        deduction_oneoff_details: deduction_oneoff_details,
        others_net: Number(others_net.toFixed(2)),
        half_month_salary: Number(half_month_salary.toFixed(2)),
        total_salary_after_late: Number(total_salary_after_late.toFixed(2)),
        late_deduction: Number(late_deduction.toFixed(2)),
        contribution_deduction_type: contribution_deduction_type,
        holiday_count: Number(holiday_count),
        holidays: holidaysArray,
        employee_type: payroll && payroll.employee_type ? payroll.employee_type : null,
        status: payroll && payroll.status ? payroll.status : null,
        department_id: coalesce(payroll && payroll.department_id, payroll && payroll.dept_id, null),
        department_name: coalesce(payroll && payroll.department_name, payroll && payroll.department, null),
        is_loan_skipped: !!hasSkipLoan,
        payroll_level_journal_credit_sum: Number(payroll_level_journal_credit_sum.toFixed(2)),
        combined_journal_credit_sum: Number(combined_journal_credit_sum.toFixed(2)),
        loans: enrichedLoans,
        loan_deduction_actual: Number(loan_deduction_actual).toFixed(2),
        gross_components: gross_components,
        total_allowances: Number(total_allowances.toFixed(2)),
        total_salary_raw: canonical_total_salary_raw,
        gross_computed: Number(gross_computed.toFixed(2)),
        backend_gross: Number(backendGross.toFixed(2)),
        displayedPhilhealth: Number(displayedPhilhealth.toFixed(2)),
        displayedSSS: Number(displayedSSS.toFixed(2)),
        displayedPagibig: Number(displayedPagibig.toFixed(2)),
        adjustedPhilhealth: Number(adjPhilhealth.toFixed(2)),
        adjustedSSS: Number(adjSSS.toFixed(2)),
        adjustedPagibig: Number(adjPagibig.toFixed(2)),
        backend_total_deductions_raw: Number(backendTotalDeductionsRaw.toFixed(2)),
        other_charges_computed: Number(computedOtherCharges.toFixed(2)), // will be 0 per requirement
        total_deductions_raw: Number(totalDeductionsForCalc.toFixed(2)),
        net_pay_raw: Number(net_pay_raw.toFixed(2)),
        salary_type: salaryType,
        monthly_rate: Number(monthlyRate.toFixed(2)),
        computed_daily_rate_for_late: Number(daily_rate_for_late.toFixed(4)),
        computed_hourly_rate_for_late: Number(hourly_rate_for_late.toFixed(4)),
        computed_late_deduction: Number(late_deduction.toFixed(2)),
        computed_half_month_salary: Number(half_month_salary.toFixed(2)),
        computed_total_salary_after_late: Number(total_salary_after_late.toFixed(2)),
        // NEW: expose total_credit (null for monthly; numeric for others)
        total_credit: total_credit,
        // NEW: paid leaves days exposed
        paid_leaves_days: Number(paid_leaves_days),
        // preserve holiday_count_for_credit if needed downstream
        holiday_count_for_credit: Number(holiday_count_for_credit)
      });

      return enrichedRow;
    });

    setEnriched(out);
  }, [open, payrolls, skipRequests]);

  var totals = useMemo(function () {
    return enriched.reduce(function (acc, p) {
      acc.gross += Number(p.gross_computed || 0);
      acc.gross_computed += Number(p.gross_computed || 0);
      acc.backend_gross += Number(p.backend_gross || 0);
      acc.allowances += Number(p.total_allowances || 0);
      acc.incentives += Number(p.total_incentives || 0);
      acc.retro += Number(p.total_retro_applied || 0);
      // accumulate others_net (instead of raw rewards)
      acc.others += Number(p.others_net || p.total_rewards || 0);
      acc.sss += Number(p.adjustedSSS || p.displayedSSS || 0);
      acc.ph += Number(p.adjustedPhilhealth || p.displayedPhilhealth || 0);
      acc.pg += Number(p.adjustedPagibig || p.displayedPagibig || 0);
      acc.loan += Number(parseFloat(p.loan_deduction_actual || 0) || 0);
      acc.payroll_journal += Number(p.payroll_level_journal_credit_sum || 0);
      acc.deductions += Number(p.total_deductions_raw || 0);
      acc.net += Number(p.net_pay_raw || 0);
      acc.holidays += Number(p.holiday_count || 0);
      acc.total_days += Number(p.total_days || 0);
      acc.overtime += Number(p.total_overtime_request || 0);

      // NEW: accumulate total credits (null for monthly -> treat as 0)
      acc.total_credits += Number(p.total_credit || 0);

      // NEW: accumulate paid leaves
      acc.total_leaves += Number(p.paid_leaves_days || 0);

      // NEW: accumulate baseSum according to salary_type:
      // - monthly => half_month_salary (if > 0)
      // - daily/others => show raw basic_salary (true daily base)
      const rowBase = (String(p.salary_type || "").toLowerCase() === "monthly" && Number(p.half_month_salary || 0) > 0)
        ? Number(p.half_month_salary || 0)
        : Number(coalesce(p.basic_salary, (p.gross_components && p.gross_components.base_gross_daily), (p.gross_components && p.gross_components.base_gross), 0));

      acc.baseSum += Number(rowBase || 0);

      // NEW: compute exportGross (replace base_gross with half_month_salary for monthly) and exportNet accordingly
      const baseForExport = (String(p.salary_type || "").toLowerCase() === "monthly" && Number(p.half_month_salary || 0) > 0)
        ? Number(p.half_month_salary || 0)
        : Number(coalesce(p.basic_salary, (p.gross_components && p.gross_components.base_gross_daily), (p.gross_components && p.gross_components.base_gross), 0));

      const exportGross = Number((
        baseForExport
        + Number(p.total_allowances || 0)
        + Number(p.total_incentives || 0)
        + Number(p.total_retro_applied || 0)
        // use others_net (rewards minus one-off deduction) in exportGross
        + Number(p.others_net || p.total_rewards || 0)
      ).toFixed(2));

      // use total_deductions_raw (which already included late when salary_type === monthly)
      const exportNet = Number((exportGross - Number(p.total_deductions_raw || 0)).toFixed(2));

      acc.exportGrossSum += exportGross;
      acc.exportNetSum += exportNet;

      return acc;
    }, {
      gross:0, gross_computed:0, backend_gross:0, allowances:0, incentives:0, retro:0, // rewards replaced by others
      others:0,
      sss:0, ph:0, pg:0, loan:0, payroll_journal:0, deductions:0, net:0, holidays:0, total_days:0, overtime:0,
      baseSum: 0,
      exportGrossSum: 0,
      exportNetSum: 0,
      // NEW totals accumulator for total credits
      total_credits: 0,
      // NEW totals accumulator for leaves
      total_leaves: 0
    });
  }, [enriched]);

  if (!open) return null;

  const gridWithTotal = (dynamicGrid && dynamicGrid.template ? dynamicGrid.template : gridTemplate) + " minmax(100px, max-content)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded shadow-lg w-[95%] max-w-7xl max-h-[90vh] overflow-hidden">
        {/* top header (title + actions) */}
        <div className="flex items-start justify-between gap-3 p-4 border-b" style={{ fontSize: 12 }}>
          <div style={{ textAlign: "center" }}>
            <h3 className="text-lg font-semibold">Payroll Summary <span className="text-sm text-slate-500">({enriched.length} selected)</span></h3>
            <p className="mt-1 text-xs text-slate-500">List layout — full gross components, journals, and metadata.</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => exportXLSX(enriched, totals)} className="px-3 py-1 text-sm bg-white border rounded">Export XLSX</button>
            <button onClick={onClose} className="px-3 py-1 text-sm rounded bg-slate-100">Close</button>
          </div>
        </div>

        <div style={{ maxHeight: "68vh", overflowY: "auto", overflowX: "auto", fontSize: 11, position: "relative" }}>
<div
  style={{
    width: "100%",            // ← Add this
    display: "grid",
    gridTemplateColumns: gridWithTotal,
    gap: `${dynamicGrid.gap}px`,
    alignItems: "center",
    borderTop: "1px solid #e6e9ee" ,
    borderBottom: "1px solid #e6e9ee",
    background: "#f6f7f9",
    fontWeight: 700,
    fontSize: 11,
    position: "sticky",
    top: 0,
    zIndex: 30,
    boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.03)"
  }}
>

            {/* sticky UI header in new order */}
            <div style={{ padding: "8px 10px", textAlign: "center", position: "sticky", left: 0, zIndex: 40, background: "#f6f7f9", boxShadow: "2px 0 4px rgba(0,0,0,0.03)" }}>Employee</div>
            <div style={{ padding: "8px 10px", textAlign: "center" }}>Type</div>
            <div style={{ padding: "8px 10px", textAlign: "center" }}>Status</div>
            <div style={{ padding: "8px 10px", textAlign: "center" }}>Dept</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Days</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>OT</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Leaves</div>{/* NEW header */}
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Hrs</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Holidays</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Total Credit</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Base</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Allow</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Inc</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Retro</div>
            {/* changed label from Rew to Others */}
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Others</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Gross</div>
            {/* <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>HalfGross</div> */}
            {/* <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>AfterLate</div> */}
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Late</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>SSS</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>PhilHealth</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Pag-IBIG</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Loan</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>PayrollJ</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Total Ded</div>
            <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>Net</div>

            {/* <div style={{ padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap" }}>All Total</div> */}
          </div>

          {enriched.map(function (p) {
            const rowTotal = Number((p.gross_components && p.gross_components.base_gross) || 0)
              + Number(p.total_allowances || 0)
              + Number(p.total_incentives || 0)
              + Number(p.total_retro_applied || 0)
              // use others (not raw rewards) for row total
              + Number(p.others_net || p.total_rewards || 0);

            // NEW: determine display values per salary_type
            const salaryTypeRow = String(p.salary_type || "").toLowerCase();
            const isMonthlyRow = salaryTypeRow === "monthly";

            // GROSS column should show canonical gross_computed
            const grossDisplayedString = fmtNumber(Number(p.gross_computed || 0));

            const halfGrossDisplay = isMonthlyRow ? fmtNumber(p.half_month_salary || 0) : ""; // hide for daily
            const afterLateDisplay = isMonthlyRow ? fmtNumber(p.total_salary_after_late || 0) : ""; // hide for daily

            // UPDATED: baseDisplay now shows the raw daily base for daily employees (p.basic_salary),
            // falling back to base_gross_daily or base_gross if missing. For monthly, show half_month_salary.
            const rawDailyBase = Number(coalesce(p.basic_salary, (p.gross_components && p.gross_components.base_gross_daily), (p.gross_components && p.gross_components.base_gross), 0)) || 0;
            const baseDisplay = isMonthlyRow
              ? fmtNumber(p.half_month_salary || 0)
              : fmtNumber(rawDailyBase);

            // For UI display we still show p.gross_computed etc. (unchanged). The exports now use half-month where applicable.
            return (
              <div
                key={p.payroll_id || (String(p.employee_id || "") + "-" + (p.date_from || "") + "-" + (p.date_until || ""))}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridWithTotal,
                  gap: `${dynamicGrid.gap}px`,
                  alignItems: "center",
                  borderBottom: "1px solid #f0f0f0",
                  fontSize: 11,
                  padding: "6px 0",
                  boxSizing: "border-box",
                  background: p.is_loan_skipped ? "#FFF7F1E6" : "transparent"
                }}
              >
                <div style={{ padding: "6px 10px", overflow: "hidden", textAlign: "left", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, position: "sticky", left: 0, zIndex: 30, background: p.is_loan_skipped ? "#FFF7F1E6" : "#fff", boxShadow: "2px 0 4px rgba(0,0,0,0.03)" }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "break-word", maxWidth: "100%" }} title={p.name}>{p.name || "—"}</div>
                  <div style={{ fontSize: 11, color: "#444", marginTop: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal", overflowWrap: "anyway", wordBreak: "break-word", maxWidth: "100%" }}>
                    {(p.employee_id || "") + (p.position_name ? " • " + p.position_name : '')}
                  </div>
                </div>

                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center" }}>{p.employee_type || ""}</div>
                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center" }}>{p.status || ""}</div>
                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center" }}>{p.department_name || p.department || ""}</div>

                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.total_days || 0)}</div>
                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.total_overtime_request || 0)}</div>

                {/* NEW Leaves column: green if paid leave (paid_leaves_days > 0) */}
                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap", }}>
                  { Number(p.paid_leaves_days || 0) > 0 ? (
                    <span style={{ color: "#047857", fontWeight: 700 }}>{fmtNumber(p.paid_leaves_days || 0)}</span>
                  ) : (
                    <span style={{ color: "#6b7280" }}>{fmtNumber(0)}</span>
                  )}
                </div>

                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.total_rendered_hours || 0)}</div>
                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.holiday_count || 0)}</div>

                {/* NEW: Total Credit column (Days + OT RAW + Holidays + PaidLeaves). Show '---' for monthly records */}
                <div style={{ padding: "6px 10px", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>
                  { isMonthlyRow ? '---' : fmtNumber(p.total_credit || 0) }
                </div>

                {/* Base: show raw daily base if available, otherwise fallback to effective/half-month */}
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{baseDisplay}</div>

                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.total_allowances || 0)}</div>
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.total_incentives || 0)}</div>
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.total_retro_applied || 0)}</div>
                {/* Show Others (rewards minus one-off deduction) */}
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>
                  {fmtNumber(p.others_net || p.total_rewards || 0)}
                </div>

                {/* Gross: canonical gross_computed */}
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{grossDisplayedString}</div>

                {/* LATE: show value only for monthly rows; for non-monthly show '---' and do not include late in Total Ded */}
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>
                  { isMonthlyRow ? fmtNumber(p.late_deduction || 0) : '---' }
                </div>

                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.adjustedSSS || p.displayedSSS || 0)}</div>
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.adjustedPhilhealth || p.displayedPhilhealth || 0)}</div>
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.adjustedPagibig || p.displayedPagibig || 0)}</div>

                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.loan_deduction_actual || 0)}</div>
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.payroll_level_journal_credit_sum || 0)}</div>

                {/* Total Ded: now shows only Loan + Gov contributions (+ Late for monthly) */}
                <div style={{ padding: "6px 10px", fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>
                  {fmtNumber(p.total_deductions_raw || 0)}
                </div>

                <div style={{ padding: "6px 10px", fontWeight: 700, color: (Number(p.net_pay_raw) < 0 ? "#B00020" : "#068f39"), fontFamily: "ui-monospace, monospace", textAlign: "center", justifySelf: "center", whiteSpace: "nowrap" }}>{fmtNumber(p.net_pay_raw || 0)}</div>

                {/* <div style={{ padding: "6px 10px", fontWeight: 700, textAlign: "center", justifySelf: "center", whiteSpace: "nowrap", fontFamily: "ui-monospace, monospace" }}>{fmtNumber(rowTotal)}</div> */}
              </div>
            );
          })}

          {/* Totals row (summary) - commented out visually; keep code if needed */}
        </div>

        <div style={{ padding: 12, fontSize: 11, color: "#6b7280", borderTop: "1px solid #e6e9ee", textAlign: "center" }}>
          Hover name to see full employee name. Use Export XLSX for raw values.
        </div>
      </div>
    </div>
  );

}
