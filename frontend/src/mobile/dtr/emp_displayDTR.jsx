// mobile/dtr/emp_displayDTR.jsx
// Mobile-first DTR + improved payslip UX (no table, card rows, clear hierarchy)

import React from 'react';
import { useLocation } from 'react-router-dom';
import TableAmPm from '../../components/DTRattenance/DTRComponent/displayDTR';
import { fetchPayrollsAPI } from '../../payrollPage/payrollApi/payrollapi';

// MUI imports
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import PrintIcon from '@mui/icons-material/Print';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Paper from '@mui/material/Paper';

const Loading = ({ text = 'Loading...' }) => (
  <div style={{ width: '100%', padding: 24, textAlign: 'center', color: '#6b7280' }}>{text}</div>
);

// formatting helpers
const fmtNumber = (v) => {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const masked = '*****';
const show = (v, hide) => (hide ? masked : fmtNumber(v));

// New: human friendly date formatter used in selects, chips, payslip header
const formatDate = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); // e.g. "Oct 9, 2025"
  } catch (e) {
    return String(d);
  }
};

// attendance mapping (kept)
const mapAttendanceToDTR = (attendance_records = []) => {
  console.log('[DTRforEmployee] mapping attendance records count:', attendance_records?.length ?? 0);
  try {
    return (attendance_records || []).map((rec) => ({
      date: rec.attendance_date || rec.date,
      am_in: rec.time_in_morning ?? rec.am_in ?? '00:00:00',
      am_out: rec.time_out_morning ?? rec.am_out ?? '00:00:00',
      pm_in: rec.time_in_afternoon ?? rec.pm_in ?? '00:00:00',
      pm_out: rec.time_out_afternoon ?? rec.pm_out ?? '00:00:00',
      total_credit: (rec.days_credited ?? rec.total_credit ?? 0).toString(),
    }));
  } catch (err) {
    console.error('[DTRforEmployee] error mapping attendance', err);
    return [];
  }
};

/**
 * printPayslipsToWindow
 * preserves prior print behavior and respects hideValues flag
 */
function printPayslipsToWindow({ payrolls = [], hideValues = true }) {
  if (!payrolls || payrolls.length === 0) {
    alert("No payslips to print.");
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const escapeHtml = (s) => {
    if (typeof s !== 'string') return s;
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  };

  const styles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 10px; }
      .payslip { width: 7.2in; margin: 6px auto; border: 1px solid #ddd; padding: 12px; page-break-inside: avoid; box-sizing: border-box; }
      .header { text-align:center; margin-bottom:8px; }
      .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0; }
      .label { color:#666; width:60%; }
      .val { text-align:right; width:40%; font-weight:600; }
      .net { font-size:18px; font-weight:800; margin-top:8px; text-align:right; }
      .small-note { font-size:11px; color:#777; }
      @media print { .no-print { display: none } }
    </style>
  `;

  let html = `<html><head><meta charset="utf-8"><title>Payslip</title>${styles}</head><body>`;

  payrolls.forEach((p) => {
    const deductionType = p.contribution_deduction_type || 'semi-monthly';
    const rawSSS = parseFloat(p.sss_employee_share) || 0;
    const rawPhil = parseFloat(p.philhealth_employee_share) || 0;
    const rawPag = parseFloat(p.pagibig_employee_share) || 0;
    const dateUntilParts = String(p.date_until || '').split('-');
    const dateUntilDay = dateUntilParts.length === 3 ? Number(dateUntilParts[2]) : 0;

    let sss = 0, phil = 0, pag = 0;
    let sssLabel = '', philLabel = '', pagLabel = '';

    if (deductionType === 'semi-monthly') {
      sss = rawSSS / 2;
      phil = rawPhil / 2;
      pag = rawPag / 2;
      sssLabel = philLabel = pagLabel = '(Semi-Monthly)';
    } else if (deductionType === 'monthly') {
      if (dateUntilDay >= 20) {
        sss = rawSSS;
        phil = rawPhil;
        pag = rawPag;
        sssLabel = philLabel = pagLabel = '(Monthly Applied)';
      } else {
        sss = phil = pag = 0;
        sssLabel = philLabel = pagLabel = '(Hidden)';
      }
    }

    const dailyRate = parseFloat(p.basic_salary) || 0;
    const totalDays = parseFloat(p.total_days) || 0;
    const overtimeDays = parseFloat(p.total_overtime_request) || 0;

    // determine holiday count (respect project-based exclusion)
    const employeeTypeNormalized = String(p.employee_type || "").toLowerCase();
    const isProjectBased = employeeTypeNormalized.includes("project") || employeeTypeNormalized === "project-based" || employeeTypeNormalized === "project base" || employeeTypeNormalized === "projectbase";
    const holidayCountRaw = Number(p.holiday_count ?? (Array.isArray(p.holidays) ? p.holidays.length : 0)) || 0;
    const holidayCount = isProjectBased ? 0 : holidayCountRaw;

    // allowances
    let allowanceTotal = 0;
    if (p.total_allowances !== undefined && p.total_allowances !== null) {
      allowanceTotal = parseFloat(p.total_allowances) || 0;
    } else if (Array.isArray(p.allowances)) {
      allowanceTotal = p.allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0);
    }

    // incentives, rewards, retro
    const incentiveAmount = parseFloat(p.total_incentives) || 0;
    const retroApplied = parseFloat(p.total_retro_applied) || 0;

    let rewardTotal = 0;
    if (typeof p.total_rewards !== "undefined" && p.total_rewards !== null) {
      rewardTotal = parseFloat(p.total_rewards) || 0;
    } else if (Array.isArray(p.rewards)) {
      rewardTotal = p.rewards.reduce((s, r) => s + (parseFloat(r.amount ?? r.applied_amount ?? 0) || 0), 0);
    }

    // loan deduction (fallbacks)
    const loan = parseFloat(p.loan_deduction_applied ?? p.loan_deduction_actual ?? p.loan_deduction ?? 0) || 0;

    // base gross includes holidays as additional credited days
    const baseGross = dailyRate * (totalDays + overtimeDays + holidayCount);
    const grossWithExtras = baseGross + allowanceTotal + incentiveAmount + retroApplied + rewardTotal;

    const totalDed = sss + phil + pag + loan;
    const net = grossWithExtras - totalDed;
    const totalCredit = (totalDays + overtimeDays + holidayCount);

    const showOrHide = (val) => (hideValues ? masked : (typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : escapeHtml(String(val))));

    html += `
      <div class="payslip">
        <div class="header">
          <div style="font-weight:700; font-size:16px">CENTRAL JUAN IT SOLUTION</div>
          <div style="font-weight:600; font-size:13px">PAYSLIP</div>
        </div>

        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <div>
            <div><strong>Name:</strong> ${escapeHtml(p.name || '')}</div>
            <div><strong>Designation:</strong> ${escapeHtml(p.position_name || '')}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>From:</strong> ${escapeHtml(new Date(p.date_from || '').toLocaleDateString())}</div>
            <div><strong>Until:</strong> ${escapeHtml(new Date(p.date_until || '').toLocaleDateString())}</div>
          </div>
        </div>

        <div class="row"><div class="label">Basic Salary</div><div class="val">${showOrHide(parseFloat(p.basic_salary) || 0)}</div></div>
        <div class="row"><div class="label">Days</div><div class="val">${showOrHide(totalDays)}</div></div>
        <div class="row"><div class="label">Overtime</div><div class="val">${showOrHide(overtimeDays)}</div></div>
        <div class="row"><div class="label">Holidays</div><div class="val">${showOrHide(holidayCount)}</div></div>
        
        <div class="row"><div class="label">Gross (base)</div><div class="val">${showOrHide(baseGross)}</div></div>
    `;

    // allowances breakdown (if present)
    if (Array.isArray(p.allowances) && p.allowances.length > 0) {
      html += `<div style="margin-top:6px; font-size:12px;"><strong>Allowances</strong></div>`;
      p.allowances.forEach((a) => {
        const name = a.allowance_name || a.name || 'Allowance';
        const amt = parseFloat(a.applied_amount) || 0;
        html += `<div class="row"><div class="label">${escapeHtml(name)}</div><div class="val">${showOrHide(amt)}</div></div>`;
      });
    } else if (allowanceTotal > 0) {
      html += `<div class="row"><div class="label">Allowances (total)</div><div class="val">${showOrHide(allowanceTotal)}</div></div>`;
    } else {
      // show zero explicit
      html += `<div class="row"><div class="label">Allowances</div><div class="val">${showOrHide(0)}</div></div>`;
    }

    // incentives/rewards/retro rows
    html += `
      <div class="row"><div class="label">Incentive</div><div class="val">${showOrHide(incentiveAmount)}</div></div>
      <div class="row"><div class="label">Reward</div><div class="val">${showOrHide(rewardTotal)}</div></div>
      <div class="row"><div class="label">Retro (applied)</div><div class="val">${showOrHide(retroApplied)}</div></div>

      <div class="row"><div class="label" style="font-weight:700">Gross (incl. ALL)</div><div class="val" style="font-weight:700">${showOrHide(grossWithExtras)}</div></div>

      <div class="row"><div class="label">SSS ${sssLabel}</div><div class="val">${showOrHide(sss)}</div></div>
      <div class="row"><div class="label">PhilHealth ${philLabel}</div><div class="val">${showOrHide(phil)}</div></div>
      <div class="row"><div class="label">Pag-ibig ${pagLabel}</div><div class="val">${showOrHide(pag)}</div></div>
      <div class="row"><div class="label">Loan Deduction</div><div class="val">${showOrHide(loan)}</div></div>

      <div class="row"><div class="label" style="font-weight:700">Total Deductions</div><div class="val" style="font-weight:700">${showOrHide(totalDed)}</div></div>

      <div class="net">Net: ${showOrHide(net)}</div>

      <div style="display:flex; justify-content:space-between; margin-top:12px;">
        <div style="text-align:center;">HR Signature</div>
        <div style="text-align:center; font-weight:700;">Employee Copy</div>
        <div style="text-align:center;">Employee Signature</div>
      </div>
    </div>
    `;
  });

  html += `</body></html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}

const DTRforEmployee = () => {
  const { state } = useLocation();
  const employeeData = state?.employeeData;
  const initialPayroll = state?.payroll || null;

  const [loading, setLoading] = React.useState(true);
  const [payrollList, setPayrollList] = React.useState([]);
  const [selectedPayroll, setSelectedPayroll] = React.useState(initialPayroll);
  const [dtrData, setDtrData] = React.useState([]);
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateUntil, setDateUntil] = React.useState('');

  // Payslip UI state
  const [hideValues, setHideValues] = React.useState(true); // default = hidden
  const [expanded, setExpanded] = React.useState(false); // accordion expanded
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  React.useEffect(() => {
    console.log('[DTRforEmployee] mounted', { employeeData, initialPayroll });
  }, []);

  React.useEffect(() => {
    // If payroll was passed via navigation state, use it immediately.
    if (initialPayroll) {
      console.log('[DTRforEmployee] initial payroll provided', initialPayroll.payroll_id);
      applyPayroll(initialPayroll);
      setLoading(false);
      return;
    }

    if (!employeeData?.employee_id) {
      console.error('[DTRforEmployee] missing employeeData in navigation state');
      setLoading(false);
      return;
    }

    // Fetch payrolls using your helper (axios or fetch wrapper)
    const fetchPayrolls = async () => {
      try {
        console.log('[DTRforEmployee] calling fetchPayrollsAPI with', employeeData.employee_id);
        const response = await fetchPayrollsAPI({ employee_id: employeeData.employee_id });

        console.log('[DTRforEmployee] raw fetchPayrollsAPI response:', response);

        // Robustly extract array of payroll objects from common shapes:
        let allPayrolls = [];

        if (Array.isArray(response)) {
          allPayrolls = response;
        } else if (Array.isArray(response?.data)) {
          allPayrolls = response.data;
        } else if (response?.data && response.data?.success && Array.isArray(response.data?.data)) {
          allPayrolls = response.data.data;
        } else if (response?.success && Array.isArray(response?.data)) {
          allPayrolls = response.data;
        } else if (Array.isArray(response?.data?.data)) {
          allPayrolls = response.data.data;
        } else {
          console.warn('[DTRforEmployee] Unexpected response shape from fetchPayrollsAPI — could not extract payroll array. Response keys:', Object.keys(response || {}), 'response.data keys:', Object.keys(response?.data || {}), 'response.data.data keys:', Object.keys(response?.data?.data || {}));
        }

        console.log('[DTRforEmployee] extracted total payrolls from API:', allPayrolls.length);

        // Filter payrolls that match THIS employee_id
        const employeePayrolls = allPayrolls.filter(p => String(p.employee_id) === String(employeeData.employee_id));
        console.log('[DTRforEmployee] payrolls matching employee_id:', employeePayrolls.length);

        if (employeePayrolls.length > 0) {
          setPayrollList(employeePayrolls);
          // choose the latest payroll by date_until
          const sorted = employeePayrolls.sort((a, b) => new Date(b.date_until) - new Date(a.date_until));
          const latest = sorted[0];
          console.log('[DTRforEmployee] selected latest payroll for employee', latest.payroll_id, latest.date_from, latest.date_until);
          setSelectedPayroll(latest);
          applyPayroll(latest);
        } else {
          console.warn('[DTRforEmployee] NO payrolls found for employee in API response. Check backend filter by employee_id or response shape.');
          setPayrollList([]);
        }
      } catch (err) {
        console.error('[DTRforEmployee] error while fetching payrolls', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayrolls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPayroll = (payroll) => {
    if (!payroll) {
      console.warn('[DTRforEmployee] applyPayroll called with falsy payroll');
      return;
    }
    console.log('[DTRforEmployee] applying payroll', payroll.payroll_id);
    setSelectedPayroll(payroll);

    // Set date range (these are the values TableAmPm expects)
    setDateFrom(payroll.date_from);
    setDateUntil(payroll.date_until);

    const records = payroll.attendance_records ?? payroll.attendance ?? [];
    console.log('[DTRforEmployee] applyPayroll attendance count:', records.length ?? 0);
    const mapped = mapAttendanceToDTR(records);
    console.log('[DTRforEmployee] mapped dtrData count:', mapped.length);
    setDtrData(mapped);
  };

  if (loading) return <Loading text="Loading DTR..." />;

  // final fallbacks — in case state hasn't updated quickly enough
  const finalDateFrom = dateFrom || selectedPayroll?.date_from || '';
  const finalDateUntil = dateUntil || selectedPayroll?.date_until || '';

  console.log('[DTRforEmployee] render values', {
    selectedPayrollId: selectedPayroll?.payroll_id,
    dateFromState: dateFrom,
    dateUntilState: dateUntil,
    finalDateFrom,
    finalDateUntil,
    dtrDataCount: dtrData.length,
    payrollListCount: payrollList.length
  });

  // helper to check project-based (for holiday credit behavior)
  const isProjectBased = (payroll) => {
    const employeeTypeNormalized = String(payroll?.employee_type || "").toLowerCase();
    return employeeTypeNormalized.includes("project") || employeeTypeNormalized === "project-based" || employeeTypeNormalized === "project base" || employeeTypeNormalized === "projectbase";
  };

  // Improved payslip presentation: no table — rows inside a card
  const PayslipCard = ({ payroll }) => {
    if (!payroll) {
      return (
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="body2">No payslip selected.</Typography>
          </CardContent>
        </Card>
      );
    }

    // compute values (same logic as before + extras)
    const deductionType = payroll.contribution_deduction_type || 'semi-monthly';
    const rawSSS = parseFloat(payroll.sss_employee_share) || 0;
    const rawPhil = parseFloat(payroll.philhealth_employee_share) || 0;
    const rawPag = parseFloat(payroll.pagibig_employee_share) || 0;
    const dateUntilParts = String(payroll.date_until || '').split('-');
    const dateUntilDay = dateUntilParts.length === 3 ? Number(dateUntilParts[2]) : 0;

    let sss = 0, phil = 0, pag = 0;
    let sssLabel = '', philLabel = '', pagLabel = '';

    if (deductionType === 'semi-monthly') {
      sss = rawSSS / 2;
      phil = rawPhil / 2;
      pag = rawPag / 2;
      sssLabel = philLabel = pagLabel = '(Semi-Monthly)';
    } else if (deductionType === 'monthly') {
      if (dateUntilDay >= 20) {
        sss = rawSSS;
        phil = rawPhil;
        pag = rawPag;
        sssLabel = philLabel = pagLabel = '(Monthly Applied)';
      } else {
        sss = phil = pag = 0;
        sssLabel = philLabel = pagLabel = '(Hidden)';
      }
    }

    const dailyRate = parseFloat(payroll.basic_salary) || 0;
    const totalDays = parseFloat(payroll.total_days) || 0;
    const overtimeDays = parseFloat(payroll.total_overtime_request) || 0;

    // holiday count and respect project-based
    const holidayCountRaw = Number(payroll.holiday_count ?? (Array.isArray(payroll.holidays) ? payroll.holidays.length : 0)) || 0;
    const holidayCount = isProjectBased(payroll) ? 0 : holidayCountRaw;

    // allowances
    let allowanceTotal = 0;
    if (payroll.total_allowances !== undefined && payroll.total_allowances !== null) {
      allowanceTotal = parseFloat(payroll.total_allowances) || 0;
    } else if (Array.isArray(payroll.allowances)) {
      allowanceTotal = payroll.allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0);
    }

    // incentives / retro / rewards
    const incentiveAmount = parseFloat(payroll.total_incentives) || 0;
    const retroApplied = parseFloat(payroll.total_retro_applied) || 0;

    let rewardTotal = 0;
    if (typeof payroll.total_rewards !== "undefined" && payroll.total_rewards !== null) {
      rewardTotal = parseFloat(payroll.total_rewards) || 0;
    } else if (Array.isArray(payroll.rewards)) {
      rewardTotal = payroll.rewards.reduce((s, r) => s + (parseFloat(r.amount ?? r.applied_amount ?? 0) || 0), 0);
    }

    // reward title(s)
    let rewardTitles = "";
    if (Array.isArray(payroll.rewards) && payroll.rewards.length > 0) {
      const titles = payroll.rewards.map(r => (r.description || r.name || r.title || "").toString().trim()).filter(Boolean);
      const uniq = [...new Set(titles)];
      rewardTitles = uniq.slice(0, 2).join(", ");
      if (uniq.length > 2) rewardTitles += " …";
    } else if (payroll.reward_title) {
      rewardTitles = payroll.reward_title;
    }

    // loan deduction (prefer journal-based from backend fields)
    const loan = parseFloat(payroll.loan_deduction_applied ?? payroll.loan_deduction_actual ?? payroll.loan_deduction ?? 0) || 0;

    // compute gross: include holiday credit and overtime and allowances + incentive + retro + rewards
    const baseGross = dailyRate * (totalDays + overtimeDays + holidayCount);
    const gross = baseGross + allowanceTotal + incentiveAmount + retroApplied + rewardTotal;

    // total deductions
    const totalDed = sss + phil + pag + loan;
    const net = gross - totalDed;
    const totalCredit = totalDays + overtimeDays + holidayCount;

    // structured rows for rendering
    // use show(...) for amounts that respect hideValues
    const rows = [
      { label: 'Basic Salary', value: show(payroll.basic_salary, hideValues) },
      { label: 'Days', value: hideValues ? masked : String(totalDays) },
      { label: 'Overtime', value: hideValues ? masked : String(overtimeDays) },
      { label: 'Holidays', value: hideValues ? masked : String(holidayCount) },
      { label: 'Gross (base)', value: show(baseGross, hideValues) },
    ];

    // push allowances breakdown if present (displayed as lines)
    const allowanceRows = [];
    if (Array.isArray(payroll.allowances) && payroll.allowances.length > 0) {
      payroll.allowances.forEach((a) => {
        allowanceRows.push({ label: a.allowance_name || a.name || 'Allowance', value: show(parseFloat(a.applied_amount) || 0, hideValues) });
      });
    } else {
      // show total allowances row (even if zero)
      allowanceRows.push({ label: 'Allowances', value: show(allowanceTotal, hideValues) });
    }

    // combine full rows
    const finalRows = [
      ...rows,
      ...allowanceRows,
      { label: 'Incentive', value: show(incentiveAmount, hideValues) },
      { label: 'Reward', value: show(rewardTotal, hideValues) },
      { label: 'Retro (applied)', value: show(retroApplied, hideValues) },
      { label: 'Gross (incl. ALL/INC/REW/RETRO)', value: show(gross, hideValues), strong: true },
      { label: `SSS ${sssLabel}`, value: show(sss, hideValues) },
      { label: `PhilHealth ${philLabel}`, value: show(phil, hideValues) },
      { label: `Pag-ibig ${pagLabel}`, value: show(pag, hideValues) },
      { label: 'Loan Deduction', value: show(loan, hideValues) },
      { label: 'Total Deduction', value: show(totalDed, hideValues) },
      { label: 'Total Credit', value: show(totalCredit, hideValues) },
      { label: 'Net Salary', value: show(net, hideValues), strong: true },
    ];

    return (
      <Card variant="outlined" sx={{ mt: 2 }}>
        <CardContent>
          <Grid container alignItems="center" spacing={1}>
            <Grid item xs={8}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{payroll.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: isMobile ? 12 : 13 }}>
                {payroll.position_name} • {formatDate(payroll.date_from)} → {formatDate(payroll.date_until)}
              </Typography>
            </Grid>

            <Grid item xs={4} textAlign="right">
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {hideValues ? masked : fmtNumber(net)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Net</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          <Box>
            {finalRows.map((r, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, alignItems: 'center' }}>
                <Typography variant={r.strong ? 'subtitle2' : 'body2'} color={r.strong ? 'text.primary' : 'text.secondary'}>
                  {r.label}
                </Typography>
                <Typography variant={r.strong ? 'subtitle2' : 'body2'} sx={{ fontWeight: r.strong ? 700 : 500 }}>
                  {r.value}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
            <Button fullWidth variant="outlined" startIcon={<PrintIcon />} onClick={() => printPayslipsToWindow({ payrolls: [payroll], hideValues })}>
              Print Payslip
            </Button>
            {/* Removed redundant "Print Both Copies" button as requested */}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: isMobile ? 1.5 : 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant={isMobile ? "h6" : "h5"}>DTR</Typography>

        {/* Native select kept for simplicity on mobile; dates formatted for readability */}
        <select
          value={selectedPayroll?.payroll_id ?? ''}
          onChange={(e) => {
            const pid = e.target.value;
            console.log('[DTRforEmployee] payroll selector changed to', pid);
            const payroll = payrollList.find(p => String(p.payroll_id) === String(pid));
            if (payroll) applyPayroll(payroll);
            else console.warn('[DTRforEmployee] selected payroll id not found', pid);
          }}
          style={{
            padding: isMobile ? '10px 12px' : '6px 8px',
            borderRadius: 8,
            border: '1px solid #ddd',
            fontSize: isMobile ? 14 : 12,
            background: '#fff',
            minWidth: 160,
          }}
        >
          {payrollList.length === 0 && selectedPayroll && (
            <option value={selectedPayroll.payroll_id}>
              {formatDate(selectedPayroll.date_from)} → {formatDate(selectedPayroll.date_until)}
            </option>
          )}
          {payrollList.map(p => (
            <option key={p.payroll_id} value={p.payroll_id}>
              {formatDate(p.date_from)} → {formatDate(p.date_until)}
            </option>
          ))}
        </select>
      </Box>

      {/* Payslip area */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Payslip</Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={hideValues ? "Values are hidden" : "Values are visible"}>
              <IconButton onClick={() => setHideValues(prev => !prev)} color={hideValues ? 'default' : 'primary'}>
                {hideValues ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </Tooltip>

            <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => printPayslipsToWindow({ payrolls: selectedPayroll ? [selectedPayroll] : [], hideValues })}>
              Print
            </Button>

            {/* Removed redundant Print All button as requested */}
          </Box>
        </Box>

        {/* Chips for quick switching */}
        {payrollList.length > 0 && (
          <Box sx={{ overflowX: 'auto', pb: 1 }}>
            <Stack direction="row" spacing={1} sx={{ width: 'max-content', py: 0.5 }}>
              {payrollList.map(p => (
                <Chip
                  key={p.payroll_id}
                  label={`${formatDate(p.date_from)} → ${formatDate(p.date_until)}`}
                  onClick={() => { applyPayroll(p); setExpanded(true); setTimeout(() => { const el = document.querySelector('.MuiAccordion-root'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 140); }}
                  color={selectedPayroll?.payroll_id === p.payroll_id ? 'primary' : 'default'}
                  variant={selectedPayroll?.payroll_id === p.payroll_id ? 'filled' : 'outlined'}
                  clickable
                  sx={{ minWidth: 150 }}
                />
              ))}
            </Stack>
          </Box>
        )}

        {/* Payslip card (no table) */}
        <PayslipCard payroll={selectedPayroll} />

        {/* DTR Table (unchanged) */}
        <TableAmPm
          dtrData={dtrData}
          dateFrom={finalDateFrom}
          dateUntil={finalDateUntil}
        />
      </Box>
    </Box>
  );
};

export default DTRforEmployee;



// // mobile/dtr/emp_displayDTR.jsx
// // Mobile-first DTR + improved payslip UX (no table, card rows, clear hierarchy)

// import React from 'react';
// import { useLocation } from 'react-router-dom';
// import TableAmPm from '../../components/DTRattenance/DTRComponent/displayDTR';
// import { fetchPayrollsAPI } from '../../payrollPage/payrollApi/payrollapi';

// // MUI imports
// import Box from '@mui/material/Box';
// import Card from '@mui/material/Card';
// import CardContent from '@mui/material/CardContent';
// import Grid from '@mui/material/Grid';
// import Typography from '@mui/material/Typography';
// import Button from '@mui/material/Button';
// import Divider from '@mui/material/Divider';
// import IconButton from '@mui/material/IconButton';
// import PrintIcon from '@mui/icons-material/Print';
// import VisibilityIcon from '@mui/icons-material/Visibility';
// import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
// import Accordion from '@mui/material/Accordion';
// import AccordionSummary from '@mui/material/AccordionSummary';
// import AccordionDetails from '@mui/material/AccordionDetails';
// import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// import Chip from '@mui/material/Chip';
// import Stack from '@mui/material/Stack';
// import useMediaQuery from '@mui/material/useMediaQuery';
// import { useTheme } from '@mui/material/styles';
// import Tooltip from '@mui/material/Tooltip';
// import Paper from '@mui/material/Paper';

// const Loading = ({ text = 'Loading...' }) => (
//   <div style={{ width: '100%', padding: 24, textAlign: 'center', color: '#6b7280' }}>{text}</div>
// );

// // formatting helpers
// const fmtNumber = (v) => {
//   const n = Number(v ?? 0);
//   if (Number.isNaN(n)) return '0.00';
//   return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// };
// const masked = '*****';
// const show = (v, hide) => (hide ? masked : fmtNumber(v));

// // New: human friendly date formatter used in selects, chips, payslip header
// const formatDate = (d) => {
//   if (!d) return '';
//   try {
//     const dt = new Date(d);
//     if (Number.isNaN(dt.getTime())) return String(d);
//     return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); // e.g. "Oct 9, 2025"
//   } catch (e) {
//     return String(d);
//   }
// };

// // attendance mapping (kept)
// const mapAttendanceToDTR = (attendance_records = []) => {
//   console.log('[DTRforEmployee] mapping attendance records count:', attendance_records?.length ?? 0);
//   try {
//     return (attendance_records || []).map((rec) => ({
//       date: rec.attendance_date || rec.date,
//       am_in: rec.time_in_morning ?? rec.am_in ?? '00:00:00',
//       am_out: rec.time_out_morning ?? rec.am_out ?? '00:00:00',
//       pm_in: rec.time_in_afternoon ?? rec.pm_in ?? '00:00:00',
//       pm_out: rec.time_out_afternoon ?? rec.pm_out ?? '00:00:00',
//       total_credit: (rec.days_credited ?? rec.total_credit ?? 0).toString(),
//     }));
//   } catch (err) {
//     console.error('[DTRforEmployee] error mapping attendance', err);
//     return [];
//   }
// };

// /**
//  * printPayslipsToWindow
//  * preserves prior print behavior and respects hideValues flag
//  */
// function printPayslipsToWindow({ payrolls = [], hideValues = true }) {
//   if (!payrolls || payrolls.length === 0) {
//     alert("No payslips to print.");
//     return;
//   }

//   const printWindow = window.open('', '_blank');
//   if (!printWindow) return;

//   const escapeHtml = (s) => {
//     if (typeof s !== 'string') return s;
//     return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
//   };

//   const styles = `
//     <style>
//       body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 10px; }
//       .payslip { width: 7.2in; margin: 6px auto; border: 1px solid #ddd; padding: 12px; page-break-inside: avoid; box-sizing: border-box; }
//       .header { text-align:center; margin-bottom:8px; }
//       .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #f0f0f0; }
//       .label { color:#666; width:60%; }
//       .val { text-align:right; width:40%; font-weight:600; }
//       .net { font-size:18px; font-weight:800; margin-top:8px; text-align:right; }
//       @media print { .no-print { display: none } }
//     </style>
//   `;

//   let html = `<html><head><meta charset="utf-8"><title>Payslip</title>${styles}</head><body>`;

//   payrolls.forEach((p) => {
//     const deductionType = p.contribution_deduction_type || 'semi-monthly';
//     const rawSSS = parseFloat(p.sss_employee_share) || 0;
//     const rawPhil = parseFloat(p.philhealth_employee_share) || 0;
//     const rawPag = parseFloat(p.pagibig_employee_share) || 0;
//     const dateUntilParts = String(p.date_until || '').split('-');
//     const dateUntilDay = dateUntilParts.length === 3 ? Number(dateUntilParts[2]) : 0;

//     let sss = 0, phil = 0, pag = 0;
//     let sssLabel = '', philLabel = '', pagLabel = '';

//     if (deductionType === 'semi-monthly') {
//       sss = rawSSS / 2;
//       phil = rawPhil / 2;
//       pag = rawPag / 2;
//       sssLabel = philLabel = pagLabel = '(Semi-Monthly)';
//     } else if (deductionType === 'monthly') {
//       if (dateUntilDay >= 20) {
//         sss = rawSSS;
//         phil = rawPhil;
//         pag = rawPag;
//         sssLabel = philLabel = pagLabel = '(Monthly Applied)';
//       } else {
//         sss = phil = pag = 0;
//         sssLabel = philLabel = pagLabel = '(Hidden)';
//       }
//     }

//     const dailyRate = parseFloat(p.basic_salary) || 0;
//     const totalDays = parseFloat(p.total_days) || 0;
//     const overtimeDays = parseFloat(p.total_overtime_request) || 0;
//     const gross = (dailyRate * (totalDays + overtimeDays));
//     const loan = parseFloat(p.loan_deduction_applied ?? p.loan_deduction_actual ?? p.loan_deduction ?? 0) || 0;
//     const totalDed = sss + phil + pag + loan;
//     const net = gross - totalDed;
//     const totalCredit = totalDays + overtimeDays;

//     const showOrHide = (val) => (hideValues ? masked : (typeof val === 'number' ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : escapeHtml(String(val))));

//     html += `
//       <div class="payslip">
//         <div class="header">
//           <div style="font-weight:700; font-size:16px">CENTRAL JUAN IT SOLUTION</div>
//           <div style="font-weight:600; font-size:13px">PAYSLIP</div>
//         </div>

//         <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
//           <div>
//             <div><strong>Name:</strong> ${escapeHtml(p.name || '')}</div>
//             <div><strong>Designation:</strong> ${escapeHtml(p.position_name || '')}</div>
//           </div>
//           <div style="text-align:right;">
//             <div><strong>From:</strong> ${escapeHtml(new Date(p.date_from || '').toLocaleDateString())}</div>
//             <div><strong>Until:</strong> ${escapeHtml(new Date(p.date_until || '').toLocaleDateString())}</div>
//           </div>
//         </div>

//         <div class="row"><div class="label">Basic Salary</div><div class="val">${showOrHide(parseFloat(p.basic_salary) || 0)}</div></div>
//         <div class="row"><div class="label">Days</div><div class="val">${showOrHide(totalDays)}</div></div>
//         <div class="row"><div class="label">Overtime</div><div class="val">${showOrHide(overtimeDays)}</div></div>
//         <div class="row"><div class="label">SSS ${sssLabel}</div><div class="val">${showOrHide(sss)}</div></div>
//         <div class="row"><div class="label">PhilHealth ${philLabel}</div><div class="val">${showOrHide(phil)}</div></div>
//         <div class="row"><div class="label">Pag-ibig ${pagLabel}</div><div class="val">${showOrHide(pag)}</div></div>
//         <div class="row"><div class="label">Loan Deduction</div><div class="val">${showOrHide(loan)}</div></div>
//         <div class="row"><div class="label" style="font-weight:700">Gross</div><div class="val" style="font-weight:700">${showOrHide(gross)}</div></div>

//         <div class="net">Net: ${showOrHide(net)}</div>

//         <div style="display:flex; justify-content:space-between; margin-top:12px;">
//           <div style="text-align:center;">HR Signature</div>
//           <div style="text-align:center; font-weight:700;">Employee Copy</div>
//           <div style="text-align:center;">Employee Signature</div>
//         </div>
//       </div>
//     `;
//   });

//   html += `</body></html>`;

//   printWindow.document.open();
//   printWindow.document.write(html);
//   printWindow.document.close();
//   printWindow.focus();
//   setTimeout(() => {
//     printWindow.print();
//   }, 350);
// }

// const DTRforEmployee = () => {
//   const { state } = useLocation();
//   const employeeData = state?.employeeData;
//   const initialPayroll = state?.payroll || null;

//   const [loading, setLoading] = React.useState(true);
//   const [payrollList, setPayrollList] = React.useState([]);
//   const [selectedPayroll, setSelectedPayroll] = React.useState(initialPayroll);
//   const [dtrData, setDtrData] = React.useState([]);
//   const [dateFrom, setDateFrom] = React.useState('');
//   const [dateUntil, setDateUntil] = React.useState('');

//   // Payslip UI state
//   const [hideValues, setHideValues] = React.useState(true); // default = hidden
//   const [expanded, setExpanded] = React.useState(false); // accordion expanded
//   const theme = useTheme();
//   const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

//   React.useEffect(() => {
//     console.log('[DTRforEmployee] mounted', { employeeData, initialPayroll });
//   }, []);

//   React.useEffect(() => {
//     // If payroll was passed via navigation state, use it immediately.
//     if (initialPayroll) {
//       console.log('[DTRforEmployee] initial payroll provided', initialPayroll.payroll_id);
//       applyPayroll(initialPayroll);
//       setLoading(false);
//       return;
//     }

//     if (!employeeData?.employee_id) {
//       console.error('[DTRforEmployee] missing employeeData in navigation state');
//       setLoading(false);
//       return;
//     }

//     // Fetch payrolls using your helper (axios or fetch wrapper)
//     const fetchPayrolls = async () => {
//       try {
//         console.log('[DTRforEmployee] calling fetchPayrollsAPI with', employeeData.employee_id);
//         const response = await fetchPayrollsAPI({ employee_id: employeeData.employee_id });

//         console.log('[DTRforEmployee] raw fetchPayrollsAPI response:', response);

//         // Robustly extract array of payroll objects from common shapes:
//         let allPayrolls = [];

//         if (Array.isArray(response)) {
//           allPayrolls = response;
//         } else if (Array.isArray(response?.data)) {
//           allPayrolls = response.data;
//         } else if (response?.data && response.data?.success && Array.isArray(response.data?.data)) {
//           allPayrolls = response.data.data;
//         } else if (response?.success && Array.isArray(response?.data)) {
//           allPayrolls = response.data;
//         } else if (Array.isArray(response?.data?.data)) {
//           allPayrolls = response.data.data;
//         } else {
//           console.warn('[DTRforEmployee] Unexpected response shape from fetchPayrollsAPI — could not extract payroll array. Response keys:', Object.keys(response || {}), 'response.data keys:', Object.keys(response?.data || {}), 'response.data.data keys:', Object.keys(response?.data?.data || {}));
//         }

//         console.log('[DTRforEmployee] extracted total payrolls from API:', allPayrolls.length);

//         // Filter payrolls that match THIS employee_id
//         const employeePayrolls = allPayrolls.filter(p => String(p.employee_id) === String(employeeData.employee_id));
//         console.log('[DTRforEmployee] payrolls matching employee_id:', employeePayrolls.length);

//         if (employeePayrolls.length > 0) {
//           setPayrollList(employeePayrolls);
//           // choose the latest payroll by date_until
//           const sorted = employeePayrolls.sort((a, b) => new Date(b.date_until) - new Date(a.date_until));
//           const latest = sorted[0];
//           console.log('[DTRforEmployee] selected latest payroll for employee', latest.payroll_id, latest.date_from, latest.date_until);
//           setSelectedPayroll(latest);
//           applyPayroll(latest);
//         } else {
//           console.warn('[DTRforEmployee] NO payrolls found for employee in API response. Check backend filter by employee_id or response shape.');
//           setPayrollList([]);
//         }
//       } catch (err) {
//         console.error('[DTRforEmployee] error while fetching payrolls', err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPayrolls();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   const applyPayroll = (payroll) => {
//     if (!payroll) {
//       console.warn('[DTRforEmployee] applyPayroll called with falsy payroll');
//       return;
//     }
//     console.log('[DTRforEmployee] applying payroll', payroll.payroll_id);
//     setSelectedPayroll(payroll);

//     // Set date range (these are the values TableAmPm expects)
//     setDateFrom(payroll.date_from);
//     setDateUntil(payroll.date_until);

//     const records = payroll.attendance_records ?? payroll.attendance ?? [];
//     console.log('[DTRforEmployee] applyPayroll attendance count:', records.length ?? 0);
//     const mapped = mapAttendanceToDTR(records);
//     console.log('[DTRforEmployee] mapped dtrData count:', mapped.length);
//     setDtrData(mapped);
//   };

//   if (loading) return <Loading text="Loading DTR..." />;

//   // final fallbacks — in case state hasn't updated quickly enough
//   const finalDateFrom = dateFrom || selectedPayroll?.date_from || '';
//   const finalDateUntil = dateUntil || selectedPayroll?.date_until || '';

//   console.log('[DTRforEmployee] render values', {
//     selectedPayrollId: selectedPayroll?.payroll_id,
//     dateFromState: dateFrom,
//     dateUntilState: dateUntil,
//     finalDateFrom,
//     finalDateUntil,
//     dtrDataCount: dtrData.length,
//     payrollListCount: payrollList.length
//   });

//   // Improved payslip presentation: no table — rows inside a card
//   const PayslipCard = ({ payroll }) => {
//     if (!payroll) {
//       return (
//         <Card variant="outlined" sx={{ mt: 2 }}>
//           <CardContent>
//             <Typography variant="body2">No payslip selected.</Typography>
//           </CardContent>
//         </Card>
//       );
//     }

//     // compute values (same logic as before)
//     const deductionType = payroll.contribution_deduction_type || 'semi-monthly';
//     const rawSSS = parseFloat(payroll.sss_employee_share) || 0;
//     const rawPhil = parseFloat(payroll.philhealth_employee_share) || 0;
//     const rawPag = parseFloat(payroll.pagibig_employee_share) || 0;
//     const dateUntilParts = String(payroll.date_until || '').split('-');
//     const dateUntilDay = dateUntilParts.length === 3 ? Number(dateUntilParts[2]) : 0;

//     let sss = 0, phil = 0, pag = 0;
//     let sssLabel = '', philLabel = '', pagLabel = '';

//     if (deductionType === 'semi-monthly') {
//       sss = rawSSS / 2;
//       phil = rawPhil / 2;
//       pag = rawPag / 2;
//       sssLabel = philLabel = pagLabel = '(Semi-Monthly)';
//     } else if (deductionType === 'monthly') {
//       if (dateUntilDay >= 20) {
//         sss = rawSSS;
//         phil = rawPhil;
//         pag = rawPag;
//         sssLabel = philLabel = pagLabel = '(Monthly Applied)';
//       } else {
//         sss = phil = pag = 0;
//         sssLabel = philLabel = pagLabel = '(Hidden)';
//       }
//     }

//     const dailyRate = parseFloat(payroll.basic_salary) || 0;
//     const totalDays = parseFloat(payroll.total_days) || 0;
//     const overtimeDays = parseFloat(payroll.total_overtime_request) || 0;
//     const gross = (dailyRate * (totalDays + overtimeDays));
//     const loan = parseFloat(payroll.loan_deduction_applied ?? payroll.loan_deduction_actual ?? payroll.loan_deduction ?? 0) || 0;
//     const totalDed = sss + phil + pag + loan;
//     const net = gross - totalDed;
//     const totalCredit = totalDays + overtimeDays;

//     // structured rows for rendering
//     const rows = [
//       { label: 'Basic Salary', value: show(payroll.basic_salary, hideValues) },
//       { label: 'Days', value: hideValues ? masked : String(totalDays) },
//       { label: 'Overtime', value: hideValues ? masked : String(overtimeDays) },
//       { label: `SSS ${sssLabel}`, value: show(sss, hideValues) },
//       { label: `PhilHealth ${philLabel}`, value: show(phil, hideValues) },
//       { label: `Pag-ibig ${pagLabel}`, value: show(pag, hideValues) },
//       { label: 'Loan Deduction', value: show(loan, hideValues) },
//       { label: 'Gross', value: show(gross, hideValues), strong: true },
//       // 'Total Deduction' intentionally removed per your earlier change
//       { label: 'Total Credit', value: show(totalCredit, hideValues) },
//       { label: 'Net Salary', value: show(net, hideValues), strong: true },
//     ];

//     return (
//       <Card variant="outlined" sx={{ mt: 2 }}>
//         <CardContent>
//           <Grid container alignItems="center" spacing={1}>
//             <Grid item xs={8}>
//               <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{payroll.name}</Typography>
//               <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: isMobile ? 12 : 13 }}>
//                 {payroll.position_name} • {formatDate(payroll.date_from)} → {formatDate(payroll.date_until)}
//               </Typography>
//             </Grid>

//             <Grid item xs={4} textAlign="right">
//               <Typography variant="h6" sx={{ fontWeight: 800 }}>
//                 {hideValues ? masked : fmtNumber(net)}
//               </Typography>
//               <Typography variant="caption" color="text.secondary">Net</Typography>
//             </Grid>
//           </Grid>

//           <Divider sx={{ my: 1 }} />

//           <Box>
//             {rows.map((r, idx) => (
//               <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, alignItems: 'center' }}>
//                 <Typography variant={r.strong ? 'subtitle2' : 'body2'} color={r.strong ? 'text.primary' : 'text.secondary'}>
//                   {r.label}
//                 </Typography>
//                 <Typography variant={r.strong ? 'subtitle2' : 'body2'} sx={{ fontWeight: r.strong ? 700 : 500 }}>
//                   {r.value}
//                 </Typography>
//               </Box>
//             ))}
//           </Box>

//           <Divider sx={{ my: 1 }} />

//           <Stack direction={isMobile ? 'column' : 'row'} spacing={1}>
//             <Button fullWidth variant="outlined" startIcon={<PrintIcon />} onClick={() => printPayslipsToWindow({ payrolls: [payroll], hideValues })}>
//               Print Payslip
//             </Button>
//             {/* Removed redundant "Print Both Copies" button as requested */}
//           </Stack>
//         </CardContent>
//       </Card>
//     );
//   };

//   return (
//     <Box sx={{ p: isMobile ? 1.5 : 3 }}>
//       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
//         <Typography variant={isMobile ? "h6" : "h5"}>DTR</Typography>

//         {/* Native select kept for simplicity on mobile; dates formatted for readability */}
//         <select
//           value={selectedPayroll?.payroll_id ?? ''}
//           onChange={(e) => {
//             const pid = e.target.value;
//             console.log('[DTRforEmployee] payroll selector changed to', pid);
//             const payroll = payrollList.find(p => String(p.payroll_id) === String(pid));
//             if (payroll) applyPayroll(payroll);
//             else console.warn('[DTRforEmployee] selected payroll id not found', pid);
//           }}
//           style={{
//             padding: isMobile ? '10px 12px' : '6px 8px',
//             borderRadius: 8,
//             border: '1px solid #ddd',
//             fontSize: isMobile ? 14 : 12,
//             background: '#fff',
//             minWidth: 160,
//           }}
//         >
//           {payrollList.length === 0 && selectedPayroll && (
//             <option value={selectedPayroll.payroll_id}>
//               {formatDate(selectedPayroll.date_from)} → {formatDate(selectedPayroll.date_until)}
//             </option>
//           )}
//           {payrollList.map(p => (
//             <option key={p.payroll_id} value={p.payroll_id}>
//               {formatDate(p.date_from)} → {formatDate(p.date_until)}
//             </option>
//           ))}
//         </select>
//       </Box>

//       {/* Payslip area */}
//       <Box sx={{ mt: 2 }}>
//         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
//           <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Payslip</Typography>

//           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
//             <Tooltip title={hideValues ? "Values are hidden" : "Values are visible"}>
//               <IconButton onClick={() => setHideValues(prev => !prev)} color={hideValues ? 'default' : 'primary'}>
//                 {hideValues ? <VisibilityOffIcon /> : <VisibilityIcon />}
//               </IconButton>
//             </Tooltip>

//             <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => printPayslipsToWindow({ payrolls: selectedPayroll ? [selectedPayroll] : [], hideValues })}>
//               Print
//             </Button>

//             {/* Removed redundant Print All button as requested */}
//           </Box>
//         </Box>

//         {/* Chips for quick switching */}
//         {payrollList.length > 0 && (
//           <Box sx={{ overflowX: 'auto', pb: 1 }}>
//             <Stack direction="row" spacing={1} sx={{ width: 'max-content', py: 0.5 }}>
//               {payrollList.map(p => (
//                 <Chip
//                   key={p.payroll_id}
//                   label={`${formatDate(p.date_from)} → ${formatDate(p.date_until)}`}
//                   onClick={() => { applyPayroll(p); setExpanded(true); setTimeout(() => { const el = document.querySelector('.MuiAccordion-root'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 140); }}
//                   color={selectedPayroll?.payroll_id === p.payroll_id ? 'primary' : 'default'}
//                   variant={selectedPayroll?.payroll_id === p.payroll_id ? 'filled' : 'outlined'}
//                   clickable
//                   sx={{ minWidth: 150 }}
//                 />
//               ))}
//             </Stack>
//           </Box>
//         )}

//         {/* Payslip card (no table) */}
//         <PayslipCard payroll={selectedPayroll} />

//         {/* DTR Table (unchanged) */}
//         <TableAmPm
//           dtrData={dtrData}
//           dateFrom={finalDateFrom}
//           dateUntil={finalDateUntil}
//         />
//       </Box>
//     </Box>
//   );
// };

// export default DTRforEmployee;




