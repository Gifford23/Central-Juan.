// PayrollRunViewer.jsx
import React, { useMemo, useState } from "react";
import { saveAs } from "file-saver"; // optional, include if you have file-saver; otherwise CSV download fallback below
import Swal from "sweetalert2";

/**
 * Props:
 *  - payrollRows: array (the payload from payroll.php)
 *  - log: object (meta about the payroll run, e.g. { date_from, date_until, id, created_at })
 *  - onClose: function
 */
export default function PayrollRunViewer({ payrollRows = [], log = null, onClose = () => {} }) {
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  // safe parser helpers
  const floatVal = (v) => {
    if (v === null || typeof v === "undefined" || v === "") return 0;
    const n = parseFloat((typeof v === "string") ? v.replace(/,/g, "") : v);
    return isNaN(n) ? 0 : n;
  };

  const rewardTotalFor = (row) => {
    if (typeof row.total_rewards !== "undefined" && row.total_rewards !== null) return floatVal(row.total_rewards);
    if (Array.isArray(row.rewards)) {
      return row.rewards.reduce((s, r) => s + floatVal(r.amount ?? r.applied_amount ?? r.value ?? 0), 0);
    }
    return 0;
  };

  const allowancesTotalFor = (row) => {
    if (typeof row.total_allowances !== "undefined" && row.total_allowances !== null) return floatVal(row.total_allowances);
    if (Array.isArray(row.allowances)) {
      return row.allowances.reduce((s, a) => s + floatVal(a.applied_amount ?? a.amount ?? 0), 0);
    }
    return 0;
  };

  const computeRowGross = (row) => {
    // prefer half_month_salary when present (monthly half cut)
    const half = floatVal(row.half_month_salary || 0);
    if (half > 0) return half;

    // otherwise compute: base (basic_salary * total_days) + allowances + incentives + retro_applied + (rewards - deduction_oneoff)
    const base = floatVal(row.basic_salary) * floatVal(row.total_days);
    const allowances = allowancesTotalFor(row);
    const incentives = floatVal(row.total_incentives || 0);
    const retroApplied = floatVal(row.total_retro_applied || 0);
    const rewards = rewardTotalFor(row);
    const deductionOneoff = floatVal(row.deduction_oneoff || 0);
    return base + allowances + incentives + retroApplied + (rewards - deductionOneoff);
  };

  const computeRowDeductions = (row) => {
    const phil = floatVal(row.philhealth_employee_share || 0);
    const sss = floatVal(row.sss_employee_share || 0);
    const pag = floatVal(row.pagibig_employee_share || 0);

    // loan deduction prefer actual if exists
    const loan = floatVal(row.loan_deduction_actual || row.loan_deduction || 0);

    // include late deduction for monthly payrolls (if backend set it)
    const late = floatVal(row.late_deduction || 0);

    // include one-off payroll deduction (already subtracted from gross extras in our gross calc, but show separately)
    const oneoff = floatVal(row.deduction_oneoff || 0);

    const total = phil + sss + pag + loan + late + oneoff;
    return { phil, sss, pag, loan, late, oneoff, total };
  };

  const computeRowNet = (row) => {
    const gross = computeRowGross(row);
    const ded = computeRowDeductions(row);
    const net = gross - ded.total;
    return net;
  };

  // memoized totals across the payroll run
  const totals = useMemo(() => {
    let grossSum = 0, deductionsSum = 0, netSum = 0;
    for (const r of payrollRows) {
      const g = computeRowGross(r);
      const d = computeRowDeductions(r);
      const n = g - d.total;
      grossSum += g;
      deductionsSum += d.total;
      netSum += n;
    }
    return {
      grossSum, deductionsSum, netSum,
      employeesCount: payrollRows.length
    };
  }, [payrollRows]); // eslint-disable-line

  // CSV exporter (very simple)
  const downloadCSV = () => {
    const headers = [
      "payroll_id","employee_id","name","position_name","department_name",
      "gross","deductions","net","total_days","total_rendered_hours"
    ];
    const rows = payrollRows.map(r => {
      const gross = computeRowGross(r).toFixed(2);
      const ded = computeRowDeductions(r).total.toFixed(2);
      const net = (parseFloat(gross) - parseFloat(ded)).toFixed(2);
      return [
        r.payroll_id, r.employee_id, `"${(r.name || "").replace(/"/g,'""')}"`,
        (r.position_name || ""), (r.department_name || ""),
        gross, ded, net, r.total_days || 0, r.total_rendered_hours || 0
      ].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    // try file-saver first
    try {
      if (typeof saveAs === "function") {
        saveAs(blob, `payroll_${log?.date_from || "from"}_${log?.date_until || "until"}.csv`);
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `payroll_${log?.date_from || "from"}_${log?.date_until || "until"}.csv`;
        link.click();
      }
    } catch (e) {
      // fallback
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `payroll_${log?.date_from || "from"}_${log?.date_until || "until"}.csv`;
      link.click();
    }
  };

  const copyJsonToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ log, payrollRows }, null, 2));
      Swal.fire({ icon: "success", title: "Copied", text: "Payroll JSON copied to clipboard", timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: "error", title: "Copy failed", text: String(err) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 overflow-auto bg-black/30">
      <div className="w-full max-w-6xl overflow-hidden bg-white rounded-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              Payroll: {log ? `${new Date(log.date_from).toLocaleDateString()} → ${new Date(log.date_until).toLocaleDateString()}` : "Payroll Run"}
            </h3>
            <p className="text-sm text-gray-500">
              Employees: {totals.employeesCount} • Generated: {log?.created_at ? new Date(log.created_at).toLocaleString() : "—"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => {
                const summary = {
                  employees: totals.employeesCount,
                  gross: totals.grossSum.toFixed(2),
                  deductions: totals.deductionsSum?.toFixed?.(2) ?? totals.deductionsSum.toFixed(2),
                  net: totals.netSum.toFixed(2)
                };
                Swal.fire({
                  title: "Payroll Summary",
                  html: `<pre style="text-align:left">${JSON.stringify(summary, null, 2)}</pre>`,
                  width: '520px'
                });
              }}
            >
              Summary
            </button>

            <button className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700" onClick={downloadCSV}>
              Export CSV
            </button>

            <button className="px-3 py-1 text-sm text-white bg-gray-800 rounded hover:bg-gray-900" onClick={copyJsonToClipboard}>
              Copy JSON
            </button>

            <button className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Totals */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 border rounded bg-green-50">
              <div className="text-xs text-gray-500">Total Gross</div>
              <div className="text-lg font-semibold text-green-700">₱{totals.grossSum.toFixed(2)}</div>
            </div>
            <div className="p-3 border rounded bg-red-50">
              <div className="text-xs text-gray-500">Total Deductions</div>
              <div className="text-lg font-semibold text-red-700">₱{totals.deductionsSum.toFixed(2)}</div>
            </div>
            <div className="p-3 border rounded bg-blue-50">
              <div className="text-xs text-gray-500">Total Net</div>
              <div className="text-lg font-semibold text-blue-700">₱{totals.netSum.toFixed(2)}</div>
            </div>
          </div>

          {/* Employee cards */}
          <div className="space-y-4">
            {payrollRows.map((row) => {
              const gross = computeRowGross(row);
              const deductions = computeRowDeductions(row);
              const net = gross - deductions.total;
              const isExpanded = expandedEmployee === row.employee_id;

              return (
                <div key={`${row.payroll_id}-${row.employee_id}`} className="p-4 bg-white border rounded-lg shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-lg font-semibold text-gray-800">{row.name}</div>
                          <div className="text-xs text-gray-500">ID: {row.employee_id}</div>
                        </div>

                        <div className="ml-4 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {row.employee_type || row.salary_type || ""}
                        </div>

                        <div className="ml-4 text-xs text-gray-500">{row.position_name} • {row.department_name}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Gross</div>
                          <div className="text-base font-semibold text-green-700">₱{gross.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Deductions</div>
                          <div className="text-base font-semibold text-red-700">₱{deductions.total.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Net</div>
                          <div className="text-base font-semibold text-blue-700">₱{net.toFixed(2)}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mt-3 text-xs text-gray-600">
                        <div>Total Days: <span className="font-medium">{row.total_days}</span></div>
                        <div>Rendered Hours: <span className="font-medium">{row.total_rendered_hours}</span></div>
                        <div>Incentive: <span className="font-medium">₱{floatVal(row.total_incentives || 0).toFixed(2)}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => setExpandedEmployee(isExpanded ? null : row.employee_id)}
                        className="px-3 py-1 text-sm bg-indigo-100 rounded hover:bg-indigo-200"
                      >
                        {isExpanded ? "Hide details" : "Show details"}
                      </button>

                      <button
                        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => {
                          Swal.fire({
                            title: `${row.name} — ${row.employee_id}`,
                            html: `<pre style="text-align:left;max-height:400px;overflow:auto">${JSON.stringify(row, null, 2)}</pre>`,
                            width: '80%',
                            confirmButtonText: 'Close'
                          });
                        }}
                      >
                        View JSON
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 text-sm text-gray-700">
                      {/* Deductions breakdown */}
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="p-2 border rounded bg-gray-50">
                          <div className="text-xs text-gray-500">SSS</div>
                          <div className="font-medium">₱{deductions.sss.toFixed(2)}</div>
                        </div>
                        <div className="p-2 border rounded bg-gray-50">
                          <div className="text-xs text-gray-500">PhilHealth</div>
                          <div className="font-medium">₱{deductions.phil.toFixed(2)}</div>
                        </div>
                        <div className="p-2 border rounded bg-gray-50">
                          <div className="text-xs text-gray-500">Pag-IBIG</div>
                          <div className="font-medium">₱{deductions.pag.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Loan & one-off */}
                      <div className="flex gap-4 mb-3">
                        <div className="p-2 border rounded bg-gray-50">
                          <div className="text-xs text-gray-500">Loan Deduction</div>
                          <div className="font-medium">₱{deductions.loan.toFixed(2)}</div>
                        </div>
                        <div className="p-2 border rounded bg-gray-50">
                          <div className="text-xs text-gray-500">One-off Deduction</div>
                          <div className="font-medium">₱{deductions.oneoff.toFixed(2)}</div>
                        </div>
                        <div className="p-2 border rounded bg-gray-50">
                          <div className="text-xs text-gray-500">Late Deduction</div>
                          <div className="font-medium">₱{deductions.late.toFixed(2)}</div>
                        </div>
                      </div>

                      {/* Attendance table */}
                      <div className="mt-2">
                        <div className="mb-2 text-sm font-semibold">Attendance Records</div>
                        {Array.isArray(row.attendance_records) && row.attendance_records.length > 0 ? (
                          <div className="overflow-auto border rounded">
                            <table className="min-w-full text-sm text-left">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2">Date</th>
                                  <th className="px-3 py-2">Rendered Hrs</th>
                                  <th className="px-3 py-2">Credited Days</th>
                                  <th className="px-3 py-2">Net Work Mins</th>
                                  <th className="px-3 py-2">Schedule</th>
                                </tr>
                              </thead>
                              <tbody>
                                {row.attendance_records.map((a, i) => (
                                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                                    <td className="px-3 py-2">{a.attendance_date}</td>
                                    <td className="px-3 py-2">{floatVal(a.total_rendered_hours).toFixed(2)}</td>
                                    <td className="px-3 py-2">{a.days_credited}</td>
                                    <td className="px-3 py-2">{a.net_work_minutes}</td>
                                    <td className="px-3 py-2">
                                      {a.schedule ? (
                                        <div className="text-xs">
                                          <div>{a.schedule.shift_name}</div>
                                          <div>{a.schedule.start_time} → {a.schedule.end_time} ({a.schedule.total_minutes} mins)</div>
                                        </div>
                                      ) : <span className="text-xs text-gray-400">No schedule</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No attendance records</div>
                        )}
                      </div>

                      {/* Loans detail */}
                      <div className="mt-3">
                        <div className="mb-2 text-sm font-semibold">Loans</div>
                        {Array.isArray(row.loans) && row.loans.length > 0 ? (
                          <div className="space-y-2">
                            {row.loans.map((ln) => (
                              <div key={ln.loan_id} className="p-2 text-sm border rounded bg-gray-50">
                                <div className="flex justify-between">
                                  <div className="text-sm font-medium">Loan #{ln.loan_id} {ln.loan_reference_no ? `(${ln.loan_reference_no})` : ""}</div>
                                  <div className="text-sm font-semibold">Balance: ₱{parseFloat(ln.balance || 0).toFixed(2)}</div>
                                </div>
                                <div className="text-xs text-gray-600">{ln.description}</div>
                                {Array.isArray(ln.journal_entries) && ln.journal_entries.length > 0 && (
                                  <details className="mt-2 text-xs">
                                    <summary className="cursor-pointer">Journal entries ({ln.journal_entries.length})</summary>
                                    <div className="mt-2 space-y-1">
                                      {ln.journal_entries.map((je) => (
                                        <div key={je.journal_id} className="flex justify-between text-xs">
                                          <div>{je.entry_date} • {je.origin}</div>
                                          <div>₱{floatVal(je.amount).toFixed(2)}</div>
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No loans</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
