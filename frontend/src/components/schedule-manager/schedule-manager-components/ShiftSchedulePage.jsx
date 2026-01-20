// // src/shift-schedule/ShiftSchedulePage.jsx
// // Paste-ready React component. Aligns UI with `employee_shift_schedule` schema.
// // Behavior notes (important):
// //  - recurrence_type: 'none' | 'daily' | 'weekly' | 'monthly'
// //  - recurrence_interval: "every X" (days/weeks/months depending on type)
// //  - days_of_week (DB) is used ONLY for weekly recurrence. For weekly:
// //      - if admin selects 0 weekdays -> we send NULL (means "all days of the week")
// //  - for daily/monthly/none -> days_of_week is not sent (NULL)
// //  - monthly recurrence uses the day-of-month from effective_date (no extra DB field)
// //  - occurrence_limit is supported and sent when provided


// ShiftSchedulePage.jsx
import React, { useEffect, useState } from "react";
import { Typography, Box, Button } from "@mui/material";
import Swal from "sweetalert2";
import Breadcrumbs from "../../breadcrumbs/Breadcrumbs";
import ScheduleManagerAPI from "../schedule-manager-API/ScheduleManagerAPI";
import {
  useScheduleHook,
  useCreateSchedule,
  useUpdateSchedule,
  useDeleteSchedule,
} from "../schedule-manager-hooks/useScheduleHook";
import { useSession } from "../../../context/SessionContext";
import usePermissions from "../../../users/hooks/usePermissions"; 

import AssignScheduleModal from "./AssignScheduleModal";
import ScheduleList from "./SheduleList";
import LayoutSMDashboard from "./LayouSMDashboard";

export default function ShiftSchedulePage() {
  const { user } = useSession(); // ✅ get user FIRST
  // const { permissions, loading: permLoading } = usePermissions(user?.role); // ✅ now safe
  const { permissions, loading: permLoading } = usePermissions(user?.username); 

  const { schedules, fetchSchedules } = useScheduleHook();
  const { createSchedule } = useCreateSchedule();
  const { updateSchedule } = useUpdateSchedule();
  const { deleteSchedule } = useDeleteSchedule();

  const [workTimes, setWorkTimes] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [openAssignModal, setOpenAssignModal] = useState(false);
const breadcrumbItems = [
  !permLoading && permissions?.attendance_dtr && { label: 'Horizon Time & Attendance', path: '/attendanceRecord' },
  !permLoading && permissions?.attendance_log && { label: 'Attendance Logs', path: '/attendance' },
  !permLoading && permissions?.leave_access && { label: 'Manage Leave', path: '/ApproveLeavePage' },
  !permLoading && permissions?.schedule_management && { label: 'Schedule Management', path: '/ShiftSchedulePage' },
].filter(Boolean); // remove any falsy (unauthorized) entries

  // Edit flow state is handled inside ScheduleList (it contains edit modal),
  // but parent provides update/delete helpers.

  // SweetAlert helper to raise z-index over MUI modal (same as original)
  const sw = (options) => {
    return Swal.fire({
      ...options,
      didOpen: (popupEl) => {
        const backdrop = document.querySelector(".swal2-backdrop");
        const container = document.querySelector(".swal2-container");
        if (backdrop) backdrop.style.zIndex = "20050";
        if (container) container.style.zIndex = "20060";
        if (typeof options.didOpen === "function") {
          try { options.didOpen(popupEl); } catch (e) { /* ignore */ }
        }
      },
    });
  };

  useEffect(() => {
    (async () => {
      const wt = await ScheduleManagerAPI.readWorkTimes();
      setWorkTimes(wt || []);
      const emps = await ScheduleManagerAPI.readEmployees();
      setEmployees(emps || []);
    })();
  }, []);

  // expose a refresh helper to pass down
  const refreshAll = () => fetchSchedules();

  return (
    
    <div className="p-4">
      <div className="block md:hidden w-full bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 px-4 py-2 text-sm shadow-sm">
  This view works better on desktop for full functionality.
</div>
            <div className="sticky flex flex-col w-full pb-3 pl-5 border-b-2 gap-y-2 Glc-dashboard-bg-header">
        <span className="text-2xl font-semibold">Shift Schedule</span>

        {/* Hidden on small screens, visible from md (>=768px) */}
        {/* <div className="hidden md:block"> */}
          <Breadcrumbs items={breadcrumbItems} />
        {/* </div> */}
      </div>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        {/* <Typography variant="h4">Shift Schedule Management</Typography> */}
        {/* <Button variant="contained" onClick={() => setOpenAssignModal(true)}>Assign Schedule</Button> */}
      </Box>

      <AssignScheduleModal
        open={openAssignModal}
        onClose={() => setOpenAssignModal(false)}
        workTimes={workTimes}
        employees={employees}
        createSchedule={createSchedule}
        updateSchedule={updateSchedule}
        deleteSchedule={deleteSchedule}
        fetchSchedules={refreshAll}
        sw={sw}
      />

      <LayoutSMDashboard/>

      {/* <ScheduleList
        schedules={schedules}
        workTimes={workTimes}
        employees={employees}
        updateSchedule={updateSchedule}
        deleteSchedule={deleteSchedule}
        fetchSchedules={refreshAll}
        sw={sw}
      /> */}
    </div>
  );
}






// import { useState, useEffect } from "react";
// import {
//   Modal,
//   Button,
//   TextField,
//   Select,
//   MenuItem,
//   Checkbox,
//   FormControlLabel,
//   Table,
//   TableHead,
//   TableRow,
//   TableCell,
//   TableBody,
//   Typography,
//   Switch,
//   IconButton,
//   Box,
// } from "@mui/material";
// import EditIcon from "@mui/icons-material/Edit";
// import DeleteIcon from "@mui/icons-material/Delete";
// import Swal from "sweetalert2";
// import ScheduleManagerAPI from "../schedule-manager-API/scheduleManagerAPI";
// import {
//   useScheduleHook,
//   useCreateSchedule,
//   useUpdateSchedule,
//   useDeleteSchedule,
// } from "../schedule-manager-hooks/useScheduleHook";

// export default function ShiftSchedulePage() {
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

//   // schedules + hooks
//   const { schedules, fetchSchedules } = useScheduleHook();
//   const { createSchedule } = useCreateSchedule();
//   const { updateSchedule } = useUpdateSchedule();
//   const { deleteSchedule } = useDeleteSchedule();

//   const [workTimes, setWorkTimes] = useState([]);
//   const [employees, setEmployees] = useState([]);

//   // conflict modal state (keeps existing behaviors)
//   const [conflicts, setConflicts] = useState([]);
//   const [showConflictModal, setShowConflictModal] = useState(false);
//   const [keptConflictDays, setKeptConflictDays] = useState({});

//   // edit modal
//   const [editingSchedule, setEditingSchedule] = useState(null);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editForm, setEditForm] = useState({});

//   const ALL_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

//   // SweetAlert helper to raise z-index over MUI modal
//   const sw = (options) => {
//     return Swal.fire({
//       ...options,
//       didOpen: (popupEl) => {
//         const backdrop = document.querySelector(".swal2-backdrop");
//         const container = document.querySelector(".swal2-container");
//         if (backdrop) backdrop.style.zIndex = "20050";
//         if (container) container.style.zIndex = "20060";
//         if (typeof options.didOpen === "function") {
//           try { options.didOpen(popupEl); } catch (e) { /* ignore */ }
//         }
//       }
//     });
//   };

//   // fetch work times and employees
//   useEffect(() => {
//     (async () => {
//       const wt = await ScheduleManagerAPI.readWorkTimes();
//       setWorkTimes(wt || []);
//       const emps = await ScheduleManagerAPI.readEmployees();
//       setEmployees(emps || []);
//     })();
//   }, []);

//   // initialize keptConflictDays
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

//   // Toggle checkbox for weekly days in add form
//   const toggleAddDay = (day) => {
//     setDaysOfWeek((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
//   };

//   // Create schedule: handle recurrence-type specifics
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
//       // days_of_week should only be sent when recurrenceType === 'weekly'
//       let days_field = null;
//       if (recurrenceType === "weekly") {
//         // if admin selected no days -> send null meaning "all weekdays" (DB uses NULL as wildcard)
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
//           setConflicts(res.conflicts.map((c) => ({ ...c, newData: payload, employeeName: employees.find(e => e.employee_id === emp_id) ? `${employees.find(e => e.employee_id === emp_id).first_name} ${employees.find(e => e.employee_id === emp_id).last_name}` : emp_id })));
//           setShowConflictModal(true);
//         } else if (res.success) {
//           await sw({ title: "Saved", text: "Schedule added successfully", icon: "success" });
//           fetchSchedules();
//         } else {
//           await sw({ title: "Error", text: res.message || "Failed to add schedule", icon: "error" });
//         }
//       } catch (err) {
//         console.error(err);
//         await sw({ title: "Error", text: "Network or server error", icon: "error" });
//       }
//     }
//   };

//   // ----------------- Edit (only included fields are sent) -----------------
//   const openEditModal = (s) => {
//     setEditingSchedule(s);
//     setEditForm({
//       schedule_id: s.schedule_id,
//       effective_date: s.effective_date || "",
//       end_date: s.end_date || "",
//       recurrence_type: s.recurrence_type || "none",
//       recurrence_interval: s.recurrence_interval || 1,
//       days_of_week: s.days_of_week ? s.days_of_week.split(",").map(d => d.trim()) : [],
//       occurrence_limit: s.occurrence_limit ?? "",
//       priority: s.priority ?? 1,
//       is_active: s.is_active === 1 || s.is_active === true,
//     });
//     setShowEditModal(true);
//   };

//   const handleEditField = (key, value) => setEditForm(p => ({ ...p, [key]: value }));

//   const saveEdit = async () => {
//     if (!editForm || !editForm.schedule_id) return;
//     const payload = { schedule_id: editForm.schedule_id };

//     // always include effective_date (update-mp.php accepts partial updates in robust version)
//     payload.effective_date = editForm.effective_date || null;
//     payload.end_date = editForm.end_date ? editForm.end_date : null;
//     payload.recurrence_type = editForm.recurrence_type;
//     payload.recurrence_interval = Number(editForm.recurrence_interval) || 1;
//     payload.occurrence_limit = editForm.occurrence_limit !== "" ? Number(editForm.occurrence_limit) : null;
//     payload.priority = Number(editForm.priority) || 1;
//     payload.is_active = editForm.is_active ? 1 : 0;

//     // days_of_week only for weekly
//     if (editForm.recurrence_type === "weekly") {
//       payload.days_of_week = Array.isArray(editForm.days_of_week) && editForm.days_of_week.length ? editForm.days_of_week.join(",") : null;
//     }

//     try {
//       const res = await updateSchedule(payload);
//       if (res && res.success) {
//         await sw({ title: "Saved", text: "Schedule updated", icon: "success" });
//         setShowEditModal(false);
//         fetchSchedules();
//       } else {
//         await sw({ title: "Error", text: res?.message || "Update failed", icon: "error" });
//       }
//     } catch (err) {
//       console.error(err);
//       await sw({ title: "Error", text: "Network or server error", icon: "error" });
//     }
//   };

//   // ----------------- Delete -----------------
//   const handleDelete = async (schedule_id) => {
//     const confirmed = await sw({ title: "Delete schedule?", text: "This will permanently delete the schedule record.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel" });
//     if (!confirmed.isConfirmed) return;
//     try {
//       const res = await deleteSchedule(schedule_id);
//       if (res && res.success) {
//         await sw({ title: "Deleted", text: "Schedule removed.", icon: "success" });
//         fetchSchedules();
//       } else {
//         await sw({ title: "Error", text: res?.message || "Delete failed", icon: "error" });
//       }
//     } catch (err) {
//       console.error(err);
//       await sw({ title: "Error", text: "Network or server error", icon: "error" });
//     }
//   };

//   // ----------------- Conflict helpers (keeps previous behavior) -----------------
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

//     const confirmed = await sw({ title: "Remove selected days?", text: `Remove ${daysToRemove.join(", ")} from existing schedule?`, icon: "warning", showCancelButton: true, confirmButtonText: "Yes, remove", cancelButtonText: "Cancel" });
//     if (!confirmed.isConfirmed) return;

//     // compute existing days arr (null/wildcard -> all weekdays)
//     const existingDaysArr = conflict.days_of_week && String(conflict.days_of_week).trim() !== "" ? conflict.days_of_week.split(",").map(d => d.trim()).filter(Boolean) : [...ALL_WEEKDAYS];
//     const newExistingDays = existingDaysArr.filter(d => !daysToRemove.includes(d));

//     // if none left -> ask deactivate/delete options
//     if (newExistingDays.length === 0) {
//       const choice = await sw({ title: "No days left on existing schedule", text: "After removing selected days the existing schedule will have no weekdays. Deactivate or Delete the existing schedule?", icon: "warning", showCancelButton: true, showDenyButton: true, confirmButtonText: "Deactivate (keep record)", denyButtonText: "Delete schedule", cancelButtonText: "Cancel" });
//       if (choice.isDismissed) return;

//       if (choice.isConfirmed) {
//         // deactivate
//         const upd = { schedule_id: scheduleId, days_of_week: null, is_active: 0 };
//         const updRes = await updateSchedule(upd);
//         if (!updRes || !updRes.success) { await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule.", icon: "error" }); return; }
//         // try to create new
//         const createRes = await createSchedule(conflict.newData);
//         if (createRes && createRes.success) { await sw({ title: "Done", text: "Existing schedule deactivated and new schedule added.", icon: "success" }); setConflicts(prev => prev.filter(c => c.schedule_id !== scheduleId)); fetchSchedules(); setShowConflictModal(false); return; }
//         if (createRes && createRes.conflicts) { await sw({ title: "Partial", text: createRes.message || "Updated existing schedule but new schedule still conflicts.", icon: "warning" }); setConflicts(createRes.conflicts.map(c => ({ ...c, newData: conflict.newData }))); setShowConflictModal(true); return; }
//         await sw({ title: "Error", text: createRes?.message || "New schedule creation failed.", icon: "error" });
//         return;
//       }

//       if (choice.isDenied) {
//         const delRes = await deleteSchedule(scheduleId);
//         if (!delRes || !delRes.success) { await sw({ title: "Error", text: delRes?.message || "Failed to delete existing schedule.", icon: "error" }); return; }
//         const createRes = await createSchedule(conflict.newData);
//         if (createRes && createRes.success) { await sw({ title: "Done", text: "Existing schedule deleted and new schedule added.", icon: "success" }); setConflicts(prev => prev.filter(c => c.schedule_id !== scheduleId)); fetchSchedules(); setShowConflictModal(false); return; }
//         if (createRes && createRes.conflicts) { await sw({ title: "Partial", text: createRes.message || "Deleted existing schedule but new schedule still conflicts.", icon: "warning" }); setConflicts(createRes.conflicts.map(c => ({ ...c, newData: conflict.newData }))); setShowConflictModal(true); return; }
//         await sw({ title: "Error", text: createRes?.message || "New schedule creation failed.", icon: "error" });
//         return;
//       }
//     }

//     // otherwise update existing schedule days to newExistingDays
//     const newDaysString = newExistingDays.join(",");
//     // try using API helper if present, otherwise use updateSchedule fallback
//     if (typeof ScheduleManagerAPI.updateScheduleDays === "function") {
//       const updRes = await ScheduleManagerAPI.updateScheduleDays({ schedule_id: scheduleId, remove_days: daysToRemove });
//       if (!updRes || !updRes.success) { await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule days.", icon: "error" }); return; }
//     } else {
//       const updRes = await updateSchedule({ schedule_id: scheduleId, days_of_week: newDaysString });
//       if (!updRes || !updRes.success) { await sw({ title: "Error", text: updRes?.message || "Failed to update existing schedule days.", icon: "error" }); return; }
//     }

//     // after updating existing schedule, try to create the new one
//     const createRes = await createSchedule(conflict.newData);
//     if (createRes && createRes.success) {
//       await sw({ title: "Done", text: "Existing schedule updated and new schedule added.", icon: "success" });
//       setConflicts(prev => prev.filter(c => c.schedule_id !== scheduleId));
//       fetchSchedules();
//       setShowConflictModal(false);
//       return;
//     }
//     if (createRes && createRes.conflicts) {
//       await sw({ title: "Partial", text: createRes.message || "Existing schedule updated but new schedule still conflicts.", icon: "warning" });
//       setConflicts(createRes.conflicts.map(c => ({ ...c, newData: conflict.newData }))); setShowConflictModal(true); return;
//     }
//     await sw({ title: "Error", text: createRes?.message || "Failed to create new schedule after update.", icon: "error" });
//   };

//   // helpers for conflict options (keep / replace / keep both)
//   async function handleResolveKeep(conflict) {
//     await sw({ title: "Kept", text: "Existing schedule was kept", icon: "info" });
//     setShowConflictModal(false);
//   }
//   async function handleResolveReplace(conflict) {
//     await deleteSchedule(conflict.schedule_id);
//     const res = await createSchedule(conflict.newData);
//     if (res.success) { await sw({ title: "Replaced", text: "Schedule replaced successfully", icon: "success" }); fetchSchedules(); setShowConflictModal(false); }
//     else { await sw({ title: "Error", text: res?.message || "Failed to replace schedule", icon: "error" }); if (res && res.conflicts) setConflicts(res.conflicts.map(c => ({ ...c, newData: conflict.newData }))); }
//   }
//   async function handleResolveKeepBoth(conflict) {
//     const newData = { ...conflict.newData, priority: (conflict.priority || 0) + 1 };
//     const res = await createSchedule(newData);
//     if (res.success) { await sw({ title: "Added", text: "New schedule added with higher priority", icon: "success" }); fetchSchedules(); setShowConflictModal(false); }
//     else { await sw({ title: "Error", text: res?.message || "Failed to add schedule", icon: "error" }); if (res && res.conflicts) setConflicts(res.conflicts.map(c => ({ ...c, newData }))); }
//   }

//   // ----------------- Render -----------------
//   return (
//     <div className="p-4">
//       <Typography variant="h4" className="mb-4">Shift Schedule Management</Typography>

//       {/* Add form */}
//       <div className="p-4 mb-6 border rounded shadow">
//         <Typography variant="h6">Add Shift Schedule</Typography>
//         <div className="grid grid-cols-1 gap-4 mt-2 md:grid-cols-2">
//           <Select multiple value={selectedEmployees} onChange={(e) => setSelectedEmployees(e.target.value)} displayEmpty>
//             {employees.map(emp => <MenuItem key={emp.employee_id} value={emp.employee_id}>{emp.first_name} {emp.last_name}</MenuItem>)}
//           </Select>

//           <Select value={workTimeId} onChange={(e) => setWorkTimeId(e.target.value)}>
//             <MenuItem value="">-- Select Shift --</MenuItem>
//             {workTimes.map(wt => <MenuItem key={wt.id} value={wt.id}>{wt.shift_name} ({wt.start_time} - {wt.end_time})</MenuItem>)}
//           </Select>

//           <TextField type="date" label="Effective Date" value={effectiveDate} onChange={(e)=>setEffectiveDate(e.target.value)} InputLabelProps={{ shrink: true }} />
//           <TextField type="date" label="End Date (Optional)" value={endDate} onChange={(e)=>setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />

//           <Select value={recurrenceType} onChange={(e)=>setRecurrenceType(e.target.value)}>
//             <MenuItem value="none">None (one-time)</MenuItem>
//             <MenuItem value="daily">Daily</MenuItem>
//             <MenuItem value="weekly">Weekly</MenuItem>
//             <MenuItem value="monthly">Monthly</MenuItem>
//           </Select>

//           <TextField type="number" label={recurrenceType === 'daily' ? 'Every X days' : recurrenceType === 'weekly' ? 'Every X weeks' : recurrenceType === 'monthly' ? 'Every X months' : 'Recurrence Interval'} value={recurrenceInterval} onChange={(e)=>setRecurrenceInterval(Math.max(1, Number(e.target.value || 1)))} inputProps={{ min: 1 }} />

//           {/* show weekly checkboxes only when weekly selected */}
//           {recurrenceType === 'weekly' ? (
//             <div className="flex flex-wrap gap-2 col-span-full">
//               {ALL_WEEKDAYS.map(d => (
//                 <FormControlLabel key={d} control={<Checkbox checked={daysOfWeek.includes(d)} onChange={()=>toggleAddDay(d)} />} label={d} />
//               ))}
//               <div className="w-full text-sm text-gray-600">If you leave all weekdays unchecked, the schedule will apply to <strong>all weekdays</strong> (saved as NULL in DB).</div>
//             </div>
//           ) : (
//             <div className="text-sm text-gray-600 col-span-full">{recurrenceType === 'daily' ? 'Daily recurrence ignores weekdays. Use the interval to repeat every X days.' : recurrenceType === 'monthly' ? 'Monthly recurrence repeats on the same day-of-month as Effective Date (e.g. 15th every X months).' : 'One-time schedule applies only on Effective Date.'}</div>
//           )}

//           <TextField type="number" label="Occurrence Limit (optional)" value={occurrenceLimit} onChange={(e)=>setOccurrenceLimit(e.target.value)} />
//           <TextField type="number" label="Priority" value={priority} onChange={(e)=>setPriority(Math.max(1, Number(e.target.value || 1)))} />
//           <div className="flex items-center gap-2">
//             <Switch checked={isActiveAdd} onChange={()=>setIsActiveAdd(p=>!p)} />
//             <span>Active</span>
//           </div>

//         </div>
//         <Button variant="contained" className="mt-4" onClick={handleAddSchedule}>Add Schedule</Button>
//       </div>

//       {/* Schedule List */}
//       <div className="mt-6">
//         <Typography variant="h6">Existing Schedules</Typography>
//         <Table>
//           <TableHead>
//             <TableRow>
//               <TableCell>Employee</TableCell>
//               <TableCell>Shift</TableCell>
//               <TableCell>Effective</TableCell>
//               <TableCell>End</TableCell>
//               <TableCell>Recurrence</TableCell>
//               <TableCell>Interval</TableCell>
//               <TableCell>Days</TableCell>
//               <TableCell>Limit</TableCell>
//               <TableCell>Active</TableCell>
//               <TableCell>Priority</TableCell>
//               <TableCell>Created</TableCell>
//               <TableCell>Actions</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {Array.isArray(schedules) && schedules.map(s => (
//               <TableRow key={s.schedule_id}>
//                 <TableCell>{s.employee_id}</TableCell>
//                 <TableCell>{s.shift_name}</TableCell>
//                 <TableCell>{s.effective_date}</TableCell>
//                 <TableCell>{s.end_date || '-'}</TableCell>
//                 <TableCell>{s.recurrence_type}</TableCell>
//                 <TableCell>{s.recurrence_interval}</TableCell>
//                 <TableCell>{s.days_of_week || (s.recurrence_type === 'weekly' ? 'All' : '-')}</TableCell>
//                 <TableCell>{s.occurrence_limit ?? '-'}</TableCell>
//                 <TableCell>{s.is_active ? 'Yes' : 'No'}</TableCell>
//                 <TableCell>{s.priority}</TableCell>
//                 <TableCell>{s.created_at || '-'}</TableCell>
//                 <TableCell>
//                   <Box display="flex" gap={1}>
//                     <IconButton size="small" onClick={()=>openEditModal(s)} title="Edit"><EditIcon fontSize="small"/></IconButton>
//                     <IconButton size="small" onClick={()=>handleDelete(s.schedule_id)} title="Delete"><DeleteIcon fontSize="small"/></IconButton>
//                   </Box>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>
//       </div>

//       {/* Edit Modal */}
//       <Modal open={showEditModal} onClose={()=>setShowEditModal(false)}>
//         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded shadow w-11/12 md:w-2/3 max-h-[90vh] overflow-y-auto">
//           <Typography variant="h6" className="mb-4">Edit Schedule</Typography>
//           {editForm && (
//             <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//               <TextField type="date" label="Effective Date" value={editForm.effective_date} onChange={(e)=>handleEditField('effective_date', e.target.value)} InputLabelProps={{ shrink: true }} />
//               <TextField type="date" label="End Date (Optional)" value={editForm.end_date} onChange={(e)=>handleEditField('end_date', e.target.value)} InputLabelProps={{ shrink: true }} />

//               <Select value={editForm.recurrence_type} onChange={(e)=>handleEditField('recurrence_type', e.target.value)}>
//                 <MenuItem value="none">None</MenuItem>
//                 <MenuItem value="daily">Daily</MenuItem>
//                 <MenuItem value="weekly">Weekly</MenuItem>
//                 <MenuItem value="monthly">Monthly</MenuItem>
//               </Select>

//               <TextField type="number" label="Recurrence Interval" value={editForm.recurrence_interval} onChange={(e)=>handleEditField('recurrence_interval', Number(e.target.value || 1))} inputProps={{ min: 1 }} />

//               {editForm.recurrence_type === 'weekly' ? (
//                 <div className="flex flex-wrap gap-2 col-span-full">
//                   {ALL_WEEKDAYS.map(d => {
//                     const checked = Array.isArray(editForm.days_of_week) && editForm.days_of_week.includes(d);
//                     return <FormControlLabel key={d} control={<Checkbox checked={checked} onChange={()=>{
//                       const copy = Array.isArray(editForm.days_of_week) ? [...editForm.days_of_week] : [];
//                       if (copy.includes(d)) editForm.days_of_week = copy.filter(x => x !== d);
//                       else editForm.days_of_week = [...copy, d];
//                       setEditForm({...editForm});
//                     }} />} label={d} />;
//                   })}
//                   <div className="w-full text-sm text-gray-600">If you leave all weekdays unchecked, the schedule will apply to <strong>all weekdays</strong> (saved as NULL in DB).</div>
//                 </div>
//               ) : (
//                 <div className="text-sm text-gray-600 col-span-full">{editForm.recurrence_type === 'daily' ? 'Daily recurrence ignores weekdays. Use the interval to repeat every X days.' : editForm.recurrence_type === 'monthly' ? 'Monthly recurrence repeats on the same day-of-month as Effective Date (e.g. 15th every X months).' : 'One-time schedule applies only on Effective Date.'}</div>
//               )}

//               <TextField type="number" label="Occurrence Limit" value={editForm.occurrence_limit} onChange={(e)=>handleEditField('occurrence_limit', e.target.value)} />
//               <TextField type="number" label="Priority" value={editForm.priority} onChange={(e)=>handleEditField('priority', e.target.value)} />
//               <div className="flex items-center gap-2">
//                 <Switch checked={editForm.is_active} onChange={()=>handleEditField('is_active', !editForm.is_active)} />
//                 <span>Active</span>
//               </div>

//               <div className="flex gap-2 mt-4 col-span-full">
//                 <Button variant="contained" onClick={saveEdit}>Save changes</Button>
//                 <Button variant="outlined" onClick={()=>setShowEditModal(false)}>Cancel</Button>
//               </div>
//             </div>
//           )}
//         </div>
//       </Modal>

//       {/* Conflict Modal (keeps existing behavior) */}
//       <Modal open={showConflictModal} onClose={()=>setShowConflictModal(false)}>
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

//                 <div className="grid grid-cols-2 gap-2 p-3 border rounded md:grid-cols-4 bg-green-50">
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
//                       return (<FormControlLabel key={day} control={<Checkbox checked={isChecked} onChange={()=>toggleConflictDay(c.schedule_id, day)} />} label={day} />);
//                     })}
//                   </div>
//                   <div className="mt-3"><Button variant="contained" color="warning" onClick={()=>removeSelectedConflictingDays(c)}>Remove Selected Conflicting Days & Add New Schedule</Button></div>
//                 </div>

//                 <div className="flex flex-col gap-2 mt-3 md:flex-row">
//                   <Button variant="contained" color="primary" onClick={()=>handleResolveKeep(c)} fullWidth>Keep Existing</Button>
//                   <Button variant="contained" color="secondary" onClick={()=>handleResolveReplace(c)} fullWidth>Replace Existing</Button>
//                   <Button variant="contained" color="success" onClick={()=>handleResolveKeepBoth(c)} fullWidth>Keep Both</Button>
//                 </div>

//               </div>
//             ))}
//           </div>

//           <div className="flex justify-end mt-6"><Button variant="text" onClick={()=>setShowConflictModal(false)}>Close</Button></div>
//         </div>
//       </Modal>
//     </div>
//   );
// }
