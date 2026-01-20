import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  Radio,
  FormControlLabel,
  Typography,
  Divider,
  Box,
  Checkbox,
  FormGroup,
} from '@mui/material';
import ScheduleManagerAPI from '../schedule-manager-API/ScheduleManagerAPI';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ConflictResolverModal({
  open,
  onClose,
  conflicts = [],
  proposed = null,
  onAfterResolve = () => {},
  handlers = {},
}) {
  // selectedId is stored as string: either 'proposed' or String(schedule_id)
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [daysSelected, setDaysSelected] = useState([]); // ['Mon','Tue',...]
  const [savingDays, setSavingDays] = useState(false);

  // default handlers fallback to ScheduleManagerAPI
  const deleteSchedule = handlers.deleteSchedule || (async (id) => {
    return ScheduleManagerAPI.deleteSchedule(id);
  });
  const updateSchedule = handlers.updateSchedule || (async (data) => {
    return ScheduleManagerAPI.updateSchedule(data);
  });
  const createSchedule = handlers.createSchedule || (async (data) => {
    return ScheduleManagerAPI.createSchedule(data);
  });

  // compute display list: existing schedules + optional proposed
  const displayList = useMemo(() => {
    const list = conflicts.map((c) => ({ type: 'existing', ...c }));
    if (proposed) list.push({ type: 'proposed', ...proposed });
    return list;
  }, [conflicts, proposed]);

  // helper to get the string value used in radios for an item
  const itemValue = (item) => (item.type === 'proposed' ? 'proposed' : String(item.schedule_id));

  // When modal opens or conflicts change, set sensible default selected schedule (string)
  useEffect(() => {
    if (conflicts && conflicts.length) {
      setSelectedId(String(conflicts[0].schedule_id));
    } else if (proposed) {
      setSelectedId('proposed');
    } else {
      setSelectedId(null);
    }
  }, [open, conflicts, proposed]);

  // When selection changes, populate daysSelected from the selected item
  useEffect(() => {
    if (!selectedId) {
      setDaysSelected([]);
      return;
    }
    const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
    if (selectedItem) {
      const ds = selectedItem.days_of_week
        ? selectedItem.days_of_week.split(',').map((d) => d.trim()).filter(Boolean)
        : [];
      setDaysSelected(ds);
    } else {
      setDaysSelected([]);
    }
  }, [selectedId, displayList]);

  // toggle a weekday
  const toggleDay = (day) => {
    setDaysSelected((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  // Helper: build update payload from an "item" (conflict object). update.php expects:
  // schedule_id, effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, priority
  const buildUpdatePayloadFromItem = (item) => {
    const effective_date = item.effective_date ?? new Date().toISOString().slice(0, 10);
    const end_date = item.end_date ?? null;
    const recurrence_type = item.recurrence_type ?? 'weekly';
    const recurrence_interval = item.recurrence_interval ?? 1;
    const priority = item.priority ?? 1;
    const days_of_week = (Array.isArray(daysSelected) && daysSelected.length > 0)
      ? daysSelected.join(',')
      : (item.days_of_week ?? null);

    return {
      schedule_id: item.schedule_id,
      effective_date,
      end_date,
      recurrence_type,
      recurrence_interval,
      days_of_week,
      priority,
    };
  };

  // Save days_of_week for selected schedule
  const handleSaveDays = async () => {
    if (!selectedId) {
      alert('No schedule selected');
      return;
    }
    const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
    if (!selectedItem || selectedItem.type !== 'existing') {
      alert('Can only edit days for existing schedules.');
      return;
    }

    const originalDays = (selectedItem.days_of_week || '').split(',').map((d) => d.trim()).filter(Boolean).join(',');
    console.error('originalDays', originalDays );
    const newDays = (daysSelected || []).join(',');
    if (originalDays === newDays) {
      alert('No change detected in days_of_week.');
      return;
    }

    // build payload then **force** the intended days value from UI
    const payload = buildUpdatePayloadFromItem(selectedItem);

    // *** FIX: make sure we send the user's intended days (even empty string) ***
    // If user cleared all days, send null (so backend can interpret clearing). If you prefer empty string, send ''.
    payload.days_of_week = newDays === '' ? null : newDays;

    console.log('buildUpdatePayloadFromItem (overridden days)', payload);

    setSavingDays(true);
    try {
      // updateSchedule expects an object with schedule_id etc.
      const res = await updateSchedule(payload);
      console.log('update schedule', res);
      if (res && res.success) {
        onAfterResolve({ action: 'update_days', schedule_id: selectedItem.schedule_id, days_of_week: payload.days_of_week });
        onClose();
      } else {
        alert(res?.message || 'Failed to update schedule days.');
      }
    } catch (err) {
      console.error(err);
      alert('Error while saving days.');
    } finally {
      setSavingDays(false);
    }
  };

  // Action: Set selected schedule as highest priority
  const handleSetAsHighest = async () => {
    if (!selectedId) return;
    const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
    if (!selectedItem || selectedItem.type !== 'existing') {
      alert('Select an existing schedule to modify priority.');
      return;
    }

    setLoading(true);
    try {
      const maxPriority = Math.max(...conflicts.map((c) => Number(c.priority || 0)), 0);
      const newPriority = maxPriority + 1;

      // build payload for update; make sure we don't accidentally overwrite days_of_week
      const payload = buildUpdatePayloadFromItem({ ...selectedItem, priority: newPriority });
      // ensure payload retains the existing days unless user explicitly changed them
      payload.days_of_week = selectedItem.days_of_week ?? payload.days_of_week;

      const res = await updateSchedule(payload);
      if (res && res.success) {
        onAfterResolve({ action: 'setHighest', schedule_id: selectedItem.schedule_id });
        onClose();
      } else {
        alert(res?.message || 'Failed to set priority');
      }
    } catch (err) {
      console.error(err);
      alert('Error while updating schedule');
    } finally {
      setLoading(false);
    }
  };

  // Action: Delete selected schedule
  const handleDeleteSelected = async () => {
    if (!selectedId) return;
    const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
    if (!selectedItem || selectedItem.type !== 'existing') {
      alert('Select an existing schedule to delete.');
      return;
    }

    if (!confirm('Delete selected schedule? This cannot be undone.')) return;
    setLoading(true);
    try {
      const res = await deleteSchedule(selectedItem.schedule_id);
      if (res && res.success) {
        onAfterResolve({ action: 'delete', schedule_id: selectedItem.schedule_id });
        onClose();
      } else {
        alert(res?.message || 'Failed to delete schedule');
      }
    } catch (err) {
      console.error(err);
      alert('Error while deleting schedule');
    } finally {
      setLoading(false);
    }
  };

  // Action: Keep both - create proposed with higher priority
  const handleKeepBoth = async () => {
    if (!proposed) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const maxPriority = Math.max(...conflicts.map((c) => Number(c.priority || 0)), 0);
      const newData = { ...proposed, priority: maxPriority + 1 };
      const res = await createSchedule(newData);
      if (res && res.success) {
        onAfterResolve({ action: 'keepBoth', created: res.data || res });
        onClose();
      } else if (res && !res.success && res.conflicts) {
        alert('Server returned conflicts when creating schedule: ' + JSON.stringify(res.conflicts));
      } else {
        alert(res?.message || 'Failed to create schedule');
      }
    } catch (err) {
      console.error(err);
      alert('Error while creating schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Resolve Schedule Conflict</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary">Select a schedule to act on and choose an action.</Typography>

        <Box mt={2} mb={1}>
          <RadioGroup value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
            {displayList.map((item) => (
              <FormControlLabel
                key={itemValue(item) + (item.type || '')}
                value={itemValue(item)}   // ✅ uses schedule_id or 'proposed'
                control={<Radio />}
                label={
                  <div>
                    <strong>{item.type === 'proposed' ? 'New Schedule' : item.shift_name || 'Shift'}</strong>
                    <div style={{ fontSize: 12 }}>{item.start_time} - {item.end_time} • {item.days_of_week}</div>
                    {item.type === 'existing' && <div style={{ fontSize: 12 }}>Priority: {item.priority}</div>}
                  </div>
                }
              />
            ))}
          </RadioGroup>
        </Box>

        <Divider />

        {/* Days of week editor */}
        <Box mt={2}>
          <Typography variant="subtitle2">Edit Days of Week</Typography>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            Toggle weekdays that this selected schedule applies to, then press Save.
          </Typography>

          <FormGroup row>
            {WEEKDAYS.map((d) => (
              <FormControlLabel
                key={d}
                control={<Checkbox checked={daysSelected.includes(d)} onChange={() => toggleDay(d)} />}
                label={d}
              />
            ))}
          </FormGroup>

          <Box mt={2} display="flex" gap={2}>
            <Button variant="contained" onClick={handleSaveDays} disabled={!selectedId || savingDays}>
              Save Days
            </Button>
            <Button variant="outlined" onClick={() => {
              const item = displayList.find((it) => itemValue(it) === selectedId);
              const ds = item && item.days_of_week ? item.days_of_week.split(',').map(d => d.trim()) : [];
              setDaysSelected(ds);
            }}>
              Reset
            </Button>
          </Box>
        </Box>

        <Divider />

        <Box mt={2}>
          <Typography variant="subtitle2">Actions</Typography>
          <Box mt={1} display="flex" gap={2}>
            <Button variant="contained" color="primary" onClick={handleSetAsHighest} disabled={!selectedId || loading}>
              Set as Highest Priority
            </Button>
            <Button variant="outlined" color="error" onClick={handleDeleteSelected} disabled={!selectedId || loading}>
              Delete Selected
            </Button>
            <Button variant="contained" color="success" onClick={handleKeepBoth} disabled={loading || !proposed}>
              Keep Both (Create New With Higher Priority)
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading || savingDays}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}


// import React, { useMemo, useState, useEffect } from 'react';
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   RadioGroup,
//   Radio,
//   FormControlLabel,
//   Typography,
//   Divider,
//   Box,
//   Checkbox,
//   FormGroup,
// } from '@mui/material';
// import ScheduleManagerAPI from '../schedule-manager-API/scheduleManagerAPI';

// const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// export default function ConflictResolverModal({
//   open,
//   onClose,
//   conflicts = [],
//   proposed = null,
//   onAfterResolve = () => {},
//   handlers = {},
// }) {
//   // selectedId is stored as string: either 'proposed' or String(schedule_id)
//   const [selectedId, setSelectedId] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [daysSelected, setDaysSelected] = useState([]); // ['Mon','Tue',...]
//   const [savingDays, setSavingDays] = useState(false);

//   // default handlers fallback to ScheduleManagerAPI
//   const deleteSchedule = handlers.deleteSchedule || (async (id) => {
//     return ScheduleManagerAPI.deleteSchedule(id);
//   });
//   const updateSchedule = handlers.updateSchedule || (async (id, data) => {
//     return ScheduleManagerAPI.updateSchedule(id, data);
//   });
//   const createSchedule = handlers.createSchedule || (async (data) => {
//     return ScheduleManagerAPI.createSchedule(data);
//   });

//   // compute display list: existing schedules + optional proposed
//   const displayList = useMemo(() => {
//     const list = conflicts.map((c) => ({ type: 'existing', ...c }));
//     if (proposed) list.push({ type: 'proposed', ...proposed });
//     return list;
//   }, [conflicts, proposed]);

//   // helper to get the string value used in radios for an item
//   const itemValue = (item) => (item.type === 'proposed' ? 'proposed' : String(item.schedule_id));

//   // When modal opens or conflicts change, set sensible default selected schedule (string)
//   useEffect(() => {
//     if (conflicts && conflicts.length) {
//       setSelectedId(String(conflicts[0].schedule_id));
//     } else if (proposed) {
//       setSelectedId('proposed');
//     } else {
//       setSelectedId(null);
//     }
//   }, [open, conflicts, proposed]);

//   // When selection changes, populate daysSelected from the selected item
//   useEffect(() => {
//     if (!selectedId) {
//       setDaysSelected([]);
//       return;
//     }
//     const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
//     if (selectedItem) {
//       const ds = selectedItem.days_of_week
//         ? selectedItem.days_of_week.split(',').map((d) => d.trim()).filter(Boolean)
//         : [];
//       setDaysSelected(ds);
//     } else {
//       setDaysSelected([]);
//     }
//   }, [selectedId, displayList]);

//   // toggle a weekday
//   const toggleDay = (day) => {
//     setDaysSelected((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
//   };

//   // Helper: build update payload from an "item" (conflict object). update.php expects:
//   // work_time_id, effective_date, end_date, recurrence_type, recurrence_interval, days_of_week, priority, schedule_id
//   const buildUpdatePayloadFromItem = (item) => {
//   const effective_date = item.effective_date ?? new Date().toISOString().slice(0, 10);
//   const end_date = item.end_date ?? null;
//   const recurrence_type = item.recurrence_type ?? 'weekly';
//   const recurrence_interval = item.recurrence_interval ?? 1;
//   const priority = item.priority ?? 1;
//   const days_of_week = (Array.isArray(daysSelected) && daysSelected.length > 0)
//     ? daysSelected.join(',')
//     : (item.days_of_week ?? null);
//   return {
//     schedule_id: item.schedule_id,
//     effective_date,
//     end_date,
//     recurrence_type,
//     recurrence_interval,
//     days_of_week,
//     priority,
//   };
// };


//   // Save days_of_week for selected schedule
//   const handleSaveDays = async () => {
//     if (!selectedId) {
//       alert('No schedule selected');
//       return;
//     }
//     const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
//     if (!selectedItem || selectedItem.type !== 'existing') {
//       alert('Can only edit days for existing schedules.');
//       return;
//     }

//     const originalDays = (selectedItem.days_of_week || '').split(',').map((d) => d.trim()).filter(Boolean).join(',');
//     console.error('originalDays', originalDays );
//     const newDays = (daysSelected || []).join(',');
//     if (originalDays === newDays) {
//       alert('No change detected in days_of_week.');
//       return;
//     }

//     const payload = buildUpdatePayloadFromItem(selectedItem);
//     console.log('buildUpdatePayloadFromItem', payload);

//     setSavingDays(true);
//     try {
//       // updateSchedule should accept schedule_id and payload; ensure API adapts if necessary
//       const res = await updateSchedule(payload);
//       console.log('update schedule', res);
//       if (res && res.success) {
//         onAfterResolve({ action: 'update_days', schedule_id: selectedItem.schedule_id, days_of_week: newDays });
//         onClose();
//       } else {
//         alert(res?.message || 'Failed to update schedule days.');
//       }
//     } catch (err) {
//       console.error(err);
//       alert('Error while saving days.');
//     } finally {
//       setSavingDays(false);
//     }
//   };

//   // Action: Set selected schedule as highest priority
//   const handleSetAsHighest = async () => {
//     if (!selectedId) return;
//     const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
//     if (!selectedItem || selectedItem.type !== 'existing') {
//       alert('Select an existing schedule to modify priority.');
//       return;
//     }

//     setLoading(true);
//     try {
//       const maxPriority = Math.max(...conflicts.map((c) => Number(c.priority || 0)), 0);
//       const newPriority = maxPriority + 1;
//       const payload = buildUpdatePayloadFromItem({ ...selectedItem, priority: newPriority });
//       const res = await updateSchedule(payload);
//       if (res && res.success) {
//         onAfterResolve({ action: 'setHighest', schedule_id: selectedItem.schedule_id });
//         onClose();
//       } else {
//         alert(res?.message || 'Failed to set priority');
//       }
//     } catch (err) {
//       console.error(err);
//       alert('Error while updating schedule');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Action: Delete selected schedule
//   const handleDeleteSelected = async () => {
//     if (!selectedId) return;
//     const selectedItem = displayList.find((it) => itemValue(it) === selectedId);
//     if (!selectedItem || selectedItem.type !== 'existing') {
//       alert('Select an existing schedule to delete.');
//       return;
//     }

//     if (!confirm('Delete selected schedule? This cannot be undone.')) return;
//     setLoading(true);
//     try {
//       const res = await deleteSchedule(selectedItem.schedule_id);
//       if (res && res.success) {
//         onAfterResolve({ action: 'delete', schedule_id: selectedItem.schedule_id });
//         onClose();
//       } else {
//         alert(res?.message || 'Failed to delete schedule');
//       }
//     } catch (err) {
//       console.error(err);
//       alert('Error while deleting schedule');
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Action: Keep both - create proposed with higher priority
//   const handleKeepBoth = async () => {
//     if (!proposed) {
//       onClose();
//       return;
//     }
//     setLoading(true);
//     try {
//       const maxPriority = Math.max(...conflicts.map((c) => Number(c.priority || 0)), 0);
//       const newData = { ...proposed, priority: maxPriority + 1 };
//       const res = await createSchedule(newData);
//       if (res && res.success) {
//         onAfterResolve({ action: 'keepBoth', created: res.data || res });
//         onClose();
//       } else if (res && !res.success && res.conflicts) {
//         alert('Server returned conflicts when creating schedule: ' + JSON.stringify(res.conflicts));
//       } else {
//         alert(res?.message || 'Failed to create schedule');
//       }
//     } catch (err) {
//       console.error(err);
//       alert('Error while creating schedule');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
//       <DialogTitle>Resolve Schedule Conflict</DialogTitle>
//       <DialogContent dividers>
//         <Typography variant="body2" color="textSecondary">Select a schedule to act on and choose an action.</Typography>

//         <Box mt={2} mb={1}>
//           <RadioGroup value={selectedId || ''} onChange={(e) => setSelectedId(e.target.value)}>
//             {displayList.map((item) => (
//               <FormControlLabel
//                 key={itemValue(item) + (item.type || '')}
//                 value={itemValue(item)}   // ✅ uses schedule_id or 'proposed'
//                 control={<Radio />}
//                 label={
//                   <div>
//                     <strong>{item.type === 'proposed' ? 'New Schedule' : item.shift_name || 'Shift'}</strong>
//                     <div style={{ fontSize: 12 }}>{item.start_time} - {item.end_time} • {item.days_of_week}</div>
//                     {item.type === 'existing' && <div style={{ fontSize: 12 }}>Priority: {item.priority}</div>}
//                   </div>
//                 }
//               />
//             ))}
//           </RadioGroup>
//         </Box>

//         <Divider />

//         {/* Days of week editor */}
//         <Box mt={2}>
//           <Typography variant="subtitle2">Edit Days of Week</Typography>
//           <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
//             Toggle weekdays that this selected schedule applies to, then press Save.
//           </Typography>

//           <FormGroup row>
//             {WEEKDAYS.map((d) => (
//               <FormControlLabel
//                 key={d}
//                 control={<Checkbox checked={daysSelected.includes(d)} onChange={() => toggleDay(d)} />}
//                 label={d}
//               />
//             ))}
//           </FormGroup>

//           <Box mt={2} display="flex" gap={2}>
//             <Button variant="contained" onClick={handleSaveDays} disabled={!selectedId || savingDays}>
//               Save Days
//             </Button>
//             <Button variant="outlined" onClick={() => {
//               const item = displayList.find((it) => itemValue(it) === selectedId);
//               const ds = item && item.days_of_week ? item.days_of_week.split(',').map(d => d.trim()) : [];
//               setDaysSelected(ds);
//             }}>
//               Reset
//             </Button>
//           </Box>
//         </Box>

//         <Divider />

//         <Box mt={2}>
//           <Typography variant="subtitle2">Actions</Typography>
//           <Box mt={1} display="flex" gap={2}>
//             <Button variant="contained" color="primary" onClick={handleSetAsHighest} disabled={!selectedId || loading}>
//               Set as Highest Priority
//             </Button>
//             <Button variant="outlined" color="error" onClick={handleDeleteSelected} disabled={!selectedId || loading}>
//               Delete Selected
//             </Button>
//             <Button variant="contained" color="success" onClick={handleKeepBoth} disabled={loading || !proposed}>
//               Keep Both (Create New With Higher Priority)
//             </Button>
//           </Box>
//         </Box>
//       </DialogContent>
//       <DialogActions>
//         <Button onClick={onClose} disabled={loading || savingDays}>Close</Button>
//       </DialogActions>
//     </Dialog>
//   );
// }

