// PayrollPage.jsx
import { useEffect, useState, useMemo, useRef  } from 'react';
import useFetchPayrolls from '../payrollHooks/useFetchPayrolls';
import useCloseOnOutsideClick from '../payrollHooks/useCloseOnOutsideClick';
import { deletePayrollAPI, fetchPayrollSummaryAPI } from '../payrollApi/payrollapi';
import BreadcrumbHeader from '../payrollComponents/breadcrumbHeader';
import SearchAndFilter from '../payrollComponents/searchAndFilter';
import ActionButtons from '../payrollComponents/actionButtons';
import ViewToggle from '../payrollComponents/viewToggle';
import PayrollLogModal from '../payrollComponents/payrollLogModal';
import PayrollGrid from '../payrollComponents/payrollgrind';
import PayrollList from '../payrollComponents/payrollList';
import PayrollModal from '../../components/payroll/payrollModal';
import { useSession } from '../../context/SessionContext';
import Breadcrumbs from '../../components/breadcrumbs/Breadcrumbs';
import printPayslipsToWindow from '../payrollComponents/printPayrollPayslip';
import { fetchPayrollsAPI } from '../payrollApi/payrollapi';
import PayrollLog from '../../components/payroll/payrollLog';
import PayrollFilterButtonEmployee from "../payrollComponents/PayrollFilterButtonEmployee"; // ✅ new import
import usePermissions from "../../users/hooks/usePermissions";  
import { RefreshCcw } from 'lucide-react';
import { Tooltip } from "react-tooltip";
import ApplyChangesButton from '../payrollApi/ApplyChangesButton';
import TopTabBar from '../../components/breadcrumbs/Tabs';
import PayrollSummaryPrint from '../payrollComponents/PayrollSummaryPrint';
import AllowanceModal from '../../components/allowance/allowance_comp/AllowanceModal';
import AllowanceSummaryModal from '../../components/allowance/AllowancePage';
import axios from 'axios';
import BASE_URL from '../../../backend/server/config';
import AttendanceModal from '../payrollComponents/AttendanceModal';
import AttendanceSummaryModal from '../payrollComponents/AttendanceSummaryModal';
import Swal from "sweetalert2";
import { EllipsisVertical } from 'lucide-react';

// <-- NEW: Reward rules manager import (adjust path if you placed the file somewhere else) -->
import RewardRulesManager from '../payrollComponents/RewardRulesModal';

export default function PayrollPage() {
  const { user } = useSession();
  const modalRef = useRef(null);

  // Expandable menu state + ref (replaces the grid buttons when collapsed)
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  // close menu on outside click / Escape
  useEffect(() => {
    function handleClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpenMenu(false);
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpenMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const [openDropdownDetails, setOpenDropdownDetails] = useState(null);
  const [selectedPayrolls, setSelectedPayrolls] = useState([]);
  const [showPayrollLog, setShowPayrollLog] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');
  const [activeView, setActiveView] = useState('list');
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPayrollDTR, setSelectedPayrollDTR] = useState([]);
  const [filters, setFilters] = useState({ status: "active", type: "all" });
  const { permissions, loading: permLoading } = usePermissions(user?.username);
  // you can store selected cutoff dates; default to latest payroll's cutoff if needed
  const [summaryDateFrom, setSummaryDateFrom] = useState(null);
  const [summaryDateUntil, setSummaryDateUntil] = useState(null);
  // add state to hold payrolls for summary modal
  const [showPayrollSummaryModal, setShowPayrollSummaryModal] = useState(false);
  const [summaryPayrolls, setSummaryPayrolls] = useState([]);
  const [allowanceModalOpen, setAllowanceModalOpen] = useState(false);
  const [allowanceSummaryOpen, setAllowanceSummaryOpen] = useState(false);
  const [currentPayrollId, setCurrentPayrollId] = useState(null); // set when a payroll is selected or when draft created
  // you already have summaryDateFrom/Until state - reuse those for props
  const [payrollDTR, setPayrollDTR] = useState([]);
  const [showAttendanceSummary, setShowAttendanceSummary] = useState(false);
  // new state to hold the prepared attendance records for the modal
  const [attendanceSummaryRecords, setAttendanceSummaryRecords] = useState([]);
  // 🗓️ Track current cutoff dates for modal
  const [dateFrom, setDateFrom] = useState("");
  const [dateUntil, setDateUntil] = useState("");

  // Add state for total selected net salary and loan deduction
  const [totalSelectedNetSalary, setTotalSelectedNetSalary] = useState(0);
  const [totalSelectedLoanDeduction, setTotalSelectedLoanDeduction] = useState(0);

  // <-- NEW: show/hide reward rules manager overlay -->
  const [showRewardManager, setShowRewardManager] = useState(false);

  // Effects
  useFetchPayrolls(setPayrollData, setError, setLoading);
  useCloseOnOutsideClick(modalRef, showPayrollLog, () => setShowPayrollLog(false));

  // Callback function to receive net salary from PayrollList
  const handleNetSalaryChange = (netSalary, loanDeduction) => {
    setTotalSelectedNetSalary(netSalary || 0);
    setTotalSelectedLoanDeduction(loanDeduction || 0);
  };

  const openPayrollSummary = async () => {
    // build selected payroll list from payrollData using selectedPayrolls
    const selectedList = (selectedPayrolls && selectedPayrolls.length > 0)
      ? payrollData.filter(p => selectedPayrolls.includes(p.payroll_id))
      : (payrollData && payrollData.length > 0 ? [payrollData[0]] : []);

    if (!selectedList || selectedList.length === 0) {
      Swal.fire("No payrolls", "No payroll records are available to summarize.", "info");
      return;
    }

    // Fetch allowances for the selected payrolls and merge
    try {
      const payrollIds = selectedList.map(p => p.payroll_id).filter(Boolean);
      if (payrollIds.length > 0) {
        const res = await axios.post(`${BASE_URL}/payroll/get_allowances_for_payrolls.php`, {
          payroll_ids: payrollIds
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('Fetched allowances for summary:', res);

        if (res.data && res.data.success) {
          const grouped = res.data.data || {};
          const merged = selectedList.map(p => {
            const pid = p.payroll_id;
            const allowances = grouped[pid] ?? grouped[String(pid)] ?? [];
            const total_allowances = Array.isArray(allowances) ? allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0) : 0;
            return {
              ...p,
              allowances,
              total_allowances: Number(total_allowances.toFixed(2))
            };
          });
          setSummaryPayrolls(merged);
        } else {
          // If allowances endpoint returned no data, still show summary (un-enriched)
          console.warn('get_allowances_for_payrolls returned no data or not success', res.data);
          setSummaryPayrolls(selectedList);
        }
      } else {
        setSummaryPayrolls(selectedList);
      }
    } catch (err) {
      console.error('Failed to fetch allowances for payroll summary:', err);
      // fallback: open summary without allowances
      setSummaryPayrolls(selectedList);
    }

    setShowPayrollSummaryModal(true);
  };

  useEffect(() => {
    if (selectedPayrolls.length === 0) {
      setTotalSelectedNetSalary(0);
      setTotalSelectedLoanDeduction(0);
    }
  }, [selectedPayrolls]);

  // Memoized filtered data
  const filteredPayrollData = useMemo(() => {
    return payrollData
      .filter((p) => {
        // Search
        const nameMatch = p.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const idMatch = p.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

        // Status filter
        const statusMatch =
          filters.status === "all" ? true : p.status === filters.status;

        // Employee type filter
        const typeMatch =
          filters.type === "all" ? true : p.employee_type === filters.type;

        return (nameMatch || idMatch) && statusMatch && typeMatch;
      })
      // ✅ Ensure active employees always come first
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (a.status !== "active" && b.status === "active") return 1;
        return 0;
      });
  }, [searchTerm, payrollData, filters]);

  // View handlers
  const handleListView = () => setActiveView('list');
  const handleGridView = () => setActiveView('grid');

  // Dropdown toggles
  const toggleActionsDropdown = payrollId => {
    setOpenDropdownId(prev => (prev === payrollId ? null : payrollId));
    setOpenDropdownDetails(null);
  };

  const toggleDetailsDropdown = payrollId => {
    setOpenDropdownDetails(prev => (prev === payrollId ? null : payrollId));
    setOpenDropdownId(null);
  };

  // Modal open/close
  const openModal = (type, payroll = null) => {
    setSelectedPayroll(payroll);
    setModalType(type);
    setIsModalOpen(true);

    if (payroll?.attendance_records) {
      const transformedDTR = payroll.attendance_records.map(item => ({
        date: item.attendance_date,
        am_in: item.time_in_morning,
        am_out: item.time_out_morning,
        pm_in: item.time_in_afternoon,
        pm_out: item.time_out_afternoon,
        total_credit: item.days_credited
      }));
      setSelectedPayrollDTR(transformedDTR);
    } else {
      setSelectedPayrollDTR([]);
    }
  };

  // inside your PayrollPage component
  const handleReFetch = async () => {
    try {
      const response = await fetchPayrollsAPI();
      if (response.data.success) {
        setPayrollData(response.data.data);
      }
    } catch (err) {
      console.error("Failed to refetch payrolls:", err);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPayroll(null);
    setModalType('');
  };

  // Delete handler
  const handleDelete = async payroll => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This payroll record will be permanently deleted!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await deletePayrollAPI(payroll.payroll_id);
        Swal.fire('Deleted!', 'Payroll record deleted successfully.', 'success');
        fetchPayrollsAPI().then(response => {
          if (response.data.success) setPayrollData(response.data.data);
        });
      } catch {
        Swal.fire('Error!', 'Failed to delete the payroll record.', 'error');
      }
    }
  };

  // Selection handlers
  const handleSelectPayroll = id => {
    setSelectedPayrolls(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // ------------------------ Attendance helpers ------------------------
  const openAttendanceSummary = () => {
    // choose payrolls: selectedPayrolls or fallback to first payroll
    const picked = (selectedPayrolls && selectedPayrolls.length > 0)
      ? payrollData.filter(p => selectedPayrolls.includes(String(p.payroll_id)))
      : (payrollData && payrollData.length > 0 ? [payrollData[0]] : []);

    if (!picked || picked.length === 0) {
      Swal.fire("No payrolls", "Please select at least one payroll to view attendance.", "info");
      return;
    }

    // Build records shaped for the modal: [{ employee_id, name, attendance_records, ... }, ...]
    const records = picked.map(p => ({
      employee_id: p.employee_id,
      name: p.name,
      department_name: p.department_name,
      position_name: p.position_name,
      date_from: p.date_from,
      date_until: p.date_until,
      overtime_hours: p.overtime_hours,
      attendance_records: Array.isArray(p.attendance_records) ? p.attendance_records : []
    }));

    // Save and open
    setAttendanceSummaryRecords(records);
    setShowAttendanceSummary(true);
  };

  // If you still need handleViewPayroll elsewhere — make it set payrollDTR too
  const handleViewPayroll = async (payrollId) => {
    try {
      const response = await axios.get(`${BASE_URL}/payroll/view/${payrollId}`);
      const dtr = response?.data?.dtr ?? response?.data?.attendance_records ?? [];
      const transformed = Array.isArray(dtr) ? dtr.map(item => ({
        date: item.attendance_date || item.att_date || item.date,
        am_in: item.time_in_morning || item.time_in_am || item.time_in,
        am_out: item.time_out_morning || item.time_out_am || item.time_out,
        pm_in: item.time_in_afternoon || item.time_in_pm,
        pm_out: item.time_out_afternoon || item.time_out_pm,
        total_credit: item.days_credited || item.total_day || item.days || item.total_credit
      })) : [];

      // keep selectedPayrollDTR (existing code) and also set payrollDTR for global modal usage
      setSelectedPayrollDTR(transformed);
      setPayrollDTR(transformed);
      console.log("handleViewPayroll -> set payrollDTR and selectedPayrollDTR", transformed);
    } catch (err) {
      console.error("handleViewPayroll error:", err);
      Swal.fire("Error", "Failed to load payroll DTR.", "error");
    }
  };

  // Select only active payroll rows when "Select all" is clicked
  const handleSelectAll = () => {
    // collect only active payroll ids
    const activePayrollIds = (payrollData || [])
      .filter(p => String(p.status).toLowerCase() === "active")
      .map(p => p.payroll_id);

    setSelectedPayrolls(prev => {
      // if currently everything active is already selected -> unselect them
      const allActiveSelected = activePayrollIds.length > 0 && activePayrollIds.every(id => prev.includes(id));
      if (allActiveSelected) return prev.filter(id => !activePayrollIds.includes(id)); // deselect active ones, keep any other explicit selections
      // otherwise select all active (preserve any previously manually-selected inactive ones if present)
      const merged = Array.from(new Set([ ...(prev || []).filter(id => !activePayrollIds.includes(id)), ...activePayrollIds ]));
      return merged;
    });
  };

  // Date formatting
  const formatDate = dateString => {
    const options = { year: 'numeric', month: 'short', day: '2-digit' };
    return new Date(dateString)
      .toLocaleDateString('en-US', options)
      .replace(/(\w{3})\s(\d{1,2}),\s(\d{4})/, (_, m, d, y) => `${m}. ${d}, ${y}`);
  };

  // ------------------ REPLACED handlePrint (computes loan deduction from journal entries) ------------------
  // helper: normalize start of day
  const toDayStart = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    dt.setHours(0,0,0,0);
    return dt.getTime();
  };
  // helper: normalize end of day
  const toDayEnd = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    dt.setHours(23,59,59,999);
    return dt.getTime();
  };

  // Sum 'credit' journal entries for a loan within payroll cutoff (inclusive)
  const sumJournalCreditsForLoan = (loan = {}, payrollFrom, payrollUntil) => {
    const journals = loan.journal_entries || [];
    const fromT = toDayStart(payrollFrom);
    const untilT = toDayEnd(payrollUntil);
    let sum = 0;
    console.log(`TRACE: sumJournalCreditsForLoan start loan_id=${loan.loan_id} from=${payrollFrom} until=${payrollUntil}`, { journals });
    for (const j of journals) {
      if (!j) { console.log('TRACE: skipping null journal', j); continue; }
      const type = String(j.entry_type || "").toLowerCase();
      const jd = j.entry_date || j.created_at || j.date || null;
      const a = parseFloat(j.amount || j.amt || 0) || 0;
      const jt = jd ? new Date(jd).getTime() : null;

      console.log('TRACE: journal inspect', { loanIdCandidate: j.loan_id ?? j.loanId ?? null, type, amountRaw: j.amount, amountParsed: a, dateRaw: jd, dateTs: jt });

      if (type !== "credit") { console.log('TRACE: skipping non-credit', type); continue; }
      if (!jd) { console.log('TRACE: skipping no-date journal'); continue; }
      if ((fromT !== null && jt < fromT) || (untilT !== null && jt > untilT)) {
        console.log('TRACE: skipping out-of-range', { jt, fromT, untilT });
        continue;
      }
      sum += a;
    }
    console.log(`TRACE: sumJournalCreditsForLoan end loan_id=${loan.loan_id} sum=${sum}`);
    return Number(sum.toFixed(2));
  };

  // Print handler - pass loan deduction data (enriched from journal entries)
  const handlePrint = async () => {
    // 1) pick selected payrolls from current payrollData
    let selectedList = payrollData.filter(p => selectedPayrolls.includes(p.payroll_id));
    console.log('Selected Payrolls:', selectedPayrolls);
    console.log('Selected List for printing (raw):', selectedList);

    // 2) fetch allowances grouped by payroll_id and merge them into selectedList
    try {
      const payrollIds = selectedList.map(p => p.payroll_id).filter(Boolean);
      if (payrollIds.length > 0) {
        const allowanceRes = await axios.post(`${BASE_URL}/payroll/get_allowances_for_payrolls.php`, {
          payroll_ids: payrollIds
        }, {
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('Fetched allowances for print:', allowanceRes);

        if (allowanceRes.data && allowanceRes.data.success) {
          const grouped = allowanceRes.data.data || {};
          // Merge allowances into selectedList (mutate selectedList entries)
          selectedList = selectedList.map((p) => {
            const pid = p.payroll_id;
            // grouped keys may be numbers or strings; try both
            const allowances = grouped[pid] ?? grouped[String(pid)] ?? [];
            const total_allowances = Array.isArray(allowances) ? allowances.reduce((s, a) => s + (parseFloat(a.applied_amount) || 0), 0) : 0;
            return {
              ...p,
              allowances,
              total_allowances: Number(total_allowances.toFixed(2))
            };
          });
        } else {
          console.warn('get_allowances_for_payrolls returned no data or not success', allowanceRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch allowances for printing:', err);
      // continue with printing even if allowances fail
    }

    // 3) existing loan enrichment logic (unchanged) — compute per-loan journal sums and attach to loan objects
    const payrollsWithLoanDeduction = selectedList.map(payroll => {
      const payrollFrom = payroll.date_from;
      const payrollUntil = payroll.date_until;

      const loans = Array.isArray(payroll.loans) ? payroll.loans.slice() : [];

      // compute per-loan journal sums and attach to loan objects
      let payrollLoanSum = 0;
      const enrichedLoans = loans.map(l => {
        const journalSum = sumJournalCreditsForLoan(l, payrollFrom, payrollUntil);

        // copy loan and attach computed fields
        const loanCopy = { ...l };
        loanCopy.journal_sum_this_cut = journalSum;

        // Prefer journalSum for deduction if > 0, else fallback to existing loan.deduction_actual
        if (journalSum > 0) {
          loanCopy.deduction_actual = String(Number(journalSum.toFixed(2)));
        } else {
          loanCopy.deduction_actual = String(Number(parseFloat(loanCopy.deduction_actual || 0).toFixed(2)));
        }

        payrollLoanSum += journalSum;
        return loanCopy;
      });

      // If no journal sums were found, fallback to existing payroll.loan_deduction_actual / payroll.loan_deduction_applied
      const fallbackPayrollLoan = parseFloat(payroll.loan_deduction_actual || payroll.loan_deduction || payroll.loan_deduction_applied || 0) || 0;
      const finalPayrollLoanDeduction = payrollLoanSum > 0 ? payrollLoanSum : fallbackPayrollLoan;

      return {
        ...payroll,
        loans: enrichedLoans,
        loan_deduction_actual: String(Number(finalPayrollLoanDeduction.toFixed(2))),
        loan_deduction_applied: String(Number(finalPayrollLoanDeduction.toFixed(2))),
      };
    });

    console.log('Selected List enriched for printing:', payrollsWithLoanDeduction);
    console.log('TRACE: detailed loan info for printing:');
    payrollsWithLoanDeduction.forEach((pl) => {
      console.log(` PAYROLL ${pl.payroll_id} for ${pl.employee_id} (${pl.name})`);
      (Array.isArray(pl.loans) ? pl.loans : []).forEach((ln) => {
        console.log('   loan:', {
          loan_id: ln.loan_id,
          loan_amount: ln.loan_amount,
          balance: ln.balance,
          payable_per_term: ln.payable_per_term,
          deduction_actual: ln.deduction_actual,
          journal_sum_this_cut: ln.journal_sum_this_cut,
          journal_entries: ln.journal_entries || ln.journals || ln.loan_journal_entries || null,
        });
      });
    });

    // 4) call the print helper
    printPayslipsToWindow({ payrolls: payrollsWithLoanDeduction });
  };
  // ------------------ end replaced handlePrint ------------------

  const breadcrumbItems = [
    !permLoading && permissions?.payroll_records && { key: "payroll", label: "Payroll", path: "/payroll-page" },
    !permLoading && permissions?.loan && { key: "loan", label: "Loan", path: "/LoanPage" },
  ].filter(Boolean);

  return (
    <div className="container h-full overflow-auto">
      {/* === PAGE HEADER (Sticky) === */}
      <div className="sticky top-0 flex flex-col w-full pb-3 pl-5 bg-white border-b-2 shadow-sm z-1 gap-y-2 Glc-dashboard-bg-header">
        <span className="text-2xl font-semibold">Payroll Records</span>
        <Breadcrumbs items={breadcrumbItems} />
      </div>

      {/* === TOOLBAR (Sticky under header) === */}
      <div className="sticky top-[70px] z-2 flex flex-col gap-4 p-4 bg-white border-b shadow-sm md:flex-row md:items-center md:justify-between">

        {/* LEFT SIDE: Search, Filters, Total, Refresh */}
        <div className="flex flex-col w-full gap-3 md:flex-row md:items-center md:w-auto md:flex-wrap">
          {/* Search */}
          <div className="flex-1 w-[500px] md:w-[500px]">
            <SearchAndFilter
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex justify-center md:justify-start ml-50">
            <PayrollFilterButtonEmployee onFilterChange={setFilters} />
          </div>

          {/* Refresh Button + Total */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center ">
            <div className="relative flex items-center gap-2 group">
              <ApplyChangesButton
                onClick={handleReFetch}
                disabled={loading}
                tooltip="Fetch updated payroll data to apply loan and contribution changes."
              />
              <Tooltip id="fetch-tooltip" place="top" effect="solid" />
            </div>

            <div className="px-4 py-2 text-sm font-semibold text-center text-green-700 bg-green-100 border border-green-300 rounded-lg shadow-sm md:text-left">
              ₱
              {totalSelectedNetSalary.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ">
            <ActionButtons
              userRole={user.role}
              onEdit={() => openModal("edit", payrollData[0])}
              onPrint={handlePrint}
              onLog={() => setShowPayrollLog(true)}
            />
          </div>

        </div>

        {/* RIGHT SIDE: Expandable ellipsis menu (replaces the 2×2 grid) */}
        <div className="flex items-center">
          <div className="relative inline-block text-left" ref={menuRef}>
            <button
              aria-expanded={openMenu}
              aria-label={openMenu ? 'Close menu' : 'Open menu'}
              onClick={() => setOpenMenu(s => !s)}
              className="inline-flex items-center justify-center w-10 h-10 p-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 hover:border-indigo-400 transition-all duration-150"
            >
              <EllipsisVertical size={20} />
            </button>

            <div
              role="menu"
              aria-hidden={!openMenu}
              className={
                `absolute right-0 mt-2 w-72 md:w-96 transform origin-top-right transition-all ease-out duration-150 ` +
                (openMenu
                  ? 'opacity-100 scale-100 pointer-events-auto'
                  : 'opacity-0 scale-95 pointer-events-none')
              }
            >
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setAllowanceModalOpen(true); setOpenMenu(false); }}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 hover:border-indigo-400 hover:text-indigo-700"
                  role="menuitem"
                >
                  Manage Allowances
                </button>
 
                <button
                  onClick={() => { setShowRewardManager(true); setOpenMenu(false); }}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 hover:border-indigo-400 hover:text-indigo-700"
                  role="menuitem"
                >
                  Manage Rewards
                </button>

                <button
                  onClick={() => { openPayrollSummary(); setOpenMenu(false); }}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] transition-all duration-200"
                  role="menuitem"
                >
                  Payroll Summary
                </button>

                <button
                  onClick={() => { openAttendanceSummary(); setOpenMenu(false); }}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow-md active:scale-[0.98] transition-all duration-200"
                  role="menuitem"
                >
                  Attendance Summary
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* === MAIN CONTENT === */}
      <div className="p-3">
        {showPayrollLog && (
          <PayrollLogModal modalRef={modalRef}>
            <PayrollLog closeLog={() => setShowPayrollLog(false)} />
          </PayrollLogModal>
        )}

        {activeView === "grid" ? (
          <PayrollGrid
            data={filteredPayrollData}
            openDropdownId={openDropdownId}
            onToggleActions={toggleActionsDropdown}
            onToggleDetails={toggleDetailsDropdown}
            onDelete={handleDelete}
            selectedPayroll={selectedPayroll}
            onSelectPayroll={handleSelectPayroll}
            onEdit={(payroll) => openModal("edit", payroll)}
          />
        ) : (
          <PayrollList
            data={filteredPayrollData}
            loading={loading}
            selected={selectedPayrolls}
            onSelectAll={handleSelectAll}
            onSelect={handleSelectPayroll}
            formatDate={formatDate}
            onNetSalaryChange={handleNetSalaryChange}
          />
        )}

        {isModalOpen && (
          <PayrollModal
            modalType={modalType}
            payroll={selectedPayroll}
            closeModal={closeModal}
            refreshData={() =>
              fetchPayrollsAPI().then((r) =>
                r.data.success ? setPayrollData(r.data.data) : null
              )
            }
          />
        )}

        {filteredPayrollData.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            No employees found
            {searchTerm ? ` for "${searchTerm}"` : ""}
            {filters.status !== "all" ? ` with status "${filters.status}"` : ""}
            {filters.type !== "all" ? ` and type "${filters.type}"` : ""}.
          </p>
        )}
      </div>

      {/* === MODALS === */}
      <AllowanceModal
        open={allowanceModalOpen}
        onClose={() => setAllowanceModalOpen(false)}
        payrollFrom={summaryDateFrom}
        payrollUntil={summaryDateUntil}
        refreshPayroll={() =>
          fetchPayrollsAPI().then((r) =>
            r.data.success ? setPayrollData(r.data.data) : null
          )
        }
      />

      {showPayrollSummaryModal && (
        <PayrollSummaryPrint
          open={showPayrollSummaryModal}
          onClose={() => setShowPayrollSummaryModal(false)}
          payrolls={summaryPayrolls}
        />
      )}

      <AttendanceSummaryModal
        show={showAttendanceSummary}
        onClose={() => setShowAttendanceSummary(false)}
        selectedPayrolls={attendanceSummaryRecords}
        dateFrom={
          dateFrom ||
          attendanceSummaryRecords?.[0]?.date_from ||
          summaryDateFrom ||
          payrollData?.[0]?.date_from ||
          ""
        }
        dateUntil={
          dateUntil ||
          attendanceSummaryRecords?.[0]?.date_until ||
          summaryDateUntil ||
          payrollData?.[0]?.date_until ||
          ""
        }
      />

      <RewardRulesManager
        open={showRewardManager}
        onClose={() => setShowRewardManager(false)}
      />
    </div>
  );
}
