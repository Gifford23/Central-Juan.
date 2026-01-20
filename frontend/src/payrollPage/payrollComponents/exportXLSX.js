// payrollComponents/exportXLSX.js
import Swal from "sweetalert2";
import ExcelJS from "exceljs";
import { coalesce } from "./helper";

/**
 * exportXLSX(enriched, totals)
 * - enriched: array of enriched payroll rows (same structure as before)
 * - totals: totals object computed by component
 *
 * Generates a payroll summary .xlsx
 */
export default async function exportXLSX(enriched, totals) {
  if (!Array.isArray(enriched) || !enriched.length) {
    Swal.fire("No data", "No payrolls to export.", "info");
    return;
  }

  // New column ordering:
  // No, Employee, Holidays, Leaves, OT, Total Reg Days, Total Credit, Rate, Basic Pay, Others, Gross Pay, SSS, PHIC, HDMF, Loan/Deduction, Total Deduction, Net Pay, Signature
  const headers = [
    "No", "Employee", "Holidays", "Leaves", "OT", "Total Reg Days", "Total Credit", "Rate", "Basic Pay",
    "Others", "Gross Pay", "SSS", "PHIC", "HDMF", "Loan/Deduction", "Total Deduction", "Net Pay", "Signature"
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Horizon HR";
  const ws = wb.addWorksheet("Payroll Summary", { views: [{ state: 'frozen', ySplit: 3 }] });

  // helpers in outer scope so both layout-phase and row-phase can use them
  function numericSafe(v) {
    const n = Number(v || 0);
    return isNaN(n) ? 0 : n;
  }

  // OT -> days heuristic:
  // - if p.overtime_is_days is truthy => treat rawOt as days
  // - else if rawOt < 1 => assume fractional days (keep as days)
  // - else => treat OT as hours and convert to days by dividing by workHoursPerDay
  function computeOvertimeDays(p) {
    const rawOt = Number(numericSafe(coalesce(p.total_overtime_request, p.total_overtime, 0)));
    const workHoursPerDay = Number(numericSafe(coalesce(p.work_hours_per_day, p.work_hours, 8)));
    const overtimeIsDays = !!coalesce(p.overtime_is_days, false);

    if (overtimeIsDays) return rawOt;
    if (rawOt < 1) return rawOt; // heuristic: small fractional value likely in days
    return workHoursPerDay > 0 ? (rawOt / workHoursPerDay) : 0;
  }

  // Build columns and widths from sample data so the sheet looks nice
  (function buildColumnsFromData() {
    const keys = [
      'no','employee','holidays','leaves','ot_hours','total_reg_days','total_credit','rate','basic_pay',
      'others','gross_pay','sss','phic','hdmf','loan_journal','total_deduction','net_pay','signature'
    ];

    const hdrs = headers;
    const minChars = [4,18,6,6,6,8,10,8,10,8,10,8,8,8,10,12,12,8];
    const maxChars = [8,80,10,10,10,14,16,12,16,12,16,12,12,12,14,18,18,10];

    function cellTextFor(colIdx, p, idx) {
      switch (colIdx) {
        case 0: return String(idx + 1);
        case 1: return String(p.name || p.display_name || '');
        // Holidays
        case 2: {
          const holidayCount = Number(numericSafe(coalesce(p.holiday_count_for_credit, p.holiday_count, 0)));
          return Number(holidayCount).toFixed(2);
        }
        // Leaves (paid leaves)
        case 3: {
          const paidLeaves = Number(numericSafe(coalesce(p.paid_leaves_days, p.paid_leaves, 0)));
          return Number(paidLeaves).toFixed(2);
        }
        // display raw OT as given
        case 4: {
          const rawOt = Number(numericSafe(coalesce(p.total_overtime_request, p.total_overtime, 0)));
          return Number(rawOt).toFixed(2);
        }
        // Total Reg Days = days + overtimeDays (using heuristic)
        case 5: {
          const overtimeDays = computeOvertimeDays(p);
          const daysForCalc = Number(numericSafe(p.total_days || 0)) + Number(overtimeDays || 0);
          return Number(daysForCalc).toFixed(2);
        }
        // Total Credit = Total Reg Days + Holidays + PaidLeaves (paid leaves added)
        case 6: {
          const overtimeDays = computeOvertimeDays(p);
          const daysForCalc = Number(numericSafe(coalesce(p.total_days, 0))) + Number(overtimeDays || 0);
          const holidayCount = Number(numericSafe(coalesce(p.holiday_count_for_credit, p.holiday_count, 0)));
          const paidLeaves = Number(numericSafe(coalesce(p.paid_leaves_days, p.paid_leaves, 0)));
          const totalCredit = Number((daysForCalc + holidayCount + paidLeaves).toFixed(2));
          return Number(numericSafe(totalCredit)).toFixed(2);
        }
        // RATE: blank for monthly rows per request
        case 7: {
          const isMonthly = String(coalesce(p.salary_type, "")).toLowerCase() === "monthly";
          if (isMonthly) return "";
          return Number(numericSafe(p.basic_salary)).toFixed(2);
        }

        // Basic Pay:
        // - for monthly rows use half_month_salary if present (preserve previous contract)
        // - otherwise Basic Pay = Total Credit * Rate (per request) — note Total Credit includes paid leaves
        case 8: {
          const isMonthly = String(coalesce(p.salary_type, "")).toLowerCase() === "monthly";
          if (isMonthly && Number(coalesce(p.half_month_salary, 0)) > 0) {
            return Number(numericSafe(p.half_month_salary)).toFixed(2);
          }
          const overtimeDays = computeOvertimeDays(p);
          const daysForCalc = Number(numericSafe(coalesce(p.total_days, 0))) + Number(overtimeDays || 0);
          const holidayCount = Number(numericSafe(coalesce(p.holiday_count_for_credit, p.holiday_count, 0)));
          const paidLeaves = Number(numericSafe(coalesce(p.paid_leaves_days, p.paid_leaves, 0)));
          const totalCredit = Number((daysForCalc + holidayCount + paidLeaves).toFixed(2));
          const rate = Number(numericSafe(coalesce(p.basic_salary, 0)));
          const basicPay = Number((totalCredit * rate).toFixed(2));
          return Number(numericSafe(basicPay)).toFixed(2);
        }

        // Others = rewards - deduction_oneoff
        case 9: {
          const rewardTotal = Number(numericSafe(p.total_rewards || 0));
          const oneoff = Number(numericSafe(coalesce(p.deduction_oneoff, p.deduction_oneoff_amount, 0)));
          const others = Number((rewardTotal - oneoff).toFixed(2));
          return Number(numericSafe(others)).toFixed(2);
        }

        // Gross Pay uses Basic Pay (computed above) + Others + allowances/incentives/retro
        case 10: {
          const isMonthly = String(coalesce(p.salary_type, "")).toLowerCase() === "monthly";
          let basicPay;
          if (isMonthly && Number(coalesce(p.half_month_salary, 0)) > 0) {
            basicPay = Number(numericSafe(coalesce(p.half_month_salary, 0)));
          } else {
            const overtimeDays = computeOvertimeDays(p);
            const daysForCalc = Number(numericSafe(coalesce(p.total_days, 0))) + Number(overtimeDays || 0);
            const holidayCount = Number(numericSafe(coalesce(p.holiday_count_for_credit, p.holiday_count, 0)));
            const paidLeaves = Number(numericSafe(coalesce(p.paid_leaves_days, p.paid_leaves, 0)));
            const totalCredit = Number((daysForCalc + holidayCount + paidLeaves).toFixed(2));
            const rate = Number(numericSafe(coalesce(p.basic_salary, 0)));
            basicPay = Number((totalCredit * rate).toFixed(2));
          }
          const rewardTotal = Number(numericSafe(p.total_rewards || 0));
          const oneoff = Number(numericSafe(coalesce(p.deduction_oneoff, p.deduction_oneoff_amount, 0)));
          const others = Number((rewardTotal - oneoff).toFixed(2));
          const exportGross = basicPay
            + Number(numericSafe(others))
            + Number(numericSafe(p.total_allowances || 0))
            + Number(numericSafe(p.total_incentives || 0))
            + Number(numericSafe(p.total_retro_applied || 0));
          return Number(numericSafe(exportGross)).toFixed(2);
        }

        case 11: return Number(numericSafe(p.adjustedSSS || p.displayedSSS || 0)).toFixed(2);
        case 12: return Number(numericSafe(p.adjustedPhilhealth || p.displayedPhilhealth || 0)).toFixed(2);
        case 13: return Number(numericSafe(p.adjustedPagibig || p.displayedPagibig || 0)).toFixed(2);
        case 14: {
          const loanJournal = Array.isArray(p.loans) ? p.loans.reduce((s, l) => s + (Number(l && l.journal_sum_this_cut || 0)), 0) : 0;
          return Number(numericSafe(loanJournal)).toFixed(2);
        }
        // total deduction
        case 15: return Number(numericSafe(p.total_deductions_raw)).toFixed(2);

        // Net: Gross - Total Deduction (Gross computed above)
        case 16: {
          const isMonthly = String(coalesce(p.salary_type, "")).toLowerCase() === "monthly";
          let basicPay;
          if (isMonthly && Number(coalesce(p.half_month_salary, 0)) > 0) {
            basicPay = Number(numericSafe(coalesce(p.half_month_salary, 0)));
          } else {
            const overtimeDays = computeOvertimeDays(p);
            const daysForCalc = Number(numericSafe(coalesce(p.total_days, 0))) + Number(overtimeDays || 0);
            const holidayCount = Number(numericSafe(coalesce(p.holiday_count_for_credit, p.holiday_count, 0)));
            const paidLeaves = Number(numericSafe(coalesce(p.paid_leaves_days, p.paid_leaves, 0)));
            const totalCredit = Number((daysForCalc + holidayCount + paidLeaves).toFixed(2));
            const rate = Number(numericSafe(coalesce(p.basic_salary, 0)));
            basicPay = Number((totalCredit * rate).toFixed(2));
          }
          const rewardTotal = Number(numericSafe(p.total_rewards || 0));
          const oneoff = Number(numericSafe(coalesce(p.deduction_oneoff, p.deduction_oneoff_amount, 0)));
          const others = Number((rewardTotal - oneoff).toFixed(2));
          const exportGross = basicPay
            + Number(numericSafe(others))
            + Number(numericSafe(p.total_allowances || 0))
            + Number(numericSafe(p.total_incentives || 0))
            + Number(numericSafe(p.total_retro_applied || 0));
          const exportNet = Number((exportGross - Number(numericSafe(p.total_deductions_raw || 0))).toFixed(2));
          return Number(numericSafe(exportNet)).toFixed(2);
        }

        case 17: return "";
        default: return "";
      }
    }

    const sampleRows = Array.isArray(enriched) ? enriched : [];
    const maxLens = hdrs.map((h, colIdx) => {
      let maxLen = String(h || "").length;
      for (let r = 0; r < sampleRows.length; r++) {
        try {
          const txt = String(cellTextFor(colIdx, sampleRows[r], r) || "");
          if (txt.length > maxLen) maxLen = txt.length;
        } catch (e) { /* ignore */ }
      }
      return maxLen;
    });

    const widths = maxLens.map((len, i) => {
      const approx = Math.ceil(len * 1.05) + 2;
      const minC = minChars[i] || 6;
      const maxC = maxChars[i] || 40;
      return Math.max(minC, Math.min(approx, maxC));
    });

    ws.columns = hdrs.map((h, i) => ({
      header: h,
      key: keys[i],
      width: widths[i]
    }));

    // column alignments
    try {
      for (let i = 1; i <= hdrs.length; i++) {
        const col = ws.getColumn(i);
        col.alignment = col.alignment || {};
        // Employee column left, Signature center, others numeric right
        if (i === 2) {
          col.alignment.wrapText = true;
          col.alignment.horizontal = 'left';
        } else {
          col.alignment.wrapText = true;
          col.alignment.horizontal = (i === 1 || i === hdrs.length) ? 'center' : 'right';
        }
      }
    } catch (e) {
      console.warn("Column alignment/wrap failed:", e);
    }

    // header row height compute
    try {
      const pointsPerLine = 14;
      let maxHeaderLines = 1;
      for (let i = 0; i < hdrs.length; i++) {
        const hdr = String(hdrs[i] || "");
        const col = ws.getColumn(i + 1);
        const colWidth = (col && col.width) ? col.width : 10;
        const charsPerLine = Math.max(1, Math.floor(colWidth));
        const requiredLines = Math.ceil(hdr.length / charsPerLine);
        if (requiredLines > maxHeaderLines) maxHeaderLines = requiredLines;
      }
      const computedHeaderHeight = Math.max(20, Math.min(120, maxHeaderLines * pointsPerLine));
      ws.getRow(3).height = computedHeaderHeight;
    } catch (e) {
      console.warn("Header height compute failed:", e);
    }
  })();

  // sheet title & cutoff
  const title = "PAYROLL SUMMARY";
  const cutoffFrom = (enriched[0] && enriched[0].date_from) || "";
  const cutoffUntil = (enriched[0] && enriched[0].date_until) || "";

  ws.mergeCells(1, 1, 1, headers.length);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { name: "Calibri", size: 16, bold: true, color: { argb: "FF0B2545" } };
  ws.getRow(1).height = 22;

  ws.mergeCells(2, 1, 2, headers.length);
  ws.getCell(2, 1).value = `Cutoff: ${cutoffFrom} — ${cutoffUntil}`;
  ws.getCell(2, 1).font = { name: "Calibri", size: 11, italic: true, color: { argb: "FF444444" } };
  ws.getRow(2).height = 14;

  const headerRow = ws.getRow(3);
  headerRow.values = headers;
  headerRow.font = { name: "Calibri", size: 11, bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = headerRow.height || 20;

  const headerColorMap = {
    employee: "FFD2E6FB",
    earnings: "FFE8F8EE",
    deductions: "FFFDF3E8",
    net: "FFDFF4E9",
    neutral: "FFF6F6F6"
  };

  // Earnings now: Holidays(3), Leaves(4), OT(5), Total Reg Days(6), Total Credit(7), Rate(8), Basic(9), Others(10), Gross(11)
  const earningsCols = [3,4,5,6,7,8,9,10,11];
  const deductionsCols = [12,13,14,15,16];
  const netColIndex = 17; // Net is now column 17 (Q)
  const employeeColIndex = 2;

  for (let c = 1; c <= headers.length; c++) {
    const cell = ws.getCell(3, c);
    let fillColor = headerColorMap.neutral;
    if (c === employeeColIndex) fillColor = headerColorMap.employee;
    else if (earningsCols.includes(c)) fillColor = headerColorMap.earnings;
    else if (deductionsCols.includes(c)) fillColor = headerColorMap.deductions;
    else if (c === netColIndex) fillColor = headerColorMap.net;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
  }

  // Data rows start at row 4
  let currentRowIndex = 4;
  // totals accumulators (we sum the exact values we write to the sheet)
  let exportGrossTotalAcc = 0;
  let othersTotalAcc = 0;
  let sssTotalAcc = 0;
  let phicTotalAcc = 0;
  let hdmfTotalAcc = 0;
  let loanJournalAcc = 0;
  let totalDeductionsAcc = 0;
  let exportNetAcc = 0;
  let totalRegDaysAcc = 0;    // accumulates daysForCalc (total_days + OT converted per heuristic)
  let overtimeAcc = 0;        // raw OT accumulator (units as supplied)
  let totalCreditAcc = 0;     // accumulates total credit (days + OTconverted + holidays + paid leaves)
  let baseSumAcc = 0;
  let holidaysAcc = 0;
  let paidLeavesAcc = 0;

  enriched.forEach((p, idx) => {
    const loanJournal = Array.isArray(p.loans)
      ? p.loans.reduce((s, l) => s + (Number(l && l.journal_sum_this_cut || 0)), 0)
      : 0;
    const sss = Number(p.adjustedSSS || p.displayedSSS || 0);
    const phic = Number(p.adjustedPhilhealth || p.displayedPhilhealth || 0);
    const hdmf = Number(p.adjustedPagibig || p.displayedPagibig || 0);
    const totalDeductions = Number(p.total_deductions_raw || 0);

    // raw OT and compute overtimeDays using heuristic
    const rawOt = Number(coalesce(p.total_overtime_request, p.total_overtime, 0)) || 0;
    const overtimeDaysForCalc = computeOvertimeDays(p);

    // Total Reg Days and Total Credit (include paid leaves)
    const daysForCalc = Number(coalesce(p.total_days, 0)) + Number(overtimeDaysForCalc || 0);
    const holidayCount = Number(coalesce(p.holiday_count_for_credit, p.holiday_count, 0));
    const paidLeaves = Number(coalesce(p.paid_leaves_days, p.paid_leaves, 0)) || 0;
    const totalCredit = Number((daysForCalc + holidayCount + paidLeaves).toFixed(2));

    // Basic Pay: monthly rows use half_month_salary if present, otherwise Basic Pay = Total Credit * Rate
    const isMonthly = String(coalesce(p.salary_type, "")).toLowerCase() === "monthly";
    let exportBasicPay;
    if (isMonthly && Number(coalesce(p.half_month_salary, 0)) > 0) {
      exportBasicPay = Number(coalesce(p.half_month_salary, 0));
    } else {
      const rate = Number(coalesce(p.basic_salary, 0));
      exportBasicPay = Number((totalCredit * rate).toFixed(2));
    }

    // Others (net rewards)
    const rewardTotal = Number(p.total_rewards || 0);
    const deductionOneoff = Number(coalesce(p.deduction_oneoff, p.deduction_oneoff_amount, 0)) || 0;
    const others = Number((rewardTotal - deductionOneoff).toFixed(2));

    // Gross = Basic + Others + allowances/incentives/retro
    const exportGross = Number((
      exportBasicPay
      + Number(others)
      + Number(p.total_allowances || 0)
      + Number(p.total_incentives || 0)
      + Number(p.total_retro_applied || 0)
    ).toFixed(2));

    // accumulate totals based on written values
    exportGrossTotalAcc += exportGross;
    othersTotalAcc += others;
    sssTotalAcc += sss;
    phicTotalAcc += phic;
    hdmfTotalAcc += hdmf;
    loanJournalAcc += loanJournal;
    totalDeductionsAcc += totalDeductions;
    const exportNet = Number((exportGross - Number(totalDeductions)).toFixed(2));
    exportNetAcc += exportNet;
    totalRegDaysAcc += Number(daysForCalc);
    overtimeAcc += Number(rawOt);
    totalCreditAcc += Number(totalCredit);
    baseSumAcc += exportBasicPay;
    holidaysAcc += Number(holidayCount);
    paidLeavesAcc += Number(paidLeaves);

    // row values:
    // No, Employee, Holidays, Leaves, OT, Total Reg Days, Total Credit, Rate, Basic Pay, Others, Gross Pay, SSS, PHIC, HDMF, Loan/Deduction, Total Deduction, Net Pay, Signature
    const rateCellValue = isMonthly ? "" : Number(coalesce(p.basic_salary, 0)); // <<--- blank Rate for monthly
    const rowValues = [
      idx + 1,
      p.name || "",
      Number(holidayCount),
      Number(paidLeaves),
      Number(rawOt),
      Number(daysForCalc),
      Number(totalCredit),
      rateCellValue,
      Number(exportBasicPay),
      Number(others),
      Number(exportGross),
      sss,
      phic,
      hdmf,
      loanJournal,
      totalDeductions,
      // Net: set as formula below
      null,
      ""
    ];

    const row = ws.addRow(rowValues);

    // numeric formatting & alignment
    // numeric columns (1-based): everything except Employee(col 2) and Signature(last)
    const numericCols = [1,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17];
    numericCols.forEach(cIdx => {
      const cell = row.getCell(cIdx);
      // Don’t format No (col 1) and Signature (last) as currency (we still format many numeric cells)
      if (![1, headers.length].includes(cIdx)) {
        cell.numFmt = '#,##0.00';
      }
      cell.alignment = { horizontal: (cIdx === 2 ? 'left' : 'right'), vertical: 'middle' };
      cell.font = { name: "Calibri", size: 11 };
    });

    // Net Pay cell as formula: Gross (K) - Total Deduction (P)
    const rowNum = row.number;
    const grossCellRef = `K${rowNum}`;   // Gross column (11th) => 'K'
    const totalDedCellRef = `P${rowNum}`; // Total Deduction column (16th) => 'P'
    const netCell = row.getCell(netColIndex);
    netCell.value = { formula: `${grossCellRef} - ${totalDedCellRef}`, result: exportNet };
    netCell.numFmt = '#,##0.00';
    netCell.alignment = { horizontal: 'right', vertical: 'middle' };
    if (exportNet < 0) {
      netCell.font = Object.assign({}, netCell.font || {}, { color: { argb: "FFB00020" } });
    } else {
      netCell.font = Object.assign({}, netCell.font || {}, { color: { argb: "FF0B6623" }, bold: true });
    }

    // color-code Others cell (column index 10 -> 'J')
    const othersCell = row.getCell(10);
    if (Number(others) < 0) {
      othersCell.font = Object.assign({}, othersCell.font || {}, { color: { argb: "FFB00020" } });
    } else {
      othersCell.font = Object.assign({}, othersCell.font || {}, { color: { argb: "FF0B6623" }, bold: true });
    }

    // highlight skipped-loan rows
    if (p.is_loan_skipped) {
      const skipFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: "FFFFF2E6" } };
      for (let c = 1; c <= headers.length; c++) {
        const cell = row.getCell(c);
        cell.fill = Object.assign({}, cell.fill || {}, skipFill);
      }
    }

    currentRowIndex++;
  });

  // spacer rows
  const spacer1 = ws.addRow([]);
  spacer1.height = 6;
  const spacer2 = ws.addRow([]);
  spacer2.height = 6;

  // totals row using accumulators
  const totalsExportGross = Number(exportGrossTotalAcc.toFixed(2));
  const totalsOthers = Number(othersTotalAcc.toFixed(2));
  const totalsSss = Number(sssTotalAcc.toFixed(2));
  const totalsPh = Number(phicTotalAcc.toFixed(2));
  const totalsPg = Number(hdmfTotalAcc.toFixed(2));
  const totalsLoanJournal = Number(loanJournalAcc.toFixed(2));
  const totalsDeductions = Number(totalDeductionsAcc.toFixed(2));
  const totalsNet = Number(exportNetAcc.toFixed(2));
  const totalsTotalRegDays = Number(totalRegDaysAcc.toFixed(2));
  const totalsOvertime = Number(overtimeAcc.toFixed(2));
  const totalsTotalCredit = Number(totalCreditAcc.toFixed(2));
  const totalsBaseSum = Number(baseSumAcc.toFixed(2));
  const totalsHolidays = Number(holidaysAcc.toFixed(2));
  const totalsPaidLeaves = Number(paidLeavesAcc.toFixed(2));

  const totalsRowValues = [
    "Totals", "",
    totalsHolidays,
    totalsPaidLeaves,
    totalsOvertime,
    totalsTotalRegDays,
    totalsTotalCredit,
    "", Number(totalsBaseSum || 0), Number(totalsOthers || 0),
    Number(totalsExportGross || 0), Number(totalsSss || 0), Number(totalsPh || 0), Number(totalsPg || 0),
    Number(totalsLoanJournal || 0), Number(totalsDeductions || 0),
    // Net will be SUM of Net column below
    null,
    ""
  ];
  const totalsRow = ws.addRow(totalsRowValues);

  // set total net as SUM over Net column (Q4:Q{lastDataRow}) — Net is column 17 => 'Q'
  const firstNetRow = 4;
  const lastNetRow = Math.max(4, currentRowIndex - 1);
  const totalsNetCell = totalsRow.getCell(netColIndex);
  totalsNetCell.value = { formula: `SUM(Q${firstNetRow}:Q${lastNetRow})`, result: totalsNet };
  totalsNetCell.numFmt = '#,##0.00';

  totalsRow.font = { name: "Calibri", size: 11, bold: true };
  totalsRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    if ([3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].includes(colNumber)) {
      if (colNumber !== 2 && colNumber !== headers.length) cell.numFmt = '#,##0.00';
      cell.alignment = { horizontal: (colNumber === 2 ? 'left' : 'right'), vertical: 'middle' };
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    cell.border = { top: { style: 'thin', color: { argb: 'FFCCCCCC' } } };
  });

  // color-code totals Others cell (col 10 -> 'J')
  try {
    const totalsOthersCell = totalsRow.getCell(10);
    const totalsOthersVal = Number(totalsRowValues[9] || 0);
    if (totalsOthersVal < 0) {
      totalsOthersCell.font = Object.assign({}, totalsOthersCell.font || {}, { color: { argb: "FFB00020" } });
    } else {
      totalsOthersCell.font = Object.assign({}, totalsOthersCell.font || {}, { color: { argb: "FF0B6623" }, bold: true });
    }
  } catch (e) {
    // ignore
  }

  // autofilter
  function colLetter(col) {
    let s = "";
    while (col > 0) {
      const m = (col - 1) % 26;
      s = String.fromCharCode(65 + m) + s;
      col = Math.floor((col - 1) / 26);
    }
    return s;
  }
  const lastColLetter = colLetter(headers.length);
  ws.autoFilter = { from: 'A3', to: `${lastColLetter}3` };

  // write workbook buffer and trigger download in browser
  try {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = 'payroll_summary_' + (new Date()).toISOString().slice(0,10) + '.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Excel export failed", err);
    Swal.fire("Export failed", "Unable to generate .xlsx file. See console for details.", "error");
  }
}
