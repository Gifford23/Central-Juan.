// AssignScheduleModal.jsx
import React, { useEffect, useState } from "react";
import {
  Modal,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  Switch,
  Button,
  Typography,
  Box,
  FormHelperText,
  IconButton,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

// IMPORTANT: adjust this import path if your project's config file lives elsewhere
import BASE_URL from "../../../../backend/server/config";

const ALL_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAY_TO_JS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export default function AssignScheduleModal({
  open,
  onClose,
  workTimes = [],
  employees = [],
  initialSelectedEmployees = [],
  createSchedule,
  updateSchedule,
  deleteSchedule,
  fetchSchedules,
  sw,
}) {
  // form state
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [workTimeId, setWorkTimeId] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recurrenceType, setRecurrenceType] = useState("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [daysOfWeek, setDaysOfWeek] = useState([]);
  const [occurrenceLimit, setOccurrenceLimit] = useState("");
  const [priority, setPriority] = useState(1);
  const [isActiveAdd, setIsActiveAdd] = useState(true);

  // validation / UI flags
  const [errors, setErrors] = useState({});
  const [inFlight, setInFlight] = useState(false);

  // preview
  const [previewDates, setPreviewDates] = useState([]);

  // conflict UI
  const [conflicts, setConflicts] = useState([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [keptConflictDays, setKeptConflictDays] = useState({});

  // Temporary service fallback state (used only if parent didn't pass data)
  const [serviceWorkTimes, setServiceWorkTimes] = useState([]);
  const [serviceEmployees, setServiceEmployees] = useState([]);
  const [serviceLoading, setServiceLoading] = useState(false);

  // Prefer parent-provided arrays; fallback to service arrays
  const displayWorkTimes = (Array.isArray(workTimes) && workTimes.length > 0)
    ? workTimes
    : serviceWorkTimes;
  const displayEmployees = (Array.isArray(employees) && employees.length > 0)
    ? employees
    : serviceEmployees;

  // ---------------------------
  // 1) Reset when modal closes
  // ---------------------------
  useEffect(() => {
    if (!open) {
      setSelectedEmployees([]);
      setWorkTimeId("");
      setEffectiveDate("");
      setEndDate("");
      setRecurrenceType("none");
      setRecurrenceInterval(1);
      setDaysOfWeek([]);
      setOccurrenceLimit("");
      setPriority(1);
      setIsActiveAdd(true);
      setConflicts([]);
      setShowConflictModal(false);
      setKeptConflictDays({});
      setErrors({});
      setPreviewDates([]);
    }
  }, [open]);

  // ---------------------------------------------------------
  // 2) Prefill selectedEmployees once when modal opens (guarded)
  //    Only set when modal opens and we haven't already set selection
  // ---------------------------------------------------------
  useEffect(() => {
    // We intentionally check selectedEmployees length directly to avoid repeated sets.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (open && Array.isArray(initialSelectedEmployees) && initialSelectedEmployees.length > 0 && selectedEmployees.length === 0) {
      setSelectedEmployees(initialSelectedEmployees);
    }
    // NOTE: we don't include selectedEmployees in deps to avoid re-running; this is intentional.
  }, [open, initialSelectedEmployees]); // guarded with `selectedEmployees.length === 0` inside

  // --------------------------------------------------------------------
  // 3) Fetch fallback service data only when modal opens AND parent didn't supply
  //    Using lengths in deps prevents ref-object churn from retriggering effect
  // --------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;

    const missingWorkTimes = !(Array.isArray(workTimes) && workTimes.length > 0);
    const missingEmployees = !(Array.isArray(employees) && employees.length > 0);

    if (!missingWorkTimes && !missingEmployees) return; // nothing to fetch

    let mounted = true;
    (async () => {
      setServiceLoading(true);
      try {
        if (missingWorkTimes) {
          try {
            const r = await fetch(`${BASE_URL}/work_time/read_work_time.php`);
            const data = await r.json();
            if (!mounted) return;
            if (Array.isArray(data)) setServiceWorkTimes(data);
            else if (data && Array.isArray(data.data)) setServiceWorkTimes(data.data);
            else setServiceWorkTimes([]);
            console.log("AssignModal: loaded workTimes from service", data);
          } catch (err) {
            console.error("AssignModal: failed to fetch workTimes", err);
            if (mounted) setServiceWorkTimes([]);
            if (sw) sw({ title: "Error", text: "Failed to load shifts from service.", icon: "error" });
          }
        }

        if (missingEmployees) {
          try {
            const r2 = await fetch(`${BASE_URL}/employeesSide/employees.php`);
            const data2 = await r2.json();
            if (!mounted) return;
            if (Array.isArray(data2)) setServiceEmployees(data2);
            else if (data2 && Array.isArray(data2.data)) setServiceEmployees(data2.data);
            else setServiceEmployees([]);
            console.log("AssignModal: loaded employees from service", data2);
          } catch (err) {
            console.error("AssignModal: failed to fetch employees", err);
            if (mounted) setServiceEmployees([]);
            if (sw) sw({ title: "Error", text: "Failed to load employees from service.", icon: "error" });
          }
        }
      } finally {
        if (mounted) setServiceLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // we only depend on "open" and the lengths of parent arrays to avoid ref churn loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (workTimes || []).length, (employees || []).length]);

  // build keptConflictDays map when conflicts change
  useEffect(() => {
    const map = {};
    conflicts.forEach((c) => {
      const list = (c.conflicting_days || "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      map[c.schedule_id] = new Set(list);
    });
    setKeptConflictDays(map);
  }, [conflicts]);

  // Derived booleans
  const isOneTime = recurrenceType === "none";
  const isDaily = recurrenceType === "daily";
  const isWeekly = recurrenceType === "weekly";
  const isMonthly = recurrenceType === "monthly";

  const disableRecurrenceInterval = isOneTime;
  const disableOccurrenceLimit = isOneTime;
  const disableEndDate = isOneTime;

  const canSubmit =
    selectedEmployees && selectedEmployees.length > 0 && !!workTimeId && !!effectiveDate && !inFlight;

  // Prefill default workTime if single employee selected and the employee has default_work_time_id
  useEffect(() => {
    if (selectedEmployees.length === 1) {
      const emp = displayEmployees.find((e) => e.employee_id === selectedEmployees[0]);
      if (emp?.default_work_time_id) {
        setWorkTimeId(String(emp.default_work_time_id));
      }
    }
    // do not auto-change when multiple selected
  }, [selectedEmployees, displayEmployees]);

  const toggleAddDay = (day) => {
    setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };
  const selectAllWeekdays = () => setDaysOfWeek([...ALL_WEEKDAYS]);
  const clearWeekdays = () => setDaysOfWeek([]);

  // ---------- preview generator ----------
  function formatDateISO(d) {
    if (!(d instanceof Date)) d = new Date(d);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }

  function generateOccurrences({
    effectiveDate,
    recurrenceType,
    interval = 1,
    daysOfWeek = null,
    occurrenceLimit = null,
    endDate = null,
    maxCount = 5,
  }) {
    const out = [];
    if (!effectiveDate) return out;
    const start = new Date(effectiveDate + "T00:00:00");
    const stopDate = endDate ? new Date(endDate + "T23:59:59") : null;
    const maxIterations = 10000;

    if (recurrenceType === "none") {
      if (stopDate && start > stopDate) return [];
      if (occurrenceLimit !== null && occurrenceLimit <= 0) return [];
      return [start];
    }

    let iterDate = new Date(start);
    let iterations = 0;
    let occurrencesSeen = 0;

    while (out.length < maxCount && iterations < maxIterations) {
      iterations += 1;
      if (stopDate && iterDate > stopDate) break;
      if (occurrenceLimit !== null && occurrencesSeen >= occurrenceLimit) break;

      if (recurrenceType === "daily") {
        const daysDiff = Math.floor((iterDate - start) / (1000 * 60 * 60 * 24));
        if (daysDiff % interval === 0 && daysDiff >= 0) {
          out.push(new Date(iterDate));
          occurrencesSeen += 1;
        }
        iterDate.setDate(iterDate.getDate() + 1);
      } else if (recurrenceType === "weekly") {
        const daysDiff = Math.floor((iterDate - start) / (1000 * 60 * 60 * 24));
        const weekIndex = Math.floor(daysDiff / 7);
        const weekdayToken = Object.keys(WEEKDAY_TO_JS).find((k) => WEEKDAY_TO_JS[k] === iterDate.getDay());
        const dayMatches = !daysOfWeek || daysOfWeek.length === 0 ? true : daysOfWeek.includes(weekdayToken);
        if (dayMatches && weekIndex % interval === 0 && daysDiff >= 0) {
          out.push(new Date(iterDate));
          occurrencesSeen += 1;
        }
        iterDate.setDate(iterDate.getDate() + 1);
      } else if (recurrenceType === "monthly") {
        break;
      }
    }

    if (recurrenceType === "monthly") {
      const startDay = start.getDate();
      let monthsAdded = 0;
      let occurrencesSeenLocal = 0;
      while (out.length < maxCount) {
        const candidate = new Date(start);
        candidate.setMonth(candidate.getMonth() + monthsAdded * interval);
        const y = candidate.getFullYear();
        const m = candidate.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        const dayToSet = Math.min(startDay, lastDay);
        candidate.setDate(dayToSet);

        if (candidate >= start) {
          if (stopDate && candidate > stopDate) break;
          if (occurrenceLimit !== null && occurrencesSeenLocal >= occurrenceLimit) break;
          out.push(candidate);
          occurrencesSeenLocal += 1;
        }
        monthsAdded += 1;
        if (monthsAdded > 1200) break;
      }
    }

    if (occurrenceLimit !== null) {
      return out.slice(0, occurrenceLimit);
    }
    return out;
  }

  function computePreview(previewCount = 5) {
    if (!effectiveDate) {
      setPreviewDates([]);
      return;
    }
    try {
      const occurrences = generateOccurrences({
        effectiveDate,
        recurrenceType,
        interval: Number(recurrenceInterval) || 1,
        daysOfWeek: isWeekly ? daysOfWeek : null,
        occurrenceLimit: occurrenceLimit !== "" ? Number(occurrenceLimit) : null,
        endDate: endDate || null,
        maxCount: previewCount,
      });
      setPreviewDates(occurrences.map((d) => formatDateISO(d)));
    } catch (err) {
      console.error("preview compute error", err);
      setPreviewDates([]);
    }
  }

  const refreshPreview = () => computePreview();

  // ---------- Add schedule ----------
  const handleAddSchedule = async () => {
    const localErrors = {};
    if (!selectedEmployees || selectedEmployees.length === 0) localErrors.selectedEmployees = "Select at least one employee.";
    if (!workTimeId) localErrors.workTimeId = "Select a shift (work time).";
    if (!effectiveDate) localErrors.effectiveDate = "Select an effective date.";
    if (endDate && effectiveDate && new Date(endDate) < new Date(effectiveDate)) localErrors.endDate = "End date must be on or after Effective Date.";
    if (occurrenceLimit !== "" && Number(occurrenceLimit) <= 0) localErrors.occurrenceLimit = "Must be 1 or greater.";
    if (recurrenceInterval <= 0) localErrors.recurrenceInterval = "Must be 1 or greater.";

    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) {
      await sw({ title: "Error", text: "Fix validation errors before submitting.", icon: "error" });
      return;
    }

    setInFlight(true);
    try {
      for (let emp_id of selectedEmployees) {
        let days_field = null;
        if (recurrenceType === "weekly") {
          days_field = daysOfWeek.length ? daysOfWeek.join(",") : null;
        }

        const payload = {
          employee_id: emp_id,
          work_time_id: Number(workTimeId) || null,
          effective_date: effectiveDate,
          end_date: endDate || null,
          recurrence_type: recurrenceType,
          recurrence_interval: Number(recurrenceInterval) || 1,
          days_of_week: days_field,
          occurrence_limit: occurrenceLimit !== "" ? Number(occurrenceLimit) : null,
          priority: Number(priority) || 1,
          is_active: isActiveAdd ? 1 : 0,
        };

        try {
          const res = await createSchedule(payload);
          if (!res.success && res.conflicts) {
            const emp = displayEmployees.find((e) => e.employee_id === emp_id);
            setConflicts(
              res.conflicts.map((c) => ({
                ...c,
                newData: payload,
                employeeName: emp ? `${emp.first_name} ${emp.last_name}` : emp_id,
              }))
            );
            setShowConflictModal(true);
          } else if (res.success) {
            await sw({ title: "Saved", text: "Schedule added successfully", icon: "success" });
            fetchSchedules();
            onClose();
          } else {
            await sw({ title: "Error", text: res.message || "Failed to add schedule", icon: "error" });
          }
        } catch (err) {
          console.error(err);
          await sw({ title: "Error", text: "Network or server error", icon: "error" });
        }
      }
    } finally {
      setInFlight(false);
    }
  };

  // ---------- Conflict helpers ----------
  const toggleConflictDay = (scheduleId, day) => {
    setKeptConflictDays((prev) => {
      const copy = { ...prev };
      const setFor = new Set(copy[scheduleId] ? Array.from(copy[schedule_id]) : []);
      if (setFor.has(day)) setFor.delete(day);
      else setFor.add(day);
      copy[scheduleId] = setFor;
      return copy;
    });
  };

  const removeSelectedConflictingDays = async (conflict) => {
    const scheduleId = conflict.schedule_id;
    const conflictDaysArr = (conflict.conflicting_days || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const keptSet = keptConflictDays[scheduleId] || new Set(conflictDaysArr);
    const daysToRemove = conflictDaysArr.filter((d) => !keptSet.has(d));

    if (daysToRemove.length === 0) {
      await sw({ title: "No change", text: "No conflicting days were selected for removal.", icon: "info" });
      return;
    }

    const confirmed = await sw({
      title: "Remove selected days?",
      text: `Remove ${daysToRemove.join(", ")} from existing schedule?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove",
      cancelButtonText: "Cancel",
    });
    if (!confirmed.isConfirmed) return;

    const existingDaysArr =
      conflict.days_of_week && String(conflict.days_of_week).trim() !== ""
        ? conflict.days_of_week.split(",").map((d) => d.trim()).filter(Boolean)
        : [...ALL_WEEKDAYS];
    const newExistingDays = existingDaysArr.filter((d) => !daysToRemove.includes(d));

    if (newExistingDays.length === 0) {
      const choice = await sw({
        title: "No days left on existing schedule",
        text: "After removing selected days the existing schedule will have no weekdays. Deactivate or Delete the existing schedule?",
        icon: "warning",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Deactivate (keep record)",
        denyButtonText: "Delete schedule",
        cancelButtonText: "Cancel",
      });
      if (choice.isDismissed) return;

      if (choice.isConfirmed) {
        const upd = { schedule_id: scheduleId, days_of_week: null, is_active: 0 };
        const updRes = await updateSchedule(upd);
        if (!updRes || !updRes.success) {
          await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule.", icon: "error" });
          return;
        }
        const createRes = await createSchedule(conflict.newData);
        if (createRes && createRes.success) {
          await sw({ title: "Done", text: "Existing schedule deactivated and new schedule added.", icon: "success" });
          setConflicts((prev) => prev.filter((c) => c.schedule_id !== scheduleId));
          fetchSchedules();
          setShowConflictModal(false);
          onClose();
          return;
        }
        if (createRes && createRes.conflicts) {
          await sw({ title: "Partial", text: createRes.message || "Updated existing schedule but new schedule still conflicts.", icon: "warning" });
          setConflicts(createRes.conflicts.map((c) => ({ ...c, newData: conflict.newData })));
          setShowConflictModal(true);
          return;
        }
        await sw({ title: "Error", text: createRes?.message || "New schedule creation failed.", icon: "error" });
        return;
      }

      if (choice.isDenied) {
        const delRes = await deleteSchedule(scheduleId);
        if (!delRes || !delRes.success) {
          await sw({ title: "Error", text: delRes?.message || "Failed to delete existing schedule.", icon: "error" });
          return;
        }
        const createRes = await createSchedule(conflict.newData);
        if (createRes && createRes.success) {
          await sw({ title: "Done", text: "Existing schedule deleted and new schedule added.", icon: "success" });
          setConflicts((prev) => prev.filter((c) => c.schedule_id !== scheduleId));
          fetchSchedules();
          setShowConflictModal(false);
          onClose();
          return;
        }
        if (createRes && createRes.conflicts) {
          await sw({ title: "Partial", text: createRes.message || "Deleted existing schedule but new schedule still conflicts.", icon: "warning" });
          setConflicts(createRes.conflicts.map((c) => ({ ...c, newData: conflict.newData })));
          setShowConflictModal(true);
          return;
        }
        await sw({ title: "Error", text: createRes?.message || "New schedule creation failed.", icon: "error" });
        return;
      }
    }

    const newDaysString = newExistingDays.join(",");
    const updRes = await updateSchedule({ schedule_id: scheduleId, days_of_week: newDaysString });
    if (!updRes || !updRes.success) {
      await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule days.", icon: "error" });
      return;
    }

    const createRes = await createSchedule(conflict.newData);
    if (createRes && createRes.success) {
      await sw({ title: "Done", text: "Existing schedule updated and new schedule added.", icon: "success" });
      setConflicts((prev) => prev.filter((c) => c.schedule_id !== scheduleId));
      fetchSchedules();
      setShowConflictModal(false);
      onClose();
      return;
    }
    if (createRes && createRes.conflicts) {
      await sw({ title: "Partial", text: createRes.message || "Existing schedule updated but new schedule still conflicts.", icon: "warning" });
      setConflicts(createRes.conflicts.map((c) => ({ ...c, newData: conflict.newData })));
      setShowConflictModal(true);
      return;
    }
    await sw({ title: "Error", text: createRes?.message || "Failed to create new schedule after update.", icon: "error" });
  };

  async function handleResolveKeep(conflict) {
    await sw({ title: "Kept", text: "Existing schedule was kept", icon: "info" });
    setShowConflictModal(false);
  }
  async function handleResolveReplace(conflict) {
    await deleteSchedule(conflict.schedule_id);
    const res = await createSchedule(conflict.newData);
    if (res.success) {
      await sw({ title: "Replaced", text: "Schedule replaced successfully", icon: "success" });
      fetchSchedules();
      setShowConflictModal(false);
      onClose();
    } else {
      await sw({ title: "Error", text: res?.message || "Failed to replace schedule", icon: "error" });
      if (res && res.conflicts) setConflicts(res.conflicts.map((c) => ({ ...c, newData: conflict.newData })));
    }
  }
  async function handleResolveKeepBoth(conflict) {
    const newData = { ...conflict.newData, priority: (conflict.priority || 0) + 1 };
    const res = await createSchedule(newData);
    if (res.success) {
      await sw({ title: "Added", text: "New schedule added with higher priority", icon: "success" });
      fetchSchedules();
      setShowConflictModal(false);
      onClose();
    } else {
      await sw({ title: "Error", text: res?.message || "Failed to add schedule", icon: "error" });
      if (res && res.conflicts) setConflicts(res.conflicts.map((c) => ({ ...c, newData })));
    }
  }

  function isRemoveButtonDisabled(conflict) {
    const scheduleId = conflict.schedule_id;
    const conflictDaysArr = (conflict.conflicting_days || "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    const keptSet = keptConflictDays[scheduleId] || new Set(conflictDaysArr);
    const daysToRemove = conflictDaysArr.filter((d) => !keptSet.has(d));
    return daysToRemove.length === 0;
  }

  // ---------- Render ----------
  return (
    <>
      <Modal open={open} onClose={onClose}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow w-11/12 md:w-2/3 max-h-[90vh] overflow-y-auto">
          <Typography variant="h6" className="mb-4">Assign Schedule to Employee</Typography>

          {(serviceLoading && (!displayWorkTimes.length || !displayEmployees.length)) && (
            <div className="mb-4 text-sm text-gray-600">Loading data from service...</div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="col-span-full">
              <Typography variant="subtitle2" className="mb-2">Employees</Typography>
              <Select
                multiple
                value={selectedEmployees}
                onChange={(e) => setSelectedEmployees(e.target.value)}
                displayEmpty
                fullWidth
              >
                {displayEmployees.map((emp) => (
                  <MenuItem key={emp.employee_id} value={emp.employee_id}>
                    {emp.first_name} {emp.last_name}
                  </MenuItem>
                ))}
              </Select>
              {errors.selectedEmployees && <FormHelperText error>{errors.selectedEmployees}</FormHelperText>}
              {selectedEmployees.length > 1 && <FormHelperText>Applying same schedule to {selectedEmployees.length} employees.</FormHelperText>}
            </div>

            <div>
              <Typography variant="subtitle2" className="mb-2">Shift</Typography>
              <Select
                value={workTimeId}
                onChange={(e) => setWorkTimeId(String(e.target.value))}
                fullWidth
                displayEmpty
              >
                <MenuItem value="">-- Select Shift --</MenuItem>
                {displayWorkTimes.map((wt) => (
                  <MenuItem key={wt.id ?? wt.work_time_id ?? wt.shift_id} value={String(wt.id ?? wt.work_time_id ?? wt.shift_id)}>
                    {wt.shift_name} ({wt.start_time} - {wt.end_time})
                  </MenuItem>
                ))}
              </Select>
              {errors.workTimeId && <FormHelperText error>{errors.workTimeId}</FormHelperText>}
            </div>

            <div>
              <TextField
                type="date"
                label="Effective Date"
                value={effectiveDate}
                onChange={(e) => {
                  setEffectiveDate(e.target.value);
                  setTimeout(() => computePreview(), 0);
                }}
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={!!errors.effectiveDate}
                helperText={errors.effectiveDate}
              />
            </div>

            <div>
              <TextField
                type="date"
                label="End Date (Optional)"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                disabled={disableEndDate}
                error={!!errors.endDate}
                helperText={errors.endDate || (disableEndDate ? "Disabled for one-time schedules." : "")}
              />
            </div>

            <div>
              <Typography variant="subtitle2" className="mb-1">Recurrence</Typography>
              <Select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)} fullWidth>
                <MenuItem value="none">None (one-time)</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </div>

            <div>
              <TextField
                type="number"
                label={
                  recurrenceType === "daily"
                    ? "Every X days"
                    : recurrenceType === "weekly"
                      ? "Every X weeks"
                      : recurrenceType === "monthly"
                        ? "Every X months"
                        : "Recurrence Interval"
                }
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value || 1)))}
                inputProps={{ min: 1 }}
                fullWidth
                disabled={disableRecurrenceInterval}
                error={!!errors.recurrenceInterval}
                helperText={errors.recurrenceInterval || (isDaily ? "Daily recurrence ignores weekdays." : "")}
              />
            </div>

            {isWeekly ? (
              <div className="col-span-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-700">Select weekdays (leave all unchecked = applies to all days)</div>
                  <div>
                    <Button size="small" onClick={selectAllWeekdays}>Select all</Button>
                    <Button size="small" onClick={clearWeekdays}>Clear</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_WEEKDAYS.map((d) => (
                    <FormControlLabel
                      key={d}
                      control={<Checkbox checked={daysOfWeek.includes(d)} onChange={() => toggleAddDay(d)} />}
                      label={d}
                    />
                  ))}
                </div>
                <FormHelperText>If you leave all weekdays unchecked, the schedule will apply to <strong>all weekdays</strong> (saved as NULL in DB).</FormHelperText>
              </div>
            ) : (
              <div className="text-sm text-gray-600 col-span-full">
                {recurrenceType === "daily"
                  ? "Daily recurrence ignores weekdays. Use the interval to repeat every X days."
                  : recurrenceType === "monthly"
                    ? "Monthly recurrence repeats on the same day-of-month as Effective Date (e.g. 15th every X months)."
                    : "One-time schedule applies only on Effective Date."}
              </div>
            )}

            <div>
              <TextField
                type="number"
                label="Occurrence Limit (optional)"
                value={occurrenceLimit}
                onChange={(e) => setOccurrenceLimit(e.target.value)}
                fullWidth
                disabled={disableOccurrenceLimit}
                error={!!errors.occurrenceLimit}
                helperText={errors.occurrenceLimit || (occurrenceLimit ? "Stops after this many occurrences." : "")}
              />
            </div>

            <div>
              <TextField
                type="number"
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(Math.max(1, Number(e.target.value || 1)))}
                fullWidth
              />
              <FormHelperText>Higher priority overrides lower priority on conflicts.</FormHelperText>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isActiveAdd} onChange={() => setIsActiveAdd((p) => !p)} />
              <span>Active</span>
            </div>

            {/* Preview */}
            <div className="col-span-full">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle2">Preview (first 5 occurrences)</Typography>
                <IconButton size="small" onClick={refreshPreview} title="Refresh preview"><RefreshIcon fontSize="small" /></IconButton>
              </div>
              <Box className="p-3 mt-2 border rounded bg-gray-50">
                {effectiveDate ? (
                  previewDates.length > 0 ? (
                    <ul className="pl-5 list-disc">
                      {previewDates.map((d) => <li key={d}><code>{d}</code></li>)}
                    </ul>
                  ) : (
                    <div className="text-sm text-gray-600">No occurrences (check Effective Date / End Date / limits).</div>
                  )
                ) : (
                  <div className="text-sm text-gray-600">Select Effective Date to preview occurrences.</div>
                )}
                <FormHelperText>
                  {endDate || occurrenceLimit ? `Stops on earlier of End Date or after ${occurrenceLimit || "∞"} occurrences.` : "No stop set — schedule continues indefinitely."}
                </FormHelperText>
              </Box>
            </div>

            <div className="flex gap-2 mt-4 col-span-full">
              <Button
                variant="contained"
                onClick={handleAddSchedule}
                disabled={!canSubmit || Object.keys(errors).length > 0}
              >
                {inFlight ? "Saving..." : (recurrenceType === "none" ? "Add One-time Schedule" : "Add Schedule")}
              </Button>
              <Button variant="outlined" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Conflict modal */}
      <Modal open={showConflictModal} onClose={() => setShowConflictModal(false)}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow w-11/12 md:w-2/3 max-h-[90vh] overflow-y-auto">
          <Typography variant="h6" className="mb-4">Shift Schedule Conflict Detected</Typography>

          <div className="space-y-4">
            {conflicts.map((c, i) => (
              <div key={i} className="p-4 border rounded-lg shadow-sm">
                <Typography variant="subtitle1" className="mb-2 font-bold">{c.employeeName}</Typography>

                <div className="grid grid-cols-2 gap-2 p-3 mb-3 border rounded md:grid-cols-4 bg-gray-50">
                  <div><p className="text-sm">Shift</p><p className="font-semibold">{c.shift_name}</p></div>
                  <div><p className="text-sm">Time</p><p className="font-semibold">{c.start_time} - {c.end_time}</p></div>
                  <div><p className="text-sm">Days</p><p className="font-semibold">{c.days_of_week || 'All'}</p></div>
                  <div><p className="text-sm">Priority</p><p className="font-semibold">{c.priority}</p></div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 mb-3 border rounded md:grid-cols-4 bg-green-50">
                  <div><p className="text-sm">New Shift</p><p className="font-semibold">{(displayWorkTimes.find(wt => String(wt.id) === String(c.newData.work_time_id)) || {}).shift_name || '—'}</p></div>
                  <div><p className="text-sm">Time</p><p className="font-semibold">{(displayWorkTimes.find(wt => String(wt.id) === String(c.newData.work_time_id)) || {}).start_time || '-'} - {(displayWorkTimes.find(wt => String(wt.id) === String(c.newData.work_time_id)) || {}).end_time || '-'}</p></div>
                  <div><p className="text-sm">Days</p><p className="font-semibold">{c.newData.days_of_week || 'All'}</p></div>
                  <div><p className="text-sm">Priority</p><p className="font-semibold">{c.newData.priority}</p></div>
                </div>

                <div className="p-3 mt-3 border rounded bg-yellow-50">
                  <p className="mb-2 text-sm">Conflicting days — uncheck days to remove them from existing schedule</p>
                  <div className="flex flex-wrap gap-2">
                    {(c.conflicting_days || "").split(",").map(dayRaw => {
                      const day = dayRaw.trim(); if (!day) return null;
                      const isChecked = keptConflictDays[c.schedule_id] ? keptConflictDays[c.schedule_id].has(day) : true;
                      return (<FormControlLabel key={day} control={<Checkbox checked={isChecked} onChange={() => toggleConflictDay(c.schedule_id, day)} />} label={day} />);
                    })}
                  </div>
                  <div className="mt-3">
                    <Button
                      variant="contained"
                      color="warning"
                      onClick={() => removeSelectedConflictingDays(c)}
                      disabled={isRemoveButtonDisabled(c)}
                    >
                      Remove Selected Conflicting Days & Add New Schedule
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-3 md:flex-row">
                  <Button variant="contained" onClick={() => handleResolveKeep(c)} fullWidth>Keep Existing</Button>
                  <Button variant="contained" color="secondary" onClick={() => handleResolveReplace(c)} fullWidth>Replace Existing</Button>
                  <Button variant="contained" color="success" onClick={() => handleResolveKeepBoth(c)} fullWidth>Keep Both</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6"><Button variant="text" onClick={() => setShowConflictModal(false)}>Close</Button></div>
        </div>
      </Modal>
    </>
  );
}



// // AssignScheduleModal.jsx
// import React, { useEffect, useState } from "react";
// import {
//   Modal,
//   Select,
//   MenuItem,
//   Checkbox,
//   FormControlLabel,
//   TextField,
//   Switch,
//   Button,
//   Typography,
//   Box,
// } from "@mui/material";

// const ALL_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// export default function AssignScheduleModal({
//   open,
//   onClose,
//   workTimes = [],
//   employees = [],
//   createSchedule,
//   updateSchedule,
//   deleteSchedule,
//   fetchSchedules,
//   sw, // SweetAlert helper passed from parent
// }) {
//   // Add form state
//   const [selectedEmployees, setSelectedEmployees] = useState([]);
//   const [workTimeId, setWorkTimeId] = useState("");
//   const [effectiveDate, setEffectiveDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [recurrenceType, setRecurrenceType] = useState("none");
//   const [recurrenceInterval, setRecurrenceInterval] = useState(1);
//   const [daysOfWeek, setDaysOfWeek] = useState([]); // only for weekly
//   const [occurrenceLimit, setOccurrenceLimit] = useState("");
//   const [priority, setPriority] = useState(1);
//   const [isActiveAdd, setIsActiveAdd] = useState(true);

//   // conflict modal state
//   const [conflicts, setConflicts] = useState([]);
//   const [showConflictModal, setShowConflictModal] = useState(false);
//   const [keptConflictDays, setKeptConflictDays] = useState({});

//   useEffect(() => {
//     if (!open) {
//       // reset form when closed
//       setSelectedEmployees([]);
//       setWorkTimeId("");
//       setEffectiveDate("");
//       setEndDate("");
//       setRecurrenceType("none");
//       setRecurrenceInterval(1);
//       setDaysOfWeek([]);
//       setOccurrenceLimit("");
//       setPriority(1);
//       setIsActiveAdd(true);
//       setConflicts([]);
//       setShowConflictModal(false);
//       setKeptConflictDays({});
//     }
//   }, [open]);

//   useEffect(() => {
//     const map = {};
//     conflicts.forEach((c) => {
//       const list = (c.conflicting_days || "")
//         .split(",")
//         .map((d) => d.trim())
//         .filter(Boolean);
//       map[c.schedule_id] = new Set(list);
//     });
//     setKeptConflictDays(map);
//   }, [conflicts]);

//   const toggleAddDay = (day) => {
//     setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
//   };

//   const handleAddSchedule = async () => {
//     if (!selectedEmployees || selectedEmployees.length === 0) {
//       await sw({ title: "Error", text: "Select at least one employee", icon: "error" });
//       return;
//     }
//     if (!workTimeId) {
//       await sw({ title: "Error", text: "Select a shift (work time)", icon: "error" });
//       return;
//     }
//     if (!effectiveDate) {
//       await sw({ title: "Error", text: "Select an effective date", icon: "error" });
//       return;
//     }

//     for (let emp_id of selectedEmployees) {
//       let days_field = null;
//       if (recurrenceType === "weekly") {
//         days_field = daysOfWeek.length ? daysOfWeek.join(",") : null;
//       }

//       const payload = {
//         employee_id: emp_id,
//         work_time_id: Number(workTimeId) || null,
//         effective_date: effectiveDate,
//         end_date: endDate || null,
//         recurrence_type: recurrenceType,
//         recurrence_interval: Number(recurrenceInterval) || 1,
//         days_of_week: days_field,
//         occurrence_limit: occurrenceLimit !== "" ? Number(occurrenceLimit) : null,
//         priority: Number(priority) || 1,
//         is_active: isActiveAdd ? 1 : 0,
//       };

//       try {
//         const res = await createSchedule(payload);
//         if (!res.success && res.conflicts) {
//           // attach readable employeeName for UI (fallback to id)
//           const emp = employees.find(e => e.employee_id === emp_id);
//           setConflicts(res.conflicts.map((c) => ({
//             ...c,
//             newData: payload,
//             employeeName: emp ? `${emp.first_name} ${emp.last_name}` : emp_id,
//           })));
//           setShowConflictModal(true);
//         } else if (res.success) {
//           await sw({ title: "Saved", text: "Schedule added successfully", icon: "success" });
//           fetchSchedules();
//           onClose();
//         } else {
//           await sw({ title: "Error", text: res.message || "Failed to add schedule", icon: "error" });
//         }
//       } catch (err) {
//         console.error(err);
//         await sw({ title: "Error", text: "Network or server error", icon: "error" });
//       }
//     }
//   };

//   // ----------------- Conflict helpers -----------------
//   const toggleConflictDay = (scheduleId, day) => {
//     setKeptConflictDays(prev => {
//       const copy = { ...prev };
//       const setFor = new Set(copy[scheduleId] ? Array.from(copy[scheduleId]) : []);
//       if (setFor.has(day)) setFor.delete(day); else setFor.add(day);
//       copy[scheduleId] = setFor;
//       return copy;
//     });
//   };

//   const removeSelectedConflictingDays = async (conflict) => {
//     const scheduleId = conflict.schedule_id;
//     const conflictDaysArr = (conflict.conflicting_days || "").split(",").map(d => d.trim()).filter(Boolean);
//     const keptSet = keptConflictDays[scheduleId] || new Set(conflictDaysArr);
//     const daysToRemove = conflictDaysArr.filter(d => !keptSet.has(d));

//     if (daysToRemove.length === 0) {
//       await sw({ title: "No change", text: "No conflicting days were selected for removal.", icon: "info" });
//       return;
//     }

//     const confirmed = await sw({
//       title: "Remove selected days?",
//       text: `Remove ${daysToRemove.join(", ")} from existing schedule?`,
//       icon: "warning",
//       showCancelButton: true,
//       confirmButtonText: "Yes, remove",
//       cancelButtonText: "Cancel",
//     });
//     if (!confirmed.isConfirmed) return;

//     const existingDaysArr = conflict.days_of_week && String(conflict.days_of_week).trim() !== "" ? conflict.days_of_week.split(",").map(d => d.trim()).filter(Boolean) : [...ALL_WEEKDAYS];
//     const newExistingDays = existingDaysArr.filter(d => !daysToRemove.includes(d));

//     if (newExistingDays.length === 0) {
//       const choice = await sw({
//         title: "No days left on existing schedule",
//         text: "After removing selected days the existing schedule will have no weekdays. Deactivate or Delete the existing schedule?",
//         icon: "warning",
//         showCancelButton: true,
//         showDenyButton: true,
//         confirmButtonText: "Deactivate (keep record)",
//         denyButtonText: "Delete schedule",
//         cancelButtonText: "Cancel",
//       });
//       if (choice.isDismissed) return;

//       if (choice.isConfirmed) {
//         const upd = { schedule_id: scheduleId, days_of_week: null, is_active: 0 };
//         const updRes = await updateSchedule(upd);
//         if (!updRes || !updRes.success) { await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule.", icon: "error" }); return; }
//         const createRes = await createSchedule(conflict.newData);
//         if (createRes && createRes.success) { await sw({ title: "Done", text: "Existing schedule deactivated and new schedule added.", icon: "success" }); setConflicts(prev => prev.filter(c => c.schedule_id !== scheduleId)); fetchSchedules(); setShowConflictModal(false); onClose(); return; }
//         if (createRes && createRes.conflicts) { await sw({ title: "Partial", text: createRes.message || "Updated existing schedule but new schedule still conflicts.", icon: "warning" }); setConflicts(createRes.conflicts.map(c => ({ ...c, newData: conflict.newData }))); setShowConflictModal(true); return; }
//         await sw({ title: "Error", text: createRes?.message || "New schedule creation failed.", icon: "error" });
//         return;
//       }

//       if (choice.isDenied) {
//         const delRes = await deleteSchedule(scheduleId);
//         if (!delRes || !delRes.success) { await sw({ title: "Error", text: delRes?.message || "Failed to delete existing schedule.", icon: "error" }); return; }
//         const createRes = await createSchedule(conflict.newData);
//         if (createRes && createRes.success) { await sw({ title: "Done", text: "Existing schedule deleted and new schedule added.", icon: "success" }); setConflicts(prev => prev.filter(c => c.schedule_id !== scheduleId)); fetchSchedules(); setShowConflictModal(false); onClose(); return; }
//         if (createRes && createRes.conflicts) { await sw({ title: "Partial", text: createRes.message || "Deleted existing schedule but new schedule still conflicts.", icon: "warning" }); setConflicts(createRes.conflicts.map(c => ({ ...c, newData: conflict.newData }))); setShowConflictModal(true); return; }
//         await sw({ title: "Error", text: createRes?.message || "New schedule creation failed.", icon: "error" });
//         return;
//       }
//     }

//     const newDaysString = newExistingDays.join(",");
//     const updRes = await updateSchedule({ schedule_id: scheduleId, days_of_week: newDaysString });
//     if (!updRes || !updRes.success) { await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule days.", icon: "error" }); return; }

//     const createRes = await createSchedule(conflict.newData);
//     if (createRes && createRes.success) {
//       await sw({ title: "Done", text: "Existing schedule updated and new schedule added.", icon: "success" });
//       setConflicts(prev => prev.filter(c => c.schedule_id !== scheduleId));
//       fetchSchedules();
//       setShowConflictModal(false);
//       onClose();
//       return;
//     }
//     if (createRes && createRes.conflicts) {
//       await sw({ title: "Partial", text: createRes.message || "Existing schedule updated but new schedule still conflicts.", icon: "warning" });
//       setConflicts(createRes.conflicts.map(c => ({ ...c, newData: conflict.newData }))); setShowConflictModal(true); return;
//     }
//     await sw({ title: "Error", text: createRes?.message || "Failed to create new schedule after update.", icon: "error" });
//   };

//   async function handleResolveKeep(conflict) {
//     await sw({ title: "Kept", text: "Existing schedule was kept", icon: "info" });
//     setShowConflictModal(false);
//   }
//   async function handleResolveReplace(conflict) {
//     await deleteSchedule(conflict.schedule_id);
//     const res = await createSchedule(conflict.newData);
//     if (res.success) { await sw({ title: "Replaced", text: "Schedule replaced successfully", icon: "success" }); fetchSchedules(); setShowConflictModal(false); onClose(); }
//     else { await sw({ title: "Error", text: res?.message || "Failed to replace schedule", icon: "error" }); if (res && res.conflicts) setConflicts(res.conflicts.map(c => ({ ...c, newData: conflict.newData }))); }
//   }
//   async function handleResolveKeepBoth(conflict) {
//     const newData = { ...conflict.newData, priority: (conflict.priority || 0) + 1 };
//     const res = await createSchedule(newData);
//     if (res.success) { await sw({ title: "Added", text: "New schedule added with higher priority", icon: "success" }); fetchSchedules(); setShowConflictModal(false); onClose(); }
//     else { await sw({ title: "Error", text: res?.message || "Failed to add schedule", icon: "error" }); if (res && res.conflicts) setConflicts(res.conflicts.map(c => ({ ...c, newData }))); }
//   }

//   return (
//     <>
//       <Modal open={open} onClose={onClose}>
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow w-11/12 md:w-2/3 max-h-[90vh] overflow-y-auto">
//           <Typography variant="h6" className="mb-4">Assign Schedule to Employee</Typography>

//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <Select
//               multiple
//               value={selectedEmployees}
//               onChange={(e) => setSelectedEmployees(e.target.value)}
//               displayEmpty
//             >
//               {employees.map(emp => (
//                 <MenuItem key={emp.employee_id} value={emp.employee_id}>
//                   {emp.first_name} {emp.last_name}
//                 </MenuItem>
//               ))}
//             </Select>

//             <Select value={workTimeId} onChange={(e) => setWorkTimeId(e.target.value)}>
//               <MenuItem value="">-- Select Shift --</MenuItem>
//               {workTimes.map(wt => (
//                 <MenuItem key={wt.id} value={wt.id}>
//                   {wt.shift_name} ({wt.start_time} - {wt.end_time})
//                 </MenuItem>
//               ))}
//             </Select>

//             <TextField type="date" label="Effective Date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} InputLabelProps={{ shrink: true }} />
//             <TextField type="date" label="End Date (Optional)" value={endDate} onChange={(e) => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />

//             <Select value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
//               <MenuItem value="none">None (one-time)</MenuItem>
//               <MenuItem value="daily">Daily</MenuItem>
//               <MenuItem value="weekly">Weekly</MenuItem>
//               <MenuItem value="monthly">Monthly</MenuItem>
//             </Select>

//             <TextField type="number" label={
//               recurrenceType === 'daily' ? 'Every X days' :
//               recurrenceType === 'weekly' ? 'Every X weeks' :
//               recurrenceType === 'monthly' ? 'Every X months' :
//               'Recurrence Interval'
//             } value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value || 1)))} inputProps={{ min: 1 }} />

//             {recurrenceType === 'weekly' ? (
//               <div className="flex flex-wrap gap-2 col-span-full">
//                 {ALL_WEEKDAYS.map(d => (
//                   <FormControlLabel key={d} control={<Checkbox checked={daysOfWeek.includes(d)} onChange={() => toggleAddDay(d)} />} label={d} />
//                 ))}
//                 <div className="w-full text-sm text-gray-600">If you leave all weekdays unchecked, the schedule will apply to <strong>all weekdays</strong> (saved as NULL in DB).</div>
//               </div>
//             ) : (
//               <div className="text-sm text-gray-600 col-span-full">
//                 {recurrenceType === 'daily' ? 'Daily recurrence ignores weekdays. Use the interval to repeat every X days.' :
//                   recurrenceType === 'monthly' ? 'Monthly recurrence repeats on the same day-of-month as Effective Date (e.g. 15th every X months).' :
//                   'One-time schedule applies only on Effective Date.'}
//               </div>
//             )}

//             <TextField type="number" label="Occurrence Limit (optional)" value={occurrenceLimit} onChange={(e) => setOccurrenceLimit(e.target.value)} />
//             <TextField type="number" label="Priority" value={priority} onChange={(e) => setPriority(Math.max(1, Number(e.target.value || 1)))} />
//             <div className="flex items-center gap-2">
//               <Switch checked={isActiveAdd} onChange={() => setIsActiveAdd(p => !p)} />
//               <span>Active</span>
//             </div>

//             <div className="flex gap-2 mt-4 col-span-full">
//               <Button variant="contained" onClick={handleAddSchedule}>Add Schedule</Button>
//               <Button variant="outlined" onClick={onClose}>Cancel</Button>
//             </div>
//           </div>
//         </div>
//       </Modal>

//       {/* Conflict Modal */}
//       <Modal open={showConflictModal} onClose={() => setShowConflictModal(false)}>
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow w-11/12 md:w-2/3 max-h-[90vh] overflow-y-auto">
//           <Typography variant="h6" className="mb-4">Shift Schedule Conflict Detected</Typography>

//           <div className="space-y-4">
//             {conflicts.map((c, i) => (
//               <div key={i} className="p-4 border rounded-lg shadow-sm">
//                 <Typography variant="subtitle1" className="mb-2 font-bold">{c.employeeName}</Typography>

//                 <div className="grid grid-cols-2 gap-2 p-3 mb-3 border rounded md:grid-cols-4 bg-gray-50">
//                   <div><p className="text-sm">Shift</p><p className="font-semibold">{c.shift_name}</p></div>
//                   <div><p className="text-sm">Time</p><p className="font-semibold">{c.start_time} - {c.end_time}</p></div>
//                   <div><p className="text-sm">Days</p><p className="font-semibold">{c.days_of_week || 'All'}</p></div>
//                   <div><p className="text-sm">Priority</p><p className="font-semibold">{c.priority}</p></div>
//                 </div>

//                 <div className="grid grid-cols-2 gap-2 p-3 mb-3 border rounded md:grid-cols-4 bg-green-50">
//                   <div><p className="text-sm">New Shift</p><p className="font-semibold">{workTimes.find(wt => wt.id === c.newData.work_time_id)?.shift_name || '—'}</p></div>
//                   <div><p className="text-sm">Time</p><p className="font-semibold">{workTimes.find(wt => wt.id === c.newData.work_time_id)?.start_time || '-'} - {workTimes.find(wt => wt.id === c.newData.work_time_id)?.end_time || '-'}</p></div>
//                   <div><p className="text-sm">Days</p><p className="font-semibold">{c.newData.days_of_week || 'All'}</p></div>
//                   <div><p className="text-sm">Priority</p><p className="font-semibold">{c.newData.priority}</p></div>
//                 </div>

//                 <div className="p-3 mt-3 border rounded bg-yellow-50">
//                   <p className="mb-2 text-sm">Conflicting days — uncheck days to remove them from existing schedule</p>
//                   <div className="flex flex-wrap gap-2">
//                     {(c.conflicting_days || "").split(",").map(dayRaw => {
//                       const day = dayRaw.trim(); if (!day) return null;
//                       const isChecked = keptConflictDays[c.schedule_id] ? keptConflictDays[c.schedule_id].has(day) : true;
//                       return (<FormControlLabel key={day} control={<Checkbox checked={isChecked} onChange={() => toggleConflictDay(c.schedule_id, day)} />} label={day} />);
//                     })}
//                   </div>
//                   <div className="mt-3"><Button variant="contained" color="warning" onClick={() => removeSelectedConflictingDays(c)}>Remove Selected Conflicting Days & Add New Schedule</Button></div>
//                 </div>

//                 <div className="flex flex-col gap-2 mt-3 md:flex-row">
//                   <Button variant="contained" onClick={() => handleResolveKeep(c)} fullWidth>Keep Existing</Button>
//                   <Button variant="contained" color="secondary" onClick={() => handleResolveReplace(c)} fullWidth>Replace Existing</Button>
//                   <Button variant="contained" color="success" onClick={() => handleResolveKeepBoth(c)} fullWidth>Keep Both</Button>
//                 </div>
//               </div>
//             ))}
//           </div>

//           <div className="flex justify-end mt-6"><Button variant="text" onClick={() => setShowConflictModal(false)}>Close</Button></div>
//         </div>
//       </Modal>
//     </>
//   );
// }