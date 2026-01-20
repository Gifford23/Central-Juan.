// PayrollLogWithViewer.jsx
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import BASE_URL from '../../../backend/server/config';
import Swal from 'sweetalert2';

/**
 * Combined Payroll Log + Viewer
 *
 * Usage:
 *   <PayrollLogWithViewer onClose={() => setShow(false)} />
 *
 * Props:
 *  - closeLog (function) optional: closes the logs modal
 *  - initiallyOpen (bool) optional: whether the logs modal opens initially
 */
export default function PayrollLogWithViewer({ closeLog = () => {}, initiallyOpen = true }) {
  const [openLogs, setOpenLogs] = useState(initiallyOpen);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState('');

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const [viewerData, setViewerData] = useState({ payrollRows: [], log: null });

  useEffect(() => {
    const fetchLogs = async () => {
      setLoadingLogs(true);
      setLogsError('');
      try {
        const response = await axios.get(`${BASE_URL}/payroll/payrollLog.php`);
        if (response.data && response.data.success) {
          const sorted = Array.isArray(response.data.data)
            ? response.data.data.sort((a, b) => (b.id || 0) - (a.id || 0))
            : [];
          setLogs(sorted);
        } else {
          setLogsError(response.data?.message || 'Failed to load payroll logs');
        }
      } catch (err) {
        setLogsError('Error fetching payroll logs: ' + (err.message || err));
      } finally {
        setLoadingLogs(false);
      }
    };

    if (openLogs) fetchLogs();
  }, [openLogs]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      return new Date(dateString).toLocaleDateString('en-US', options);
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    try {
      const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
      return new Date(dateString).toLocaleString('en-US', options);
    } catch {
      return dateString;
    }
  };

  // ---------- Viewer helpers ----------
  const floatVal = (v) => {
    if (v === null || typeof v === 'undefined' || v === '') return 0;
    if (typeof v === 'number') return v;
    const parsed = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const allowancesTotalFor = (row) => {
    if (typeof row.total_allowances !== 'undefined' && row.total_allowances !== null) return floatVal(row.total_allowances);
    if (Array.isArray(row.allowances)) return row.allowances.reduce((s, a) => s + floatVal(a.applied_amount ?? a.amount ?? 0), 0);
    return 0;
  };

  const rewardTotalFor = (row) => {
    if (typeof row.total_rewards !== 'undefined' && row.total_rewards !== null) return floatVal(row.total_rewards);
    if (Array.isArray(row.rewards)) return row.rewards.reduce((s, r) => s + floatVal(r.amount ?? r.applied_amount ?? 0), 0);
    return 0;
  };

  const computeRowGross = (row) => {
    // prefer half_month_salary if present (monthly halved salary)
    const half = floatVal(row.half_month_salary || 0);
    if (half > 0) return half;

    const base = floatVal(row.basic_salary) * floatVal(row.total_days || 0);
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
    const loan = floatVal(row.loan_deduction_actual || row.loan_deduction || 0);
    const late = floatVal(row.late_deduction || 0);
    const oneoff = floatVal(row.deduction_oneoff || 0);
    const total = phil + sss + pag + loan + late + oneoff;
    return { phil, sss, pag, loan, late, oneoff, total };
  };

  const computeRowNet = (row) => {
    const gross = computeRowGross(row);
    const ded = computeRowDeductions(row);
    return gross - ded.total;
  };

  const totals = useMemo(() => {
    let grossSum = 0, dedSum = 0, netSum = 0;
    const rows = viewerData.payrollRows || [];
    for (const r of rows) {
      const g = computeRowGross(r);
      const d = computeRowDeductions(r);
      const n = g - d.total;
      grossSum += g;
      dedSum += d.total;
      netSum += n;
    }
    return { grossSum, dedSum, netSum, count: rows.length || 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerData]); // recompute when viewerData changes

  // CSV exporter
  const downloadCSV = () => {
    const rows = viewerData.payrollRows || [];
    const headers = ['payroll_id','employee_id','name','position_name','department_name','gross','deductions','net','total_days','total_rendered_hours'];
    const csvRows = [headers.join(',')];
    for (const r of rows) {
      const gross = computeRowGross(r).toFixed(2);
      const ded = computeRowDeductions(r).total.toFixed(2);
      const net = (parseFloat(gross) - parseFloat(ded)).toFixed(2);
      const safe = (v) => `"${String(v ?? '').replace(/"/g,'""')}"`;
      csvRows.push([
        safe(r.payroll_id),
        safe(r.employee_id),
        safe(r.name),
        safe(r.position_name),
        safe(r.department_name),
        gross,
        ded,
        net,
        safe(r.total_days),
        safe(r.total_rendered_hours)
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payroll_${viewerData.log?.date_from || 'from'}_${viewerData.log?.date_until || 'until'}.csv`;
    link.click();
  };

  const copyJsonToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(viewerData, null, 2));
      Swal.fire({ icon: 'success', title: 'Copied', text: 'Payroll JSON copied to clipboard', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Copy failed', text: String(err) });
    }
  };

  // ---------- Actions ----------
  const handleRowClick = async (log) => {
    setViewerError('');
    setViewerLoading(true);
    try {
      const df = encodeURIComponent(log.date_from);
      const du = encodeURIComponent(log.date_until);
      const url = `${BASE_URL}/payroll/payroll.php?date_from=${df}&date_until=${du}`;
      const resp = await axios.get(url);
      if (resp.data && resp.data.success) {
        const payrollRows = Array.isArray(resp.data.data) ? resp.data.data : [];
        setViewerData({ payrollRows, log });
        setViewerOpen(true);
      } else {
        Swal.fire({ icon: 'error', title: 'No data', text: resp.data?.message || 'No payroll data returned for selected payroll.' });
      }
    } catch (err) {
      console.error('Failed to fetch payroll for log', err);
      setViewerError('Failed to fetch payroll: ' + (err.message || err));
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to fetch payroll: ' + (err.message || err) });
    } finally {
      setViewerLoading(false);
    }
  };

  // ---------- Render ----------
  return (
    <>
      {/* Logs Modal */}
      {openLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-[1000px] max-h-[90vh] bg-gradient-to-r from-indigo-100 to-blue-200 rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <h2 className="text-3xl font-semibold text-gray-800">Payroll Logs</h2>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 text-sm bg-white border rounded"
                  onClick={() => {
                    // refresh logs
                    setOpenLogs(false);
                    setTimeout(() => setOpenLogs(true), 120);
                  }}
                  title="Refresh"
                >
                  Refresh
                </button>
                <button
                  className="px-4 py-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                  onClick={() => { setOpenLogs(false); closeLog(); }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 mx-6 mb-4 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-inner">
              {loadingLogs ? (
                <div className="text-center text-blue-500">Loading...</div>
              ) : logsError ? (
                <div className="text-center text-red-500">{logsError}</div>
              ) : logs.length === 0 ? (
                <div className="text-center text-gray-600">No payroll logs available.</div>
              ) : (
                <table className="min-w-full text-gray-800 border-collapse table-auto">
                  <thead>
                    <tr className="sticky top-0 z-10 text-lg text-white bg-indigo-500">
                      <th className="px-4 py-3 text-left border-b border-gray-300">Date From</th>
                      <th className="px-4 py-3 text-left border-b border-gray-300">Date Until</th>
                      <th className="px-4 py-3 text-left border-b border-gray-300">Created At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="transition-all cursor-pointer hover:bg-gray-100"
                        onClick={() => handleRowClick(log)}
                        title={`View payroll for ${log.date_from} → ${log.date_until}`}
                      >
                        <td className="px-4 py-3 border-b border-gray-300">{formatDate(log.date_from)}</td>
                        <td className="px-4 py-3 border-b border-gray-300">{formatDate(log.date_until)}</td>
                        <td className="px-4 py-3 border-b border-gray-300">{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Viewer Modal */}
      {viewerOpen && (
        <div className="fixed inset-0 flex items-start justify-center p-6 overflow-auto z-60 bg-black/40">
          <div className="w-full max-w-6xl overflow-hidden bg-white rounded-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Payroll: {viewerData.log ? `${new Date(viewerData.log.date_from).toLocaleDateString()} → ${new Date(viewerData.log.date_until).toLocaleDateString()}` : 'Payroll Run'}
                </h3>
                <p className="text-sm text-gray-500">
                  Employees: {totals.count} • Generated: {viewerData.log?.created_at ? new Date(viewerData.log.created_at).toLocaleString() : '—'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200" onClick={() => {
                  Swal.fire({
                    title: "Payroll Summary",
                    html: `<pre style="text-align:left">${JSON.stringify({ employees: totals.count, gross: totals.grossSum.toFixed(2), deductions: totals.dedSum?.toFixed?.(2) ?? totals.dedSum.toFixed(2), net: totals.netSum.toFixed(2) }, null, 2)}</pre>`,
                    width: '520px'
                  });
                }}>
                  Summary
                </button>

                <button className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700" onClick={downloadCSV}>
                  Export CSV
                </button>

                <button className="px-3 py-1 text-sm text-white bg-gray-800 rounded hover:bg-gray-900" onClick={copyJsonToClipboard}>
                  Copy JSON
                </button>

                <button className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600" onClick={() => setViewerOpen(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 border rounded bg-green-50">
                  <div className="text-xs text-gray-500">Total Gross</div>
                  <div className="text-lg font-semibold text-green-700">₱{totals.grossSum.toFixed(2)}</div>
                </div>
                <div className="p-3 border rounded bg-red-50">
                  <div className="text-xs text-gray-500">Total Deductions</div>
                  <div className="text-lg font-semibold text-red-700">₱{totals.dedSum.toFixed(2)}</div>
                </div>
                <div className="p-3 border rounded bg-blue-50">
                  <div className="text-xs text-gray-500">Total Net</div>
                  <div className="text-lg font-semibold text-blue-700">₱{totals.netSum.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-4">
                {viewerLoading ? (
                  <div className="text-center text-blue-500">Loading payroll data...</div>
                ) : viewerError ? (
                  <div className="text-center text-red-500">{viewerError}</div>
                ) : (viewerData.payrollRows || []).length === 0 ? (
                  <div className="text-center text-gray-500">No payroll rows to display.</div>
                ) : (
                  (viewerData.payrollRows || []).map((row) => {
                    const gross = computeRowGross(row);
                    const ded = computeRowDeductions(row);
                    const net = gross - ded.total;

                    return (
                      <EmployeePayrollCard
                        key={`${row.payroll_id}-${row.employee_id}`}
                        row={row}
                        gross={gross}
                        deductions={ded}
                        net={net}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Small subcomponent: EmployeePayrollCard ---------- */
function EmployeePayrollCard({ row, gross, deductions, net }) {
  const [expanded, setExpanded] = useState(false);
  const floatVal = (v) => {
    if (v === null || typeof v === 'undefined' || v === '') return 0;
    if (typeof v === 'number') return v;
    const parsed = parseFloat(String(v).replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm">
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
            onClick={() => setExpanded(prev => !prev)}
            className="px-3 py-1 text-sm bg-indigo-100 rounded hover:bg-indigo-200"
          >
            {expanded ? 'Hide details' : 'Show details'}
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

      {expanded && (
        <div className="mt-4 text-sm text-gray-700">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="p-2 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">SSS</div>
              <div className="font-medium">₱{floatVal(row.sss_employee_share || 0).toFixed(2)}</div>
            </div>
            <div className="p-2 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">PhilHealth</div>
              <div className="font-medium">₱{floatVal(row.philhealth_employee_share || 0).toFixed(2)}</div>
            </div>
            <div className="p-2 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Pag-IBIG</div>
              <div className="font-medium">₱{floatVal(row.pagibig_employee_share || 0).toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-4 mb-3">
            <div className="p-2 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Loan Deduction</div>
              <div className="font-medium">₱{floatVal(row.loan_deduction_actual || row.loan_deduction || 0).toFixed(2)}</div>
            </div>
            <div className="p-2 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">One-off Deduction</div>
              <div className="font-medium">₱{floatVal(row.deduction_oneoff || 0).toFixed(2)}</div>
            </div>
            <div className="p-2 border rounded bg-gray-50">
              <div className="text-xs text-gray-500">Late Deduction</div>
              <div className="font-medium">₱{floatVal(row.late_deduction || 0).toFixed(2)}</div>
            </div>
          </div>

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
                            <div key={je.journal_id || Math.random()} className="flex justify-between text-xs">
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
}
