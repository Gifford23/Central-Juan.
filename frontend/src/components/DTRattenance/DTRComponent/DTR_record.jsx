import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "../../../../Styles/components/attendance/AttendanceModal.css";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import BASE_URL from "../../../../backend/server/config";
import { format } from "date-fns";
import { CalendarSearch } from 'lucide-react';
import AdminDTRRecordActionDropdown from "./DTR_record_action_button";
import AdminAddOvertimeModal from "./DTRAdminOvertimeEntryModal";
import { useSession } from '../../../context/SessionContext';

// MUI imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

/*
  DTR_record
  - This file preserves the original business logic and behaviour (fetching, autosave, save/clear, bulk update, schedules, etc.).
  - Visual layer updated to use Tailwind utility classes for layout and MUI components for inputs/buttons where it improves UX.
  - Comments have been added across the file to explain key areas and choices.
  - NOTE: I intentionally did NOT remove any logic or helper functions that are unrelated to UI changes.
*/

const DTR_record = ({ data, onClose, onCreditedDaysChange }) => {
  const { user } = useSession();
  const currentUserFullName = (
    user?.fullName ||
    user?.full_name ||
    ((user?.firstName || user?.first_name || user?.givenName) || "") + (user?.lastName || user?.last_name || user?.familyName ? " " + (user?.lastName || user?.last_name || user?.familyName) : "")
  ).trim();
  const currentUserRole = user?.role || user?.user_role || "";

  // --- state (kept same names to avoid breaking logic) ---
  const [formData, setFormData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeTarget, setOvertimeTarget] = useState(null);
  const [showFirstHalf, setShowFirstHalf] = useState(new Date().getDate() <= 15);
  const [isLoading, setIsLoading] = useState(false);
  const [updateAllLoading, setUpdateAllLoading] = useState(false);

  // AUTOSAVE refs/state (preserved behaviour)
  const autoSaveTimersRef = useRef({});
  const [autosavePending, setAutosavePending] = useState({});
  const [savingIndexes, setSavingIndexes] = useState({});
  const setSaving = (index, val) => {
    setSavingIndexes(prev => ({ ...prev, [index]: !!val }));
  };
  const setPending = (index, val) => {
    setAutosavePending(prev => ({ ...prev, [index]: !!val }));
  };

  // --- helper functions for schedules ---
  const parseDaysOfWeek = (raw) => {
    if (!raw) return [];
    const parts = raw.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
    const map = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
    const dow = [];
    for (const p of parts) {
      if (/^\d+$/.test(p)) {
        let n = parseInt(p, 10);
        if (n === 7) n = 0;
        if (n >= 0 && n <= 6) dow.push(n);
      } else {
        const key = p.toUpperCase().slice(0,3);
        if (map[key] !== undefined) dow.push(map[key]);
      }
    }
    return Array.from(new Set(dow));
  };

  const computeScheduleDatesInMonth = (schedule, month /*0-based*/, year) => {
    if (!schedule) return [];

    const month1 = month + 1;
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const eff = schedule.effective_date ? new Date(schedule.effective_date) : null;
    const endd = schedule.end_date ? new Date(schedule.end_date) : null;

    const periodStart = eff && eff > startOfMonth ? eff : startOfMonth;
    const periodEnd = endd && endd < endOfMonth ? endd : endOfMonth;

    const recurrence = (schedule.recurrence_type || "").toUpperCase();

    const dates = [];

    const pushYmd = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${dd}`);
    };

    if (recurrence === "daily" || recurrence === "everyday") {
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        pushYmd(new Date(d));
      }
      return dates;
    }

    const dowList = parseDaysOfWeek(schedule.days_of_week);

    if (recurrence === "weekly" && dowList.length > 0) {
      for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
        if (dowList.includes(d.getDay())) pushYmd(new Date(d));
      }
      return dates;
    }

    if (eff && eff >= startOfMonth && eff <= endOfMonth) {
      pushYmd(eff);
      return dates;
    }

    if (dowList.length > 0) {
      for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
        if (dowList.includes(d.getDay())) pushYmd(new Date(d));
      }
      return dates;
    }

    return dates;
  };

  const fetchSchedulesForEmployee = async (employeeId, monthZeroBased, year) => {
    if (!employeeId) return new Set();

    const tryUrl = `${BASE_URL}/schedule-manager/read-schedule-manager.php?employee_id=${encodeURIComponent(employeeId)}&month=${monthZeroBased + 1}&year=${year}`;
    try {
      const resp = await fetch(tryUrl);
      const json = await resp.json();
      if (json && json.success && Array.isArray(json.schedules || json.data)) {
        const list = Array.isArray(json.schedules) ? json.schedules : (Array.isArray(json.data) ? json.data : []);
        const resultDates = new Set();
        for (const s of list) {
          if (s.employee_id && s.employee_id !== employeeId) continue;
          const schDates = computeScheduleDatesInMonth(s, monthZeroBased, year);
          schDates.forEach(d => resultDates.add(d));
        }
        return resultDates;
      }
    } catch (err) {
      console.warn("fetchSchedulesForEmployee: param fetch failed", err);
    }

    try {
      const allUrl = `${BASE_URL}/schedule-manager/read-schedule-manager.php`;
      const resp2 = await fetch(allUrl);
      const json2 = await resp2.json();
      const listAll = Array.isArray(json2.schedules) ? json2.schedules : (Array.isArray(json2.data) ? json2.data : []);
      const resultDates = new Set();
      for (const s of listAll) {
        if (s.employee_id && s.employee_id !== employeeId) continue;
        const schDates = computeScheduleDatesInMonth(s, monthZeroBased, year);
        schDates.forEach(d => resultDates.add(d));
      }
      return resultDates;
    } catch (err) {
      console.error("fetchSchedulesForEmployee fallback failed", err);
      return new Set();
    }
  };

  // --- attendance & schedule state ---
  const [attendance, setAttendance] = useState([]);
  const [scheduleDates, setScheduleDates] = useState(new Set());
  const fetchControllerRef = useRef(null);
  const lastFetchRef = useRef({ employeeId: null, month: null, year: null });

  // --- date helpers (unchanged) ---
  const localDateYMD = (year, monthZeroBased, day) => {
    const d = new Date(year, monthZeroBased, day);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const parseYMDToLocalDate = (ymd) => {
    if (!ymd) return null;
    const parts = String(ymd).split("-");
    if (parts.length !== 3) return null;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    const d = Number(parts[2]);
    if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
    return new Date(y, m - 1, d);
  };

  const formatDisplayDate = (ymd) => {
    const d = parseYMDToLocalDate(ymd);
    return d ? format(d, "MMM d, yyyy") : "";
  };

  const isSunday = (ymd) => {
    const d = parseYMDToLocalDate(ymd);
    if (!d) return false;
    return d.getDay() === 0;
  };

  // --- credited days calc ---
  const calculateTotalCreditedDays = () => {
    const firstHalfDays = formData.slice(0, 15).reduce((total, record) => {
      return total + (parseFloat(record?.days_credited) || 0);
    }, 0);

    const secondHalfDays = formData.slice(15, 31).reduce((total, record) => {
      return total + (parseFloat(record?.days_credited) || 0);
    }, 0);

    return { firstHalfDays, secondHalfDays };
  };

  useEffect(() => {
    const { firstHalfDays, secondHalfDays } = calculateTotalCreditedDays();
    onCreditedDaysChange(firstHalfDays, secondHalfDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  // --- fetch attendance on employee/month/year change ---
  useEffect(() => {
    const employeeId = data?.employee_id;
    if (!employeeId) return;
    fetchAttendanceRecords(employeeId);
    return () => {
      if (fetchControllerRef.current) {
        try { fetchControllerRef.current.abort(); } catch (e) {}
      }
      // clear autosave timers on unmount
      Object.values(autoSaveTimersRef.current || {}).forEach(t => clearTimeout(t));
      autoSaveTimersRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.employee_id, selectedMonth, selectedYear]);

  const buildEmptyMonthArray = (employeeId, employeeName, daysInMonth) => {
    const arr = [];
    for (let day = 1; day <= 31; day++) {
      if (day <= daysInMonth) {
        const ymd = localDateYMD(selectedYear, selectedMonth, day);
        arr.push({
          attendance_id: null,
          employee_id: employeeId,
          employee_name: employeeName,
          attendance_date: ymd,
          time_in_morning: "",
          time_out_morning: "",
          time_in_afternoon: "",
          time_out_afternoon: "",
          original_time_in_morning: "",
          original_time_out_morning: "",
          original_time_in_afternoon: "",
          original_time_out_afternoon: "",
          days_credited: "",
          total_rendered_hours: "",
          deducted_days: "",
          overtime_hours: "",
          hours_requested: "",
        });
      } else {
        arr.push({
          attendance_id: null,
          employee_id: employeeId,
          employee_name: employeeName,
          attendance_date: null,
          time_in_morning: "",
          time_out_morning: "",
          time_in_afternoon: "",
          time_out_afternoon: "",
          original_time_in_morning: "",
          original_time_out_morning: "",
          original_time_in_afternoon: "",
          original_time_out_afternoon: "",
          days_credited: "",
          total_rendered_hours: "",
          deducted_days: "",
          overtime_hours: "",
          hours_requested: "",
        });
      }
    }
    return arr;
  };

  const fetchAttendanceRecords = async (employeeId) => {
    if (!employeeId) return;

    const alreadyFetched =
      lastFetchRef.current.employeeId === employeeId &&
      lastFetchRef.current.month === selectedMonth &&
      lastFetchRef.current.year === selectedYear;

    if (alreadyFetched && !fetchControllerRef.current) return;

    if (fetchControllerRef.current) {
      try { fetchControllerRef.current.abort(); } catch (e) {}
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    const attendanceUrl = `${BASE_URL}/attendance/get_attendance.php?employee_id=${encodeURIComponent(employeeId)}&month=${selectedMonth + 1}&year=${selectedYear}`;
    const schedulesUrl = `${BASE_URL}/schedule-manager/get_employee_schedules.php?employee_id=${encodeURIComponent(employeeId)}&month=${selectedMonth + 1}&year=${selectedYear}`;

    try {
      setIsLoading(true);

      const [attResp, schedResp] = await Promise.all([
        fetch(attendanceUrl, { signal: controller.signal }),
        fetch(schedulesUrl, { signal: controller.signal }).catch(err => null)
      ]);

      const attJson = attResp ? await attResp.json() : { success: false, data: [] };

      if (attJson && attJson.success) {
        lastFetchRef.current = { employeeId, month: selectedMonth, year: selectedYear };
      }

      setAttendance(Array.isArray(attJson?.data) ? attJson.data : []);

      if (schedResp) {
        try {
          const schedJson = await schedResp.json();
          if (schedJson && schedJson.success && Array.isArray(schedJson.data)) {
            setScheduleDates(new Set(schedJson.data));
          } else {
            setScheduleDates(new Set());
          }
        } catch (err) {
          console.warn("Failed to parse schedules response", err);
          setScheduleDates(new Set());
        }
      } else {
        setScheduleDates(new Set());
      }

      if (attJson.success && Array.isArray(attJson.data)) {
        const raw = attJson.data;
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const initialData = buildEmptyMonthArray(employeeId, data.employee_name, daysInMonth);

        for (let i = 0; i < initialData.length; i++) {
          const entry = initialData[i];
          if (!entry.attendance_date) continue;
          const found = raw.find((r) => r.attendance_date === entry.attendance_date);
          if (found) {
            initialData[i] = {
              attendance_id: found.attendance_id ?? null,
              employee_id: entry.employee_id,
              employee_name: entry.employee_name,
              attendance_date: entry.attendance_date,
              time_in_morning: found.time_in_morning ?? "",
              time_out_morning: found.time_out_morning ?? "",
              time_in_afternoon: found.time_in_afternoon ?? "",
              time_out_afternoon: found.time_out_afternoon ?? "",
              original_time_in_morning: found.time_in_morning ?? "",
              original_time_out_morning: found.time_out_morning ?? "",
              original_time_in_afternoon: found.time_in_afternoon ?? "",
              original_time_out_afternoon: found.time_out_afternoon ?? "",
              days_credited: found.days_credited ?? "",
              total_rendered_hours: found.total_rendered_hours ?? "",
              deducted_days: found.deducted_days ?? "",
              overtime_hours: found.overtime_hours ?? "",
              hours_requested: found.hours_requested ?? ""
            };
          }
        }

        setFormData(initialData);
      } else {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        setFormData(buildEmptyMonthArray(employeeId, data.employee_name, daysInMonth));
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Fetch aborted for attendance (newer request started).");
      } else {
        console.error("Error fetching attendance records:", error);
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        setFormData(buildEmptyMonthArray(employeeId, data.employee_name, daysInMonth));
        setScheduleDates(new Set());
      }
    } finally {
      setIsLoading(false);
      fetchControllerRef.current = null;
    }
  };

  // time input change -> autosave timer
  const handleChange = (index, field, value) => {
    const record = formData[index];
    if (!record) return;
    if (!record.attendance_date) return;

    const updatedData = [...formData];
    if (!value) {
      updatedData[index][field] = "";
    } else {
      updatedData[index][field] = value.length === 5 ? `${value}:00` : value;
    }
    setFormData(updatedData);

    // --- autosave behaviour (3s inactivity) ---
    if (autoSaveTimersRef.current[index]) {
      clearTimeout(autoSaveTimersRef.current[index]);
      delete autoSaveTimersRef.current[index];
    }

    setPending(index, true);

    autoSaveTimersRef.current[index] = setTimeout(async () => {
      delete autoSaveTimersRef.current[index];
      setPending(index, false);
      await autoSaveIndex(index);
    }, 3000);
  };

  // render input field (kept as time input for accuracy) -- styled with Tailwind for modern look
  const renderInputField = (record, field, index) => {
    const isDisabled = !record || !record.attendance_date;
    let value = record ? record[field] || "" : "";

    if (value && value.length >= 5) {
      value = value.slice(0, 5);
    } else {
      value = value || "";
    }

    return (
      <input
        type="time"
        value={value}
        onChange={(e) => handleChange(index, field, e.target.value)}
        className={`border p-2 rounded min-w-[130px] max-w-full ${isDisabled ? 'bg-gray-200 cursor-not-allowed opacity-60' : 'bg-white'} focus:outline-none`}
        readOnly={isDisabled}
        disabled={isDisabled}
      />
    );
  };

  // clear attendance (kept logic intact)
  const handleClear = async (record, index) => {
    if (!record || !record.attendance_date) {
      Swal.fire("Error", "Invalid record selected.", "error");
      return;
    }

    try {
      const currentUserFullName = (user && (user.full_name || user.fullName || user.name)) || "";
      const currentUserRole = (user && (user.role || user.user_role)) || "";

      let response, result;
      if (record.attendance_id) {
        response = await fetch(`${BASE_URL}/attendance/delete_attendance.php?id=${record.attendance_id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: record.attendance_id,
            full_name: currentUserFullName,
            user_role: currentUserRole
          })
        });
      } else {
        response = await fetch(`${BASE_URL}/attendance/delete_by_emp_date.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employee_id: record.employee_id,
            attendance_date: record.attendance_date,
            full_name: currentUserFullName,
            user_role: currentUserRole
          })
        });
      }

      result = await response.json();

      if (result.success) {
        Swal.fire({
          icon: "info",
          title: "Cleared",
          text: `Attendance cleared for ${record.attendance_date}.`,
        });

        const updatedData = [...formData];
        updatedData[index] = {
          ...updatedData[index],
          attendance_id: null,
          time_in_morning: "",
          time_out_morning: "",
          time_in_afternoon: "",
          time_out_afternoon: "",
          days_credited: "",
          deducted_days: "",
          overtime_hours: "",
          hours_requested: ""
        };
        setFormData(updatedData);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: result.message || "Failed to clear attendance.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: `Error clearing attendance: ${error.message}`,
      });
    }
  };

  // handleSave supports 'silent' mode (for autosave) - kept behaviour
  const handleSave = async (record, index, silent = false) => {
    if (!record || !record.attendance_date) {
      if (!silent) Swal.fire("Error!", "Invalid record selected.", "error");
      return;
    }

    if (savingIndexes[index]) {
      if (!silent) Swal.fire("Info", "Save already in progress for this row.", "info");
      return;
    }

    setSaving(index, true);
    if (autoSaveTimersRef.current[index]) {
      clearTimeout(autoSaveTimersRef.current[index]);
      delete autoSaveTimersRef.current[index];
      setPending(index, false);
    }

    const cleanedRecord = { ...record };
    ["time_in_morning", "time_out_morning", "time_in_afternoon", "time_out_afternoon"].forEach(field => {
      const v = String(cleanedRecord[field] || "").trim();
      if (!v) {
        cleanedRecord[field] = "00:00:00";
      } else if (v.length === 5 && v.indexOf(":") === 2) {
        cleanedRecord[field] = `${v}:00`;
      } else {
        cleanedRecord[field] = v;
      }
    });

    cleanedRecord.user_full_name = currentUserFullName;
    cleanedRecord.user_role = currentUserRole;

    try {
      const method = record.attendance_id ? "PUT" : "POST";
      const url = record.attendance_id
        ? `${BASE_URL}/attendance/update_attendance.php?id=${record.attendance_id}`
        : `${BASE_URL}/attendance/create_attendance.php`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedRecord),
      });

      const rawText = await response.text();

      let result;
      try {
        result = JSON.parse(rawText);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError.message);
        throw new Error("Server did not return valid JSON. Check PHP errors.");
      }

      if (result.success) {
        if (!silent) {
          Swal.fire("Success!", `Attendance record for ${record.attendance_date} saved successfully.`, "success");
        }
        lastFetchRef.current = { employeeId: null, month: null, year: null };
        await fetchAttendanceRecords(data.employee_id);
      } else {
        if (!silent) {
          Swal.fire("Oops!", result.message || "Failed to save attendance record.", "error");
        } else {
          Swal.fire({ icon: "error", title: "Autosave failed", text: result.message || "Failed to autosave." });
        }
      }
    } catch (error) {
      console.error("❌ Fetch error:", error);
      if (!silent) {
        Swal.fire("Error!", "Error saving record: " + error.message, "error");
      } else {
        Swal.fire({ icon: "error", title: "Autosave error", text: error.message });
      }
    } finally {
      setSaving(index, false);
    }
  };

  // autosave helper called by timer
  const autoSaveIndex = async (index) => {
    const record = formData[index];
    if (!record || !record.attendance_date) return;
    setSaving(index, true);
    try {
      await handleSave(record, index, true);
    } finally {
      setSaving(index, false);
    }
  };

  // month/year change handlers (kept) --- UI changed to MUI Select
  const handleMonthChange = (e) => {
    const month = parseInt(e.target.value, 10);
    if (!Number.isNaN(month)) setSelectedMonth(month);
  };

  const handleYearChange = (e) => {
    const year = parseInt(e.target.value, 10);
    if (!Number.isNaN(year)) setSelectedYear(year);
  };

  const currentYearForSelect = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYearForSelect - 5 + i);

  const getDaysArray = (month, year) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysArray = [];
    for (let day = 16; day <= 31; day++) {
      daysArray.push(day <= daysInMonth ? day : null);
    }
    return daysArray;
  };

  const hasSchedule = (ymd) => {
    if (!ymd) return false;
    return scheduleDates instanceof Set ? scheduleDates.has(ymd) : (Array.isArray(scheduleDates) && scheduleDates.includes(ymd));
  };

  // bulk update (kept)
  const handleUpdateAllAttendances = async () => {
    const confirmation = await Swal.fire({
      title: 'Update attendance for ALL employees?',
      text: `This will recalculate and update attendance for all employees for ${new Date(selectedYear, selectedMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}.\nThis action cannot be undone. Proceed?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, update all',
      cancelButtonText: 'Cancel'
    });

    if (!confirmation.isConfirmed) return;

    setUpdateAllLoading(true);
    Swal.fire({
      title: 'Updating all attendance...',
      text: 'Please wait — recalculating attendances for everyone.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const payload = {
        month: selectedMonth + 1,
        year: selectedYear,
        user_full_name: currentUserFullName,
        user_role: currentUserRole
      };

      const resp = await fetch(`${BASE_URL}/attendance/bulk_update_attendance.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Server responded with ${resp.status}${txt ? ': ' + txt : ''}`);
      }

      const json = await resp.json().catch(() => ({ success: false, message: 'Invalid JSON from server' }));

      if (json && json.success) {
        Swal.close();
        await Swal.fire('Done', json.message || 'All attendances updated successfully.', 'success');

        lastFetchRef.current = { employeeId: null, month: null, year: null };
        try { await fetchAttendanceRecords(data.employee_id); } catch (e) { console.warn(e); }
        try {
          const schedSet = await fetchSchedulesForEmployee(data.employee_id, selectedMonth, selectedYear);
          if (schedSet instanceof Set) setScheduleDates(schedSet);
          else if (Array.isArray(schedSet)) setScheduleDates(new Set(schedSet));
          else setScheduleDates(new Set());
        } catch (e) {
          console.warn(e);
          setScheduleDates(new Set());
        }

      } else {
        Swal.close();
        await Swal.fire('Error', (json && json.message) || 'Failed to update all attendances.', 'error');
      }
    } catch (err) {
      console.error('Bulk update error', err);
      Swal.close();
      await Swal.fire('Error', `Bulk update failed: ${err.message}`, 'error');
    } finally {
      setUpdateAllLoading(false);
      try { Swal.close(); } catch (e) {}
    }
  };

  // --------------------------------- RENDER ---------------------------------
  return (
    <>
      <motion.div 
        className="flex items-center justify-center w-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div className="w-full p-4 mx-4 mb-2 overflow-auto border shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
          {/* Header: modern title with MUI Typography and icon */}
          <Box className="flex items-center justify-between mb-4">
            <Box className="flex items-center gap-3">
              <CalendarSearch className="w-6 h-6 text-slate-700" />
              <Typography variant="h5" component="h2" className="font-semibold">DTR — Attendance Adjustments</Typography>
              <Typography variant="body2" className="ml-2 text-slate-500">Admin panel</Typography>
            </Box>

            <Box className="flex items-center gap-3">
              {/* Month select (MUI) */}
              <FormControl size="small">
                <InputLabel id="month-select-label">Month</InputLabel>
                <Select
                  labelId="month-select-label"
                  value={selectedMonth}
                  label="Month"
                  onChange={handleMonthChange}
                  sx={{ minWidth: 160 }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Year select (MUI) */}
              <FormControl size="small">
                <InputLabel id="year-select-label">Year</InputLabel>
                <Select
                  labelId="year-select-label"
                  value={selectedYear}
                  label="Year"
                  onChange={handleYearChange}
                  sx={{ minWidth: 110 }}
                >
                  {yearOptions.map(y => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Toggle pages */}
              <Button variant="contained" onClick={() => setShowFirstHalf(!showFirstHalf)}>
                {showFirstHalf ? 'Show 2nd Page' : 'Show 1st Page'}
              </Button>

              {/* Bulk update action */}
              <Button variant="outlined" onClick={handleUpdateAllAttendances} startIcon={updateAllLoading ? <CircularProgress size={16} /> : null}>
                Recalculate All
              </Button>

              {/* Close button */}
              <Button color="error" variant="contained" onClick={onClose}>Close</Button>
            </Box>
          </Box>

          {/* Loading indicator */}
          {isLoading && <div className="mb-2 text-sm text-slate-700">Loading attendance...</div>}

          <div className="flex flex-col gap-6">
            {/* FIRST HALF TABLE */}
            {showFirstHalf && (
              <section>
                <Typography variant="h6" className="mb-2 font-medium">Days 1-15</Typography>
                <div className="overflow-x-auto border rounded-lg shadow-sm border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-xs font-semibold text-center">#</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Date</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time In AM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time Out AM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time In PM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time Out PM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Credited</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Total Hours</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Deduction</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Overtime</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.slice(0, 15).map((record, index) => (
                        <tr key={record?.attendance_id ?? `first-${index}`} className={(!record?.attendance_date) ? 'bg-slate-50' : isSunday(record?.attendance_date) ? 'bg-red-50 text-red-600 font-semibold' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs font-semibold">{record?.attendance_date ? format(parseYMDToLocalDate(record.attendance_date), 'EEE').toUpperCase() : ''}</span>
                              {record?.attendance_date && hasSchedule(record.attendance_date) && (
                                <span className="inline-block w-4 h-4 bg-green-600 rounded-full" title="Has schedule" />
                              )}
                            </div>
                          </td>

                          <td className="px-3 py-2 text-center">
                            <input type="text" value={ formatDisplayDate(record?.attendance_date) } readOnly className="w-full text-sm text-center bg-transparent border-none" />
                          </td>

                          {['time_in_morning','time_out_morning','time_in_afternoon','time_out_afternoon'].map((field) => (
                            <td key={field} className="px-3 py-2 text-center">{renderInputField(record, field, index)}</td>
                          ))}

                          <td className="px-3 py-2 text-center">{record?.days_credited}</td>
                          <td className="px-3 py-2 text-center">{record?.total_rendered_hours}</td>
                          <td className="px-3 py-2 text-center">{record?.deducted_days}</td>
                          <td className="px-3 py-2 text-center">{record?.hours_requested}</td>
                          <td className="px-3 py-2 text-center">
                            <AdminDTRRecordActionDropdown
                              onSave={() => {
                                if (autosavePending[index]) { Swal.fire("Info", "Autosave pending — will save automatically shortly.", "info"); return; }
                                if (savingIndexes[index]) { Swal.fire("Info", "Save in progress for this row.", "info"); return; }
                                if (!record?.attendance_date) { Swal.fire("Action Blocked", "No date for this row.", "info"); return; }
                                handleSave(record, index, false);
                              }}
                              onClear={() => { if (!record?.attendance_date) { Swal.fire("Action Blocked", "No date for this row.", "info"); return; } handleClear(record, index); }}
                              onAddOvertime={() => { if (!record?.attendance_date) { Swal.fire("Action Blocked", "No date for this row.", "info"); return; } setOvertimeTarget({ employee_id: record.employee_id, employee_name: record.employee_name, attendance_date: record.attendance_date }); setShowOvertimeModal(true); }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* SECOND HALF TABLE */}
            {!showFirstHalf && (
              <section>
                <Typography variant="h6" className="mb-2 font-medium">Days 16-31</Typography>
                <div className="overflow-x-auto border rounded-lg shadow-sm border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-xs font-semibold text-center">#</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Date</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time In AM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time Out AM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time In PM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Time Out PM</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Credited</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Total Hours</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Deduction</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Overtime</th>
                        <th className="px-3 py-3 text-xs font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getDaysArray(selectedMonth, selectedYear).map((day, i) => {
                        const recordIndex = i + 15;
                        const record = formData[recordIndex] || {};
                        return (
                          <tr key={record?.attendance_id ?? `second-${i}`} className={(!record?.attendance_date && day === null) ? 'bg-slate-50' : isSunday(record?.attendance_date) ? 'bg-red-50 text-red-600 font-semibold' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xs font-semibold">{record?.attendance_date ? format(parseYMDToLocalDate(record.attendance_date), 'EEE').toUpperCase() : ''}</span>
                                {record?.attendance_date && hasSchedule(record.attendance_date) && (
                                  <span className="inline-block w-4 h-4 bg-green-600 rounded-full" title="Has schedule" />
                                )}
                              </div>
                            </td>

                            <td className="px-3 py-2 text-center">
                              <input type="text" value={ formatDisplayDate(record?.attendance_date) } readOnly className="w-full text-sm text-center bg-transparent border-none" />
                            </td>

                            {['time_in_morning','time_out_morning','time_in_afternoon','time_out_afternoon'].map((field) => (
                              <td key={field} className="px-3 py-2 text-center">{renderInputField(record, field, recordIndex)}</td>
                            ))}

                            <td className="px-3 py-2 text-center">{record?.days_credited}</td>
                            <td className="px-3 py-2 text-center">{record?.total_rendered_hours}</td>
                            <td className="px-3 py-2 text-center">{record?.deducted_days}</td>
                            <td className="px-3 py-2 text-center">{record?.hours_requested}</td>
                            <td className="px-3 py-2 text-center">
                              <AdminDTRRecordActionDropdown
                                onSave={() => {
                                  if (autosavePending[recordIndex]) { Swal.fire("Info", "Autosave pending — will save automatically shortly.", "info"); return; }
                                  if (savingIndexes[recordIndex]) { Swal.fire("Info", "Save in progress for this row.", "info"); return; }
                                  if (!record?.attendance_date) { Swal.fire("Action Blocked", "No date for this row.", "info"); return; }
                                  handleSave(record, recordIndex, false);
                                }}
                                onClear={() => { if (!record?.attendance_date) { Swal.fire("Action Blocked", "No date for this row.", "info"); return; } handleClear(record, recordIndex); }}
                                onAddOvertime={() => { if (!record?.attendance_date) { Swal.fire("Action Blocked", "No date for this row.", "info"); return; } setOvertimeTarget({ employee_id: record.employee_id, employee_name: record.employee_name, attendance_date: record.attendance_date }); setShowOvertimeModal(true); }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Footer controls duplicated for convenience */}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="contained" onClick={() => setShowFirstHalf(!showFirstHalf)}>{showFirstHalf ? 'Show 2nd Page' : 'Show 1st Page'}</Button>
              <Button color="error" variant="contained" onClick={onClose}>Close</Button>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {/* Overtime modal preserved */}
      {showOvertimeModal && overtimeTarget && (
        <AdminAddOvertimeModal
          employeeId={overtimeTarget.employee_id}
          employeeName={overtimeTarget.employee_name}
          attendanceDate={overtimeTarget.attendance_date}
          onClose={() => setShowOvertimeModal(false)}
          onSaved={() => {
            setShowOvertimeModal(false);
            lastFetchRef.current = { employeeId: null, month: null, year: null };
            fetchAttendanceRecords(data.employee_id);
          }}
        />
      )}
    </>
  );
};

DTR_record.propTypes = {
  data: PropTypes.shape({
    employee_id: PropTypes.string.isRequired,
    employee_name: PropTypes.string.isRequired,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onCreditedDaysChange: PropTypes.func.isRequired,
};

export default DTR_record;



// import { useState, useEffect, useRef } from "react";
// import PropTypes from "prop-types";
// import "../../../../Styles/components/attendance/AttendanceModal.css";
// import { motion } from "framer-motion";
// import Swal from "sweetalert2";
// import BASE_URL from "../../../../backend/server/config";
// import { format } from "date-fns";
// import { CalendarSearch } from 'lucide-react';
// import AdminDTRRecordActionDropdown from "./DTR_record_action_button";
// import AdminAddOvertimeModal from "./DTRAdminOvertimeEntryModal";
// import { useSession } from '../../../context/SessionContext';

// const DTR_record = ({ data, onClose, onCreditedDaysChange }) => {
//   const { user } = useSession();
//   const currentUserFullName = (
//     user?.fullName ||
//     user?.full_name ||
//     ((user?.firstName || user?.first_name || user?.givenName) || "") + (user?.lastName || user?.last_name || user?.familyName ? " " + (user?.lastName || user?.last_name || user?.familyName) : "")
//   ).trim();
//   const currentUserRole = user?.role || user?.user_role || "";

//   const [formData, setFormData] = useState([]);
//   const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
//   const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
//   const [showOvertimeModal, setShowOvertimeModal] = useState(false);
//   const [overtimeTarget, setOvertimeTarget] = useState(null);
//   const [showFirstHalf, setShowFirstHalf] = useState(new Date().getDate() <= 15);
//   const [isLoading, setIsLoading] = useState(false);
//   const [updateAllLoading, setUpdateAllLoading] = useState(false);

//   // AUTOSAVE refs/state
//   // timers for each index -> reset on further typing
//   const autoSaveTimersRef = useRef({});
//   // whether an autosave is pending (waiting 3s) for index
//   const [autosavePending, setAutosavePending] = useState({});
//   // whether saving is in progress for index
//   const [savingIndexes, setSavingIndexes] = useState({});

//   // helper to set savingIndexes safely
//   const setSaving = (index, val) => {
//     setSavingIndexes(prev => ({ ...prev, [index]: !!val }));
//   };
//   const setPending = (index, val) => {
//     setAutosavePending(prev => ({ ...prev, [index]: !!val }));
//   };

//   // --- SCHEDULES HELPERS ---
//   const parseDaysOfWeek = (raw) => {
//     if (!raw) return [];
//     const parts = raw.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
//     const map = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
//     const dow = [];
//     for (const p of parts) {
//       if (/^\d+$/.test(p)) {
//         let n = parseInt(p, 10);
//         if (n === 7) n = 0;
//         if (n >= 0 && n <= 6) dow.push(n);
//       } else {
//         const key = p.toUpperCase().slice(0,3);
//         if (map[key] !== undefined) dow.push(map[key]);
//       }
//     }
//     return Array.from(new Set(dow));
//   };

//   const computeScheduleDatesInMonth = (schedule, month /*0-based*/, year) => {
//     if (!schedule) return [];

//     const month1 = month + 1;
//     const startOfMonth = new Date(year, month, 1);
//     const endOfMonth = new Date(year, month + 1, 0);

//     const eff = schedule.effective_date ? new Date(schedule.effective_date) : null;
//     const endd = schedule.end_date ? new Date(schedule.end_date) : null;

//     const periodStart = eff && eff > startOfMonth ? eff : startOfMonth;
//     const periodEnd = endd && endd < endOfMonth ? endd : endOfMonth;

//     const recurrence = (schedule.recurrence_type || "").toUpperCase();

//     const dates = [];

//     const pushYmd = (d) => {
//       const y = d.getFullYear();
//       const m = String(d.getMonth() + 1).padStart(2, "0");
//       const dd = String(d.getDate()).padStart(2, "0");
//       dates.push(`${y}-${m}-${dd}`);
//     };

//     if (recurrence === "daily" || recurrence === "everyday") {
//       for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
//         pushYmd(new Date(d));
//       }
//       return dates;
//     }

//     const dowList = parseDaysOfWeek(schedule.days_of_week);

//     if (recurrence === "weekly" && dowList.length > 0) {
//       for (let d = new Date(periodStart); d <= periodEnd; d.setDate(d.getDate() + 1)) {
//         if (dowList.includes(d.getDay())) pushYmd(new Date(d));
//       }
//       return dates;
//     }

//     if (eff && eff >= startOfMonth && eff <= endOfMonth) {
//       pushYmd(eff);
//       return dates;
//     }

//     if (dowList.length > 0) {
//       for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
//         if (dowList.includes(d.getDay())) pushYmd(new Date(d));
//       }
//       return dates;
//     }

//     return dates;
//   };

//   const fetchSchedulesForEmployee = async (employeeId, monthZeroBased, year) => {
//     if (!employeeId) return new Set();

//     const tryUrl = `${BASE_URL}/schedule-manager/read-schedule-manager.php?employee_id=${encodeURIComponent(employeeId)}&month=${monthZeroBased + 1}&year=${year}`;
//     try {
//       const resp = await fetch(tryUrl);
//       const json = await resp.json();
//       if (json && json.success && Array.isArray(json.schedules || json.data)) {
//         const list = Array.isArray(json.schedules) ? json.schedules : (Array.isArray(json.data) ? json.data : []);
//         const resultDates = new Set();
//         for (const s of list) {
//           if (s.employee_id && s.employee_id !== employeeId) continue;
//           const schDates = computeScheduleDatesInMonth(s, monthZeroBased, year);
//           schDates.forEach(d => resultDates.add(d));
//         }
//         return resultDates;
//       }
//     } catch (err) {
//       console.warn("fetchSchedulesForEmployee: param fetch failed", err);
//     }

//     try {
//       const allUrl = `${BASE_URL}/schedule-manager/read-schedule-manager.php`;
//       const resp2 = await fetch(allUrl);
//       const json2 = await resp2.json();
//       const listAll = Array.isArray(json2.schedules) ? json2.schedules : (Array.isArray(json2.data) ? json2.data : []);
//       const resultDates = new Set();
//       for (const s of listAll) {
//         if (s.employee_id && s.employee_id !== employeeId) continue;
//         const schDates = computeScheduleDatesInMonth(s, monthZeroBased, year);
//         schDates.forEach(d => resultDates.add(d));
//       }
//       return resultDates;
//     } catch (err) {
//       console.error("fetchSchedulesForEmployee fallback failed", err);
//       return new Set();
//     }
//   };

//   const [attendance, setAttendance] = useState([]);
//   const [scheduleDates, setScheduleDates] = useState(new Set());
//   const fetchControllerRef = useRef(null);
//   const lastFetchRef = useRef({ employeeId: null, month: null, year: null });

//   const localDateYMD = (year, monthZeroBased, day) => {
//     const d = new Date(year, monthZeroBased, day);
//     const y = d.getFullYear();
//     const m = String(d.getMonth() + 1).padStart(2, "0");
//     const dd = String(d.getDate()).padStart(2, "0");
//     return `${y}-${m}-${dd}`;
//   };

//   const parseYMDToLocalDate = (ymd) => {
//     if (!ymd) return null;
//     const parts = String(ymd).split("-");
//     if (parts.length !== 3) return null;
//     const y = Number(parts[0]);
//     const m = Number(parts[1]);
//     const d = Number(parts[2]);
//     if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return null;
//     return new Date(y, m - 1, d);
//   };

//   const formatDisplayDate = (ymd) => {
//     const d = parseYMDToLocalDate(ymd);
//     return d ? format(d, "MMM d, yyyy") : "";
//   };

//   const isSunday = (ymd) => {
//     const d = parseYMDToLocalDate(ymd);
//     if (!d) return false;
//     return d.getDay() === 0;
//   };

//   const calculateTotalCreditedDays = () => {
//     const firstHalfDays = formData.slice(0, 15).reduce((total, record) => {
//       return total + (parseFloat(record?.days_credited) || 0);
//     }, 0);

//     const secondHalfDays = formData.slice(15, 31).reduce((total, record) => {
//       return total + (parseFloat(record?.days_credited) || 0);
//     }, 0);

//     return { firstHalfDays, secondHalfDays };
//   };

//   useEffect(() => {
//     const { firstHalfDays, secondHalfDays } = calculateTotalCreditedDays();
//     onCreditedDaysChange(firstHalfDays, secondHalfDays);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [formData]);

//   useEffect(() => {
//     const employeeId = data?.employee_id;
//     if (!employeeId) return;
//     fetchAttendanceRecords(employeeId);
//     return () => {
//       if (fetchControllerRef.current) {
//         try { fetchControllerRef.current.abort(); } catch (e) {}
//       }
//       // clear all autosave timers on unmount
//       Object.values(autoSaveTimersRef.current || {}).forEach(t => clearTimeout(t));
//       autoSaveTimersRef.current = {};
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [data?.employee_id, selectedMonth, selectedYear]);

//   const buildEmptyMonthArray = (employeeId, employeeName, daysInMonth) => {
//     const arr = [];
//     for (let day = 1; day <= 31; day++) {
//       if (day <= daysInMonth) {
//         const ymd = localDateYMD(selectedYear, selectedMonth, day);
//         arr.push({
//           attendance_id: null,
//           employee_id: employeeId,
//           employee_name: employeeName,
//           attendance_date: ymd,
//           time_in_morning: "",
//           time_out_morning: "",
//           time_in_afternoon: "",
//           time_out_afternoon: "",
//           original_time_in_morning: "",
//           original_time_out_morning: "",
//           original_time_in_afternoon: "",
//           original_time_out_afternoon: "",
//           days_credited: "",
//           total_rendered_hours: "",
//           deducted_days: "",
//           overtime_hours: "",
//           hours_requested: "",
//         });
//       } else {
//         arr.push({
//           attendance_id: null,
//           employee_id: employeeId,
//           employee_name: employeeName,
//           attendance_date: null,
//           time_in_morning: "",
//           time_out_morning: "",
//           time_in_afternoon: "",
//           time_out_afternoon: "",
//           original_time_in_morning: "",
//           original_time_out_morning: "",
//           original_time_in_afternoon: "",
//           original_time_out_afternoon: "",
//           days_credited: "",
//           total_rendered_hours: "",
//           deducted_days: "",
//           overtime_hours: "",
//           hours_requested: "",
//         });
//       }
//     }
//     return arr;
//   };

//   const fetchAttendanceRecords = async (employeeId) => {
//     if (!employeeId) return;

//     const alreadyFetched =
//       lastFetchRef.current.employeeId === employeeId &&
//       lastFetchRef.current.month === selectedMonth &&
//       lastFetchRef.current.year === selectedYear;

//     if (alreadyFetched && !fetchControllerRef.current) return;

//     if (fetchControllerRef.current) {
//       try { fetchControllerRef.current.abort(); } catch (e) {}
//     }
//     const controller = new AbortController();
//     fetchControllerRef.current = controller;

//     const attendanceUrl = `${BASE_URL}/attendance/get_attendance.php?employee_id=${encodeURIComponent(employeeId)}&month=${selectedMonth + 1}&year=${selectedYear}`;
//     const schedulesUrl = `${BASE_URL}/schedule-manager/get_employee_schedules.php?employee_id=${encodeURIComponent(employeeId)}&month=${selectedMonth + 1}&year=${selectedYear}`;

//     try {
//       setIsLoading(true);

//       const [attResp, schedResp] = await Promise.all([
//         fetch(attendanceUrl, { signal: controller.signal }),
//         fetch(schedulesUrl, { signal: controller.signal }).catch(err => null)
//       ]);

//       const attJson = attResp ? await attResp.json() : { success: false, data: [] };

//       if (attJson && attJson.success) {
//         lastFetchRef.current = { employeeId, month: selectedMonth, year: selectedYear };
//       }

//       setAttendance(Array.isArray(attJson?.data) ? attJson.data : []);

//       if (schedResp) {
//         try {
//           const schedJson = await schedResp.json();
//           if (schedJson && schedJson.success && Array.isArray(schedJson.data)) {
//             setScheduleDates(new Set(schedJson.data));
//           } else {
//             setScheduleDates(new Set());
//           }
//         } catch (err) {
//           console.warn("Failed to parse schedules response", err);
//           setScheduleDates(new Set());
//         }
//       } else {
//         setScheduleDates(new Set());
//       }

//       if (attJson.success && Array.isArray(attJson.data)) {
//         const raw = attJson.data;
//         const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
//         const initialData = buildEmptyMonthArray(employeeId, data.employee_name, daysInMonth);

//         for (let i = 0; i < initialData.length; i++) {
//           const entry = initialData[i];
//           if (!entry.attendance_date) continue;
//           const found = raw.find((r) => r.attendance_date === entry.attendance_date);
//           if (found) {
//             initialData[i] = {
//               attendance_id: found.attendance_id ?? null,
//               employee_id: entry.employee_id,
//               employee_name: entry.employee_name,
//               attendance_date: entry.attendance_date,
//               time_in_morning: found.time_in_morning ?? "",
//               time_out_morning: found.time_out_morning ?? "",
//               time_in_afternoon: found.time_in_afternoon ?? "",
//               time_out_afternoon: found.time_out_afternoon ?? "",
//               original_time_in_morning: found.time_in_morning ?? "",
//               original_time_out_morning: found.time_out_morning ?? "",
//               original_time_in_afternoon: found.time_in_afternoon ?? "",
//               original_time_out_afternoon: found.time_out_afternoon ?? "",
//               days_credited: found.days_credited ?? "",
//               total_rendered_hours: found.total_rendered_hours ?? "",
//               deducted_days: found.deducted_days ?? "",
//               overtime_hours: found.overtime_hours ?? "",
//               hours_requested: found.hours_requested ?? ""
//             };
//           }
//         }

//         setFormData(initialData);
//       } else {
//         const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
//         setFormData(buildEmptyMonthArray(employeeId, data.employee_name, daysInMonth));
//       }
//     } catch (error) {
//       if (error.name === "AbortError") {
//         console.log("Fetch aborted for attendance (newer request started).");
//       } else {
//         console.error("Error fetching attendance records:", error);
//         const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
//         setFormData(buildEmptyMonthArray(employeeId, data.employee_name, daysInMonth));
//         setScheduleDates(new Set());
//       }
//     } finally {
//       setIsLoading(false);
//       fetchControllerRef.current = null;
//     }
//   };

//   // handle time input change: store "HH:MM:00" and start/reset autosave 3s timer
//   const handleChange = (index, field, value) => {
//     const record = formData[index];
//     if (!record) return;
//     if (!record.attendance_date) return;

//     const updatedData = [...formData];
//     if (!value) {
//       updatedData[index][field] = "";
//     } else {
//       updatedData[index][field] = value.length === 5 ? `${value}:00` : value;
//     }
//     setFormData(updatedData);

//     // --- autosave behavior ---
//     // clear any previous timer for this index
//     if (autoSaveTimersRef.current[index]) {
//       clearTimeout(autoSaveTimersRef.current[index]);
//       delete autoSaveTimersRef.current[index];
//     }

//     // mark pending
//     setPending(index, true);

//     // set a new timer: 3000ms of inactivity -> autosave
//     autoSaveTimersRef.current[index] = setTimeout(async () => {
//       delete autoSaveTimersRef.current[index];
//       setPending(index, false);
//       await autoSaveIndex(index);
//     }, 3000);
//   };

//   // render input (unchanged)
//   const renderInputField = (record, field, index) => {
//     const isDisabled = !record || !record.attendance_date;
//     let value = record ? record[field] || "" : "";

//     if (value && value.length >= 5) {
//       value = value.slice(0, 5);
//     } else {
//       value = value || "";
//     }

//     return (
//       <input
//         type="time"
//         value={value}
//         onChange={(e) => handleChange(index, field, e.target.value)}
//         className={`border p-2 rounded min-w-[133px] max-w-full ${isDisabled ? 'bg-gray-200 cursor-not-allowed opacity-60' : ''}`}
//         readOnly={isDisabled}
//         disabled={isDisabled}
//       />
//     );
//   };

//   const handleClear = async (record, index) => {
//     if (!record || !record.attendance_date) {
//       Swal.fire("Error", "Invalid record selected.", "error");
//       return;
//     }

//     try {
//       const currentUserFullName = (user && (user.full_name || user.fullName || user.name)) || "";
//       const currentUserRole = (user && (user.role || user.user_role)) || "";

//       let response, result;
//       if (record.attendance_id) {
//         response = await fetch(`${BASE_URL}/attendance/delete_attendance.php?id=${record.attendance_id}`, {
//           method: "DELETE",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             id: record.attendance_id,
//             full_name: currentUserFullName,
//             user_role: currentUserRole
//           })
//         });
//       } else {
//         response = await fetch(`${BASE_URL}/attendance/delete_by_emp_date.php`, {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             employee_id: record.employee_id,
//             attendance_date: record.attendance_date,
//             full_name: currentUserFullName,
//             user_role: currentUserRole
//           })
//         });
//       }

//       result = await response.json();

//       if (result.success) {
//         Swal.fire({
//           icon: "info",
//           title: "Cleared",
//           text: `Attendance cleared for ${record.attendance_date}.`,
//         });

//         const updatedData = [...formData];
//         updatedData[index] = {
//           ...updatedData[index],
//           attendance_id: null,
//           time_in_morning: "",
//           time_out_morning: "",
//           time_in_afternoon: "",
//           time_out_afternoon: "",
//           days_credited: "",
//           deducted_days: "",
//           overtime_hours: "",
//           hours_requested: ""
//         };
//         setFormData(updatedData);
//       } else {
//         Swal.fire({
//           icon: "error",
//           title: "Error",
//           text: result.message || "Failed to clear attendance.",
//         });
//       }
//     } catch (error) {
//       Swal.fire({
//         icon: "error",
//         title: "Error",
//         text: `Error clearing attendance: ${error.message}`,
//       });
//     }
//   };

//   // handleSave supports silent mode (no success Swal) for autosave
//   const handleSave = async (record, index, silent = false) => {
//     if (!record || !record.attendance_date) {
//       if (!silent) Swal.fire("Error!", "Invalid record selected.", "error");
//       return;
//     }

//     // if already saving for this index, skip duplicate
//     if (savingIndexes[index]) {
//       if (!silent) Swal.fire("Info", "Save already in progress for this row.", "info");
//       return;
//     }

//     setSaving(index, true);
//     // clear any pending autosave timer for this index (we're saving now)
//     if (autoSaveTimersRef.current[index]) {
//       clearTimeout(autoSaveTimersRef.current[index]);
//       delete autoSaveTimersRef.current[index];
//       setPending(index, false);
//     }

//     const cleanedRecord = { ...record };
//     ["time_in_morning", "time_out_morning", "time_in_afternoon", "time_out_afternoon"].forEach(field => {
//       const v = String(cleanedRecord[field] || "").trim();
//       if (!v) {
//         cleanedRecord[field] = "00:00:00";
//       } else if (v.length === 5 && v.indexOf(":") === 2) {
//         cleanedRecord[field] = `${v}:00`;
//       } else {
//         cleanedRecord[field] = v;
//       }
//     });

//     cleanedRecord.user_full_name = currentUserFullName;
//     cleanedRecord.user_role = currentUserRole;

//     try {
//       const method = record.attendance_id ? "PUT" : "POST";
//       const url = record.attendance_id
//         ? `${BASE_URL}/attendance/update_attendance.php?id=${record.attendance_id}`
//         : `${BASE_URL}/attendance/create_attendance.php`;

//       const response = await fetch(url, {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(cleanedRecord),
//       });

//       const rawText = await response.text();

//       let result;
//       try {
//         result = JSON.parse(rawText);
//       } catch (parseError) {
//         console.error("❌ JSON parse error:", parseError.message);
//         throw new Error("Server did not return valid JSON. Check PHP errors.");
//       }

//       if (result.success) {
//         if (!silent) {
//           Swal.fire("Success!", `Attendance record for ${record.attendance_date} saved successfully.`, "success");
//         }
//         lastFetchRef.current = { employeeId: null, month: null, year: null };
//         await fetchAttendanceRecords(data.employee_id);
//       } else {
//         if (!silent) {
//           Swal.fire("Oops!", result.message || "Failed to save attendance record.", "error");
//         } else {
//           // when silent and failed, show error toast so user knows autosave failed
//           Swal.fire({ icon: "error", title: "Autosave failed", text: result.message || "Failed to autosave." });
//         }
//       }
//     } catch (error) {
//       console.error("❌ Fetch error:", error);
//       if (!silent) {
//         Swal.fire("Error!", "Error saving record: " + error.message, "error");
//       } else {
//         Swal.fire({ icon: "error", title: "Autosave error", text: error.message });
//       }
//     } finally {
//       setSaving(index, false);
//     }
//   };

//   // autoSave helper called by timer
//   const autoSaveIndex = async (index) => {
//     const record = formData[index];
//     if (!record || !record.attendance_date) return;
//     // mark saving (visual state) and perform silent save
//     setSaving(index, true);
//     try {
//       await handleSave(record, index, true);
//     } finally {
//       setSaving(index, false);
//     }
//   };

//   // rest of component (month/year etc.) unchanged
//   const handleMonthChange = (e) => {
//     const month = parseInt(e.target.value, 10);
//     if (!Number.isNaN(month)) setSelectedMonth(month);
//   };

//   const handleYearChange = (e) => {
//     const year = parseInt(e.target.value, 10);
//     if (!Number.isNaN(year)) setSelectedYear(year);
//   };

//   const currentYearForSelect = new Date().getFullYear();
//   const yearOptions = Array.from({ length: 11 }, (_, i) => currentYearForSelect - 5 + i);

//   const getDaysArray = (month, year) => {
//     const daysInMonth = new Date(year, month + 1, 0).getDate();
//     const daysArray = [];
//     for (let day = 16; day <= 31; day++) {
//       daysArray.push(day <= daysInMonth ? day : null);
//     }
//     return daysArray;
//   };

//   const hasSchedule = (ymd) => {
//     if (!ymd) return false;
//     return scheduleDates instanceof Set ? scheduleDates.has(ymd) : (Array.isArray(scheduleDates) && scheduleDates.includes(ymd));
//   };

//   // existing handleUpdateAllAttendances (kept as-is in your last version)...
//   const handleUpdateAllAttendances = async () => {
//     // confirm action
//     const confirmation = await Swal.fire({
//       title: 'Update attendance for ALL employees?',
//       text: `This will recalculate and update attendance for all employees for ${new Date(selectedYear, selectedMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' })}.\nThis action cannot be undone. Proceed?`,
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonText: 'Yes, update all',
//       cancelButtonText: 'Cancel'
//     });

//     if (!confirmation.isConfirmed) return;

//     setUpdateAllLoading(true);
//     Swal.fire({
//       title: 'Updating all attendance...',
//       text: 'Please wait — recalculating attendances for everyone.',
//       allowOutsideClick: false,
//       didOpen: () => Swal.showLoading()
//     });

//     try {
//       const payload = {
//         month: selectedMonth + 1,
//         year: selectedYear,
//         user_full_name: currentUserFullName,
//         user_role: currentUserRole
//       };

//       const resp = await fetch(`${BASE_URL}/attendance/bulk_update_attendance.php`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(payload)
//       });

//       if (!resp.ok) {
//         const txt = await resp.text().catch(() => '');
//         throw new Error(`Server responded with ${resp.status}${txt ? ': ' + txt : ''}`);
//       }

//       const json = await resp.json().catch(() => ({ success: false, message: 'Invalid JSON from server' }));

//       if (json && json.success) {
//         Swal.close();
//         await Swal.fire('Done', json.message || 'All attendances updated successfully.', 'success');

//         lastFetchRef.current = { employeeId: null, month: null, year: null };
//         try { await fetchAttendanceRecords(data.employee_id); } catch (e) { console.warn(e); }
//         try {
//           const schedSet = await fetchSchedulesForEmployee(data.employee_id, selectedMonth, selectedYear);
//           if (schedSet instanceof Set) setScheduleDates(schedSet);
//           else if (Array.isArray(schedSet)) setScheduleDates(new Set(schedSet));
//           else setScheduleDates(new Set());
//         } catch (e) {
//           console.warn(e);
//           setScheduleDates(new Set());
//         }

//       } else {
//         Swal.close();
//         await Swal.fire('Error', (json && json.message) || 'Failed to update all attendances.', 'error');
//       }
//     } catch (err) {
//       console.error('Bulk update error', err);
//       Swal.close();
//       await Swal.fire('Error', `Bulk update failed: ${err.message}`, 'error');
//     } finally {
//       setUpdateAllLoading(false);
//       try { Swal.close(); } catch (e) {}
//     }
//   };

//   return (
//     <>
//       <motion.div 
//         className="flex items-center justify-center w-full"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//       >
//         <motion.div className="w-full overflow-auto border  bg-gray-300 p-3 rounded-[10px] mx-4 mb-2">
//           <h2 className="mb-4 text-2xl font-semibold">DTR</h2>

//           {/* Month Picker */}
//           <div className="flex flex-row items-center mb-4 gap-x-2">
//             <label className="flex flex-row items-center text-lg font-medium gap-x-2">
//               <CalendarSearch /> Select Month & Year:
//             </label>

//             <select value={selectedMonth} onChange={handleMonthChange} className="border-2 p-2 rounded w-[28vh]">
//               {Array.from({ length: 12 }, (_, i) => (
//                 <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
//               ))}
//             </select>

//             <select value={selectedYear} onChange={handleYearChange} className="border-2 p-2 rounded w-[12vh]">
//               {yearOptions.map(y => (
//                 <option key={y} value={y}>{y}</option>
//               ))}
//             </select>

//             <div className="flex justify-end w-full">  
//               <button
//                 type="button"
//                 onClick={() => setShowFirstHalf(!showFirstHalf)}
//                 className="px-4 py-2 text-white bg-green-600 rounded toggle-btn hover:bg-green-700"
//               >
//                 {showFirstHalf ? "Show 2nd Page" : "Show 1st Page"}
//               </button> 
//             </div> 
//           </div>

//           {isLoading && <div className="mb-2 text-sm text-gray-700">Loading attendance...</div>}

//           <div className="flex flex-col">
//             {/* 1st Half */}
//             {showFirstHalf && (
//               <div>
//                 <h3 className="mb-2 text-lg font-semibold">Days 1-15</h3>
//                 <div className="overflow-x-auto">
//                   <table className="w-full border border-collapse border-gray-300">
//                     <thead>
//                       <tr className="bg-gray-200">
//                         <th className="px-2 py-4 text-center border max-w-[100px]">#</th>
//                         <th className="px-2 py-4 text-center border max-w-[150px]">Date</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time In AM</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time Out AM</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time In PM</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time Out PM</th>
//                         <th className="px-2 py-4 text-center border">Credited</th>
//                         <th className="px-2 py-4 text-center border">Total Rendered Hours</th>
//                         <th className="px-2 py-4 text-center border">Deduction</th>
//                         <th className="px-2 py-4 text-center border">Overtime</th>
//                         <th className="px-2 py-4 text-center border">Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {formData.slice(0, 15).map((record, index) => (
//                         <tr
//                           key={record?.attendance_id ?? `first-${index}`}
//                           className={
//                             (!record?.attendance_date)
//                               ? "bg-gray-50"
//                               : isSunday(record?.attendance_date)
//                               ? "bg-red-100 text-red-500 font-bold"
//                               : index % 2 === 0
//                               ? "bg-gray-100"
//                               : "bg-white"
//                           }
//                         >
//                           <td className="px-2 py-4 text-center border max-w-[100px]">
//                             <div className="flex items-center justify-center gap-x-1">
//                               <span className="font-semibold text-center">{record?.attendance_date ? format(parseYMDToLocalDate(record.attendance_date), 'EEE').toUpperCase() : ''}</span>
//                               {record?.attendance_date && hasSchedule(record.attendance_date) && (
//                                 <span className="inline-block w-5 h-5 bg-green-600 rounded-full" title="Has schedule" />
//                               )}
//                             </div>
//                           </td>
//                           <td className="px-2 py-4 text-center border max-w-[150px]">
//                             <input
//                               type="text"
//                               value={ formatDisplayDate(record?.attendance_date) }
//                               readOnly
//                               className="w-full text-center bg-transparent border-none"
//                             />
//                           </td>

//                           {["time_in_morning", "time_out_morning", "time_in_afternoon", "time_out_afternoon"].map((field) => (
//                             <td key={field} className="px-2 py-4 text-center border">
//                               {renderInputField(record, field, index)}
//                             </td>
//                           ))}

//                           <td className="px-2 py-4 text-center border">{record?.days_credited}</td>
//                           <td className="px-2 py-4 text-center border">{record?.total_rendered_hours}</td>                          
//                           <td className="px-2 py-4 text-center border">{record?.deducted_days}</td>
//                           <td className="px-2 py-4 text-center border">{record?.hours_requested}</td>
//                           <td className="px-2 py-4 text-center border">
//                             <AdminDTRRecordActionDropdown 
//                               onSave={() => {
//                                 // Prevent manual save while autosave pending or saving
//                                 if (autosavePending[index]) {
//                                   Swal.fire("Info", "Autosave pending — will save automatically shortly.", "info");
//                                   return;
//                                 }
//                                 if (savingIndexes[index]) {
//                                   Swal.fire("Info", "Save in progress for this row.", "info");
//                                   return;
//                                 }
//                                 if (!record?.attendance_date) {
//                                   Swal.fire("Action Blocked", "No date for this row.", "info");
//                                   return;
//                                 }
//                                 handleSave(record, index, false);
//                               }}
//                               onClear={() => {
//                                 if (!record?.attendance_date) {
//                                   Swal.fire("Action Blocked", "No date for this row.", "info");
//                                   return;
//                                 }
//                                 handleClear(record, index);
//                               }}
//                               onAddOvertime={() => {
//                                 if (!record?.attendance_date) {
//                                   Swal.fire("Action Blocked", "No date for this row.", "info");
//                                   return;
//                                 }
//                                 setOvertimeTarget({
//                                   employee_id: record.employee_id,
//                                   employee_name: record.employee_name,
//                                   attendance_date: record.attendance_date
//                                 });
//                                 setShowOvertimeModal(true);
//                               }}
//                             />
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

//             {/* 2nd Half */}
//             {!showFirstHalf && (
//               <div>
//                 <h3 className="mb-2 text-lg font-semibold">Days 16-31</h3>
//                 <div className="overflow-x-auto">
//                   <table className="w-full border border-collapse border-gray-300">
//                     <thead>
//                       <tr className="bg-gray-200">
//                         <th className="px-2 py-4 text-center border max-w-[100px]">#</th>
//                         <th className="px-2 py-4 text-center border max-w-[150px]">Date</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time In AM</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time Out AM</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time In PM</th>
//                         <th className="px-2 py-4 text-center border min-w-[150px] max-w-[200px]">Time Out PM</th>
//                         <th className="px-2 py-4 text-center border">Credited</th>
//                         <th className="px-2 py-4 text-center border">Total Rendered Hours</th>

//                         <th className="px-2 py-4 text-center border">Deduction</th>
//                         <th className="px-2 py-4 text-center border">Overtime</th>
//                         <th className="px-2 py-4 text-center border">Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {getDaysArray(selectedMonth, selectedYear).map((day, i) => {
//                         const recordIndex = i + 15; // map to formData index
//                         const record = formData[recordIndex] || {};
//                         return (
//                           <tr
//                             key={record?.attendance_id ?? `second-${i}`}
//                             className={
//                               (!record?.attendance_date && day === null)
//                                 ? "bg-gray-50"
//                                 : isSunday(record?.attendance_date)
//                                 ? "bg-red-100 text-red-500 font-bold"
//                                 : i % 2 === 0
//                                 ? "bg-gray-100"
//                                 : "bg-white"
//                             }
//                           >
//                             <td className="px-2 py-4 text-center border max-w-[100px]">
//                               <div className="flex items-center justify-center gap-x-1">
//                                 <span className="font-semibold text-center">{record?.attendance_date ? format(parseYMDToLocalDate(record.attendance_date), 'EEE').toUpperCase() : ''}</span>
//                                 {record?.attendance_date && hasSchedule(record.attendance_date) && (
//                                   <span className="inline-block w-5 h-5 bg-green-600 rounded-full" title="Has schedule" />
//                                 )}
//                               </div>
//                             </td>
//                             <td className="px-2 py-4 text-center border max-w-[150px]">
//                               <input
//                                 type="text"
//                                 value={ formatDisplayDate(record?.attendance_date) }
//                                 readOnly
//                                 className="w-full text-center bg-transparent border-none"
//                               />
//                             </td>

//                             {["time_in_morning", "time_out_morning", "time_in_afternoon", "time_out_afternoon"].map((field) => (
//                               <td key={field} className="px-2 py-4 text-center border">
//                                 {renderInputField(record, field, recordIndex)}
//                               </td>
//                             ))}

//                             <td className="px-2 py-4 text-center border">{record?.days_credited}</td>
//                             <td className="px-2 py-4 text-center border">{record?.total_rendered_hours}</td>
//                             <td className="px-2 py-4 text-center border">{record?.deducted_days}</td>
//                             <td className="px-2 py-4 text-center border">{record?.hours_requested}</td>
//                             <td className="px-2 py-4 text-center border">
//                               <AdminDTRRecordActionDropdown 
//                                 onSave={() => {
//                                   // Prevent manual save while autosave pending or saving
//                                   if (autosavePending[recordIndex]) {
//                                     Swal.fire("Info", "Autosave pending — will save automatically shortly.", "info");
//                                     return;
//                                   }
//                                   if (savingIndexes[recordIndex]) {
//                                     Swal.fire("Info", "Save in progress for this row.", "info");
//                                     return;
//                                   }
//                                   if (!record?.attendance_date) {
//                                     Swal.fire("Action Blocked", "No date for this row.", "info");
//                                     return;
//                                   }
//                                   handleSave(record, recordIndex, false);
//                                 }}
//                                 onClear={() => {
//                                   if (!record?.attendance_date) {
//                                     Swal.fire("Action Blocked", "No date for this row.", "info");
//                                     return;
//                                   }
//                                   handleClear(record, recordIndex);
//                                 }}
//                                 onAddOvertime={() => {
//                                   if (!record?.attendance_date) {
//                                     Swal.fire("Action Blocked", "No date for this row.", "info");
//                                     return;
//                                   }
//                                   setOvertimeTarget({
//                                     employee_id: record.employee_id,
//                                     employee_name: record.employee_name,
//                                     attendance_date: record.attendance_date
//                                   });
//                                   setShowOvertimeModal(true);
//                                 }}
//                               />
//                             </td>
//                           </tr>
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}
//           </div>

//           <div className="flex justify-end w-full mt-4">
//             <button
//               type="button"
//               onClick={() => setShowFirstHalf(!showFirstHalf)}
//               className="px-4 py-2 mx-1 text-white bg-green-600 rounded toggle-btn hover:bg-green-700"
//             >
//               {showFirstHalf ? "Show 2nd Page" : "Show 1st Page"}
//             </button> 
//             <button
//               type="button"
//               className="py-2 px-2.5 bg-red-500 text-white rounded hover:bg-red-600"
//               onClick={onClose}
//             >
//               Close
//             </button>
//           </div>
//         </motion.div>
//       </motion.div>

//       {showOvertimeModal && overtimeTarget && (
//         <AdminAddOvertimeModal
//           employeeId={overtimeTarget.employee_id}
//           employeeName={overtimeTarget.employee_name}
//           attendanceDate={overtimeTarget.attendance_date}
//           onClose={() => setShowOvertimeModal(false)}
//           onSaved={() => {
//             setShowOvertimeModal(false);
//             lastFetchRef.current = { employeeId: null, month: null, year: null };
//             fetchAttendanceRecords(data.employee_id);
//           }}
//         />
//       )}
//     </>
//   );
// };

// DTR_record.propTypes = {
//   data: PropTypes.shape({
//     employee_id: PropTypes.string.isRequired,
//     employee_name: PropTypes.string.isRequired,
//   }).isRequired,
//   onClose: PropTypes.func.isRequired,
//   onCreditedDaysChange: PropTypes.func.isRequired,
// };

// export default DTR_record;
