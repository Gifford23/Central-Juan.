// src/components/thirteenth/ThirteenthSlip.js
// Client-side slip generator — fixed: detects monthly vs semi-monthly and renders appropriate compact layout.
// - Compact: each slip ~25% width, height auto.
// - Uses fetchEmployeesAPI and fetchTmEntriesAPI from your API helper.

import { fetchEmployeesAPI, fetchTmEntriesAPI, fetchTmDeductionsAPI } from "../payrollApi/thirteenthMonthAPI";

/**
 * printThirteenthSlips(selectedEmployeeIds = [], year)
 * - selectedEmployeeIds: array of employee_id strings
 * - year: calendar year (number)
 */
export async function printThirteenthSlips(selectedEmployeeIds = [], year = new Date().getFullYear()) {
  if (!Array.isArray(selectedEmployeeIds) || selectedEmployeeIds.length === 0) {
    alert("No employees selected to print.");
    return;
  }

  try {
    // fetch employees + entries
    const empRes = await fetchEmployeesAPI({ status: "all" });
    const employees = empRes && empRes.success ? empRes.data : Array.isArray(empRes) ? empRes : [];
    const empMap = employees.reduce((m, e) => { m[e.employee_id] = e; return m; }, {});

    const entriesRes = await fetchTmEntriesAPI({ calendar_year: year });
    const entries = entriesRes && entriesRes.success && Array.isArray(entriesRes.data)
      ? entriesRes.data : Array.isArray(entriesRes) ? entriesRes : [];

    const entriesByEmployee = entries.reduce((acc, item) => {
      const id = item.employee_id;
      if (!acc[id]) acc[id] = [];
      acc[id].push(item);
      return acc;
    }, {});

    const htmlParts = [];
    const missing = [];
    const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    for (const id of selectedEmployeeIds) {
      const emp = empMap[id];
      const empEntries = entriesByEmployee[id] || [];

      if (!emp) {
        missing.push({ employee_id: id, reason: "employee not found" });
        continue;
      }

      // Build a period map 1..24 default 0
      const periodMap = {};
      for (let i = 1; i <= 24; i++) periodMap[i] = 0;
      empEntries.forEach((r) => {
        const idx = Number(r.period_index);
        if (!isNaN(idx) && idx >= 1 && idx <= 24) periodMap[idx] = Number(r.gross_amount || 0);
      });

      // detect mode: prefer emp.mode if provided; otherwise use entries pattern
      const detectSemi = (() => {
        const modeVal = (emp.mode || emp.employee_mode || "").toString().toLowerCase();
        if (modeVal) {
          return modeVal.includes("semi") || modeVal === "semi_monthly" || modeVal === "semi-monthly";
        }
        // fallback: if any period_index > 12 exists (meaning 24-slot data) => semi
        const maxIdx = empEntries.reduce((mx, r) => Math.max(mx, Number(r.period_index || 0)), 0);
        if (maxIdx > 12) return true;
        // fallback: if there are more than 12 non-zero entries -> likely semi
        const nonZeroCount = empEntries.filter(r => Number(r.gross_amount || 0) !== 0).length;
        if (nonZeroCount > 12) return true;
        return false; // treat as monthly
      })();

      // compute monthly totals and year total differently depending on detected mode
      const monthly = []; // array of { monthIndex, cutA, cutB, monthTotal } but for monthly cutA=cutB=0
      let yearTotal = 0;

      if (detectSemi) {
        for (let m = 1; m <= 12; m++) {
          const a = periodMap[2 * m - 1] || 0;
          const b = periodMap[2 * m] || 0;
          const monthTotal = a + b;
          monthly.push({ monthIndex: m, cutA: a, cutB: b, monthTotal });
          yearTotal += monthTotal;
        }
      } else {
        // monthly employees: expect period_index 1..12
        for (let m = 1; m <= 12; m++) {
          // prefer periodMap[m]; if not present, fall back to sum of 2*m-1 and 2*m (in case data saved oddly)
          const mVal = (periodMap[m] !== undefined && periodMap[m] !== 0)
            ? periodMap[m]
            : ((periodMap[2 * m - 1] || 0) + (periodMap[2 * m] || 0));
          monthly.push({ monthIndex: m, cutA: null, cutB: null, monthTotal: mVal });
          yearTotal += Number(mVal || 0);
        }
      }

      const thirteenthRaw = Math.round((yearTotal / 12) * 100) / 100;

      // FETCH deductions for this employee (if endpoint exists)
      // If fetchTmDeductionsAPI returns { success, data } or an array directly, handle both.
      let deductions = [];
      try {
        const dedRes = await fetchTmDeductionsAPI({ employee_id: id, calendar_year: year });
        deductions = dedRes && dedRes.success ? (dedRes.data || []) : (Array.isArray(dedRes) ? dedRes : []);
      } catch (err) {
        deductions = [];
        console.warn("Failed to fetch deductions for", id, err);
      }

      // Compute deductions: fixed + percent applied to raw thirteenth
      let fixedSum = 0;
      let percentSum = 0;
      (deductions || []).forEach((d) => {
        if (d.type === "fixed") fixedSum += Number(d.amount || 0);
        else if (d.type === "percent") percentSum += Number(d.amount || 0);
      });
      const percentAmount = Math.round((percentSum / 100) * thirteenthRaw * 100) / 100;
      const totalDeduction = Math.round((fixedSum + percentAmount) * 100) / 100;
      const thirteenthNet = Math.round((thirteenthRaw - totalDeduction) * 100) / 100;

      // Build per-employee slip HTML: adapt table columns based on detectSemi
      const tableRowsHtml = detectSemi
        ? monthly.map(mi => `
            <tr>
              <td class="l">${mi.monthIndex}</td>
              <td class="r">${fmt(mi.cutA)}</td>
              <td class="r">${fmt(mi.cutB)}</td>
              <td class="r bold">${fmt(mi.monthTotal)}</td>
            </tr>
          `).join("")
        : monthly.map(mi => `
            <tr>
              <td class="l">${mi.monthIndex}</td>
              <td class="r bold">${fmt(mi.monthTotal)}</td>
            </tr>
          `).join("");

      const headHtml = detectSemi
        ? `<thead><tr><th>Mon</th><th class="r">1st</th><th class="r">2nd</th><th class="r">Total</th></tr></thead>`
        : `<thead><tr><th>Mon</th><th class="r">Total</th></tr></thead>`;

      // Footer: show Year total, 13th Raw and 13th Net. If deductions exist, show raw (muted) and net (red) with deduction summary
      const dedSummaryLines = (deductions || []).map((d) => {
        if (d.type === "fixed") return `${escapeHtml(d.description)}: ₱ ${Number(d.amount).toFixed(2)}`;
        const applied = Math.round(((Number(d.amount || 0) / 100) * thirteenthRaw) * 100) / 100;
        return `${escapeHtml(d.description)}: ${Number(d.amount).toFixed(2)}% (₱ ${applied.toFixed(2)})`;
      });

      const dedTooltip = dedSummaryLines.length > 0 ? dedSummaryLines.join("\\n") : "";

      const footHtml = detectSemi
        ? `
          <tfoot>
            <tr>
              <td class="l bold">Year</td><td></td><td></td>
              <td class="r bold">₱ ${fmt(yearTotal)}</td>
            </tr>
            <tr>
              <td></td><td></td><td class="r small">13th (raw)</td>
              <td class="r small">₱ ${fmt(thirteenthRaw)}</td>
            </tr>
            ${ totalDeduction > 0 ? `
            <tr>
              <td></td><td></td><td class="r small">Deductions</td>
              <td class="r small">₱ ${fmt(totalDeduction)}</td>
            </tr>
            <tr>
              <td></td><td></td><td class="r small">13th (net)</td>
              <td class="r bold" title="${dedTooltip}" style="color:#9b1c1c; background:#fff5f5; border:1px solid #fde2e2; padding:4px; border-radius:4px;">₱ ${fmt(thirteenthNet)}</td>
            </tr>
            ` : `
            <tr>
              <td></td><td></td><td class="r small">13th (final)</td>
              <td class="r bold" style="color:#11632a; background:#f0fff4; border:1px solid #d1f4d8; padding:4px; border-radius:4px;">₱ ${fmt(thirteenthRaw)}</td>
            </tr>
            `}
          </tfoot>
        `
        : `
          <tfoot>
            <tr>
              <td class="l bold">Year</td>
              <td class="r bold">₱ ${fmt(yearTotal)}</td>
            </tr>
            <tr>
              <td class="l small">13th (raw)</td>
              <td class="r small">₱ ${fmt(thirteenthRaw)}</td>
            </tr>
            ${ totalDeduction > 0 ? `
            <tr>
              <td class="l small">Deductions</td>
              <td class="r small">₱ ${fmt(totalDeduction)}</td>
            </tr>
            <tr>
              <td class="l small">13th (net)</td>
              <td class="r bold" title="${dedTooltip}" style="color:#9b1c1c; background:#fff5f5; border:1px solid #fde2e2; padding:4px; border-radius:4px;">₱ ${fmt(thirteenthNet)}</td>
            </tr>
            ` : `
            <tr>
              <td class="l small">13th (final)</td>
              <td class="r bold" style="color:#11632a; background:#f0fff4; border:1px solid #d1f4d8; padding:4px; border-radius:4px;">₱ ${fmt(thirteenthRaw)}</td>
            </tr>
            `}
          </tfoot>
        `;

      const slipHtml = `
        <div class="tm-slip-block">
          <div class="tm-slip-inner">
            <div class="tm-header">
              <div class="tm-company">Company</div>
              <div class="tm-year">13th • ${year}</div>
            </div>

            <div class="tm-employee">
              <div class="tm-name">${escapeHtml(emp.first_name || "")} ${escapeHtml(emp.last_name || "")}</div>
              <div class="tm-meta">ID: ${escapeHtml(emp.employee_id || "")}</div>
            </div>

            <div class="tm-breakdown">
              <table class="tm-table">
                ${headHtml}
                <tbody>
                  ${tableRowsHtml}
                </tbody>
                ${footHtml}
              </table>
            </div>
          </div>
        </div>
      `;

      htmlParts.push(slipHtml);
    }

    if (htmlParts.length === 0) {
      alert("No slips could be generated. Check console for details.");
      console.error("Slip missing info", missing);
      return;
    }

    const combinedHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>13th Month Slips - ${year}</title>
          <style>
            :root { --pad:6px; --font:11px; --muted:#666; }
            body { margin: 8px; font-family: Inter, Roboto, "Segoe UI", Arial; font-size: var(--font); color:#111; }
            /* Print control bar (hidden when printing) */
            .print-controls { position: fixed; top: 8px; right: 8px; z-index: 9999; display: flex; gap: 8px; }
            .print-controls button { padding: 6px 10px; border-radius: 6px; border: 1px solid #ccc; background: #fff; cursor: pointer; font-size: 12px; }
            .print-controls button:hover { box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
            .no-print { display: inline-block; }

            /* Layout: target ~25% width per slip (4 per row).
               Using calc lets us account for margins so 4 fit nicely. */
            .tm-slip-block {
              width: calc(20% - 12px);
              box-sizing: border-box;
              display: inline-block;
              vertical-align: top;
              padding: 3px;
              margin: 3px;
              page-break-inside: avoid;
              page-break-after: auto;
            }
            .tm-slip-inner { border: 1px solid #e6e6e6; padding: 8px; border-radius: 4px; background: #fff; }
            .tm-header { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; }
            .tm-company { font-weight:700; font-size:12px; }
            .tm-year { font-size:10px; color:var(--muted); }
            .tm-employee { margin-bottom:6px; }
            .tm-name { font-weight:600; font-size:11px; margin-bottom:2px; }
            .tm-meta { font-size:10px; color:var(--muted); }
            .tm-table { width:100%; border-collapse:collapse; font-size:10px; }
            .tm-table th, .tm-table td { padding:4px 6px; border-bottom:1px solid #f2f2f2; }
            .tm-table thead th { border-bottom:1px solid #ddd; font-weight:600; font-size:10px; }
            .tm-table tfoot td { padding-top:6px; border-top:2px solid #eee; }
            .l { text-align:left; }
            .r { text-align:right; }
            .bold { font-weight:700; }
            .small { font-size:10px; color:var(--muted); }

            /* Responsive fallbacks for narrower screens */
            @media (max-width: 1100px) {
              .tm-slip-block { width: calc(50% - 12px); } /* two per row on medium screens */
            }
            @media (max-width: 520px) {
              .tm-slip-block { width: calc(100% - 12px); } /* single column on phones */
            }

            @media print {
              .print-controls, .no-print { display: none !important; }
              body { margin: 6mm; }
              /* Use 25% width in print so four slips per page row on landscape/portrait depending on page size */
              .tm-slip-block { page-break-inside: avoid; page-break-after: auto; width: calc(25% - 12px); }
              /* Slightly tighten inner spacing for printing */
              .tm-slip-inner { padding: 6px; }
              .tm-table th, .tm-table td { padding: 3px 4px; }
            }
          </style>
        </head>
        <body>
          <div class="print-controls no-print" aria-hidden="true">
            <button id="printBtn" type="button" title="Print slips">Print</button>
            <button id="closeBtn" type="button" title="Close window">Close</button>
          </div>

          ${htmlParts.join("\n")}

          <script>
            // basic wiring for print/close controls
            (function(){
              function safeId(id){ return document.getElementById(id); }
              var p = safeId('printBtn');
              var c = safeId('closeBtn');
              if(p){
                p.addEventListener('click', function(){
                  try{
                    window.focus();
                  }catch(e){}
                  // give browser a moment to focus, then print
                  setTimeout(function(){ window.print(); }, 100);
                });
              }
              if(c){
                c.addEventListener('click', function(){
                  try{ window.close(); }catch(e){ /* ignore */ }
                });
              }

              // Optional: focus so keyboard print (Ctrl+P) works
              try{ window.focus(); }catch(e){}

              // Accessibility: allow pressing 'p' to print and 'Esc' to close
              document.addEventListener('keydown', function(ev){
                if(ev.key === 'p' && (ev.ctrlKey || ev.metaKey) === false){ // just 'p'
                  ev.preventDefault();
                  if(p) p.click();
                } else if(ev.key === 'Escape') {
                  if(c) c.click();
                }
              }, false);
            })();
          </script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Allow popups to print slips.");
      return;
    }
    w.document.open();
    w.document.write(combinedHtml);
    w.document.close();
  } catch (err) {
    console.error("printThirteenthSlips error:", err);
    alert("Failed to generate slips. See console for details.");
  }
}

/**
 * Basic HTML escape to avoid injection.
 */
function escapeHtml(text) {
  if (text == null) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}




// // src/components/thirteenth/ThirteenthSlip.js
// // Client-side slip generator — fixed: detects monthly vs semi-monthly and renders appropriate compact layout.
// // - Compact: each slip ~25% width, height auto.
// // - Uses fetchEmployeesAPI and fetchTmEntriesAPI from your API helper.

// import { fetchEmployeesAPI, fetchTmEntriesAPI } from "../payrollApi/thirteenthMonthAPI";

// /**
//  * printThirteenthSlips(selectedEmployeeIds = [], year)
//  * - selectedEmployeeIds: array of employee_id strings
//  * - year: calendar year (number)
//  */
// export async function printThirteenthSlips(selectedEmployeeIds = [], year = new Date().getFullYear()) {
//   if (!Array.isArray(selectedEmployeeIds) || selectedEmployeeIds.length === 0) {
//     alert("No employees selected to print.");
//     return;
//   }

//   try {
//     // fetch employees + entries
//     const empRes = await fetchEmployeesAPI({ status: "all" });
//     const employees = empRes && empRes.success ? empRes.data : Array.isArray(empRes) ? empRes : [];
//     const empMap = employees.reduce((m, e) => { m[e.employee_id] = e; return m; }, {});

//     const entriesRes = await fetchTmEntriesAPI({ calendar_year: year });
//     const entries = entriesRes && entriesRes.success && Array.isArray(entriesRes.data)
//       ? entriesRes.data : Array.isArray(entriesRes) ? entriesRes : [];

//     const entriesByEmployee = entries.reduce((acc, item) => {
//       const id = item.employee_id;
//       if (!acc[id]) acc[id] = [];
//       acc[id].push(item);
//       return acc;
//     }, {});

//     const htmlParts = [];
//     const missing = [];
//     const fmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

//     for (const id of selectedEmployeeIds) {
//       const emp = empMap[id];
//       const empEntries = entriesByEmployee[id] || [];

//       if (!emp) {
//         missing.push({ employee_id: id, reason: "employee not found" });
//         continue;
//       }

//       // Build a period map 1..24 default 0
//       const periodMap = {};
//       for (let i = 1; i <= 24; i++) periodMap[i] = 0;
//       empEntries.forEach((r) => {
//         const idx = Number(r.period_index);
//         if (!isNaN(idx) && idx >= 1 && idx <= 24) periodMap[idx] = Number(r.gross_amount || 0);
//       });

//       // detect mode: prefer emp.mode if provided; otherwise use entries pattern
//       const detectSemi = (() => {
//         const modeVal = (emp.mode || emp.employee_mode || "").toString().toLowerCase();
//         if (modeVal) {
//           return modeVal.includes("semi") || modeVal === "semi_monthly" || modeVal === "semi-monthly";
//         }
//         // fallback: if any period_index > 12 exists (meaning 24-slot data) => semi
//         const maxIdx = empEntries.reduce((mx, r) => Math.max(mx, Number(r.period_index || 0)), 0);
//         if (maxIdx > 12) return true;
//         // fallback: if there are more than 12 non-zero entries -> likely semi
//         const nonZeroCount = empEntries.filter(r => Number(r.gross_amount || 0) !== 0).length;
//         if (nonZeroCount > 12) return true;
//         return false; // treat as monthly
//       })();

//       // compute monthly totals and year total differently depending on detected mode
//       const monthly = []; // array of { monthIndex, cutA, cutB, monthTotal } but for monthly cutA=cutB=0
//       let yearTotal = 0;

//       if (detectSemi) {
//         for (let m = 1; m <= 12; m++) {
//           const a = periodMap[2 * m - 1] || 0;
//           const b = periodMap[2 * m] || 0;
//           const monthTotal = a + b;
//           monthly.push({ monthIndex: m, cutA: a, cutB: b, monthTotal });
//           yearTotal += monthTotal;
//         }
//       } else {
//         // monthly employees: expect period_index 1..12
//         for (let m = 1; m <= 12; m++) {
//           // prefer periodMap[m]; if not present, fall back to sum of 2*m-1 and 2*m (in case data saved oddly)
//           const mVal = (periodMap[m] !== undefined && periodMap[m] !== 0)
//             ? periodMap[m]
//             : ((periodMap[2 * m - 1] || 0) + (periodMap[2 * m] || 0));
//           monthly.push({ monthIndex: m, cutA: null, cutB: null, monthTotal: mVal });
//           yearTotal += Number(mVal || 0);
//         }
//       }

//       const thirteenth = Math.round((yearTotal / 12) * 100) / 100;

//       // Build per-employee slip HTML: adapt table columns based on detectSemi
//       const tableRowsHtml = detectSemi
//         ? monthly.map(mi => `
//             <tr>
//               <td class="l">${mi.monthIndex}</td>
//               <td class="r">${fmt(mi.cutA)}</td>
//               <td class="r">${fmt(mi.cutB)}</td>
//               <td class="r bold">${fmt(mi.monthTotal)}</td>
//             </tr>
//           `).join("")
//         : monthly.map(mi => `
//             <tr>
//               <td class="l">${mi.monthIndex}</td>
//               <td class="r bold">${fmt(mi.monthTotal)}</td>
//             </tr>
//           `).join("");

//       const headHtml = detectSemi
//         ? `<thead><tr><th>Mon</th><th class="r">1st</th><th class="r">2nd</th><th class="r">Total</th></tr></thead>`
//         : `<thead><tr><th>Mon</th><th class="r">Total</th></tr></thead>`;

//       const footHtml = detectSemi
//         ? `
//           <tfoot>
//             <tr>
//               <td class="l bold">Year</td><td></td><td></td>
//               <td class="r bold">₱ ${fmt(yearTotal)}</td>
//             </tr>
//             <tr>
//               <td></td><td></td><td class="r small">13th</td>
//               <td class="r bold">₱ ${fmt(thirteenth)}</td>
//             </tr>
//           </tfoot>
//         `
//         : `
//           <tfoot>
//             <tr>
//               <td class="l bold">Year</td>
//               <td class="r bold">₱ ${fmt(yearTotal)}</td>
//             </tr>
//             <tr>
//               <td></td>
//               <td class="r bold">13th: ₱ ${fmt(thirteenth)}</td>
//             </tr>
//           </tfoot>
//         `;

//       const slipHtml = `
//         <div class="tm-slip-block">
//           <div class="tm-slip-inner">
//             <div class="tm-header">
//               <div class="tm-company">Company</div>
//               <div class="tm-year">13th • ${year}</div>
//             </div>

//             <div class="tm-employee">
//               <div class="tm-name">${escapeHtml(emp.first_name || "")} ${escapeHtml(emp.last_name || "")}</div>
//               <div class="tm-meta">ID: ${escapeHtml(emp.employee_id || "")}</div>
//             </div>

//             <div class="tm-breakdown">
//               <table class="tm-table">
//                 ${headHtml}
//                 <tbody>
//                   ${tableRowsHtml}
//                 </tbody>
//                 ${footHtml}
//               </table>
//             </div>
//           </div>
//         </div>
//       `;

//       htmlParts.push(slipHtml);
//     }

//     if (htmlParts.length === 0) {
//       alert("No slips could be generated. Check console for details.");
//       console.error("Slip missing info", missing);
//       return;
//     }

//     const combinedHtml = `
//       <!doctype html>
//       <html>
//         <head>
//           <meta charset="utf-8"/>
//           <title>13th Month Slips - ${year}</title>
//           <style>
//             :root { --pad:6px; --font:11px; --muted:#666; }
//             body { margin: 8px; font-family: Inter, Roboto, "Segoe UI", Arial; font-size: var(--font); color:#111; }
//             .tm-slip-block {
//               width: 25%;
//               box-sizing: border-box;
//               display: inline-block;
//               vertical-align: top;
//               padding: 6px;
//               margin: 6px;
//               page-break-inside: avoid;
//               page-break-after: auto;
//             }
//             .tm-slip-inner { border: 1px solid #e6e6e6; padding: 8px; border-radius: 4px; background: #fff; }
//             .tm-header { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px; }
//             .tm-company { font-weight:700; font-size:12px; }
//             .tm-year { font-size:10px; color:var(--muted); }
//             .tm-employee { margin-bottom:6px; }
//             .tm-name { font-weight:600; font-size:11px; margin-bottom:2px; }
//             .tm-meta { font-size:10px; color:var(--muted); }
//             .tm-table { width:100%; border-collapse:collapse; font-size:10px; }
//             .tm-table th, .tm-table td { padding:4px 6px; border-bottom:1px solid #f2f2f2; }
//             .tm-table thead th { border-bottom:1px solid #ddd; font-weight:600; font-size:10px; }
//             .tm-table tfoot td { padding-top:6px; border-top:2px solid #eee; }
//             .l { text-align:left; }
//             .r { text-align:right; }
//             .bold { font-weight:700; }
//             .small { font-size:10px; color:var(--muted); }
//             @media print {
//               body { margin: 6mm; }
//               .tm-slip-block { page-break-inside: avoid; page-break-after: auto; }
//             }
//           </style>
//         </head>
//         <body>
//           ${htmlParts.join("\n")}
//         </body>
//       </html>
//     `;

//     const w = window.open("", "_blank");
//     if (!w) {
//       alert("Popup blocked. Allow popups to print slips.");
//       return;
//     }
//     w.document.open();
//     w.document.write(combinedHtml);
//     w.document.close();
//   } catch (err) {
//     console.error("printThirteenthSlips error:", err);
//     alert("Failed to generate slips. See console for details.");
//   }
// }

// /**
//  * Basic HTML escape to avoid injection.
//  */
// function escapeHtml(text) {
//   if (text == null) return "";
//   return String(text)
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;")
//     .replace(/"/g, "&quot;")
//     .replace(/'/g, "&#039;");
// }
