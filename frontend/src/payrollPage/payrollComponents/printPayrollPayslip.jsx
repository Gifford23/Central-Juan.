// printPayslipsToWindow_patched.js
// Compact payslip printer with POS-style and continuous options.
// Behavior change: if an employee is commission_based (truthy: 'yes', true, 1) AND
// total_commission > computed base gross (basic pay), then the commission amount
// takes over as the effective base for Gross and Net calculations. The UI shows
// the original Basic Pay struck-through and highlights the applied commission.

export default function printPayslipsToWindow({ payrolls = [], autoPrint = false, mode = "grid", continuous = false } = {}) {
  if (!Array.isArray(payrolls) || payrolls.length === 0) {
    alert("No payslips to print.");
    return;
  }

  const parseLoans = (loan) => {
    if (!loan) return [];
    if (Array.isArray(loan)) return loan;
    try { return JSON.parse(loan); } catch (e) { return []; }
  };

  const parseJournals = (maybe) => {
    if (!maybe) return [];
    if (Array.isArray(maybe)) return maybe;
    try { return JSON.parse(maybe); } catch (e) { return []; }
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

  const formatPeso = (val) =>
    new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(Number(val || 0));

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  const loanTypeMap = { company: "Co.", sss: "SSS", pagibig: "Pag-IBIG" };
  function getLoanTypeLabel(ln) {
    const rawType = (ln && (ln.loan_type ?? ln.type ?? ln.loanType ?? ln.liability_type)) ?? "";
    if (!rawType) return "";
    const key = String(rawType).toLowerCase();
    return loanTypeMap[key] ?? String(rawType);
  }
  function getLoanDescription(ln) {
    return (ln && (ln.description ?? ln.desc ?? ln.reason ?? ln.note ?? ln.detail)) || "";
  }

  const perLoanScheduled = (loan, payrollType, dateUntilDay) => {
    const payable = Number(loan.final_loan_deduction ?? loan.payable_per_term ?? loan.payable ?? 0) || 0;
    const sched = (loan.deduction_schedule ?? loan.schedule ?? "").toString().toLowerCase();
    const pt = (payrollType || "").toLowerCase();
    let amount = payable;
    if (sched === "current-payroll") amount = payable;
    else if (sched === "monthly") {
      if (pt === "semi-monthly") {
        const isSecond = (typeof dateUntilDay === "number") ? dateUntilDay >= 20 : true;
        amount = isSecond ? payable : 0;
      } else amount = payable;
    } else if (sched === "semi-monthly") amount = pt === "semi-monthly" ? payable / 2 : payable;
    const bal = Number(loan.balance ?? loan.remaining ?? loan.remain ?? 0) || 0;
    if (amount > bal) amount = bal;
    return Number(amount.toFixed(2));
  };

  function sumJournalCreditsForLoan(journals, loanId, fromDate, untilDate) {
    if (!Array.isArray(journals) || !loanId) return 0;
    const from = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
    const until = untilDate ? new Date(untilDate).setHours(23,59,59,999) : null;

    let sum = 0;
    for (const j of journals) {
      const jLoanId = j.loan_id ?? j.loanId ?? j._loan_id ?? j.legacy_loan_id ?? null;
      if (jLoanId === null) continue;
      if (String(jLoanId) !== String(loanId)) continue;

      const entryType = (j.entry_type ?? j.type ?? "").toString().toLowerCase();
      if (entryType !== "credit") continue;

      const jd = j.entry_date ?? j.created_at ?? j.date ?? null;
      if (!jd) continue;
      const d = new Date(jd);
      const t = d.getTime();
      if ((from !== null && t < from) || (until !== null && t > until)) continue;

      const amt = parseFloat(String(j.amount ?? j.value ?? j.amt ?? 0).replace(/[^0-9.-]+/g, "")) || 0;
      sum += amt;
    }
    return Number(sum.toFixed(2));
  }

  const rewardAppliesToPayroll = (reward, payroll) => {
    if (!reward) return { applies: true, reason: "all" };
    const hasDept = reward.applies_to_department_id !== null && reward.applies_to_department_id !== undefined && reward.applies_to_department_id !== "";
    const hasPos  = reward.applies_to_position_id !== null && reward.applies_to_position_id !== undefined && reward.applies_to_position_id !== "";
    if (!hasDept && !hasPos) return { applies: true, reason: "all" };
    if (hasPos && payroll.position_id && String(reward.applies_to_position_id) === String(payroll.position_id)) return { applies: true, reason: "position" };
    if (hasDept) {
      if (payroll.department_id && String(reward.applies_to_department_id) === String(payroll.department_id)) return { applies: true, reason: "department" };
      if (payroll.department_name && String(reward.applies_to_department_id) === String(payroll.department_name)) return { applies: true, reason: "department" };
      if (payroll.department && String(reward.applies_to_department_id) === String(payroll.department)) return { applies: true, reason: "department" };
    }
    return { applies: false, reason: "no-match" };
  };

  // open window
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  // Choose layout CSS based on mode + continuous
  const isPOS = String(mode).toLowerCase() === "pos";
  const continuousComment = continuous ? "/* continuous: true */" : "";

  printWindow.document.write(`
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Payslips</title>
    <style>
      :root { --muted:#6b6b6b; --accent:#1f6feb; }
      ${continuous ? "@page { size: auto; margin: 0; }" : "@page { margin: 3mm; }"}
      body {
        background:#fff; color:#000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        font-size:9px; line-height:1.15; padding: ${continuous ? "6px" : "6px"};
        -webkit-print-color-adjust:exact;
      }

      /* Top toolbar (hidden in print) */
      .topbar { display:flex; justify-content:flex-end; gap:8px; margin-bottom:8px; }
      .btn { padding:6px 10px; font-size:12px; border-radius:6px; border:1px solid #bbb; background:#f7f7f7; cursor:pointer; }
      .btn-primary { background:var(--accent); color:#fff; border-color:var(--accent); }
      .btn-ghost { background:transparent; color:#111; }

      /* GRID layout (original) */
      .grid { display:flex; flex-wrap:wrap; gap:6px; align-items:flex-start; justify-content:flex-start; }

      /* POS layout: single column narrow receipts */
      .pos-list { display:flex; flex-direction:column; gap:6px; align-items:flex-start; }

      /* default payslip card */
      .payslip {
        box-sizing:border-box;
        background:#fff;
        padding:8px;
        border:1px solid #111;
        display:flex;
        flex-direction:column;
        gap:6px;
        page-break-inside:avoid;
        break-inside:avoid;
      }

      /* Grid variant sizes */
      .grid .payslip {
        width:16%;
        min-width:110px;
        max-width:220px;
        min-height:3.8in;
      }

      /* POS variant: narrow receipt-style */
      .pos .payslip {
        width: 80mm; /* typical thermal width; adjust to 58mm if needed (e.g., 58mm -> 58mm) */
        max-width: 100%;
        min-width: 200px;
        border-left: none;
        border-right: none;
        border-top: none;
        border-bottom: 1px dashed #ddd;
        padding:10px 8px;
        box-shadow: none;
      }

      /* if continuous, remove page breaks and ensure single column */
      ${continuous ? `
        .grid { flex-direction: column; }
        .pos { flex-direction: column; }
        .payslip { page-break-after: avoid; break-after: avoid; margin-bottom: 2px; }
      ` : ""}

      .center { text-align:center; }
      .small { font-size:9px; }
      .tiny { font-size:8px; }
      .muted { color:var(--muted); }
      .bold { font-weight:700; }
      .upper { text-transform:uppercase; font-size:9px; }

      .sep { height:1px; background:#eee; margin:6px 0; }
      .thick { height:2px; background:#111; margin:6px 0; }

      .row { display:flex; gap:6px; align-items:center; width:100%; }
      .col-left { flex:1 1 auto; min-width:0; font-size:9px; color:#111; }
      .col-right { flex:0 0 36%; max-width:36%; text-align:right; min-width:60px; box-sizing:border-box; font-variant-numeric:tabular-nums; }

      .label { display:block; color:var(--muted); font-size:8px; margin-bottom:2px; }
      .value { font-weight:600; font-variant-numeric:tabular-nums; }

      .deduct { margin-top:4px; padding-top:4px; border-top:1px solid #eee; }
      .deduct .title { font-weight:700; font-size:9px; margin-bottom:4px; }
      .gov-total { display:flex; justify-content:space-between; font-weight:700; margin-top:4px; font-size:9px; }

      .loan-list { margin-top:4px; display:flex; flex-direction:column; gap:4px; }
      .loan-item { display:grid; grid-template-columns: 1fr auto; gap:6px; align-items:start; font-size:9px; }
      .loan-desc { color:#111; font-size:8.5px; }
      .loan-vals { text-align:right; font-variant-numeric:tabular-nums; font-size:9px; color:#111; }

      .totals { display:flex; justify-content:space-between; font-weight:700; margin-top:6px; font-size:10px; }
      .net { font-size:11px; font-weight:900; }

      .sig { display:flex; justify-content:space-between; gap:6px; margin-top:8px; font-size:9px; }
      .sig div { width:32%; text-align:center; border-top:1px dashed #e6e6e6; padding-top:4px; color:var(--muted); }

      .strike { text-decoration: line-through; color: #999; }
      .applied-commission { font-weight: 700; }

      @media print {
        .topbar { display:none; }
        body { padding: ${continuous ? "4px" : "3mm"}; }
      }
    </style>
  </head>
  <body>
    <div class="topbar">
      <button class="btn btn-primary" id="printBtn">Print</button>
      <button class="btn btn-ghost" id="closeBtn">Close</button>
    </div>

    <div class="${isPOS ? "pos-list pos" : "grid"}">
  `);

  // Render each payroll record into the window (keeps your original calculation logic)
  payrolls.forEach((p) => {
    const deductionType = p.contribution_deduction_type || "semi-monthly";
    const rawSSS = parseFloat(p.sss_employee_share) || 0;
    const rawPhil = parseFloat(p.philhealth_employee_share) || 0;
    const rawPag = parseFloat(p.pagibig_employee_share) || 0;
    const dateUntilDay = p.date_until ? Number(String(p.date_until).split("-")[2]) : 31;

    let sss = 0, phil = 0, pag = 0;
    let sssLabel = "", philLabel = "", pagLabel = "";

    if (deductionType === "semi-monthly") {
      sss = rawSSS / 2; phil = rawPhil / 2; pag = rawPag / 2;
      sssLabel = philLabel = pagLabel = "(Semi)";
    } else {
      if (dateUntilDay >= 20) {
        sss = rawSSS; phil = rawPhil; pag = rawPag;
        sssLabel = philLabel = pagLabel = "(Mon)";
      } else {
        sss = phil = pag = 0;
        sssLabel = philLabel = pagLabel = "(Hid)";
      }
    }

    sss = Number(sss) || 0;
    phil = Number(phil) || 0;
    pag = Number(pag) || 0;

    const isMonthly = String((p.salary_type || "")).toLowerCase() === "monthly";
    const basicDailyRate = Number(p.basic_salary || p.daily_rate || 0) || 0;
    const totalDays = parseFloat(p.total_days) || 0;

    let overtimeRaw = null;
    const candFields = ['total_overtime_request','total_overtime','overtime_days','overtime','ot'];
    for (const k of candFields) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") {
        const v = Number(p[k]);
        if (!Number.isNaN(v)) { overtimeRaw = v; break; }
      }
    }
    if (overtimeRaw === null) {
      const alt = Number(p.overtime_hours ?? p.overtime_hours_rendered ?? p.overtime_h ?? 0) || 0;
      if (alt !== 0) overtimeRaw = alt;
    }
    if (overtimeRaw === null) overtimeRaw = 0;

    const holidayCount = getHolidayCount(p);

    let paidLeavesDays = 0;
    if (Array.isArray(p.leaves) && p.leaves.length) {
      p.leaves.forEach(lv => {
        const isPaid =
          lv?.is_paid === 1 ||
          lv?.is_paid === true ||
          String(lv?.is_paid).toLowerCase() === "1" ||
          String(lv?.is_paid).toLowerCase() === "true";

        if (!isPaid) return;
        const days = (typeof lv.leave_days_cutoff !== "undefined")
          ? parseFloat(lv.leave_days_cutoff || 0)
          : (typeof lv.total_days !== "undefined" ? parseFloat(lv.total_days || 0) : 0);
        if (!Number.isNaN(days)) paidLeavesDays += Number(days);
      });
    }
    paidLeavesDays = Number(paidLeavesDays.toFixed(2));

    const totalCredits = Number((Number(totalDays) + Number(overtimeRaw) + Number(holidayCount) + Number(paidLeavesDays)).toFixed(2));

    let perDayRate = basicDailyRate;
    if (perDayRate === 0 && isMonthly) {
      const halfMonthSalary = Number(p.half_month_salary) || 0;
      perDayRate = halfMonthSalary || 0;
    }

    const basicPay = Number((totalCredits * perDayRate).toFixed(2));

    let allowanceTotal = 0;
    if (p.total_allowances !== undefined && p.total_allowances !== null) {
      allowanceTotal = Number(p.total_allowances) || 0;
    } else if (Array.isArray(p.allowances) && p.allowances.length) {
      allowanceTotal = p.allowances.reduce((s, a) => s + (Number(a.applied_amount || a.amount || 0)), 0);
    }
    allowanceTotal = Number(allowanceTotal.toFixed(2));

    let incentiveAmount = 0;
    if (p.total_incentives !== undefined && p.total_incentives !== null) {
      incentiveAmount = Number(p.total_incentives) || 0;
    } else if (Array.isArray(p.incentives) && p.incentives.length) {
      incentiveAmount = p.incentives.reduce((s, it) => s + (Number(it.applied_amount || it.amount || 0)), 0);
    }
    incentiveAmount = Number(incentiveAmount.toFixed(2));

    let retroAmount = 0;
    if (p.total_retro_applied !== undefined && p.total_retro_applied !== null) {
      retroAmount = Number(p.total_retro_applied) || 0;
    } else if (p.total_retro !== undefined && p.total_retro !== null) {
      retroAmount = Number(p.total_retro) || 0;
    } else if (Array.isArray(p.retro_entries) && p.retro_entries.length) {
      retroAmount = p.retro_entries.reduce((s, r) => s + (Number(r.amount || 0)), 0);
    }
    retroAmount = Number(retroAmount.toFixed(2));

    let appliedRewardAmount = 0;
    let appliedRewardTitles = [];
    if (Array.isArray(p.rewards) && p.rewards.length) {
      p.rewards.forEach((r) => {
        const amt = Number(r.amount ?? r.applied_amount ?? 0) || 0;
        const match = rewardAppliesToPayroll(r, p);
        if (match.applies) {
          appliedRewardAmount += amt;
          const title = (r.description || r.name || r.title || "").toString().trim();
          if (title) appliedRewardTitles.push(title);
        }
      });
    } else if (p.total_rewards !== undefined && p.total_rewards !== null) {
      appliedRewardAmount = Number(p.total_rewards) || 0;
    }
    appliedRewardAmount = Number(appliedRewardAmount.toFixed(2));

    const deduction_oneoff = Number(p.deduction_oneoff ?? p.deduction_oneoff_amount ?? 0) || 0;
    const others_net = Number((appliedRewardAmount - deduction_oneoff).toFixed(2));

    // --- NEW: Commission override logic ---
    const commissionAmount = Number(p.total_commission ?? 0) || 0;
    const isCommissionBased = (() => {
      const v = p?.commission_based;
      if (v === true) return true;
      if (v === 1 || v === "1") return true;
      const s = String(v ?? "").toLowerCase().trim();
      return s === "yes" || s === "true";
    })();

    const commissionOverridesBase = isCommissionBased && commissionAmount > basicPay;

    // effective base gross used for totals: either basicPay or commission if override applies
    const effectiveBase = commissionOverridesBase ? commissionAmount : basicPay;

    // gross total includes effective base + others + allowances + retro + incentive
    const grossTot = Number((effectiveBase + others_net + allowanceTotal + retroAmount + incentiveAmount).toFixed(2));

    const loansAppliedDetails = parseLoans(p.loans_applied_details);
    const backendLoans = parseLoans(p.loans);
    let loansToShow = [];
    if (Array.isArray(loansAppliedDetails) && loansAppliedDetails.length) {
      loansToShow = loansAppliedDetails;
    } else if (Array.isArray(backendLoans) && backendLoans.length) {
      if (Array.isArray(p.selected_loan_ids) && p.selected_loan_ids.length) {
        const ids = p.selected_loan_ids.map(String);
        loansToShow = backendLoans.filter(l => ids.includes(String(l.loan_id)));
      } else {
        loansToShow = backendLoans;
      }
    }
    loansToShow = (loansToShow || []).filter(l => (Number(l.balance ?? l.remaining ?? 0) || 0) > 0);

    const journalsRaw =
      p.journal_entries ??
      p.loan_journal_entries ??
      p.journals ??
      p.loan_journals ??
      p.journalEntries ??
      null;
    const payrollJournals = parseJournals(journalsRaw);

    const aggregatedLoanLevelJournals = {};
    if (Array.isArray(loansToShow)) {
      loansToShow.forEach((ln) => {
        const lnJ = parseJournals(ln.journal_entries ?? ln.loan_journal_entries ?? ln.journals ?? ln.loan_journals ?? ln.journalEntries ?? null);
        if (Array.isArray(lnJ) && lnJ.length) {
          aggregatedLoanLevelJournals[String(ln.loan_id)] = (aggregatedLoanLevelJournals[String(ln.loan_id)] || []).concat(lnJ);
        }
      });
    }

    let loanSubtotal = 0;
    let loanListHtml = "";
    if (loansToShow.length) {
      loanListHtml += `<div class="loan-list">`;
      loansToShow.forEach((ln) => {
        const loanId = ln.loan_id ?? ln.id ?? ln.loanId;
        const fromDate = p.date_from ?? null;
        const untilDate = p.date_until ?? null;

        const rawCombined = [];

        if (Array.isArray(payrollJournals) && payrollJournals.length) {
          payrollJournals.forEach(j => {
            const jLoan = j.loan_id ?? j.loanId ?? j._loan_id ?? j.legacy_loan_id ?? null;
            if (jLoan !== null && String(jLoan) === String(loanId)) {
              rawCombined.push(j);
            }
          });
        }

        if (aggregatedLoanLevelJournals[String(loanId)] && aggregatedLoanLevelJournals[String(loanId)].length) {
          const normalized = aggregatedLoanLevelJournals[String(loanId)].map(j => {
            return (j.loan_id ?? j.loanId ?? j._loan_id ?? j.legacy_loan_id) ? j : ({ ...j, loan_id: loanId });
          });
          rawCombined.push(...normalized);
        }

        const inlineList = parseJournals(ln.journal_entries ?? ln.loan_journal_entries ?? ln.journals ?? ln.journalEntries ?? null);
        if (Array.isArray(inlineList) && inlineList.length) {
          const normalizedInline = inlineList.map(j => (j.loan_id ?? j.loanId ?? j._loan_id ?? j.legacy_loan_id) ? j : ({ ...j, loan_id: loanId }));
          rawCombined.push(...normalizedInline);
        }

        const combinedJournals = [];
        const seen = new Set();
        rawCombined.forEach(j => {
          const idCandidate = j?.journal_id ?? j?.id ?? j?.journalId ?? null;
          const fallback = `${j?.entry_date ?? j?.created_at ?? ''}|${String(j?.amount ?? j?.value ?? j?.amt ?? '')}`;
          const key = idCandidate !== null && idCandidate !== undefined && idCandidate !== '' ? String(idCandidate) : fallback;
          if (!seen.has(key)) {
            seen.add(key);
            const withLoan = (j.loan_id ?? j.loanId ?? j._loan_id ?? j.legacy_loan_id) ? j : ({ ...j, loan_id: loanId });
            combinedJournals.push(withLoan);
          }
        });

        const journalSum = sumJournalCreditsForLoan(combinedJournals, loanId, fromDate, untilDate);

        const scheduled = (journalSum && journalSum > 0) ? journalSum : perLoanScheduled(ln, deductionType, dateUntilDay);

        const balanceVal = Number(ln.balance ?? ln.remaining ?? ln.remain ?? ln.balance_amount ?? 0) || 0;
        const thisCut = Math.min(scheduled, balanceVal);

        loanSubtotal += Number(thisCut);

        const typeLabel = getLoanTypeLabel(ln) || "";
        const descLabel = getLoanDescription(ln) || (`Loan #${loanId}` || "");
        const loanAmountVal = Number(ln.loan_amount ?? ln.amount ?? ln.loanAmount ?? 0) || 0;

        loanListHtml += `
          <div class="loan-item">
            <div class="loan-desc">${escapeHtml(typeLabel ? typeLabel + " - " : "")}${escapeHtml(descLabel)}</div>
            <div class="loan-vals">
              <div style="font-size:8px;color:var(--muted)">LOAN: ${formatPeso(loanAmountVal)}</div>
              <div style="font-size:8px;color:var(--muted)">BALANCE: ${formatPeso(balanceVal)}</div>
              <div style="font-size:9px;font-weight:600">AMMOUNT: ${formatPeso(thisCut)}</div>
            </div>
          </div>
        `;
      });
      loanListHtml += `</div>`;
    }

    const fallbackLoan = Number(
      parseFloat(p.loan_deduction_actual) ||
      parseFloat(p.loan_deduction) ||
      parseFloat(p.loan_deduction_applied) || 0
    );

    const loanToShowValue = loanListHtml ? loanSubtotal : fallbackLoan;

    const deductionTypeLower = (p.contribution_deduction_type || "").toString().toLowerCase();
    let adjSss = 0, adjPhil = 0, adjPag = 0;
    if (deductionTypeLower === "semi-monthly") {
      adjSss = rawSSS / 2; adjPhil = rawPhil / 2; adjPag = rawPag / 2;
    } else {
      const dateUntilDayVal = p.date_until ? Number(String(p.date_until).split("-")[2]) : 31;
      if (dateUntilDayVal >= 20) {
        adjSss = rawSSS; adjPhil = rawPhil; adjPag = rawPag;
      } else {
        adjSss = adjPhil = adjPag = 0;
      }
    }
    adjSss = Number(adjSss.toFixed(2));
    adjPhil = Number(adjPhil.toFixed(2));
    adjPag = Number(adjPag.toFixed(2));

    const lateDeductionRaw = Number(parseFloat(p.late_deduction) || 0);
    const totalSalaryAfterLateVal = (p.total_salary_after_late !== undefined && p.total_salary_after_late !== null)
      ? Number(parseFloat(p.total_salary_after_late) || 0)
      : 0;
    const includeLateDeduction = (p.salary_type === "monthly" && totalSalaryAfterLateVal === 0) ? lateDeductionRaw : 0;

    const totalDed = Number((adjSss + adjPhil + adjPag + loanToShowValue + includeLateDeduction).toFixed(2));
    const net = Number((grossTot - totalDed).toFixed(2));
    const otDisplayRaw = Number(overtimeRaw || 0).toFixed(2);
    const rewardTitles = appliedRewardTitles.length ? appliedRewardTitles.slice(0,2).join(", ") + (appliedRewardTitles.length > 2 ? " …" : "") : (p.reward_title ? String(p.reward_title).trim() : "");

    ["Employee Copy", "Employer Copy"].forEach((copyType) => {
      printWindow.document.write(`
        <div class="payslip">
          <div class="center bold upper">${escapeHtml(p.company_name ?? "CENTRAL JUAN IT SOLUTION")}</div>
          <div class="center tiny">PAYSLIP</div>
          <div class="center tiny muted">PERIOD END: ${escapeHtml(new Date(p.date_until).toLocaleDateString())}</div>

          <div class="sep"></div>

          <div>
            <div class="row"><div class="col-left"><span class="label">NAME</span>${escapeHtml(p.name)}</div></div>
            <div class="row"><div class="col-left"><span class="label">DESIGNATION</span>${escapeHtml(p.position_name ?? '')}</div></div>
            <div class="row"><div class="col-left"><span class="label">DATE</span>${escapeHtml(new Date(p.date_from).toLocaleDateString())}</div></div>
            <div class="row"><div class="col-left"><span class="label">DEPARTMENT</span>${escapeHtml(p.department_name ?? p.dept ?? '')}</div></div>
            <div class="row"><div class="col-left"><span class="label">Commission Based</span>${isCommissionBased ? '<span class="applied-commission">Yes</span>' : '<span class="muted">No</span>'}</div></div>
          </div>

          <div class="sep"></div>

          <div>
            <div class="row bold"><div class="col-left">GROSS</div><div class="col-right">AMT</div></div>

            <div class="row"><div class="col-left">Days</div><div class="col-right">${escapeHtml(Number(totalDays).toFixed(2))}</div></div>
            <div class="row"><div class="col-left">Overtime</div><div class="col-right">${escapeHtml(otDisplayRaw)}</div></div>
            <div class="row"><div class="col-left">Leaves (paid)</div><div class="col-right">${escapeHtml(Number(paidLeavesDays).toFixed(2))}</div></div>
            <div class="row"><div class="col-left">Holidays</div><div class="col-right">${escapeHtml(Number(holidayCount).toFixed(2))}</div></div>
            <div class="row"><div class="col-left">Total Credits</div><div class="col-right">${escapeHtml(Number(totalCredits).toFixed(2))}</div></div>
            <div class="row"><div class="col-left">Basic Rate</div><div class="col-right">${formatPeso(perDayRate)}</div></div>

            <!-- Show Basic Pay or strike-through + applied commission when commission overrides -->
            ${ commissionOverridesBase ? `
              <div class="row"><div class="col-left">Basic Pay</div><div class="col-right"><span class="strike">${formatPeso(basicPay)}</span></div></div>
              <div class="row"><div class="col-left">Applied as Gross (Commission)</div><div class="col-right"><span class="applied-commission">${formatPeso(commissionAmount)}</span></div></div>
            ` : `
              <div class="row"><div class="col-left">Basic Pay</div><div class="col-right">${formatPeso(basicPay)}</div></div>
            ` }

            <div class="row"><div class="col-left">Allowance.</div><div class="col-right">${formatPeso(allowanceTotal)}</div></div>
            <div class="row"><div class="col-left">Inc.</div><div class="col-right">${formatPeso(incentiveAmount)}</div></div>

            <div class="row"><div class="col-left">Others</div><div class="col-right">${formatPeso(others_net)}</div></div>
            ${ rewardTitles ? `<div class="row"><div class="col-left tiny muted">${escapeHtml(rewardTitles)}</div><div class="col-right"></div></div>` : '' }

            <div class="row"><div class="col-left">Retroactive</div><div class="col-right">${formatPeso(retroAmount)}</div></div>

            <div class="thick"></div>
            <div class="row bold"><div class="col-left">GROSS TOTAL:</div><div class="col-right">${formatPeso(grossTot)}</div></div>
          </div>

          <div class="sep"></div>

          <div class="deduct">
            <div class="title">DED.</div>

            <div class="row"><div class="col-left">SSS <span class="muted tiny"> ${escapeHtml(sssLabel)}</span></div><div class="col-right">${formatPeso(adjSss)}</div></div>
            <div class="row"><div class="col-left">Philhealth <span class="muted tiny"> ${escapeHtml(philLabel)}</span></div><div class="col-right">${formatPeso(adjPhil)}</div></div>
            <div class="row"><div class="col-left">Pag-ibig <span .lass="muted tiny"> ${escapeHtml(pagLabel)}</span></div><div class="col-right">${formatPeso(adjPag)}</div></div>

            <div class="gov-total"><div>Gov Total</div><div>${formatPeso(Number((adjSss + adjPhil + adjPag).toFixed(2)))}</div></div>

            ${ includeLateDeduction && includeLateDeduction > 0 ? `<div class="row"><div class="col-left">Late Ded</div><div class="col-right">${formatPeso(includeLateDeduction)}</div></div>` : '' }
          </div>

          <div class="deduct">
            <div class="title">Loan Ded</div>

            <div style="font-size:9px; color:var(--muted); display:flex; justify-content:space-between;">
              <div>DESC</div><div style="text-align:right">AMMOUNT</div>
            </div>

            ${ loanListHtml ? loanListHtml : `
              <div class="loan-item">
                <div class="loan-desc">No Loans</div>
                <div class="loan-vals">${formatPeso(0)}</div>
              </div>
            ` }

            <div class="totals"><div>Loan Total :</div><div>${formatPeso(loanToShowValue)}</div></div>
          </div>

          <div class="thick"></div>

          <div class="totals"><div>Total Deduction:</div><div>${formatPeso(totalDed)}</div></div>

          <div class="thick"></div>

          <div class="row bold"><div class="col-left net">NET</div><div class="col-right net">${formatPeso(net)}</div></div>

          <div class="sep"></div>

          <div class="sig">
            <div>HR</div>
            <div class="bold">${escapeHtml(copyType)}</div>
            <div>EMP</div>
          </div>

        </div>
      `);
    });
  });

  // scripts: print / close, autoPrint optional (do NOT auto-close when continuous)
  printWindow.document.write(`
    </div>
    <script>
      (function() {
        const printBtn = document.getElementById('printBtn');
        const closeBtn = document.getElementById('closeBtn');

        function doPrint() {
          try {
            window.print();
          } catch (e) {
            console.error('Print failed', e);
            alert('Print failed. Use Ctrl+P / Cmd+P.');
          }
        }

        printBtn && printBtn.addEventListener('click', () => { doPrint(); });

        closeBtn && closeBtn.addEventListener('click', () => { window.close(); });

        ${autoPrint ? `
          // autoPrint enabled by caller: trigger print shortly after load
          window.addEventListener('load', function() {
            setTimeout(function() {
              doPrint();
              ${continuous ? "/* keep window open for continuous printing */" : "try { window.close(); } catch(e) { /* ignore */ }"}
            }, 200);
          });
        ` : ""}
      })();
    </script>
  </body>
  `);

  printWindow.document.close();
  printWindow.focus();
}
