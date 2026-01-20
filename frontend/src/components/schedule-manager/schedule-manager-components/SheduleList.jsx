// ScheduleList.jsx
import React, { useState } from "react";
import {
  Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, Typography, Box, Modal, TextField, Select, MenuItem,
  Checkbox, FormControlLabel, Switch, Button, useTheme, useMediaQuery,
  Card, CardContent, CardActions, Stack, Chip
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

const ALL_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ScheduleList({
  schedules = [],
  workTimes = [],
  employees = [],
  updateSchedule,
  deleteSchedule,
  fetchSchedules,
  sw,
}) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm")); // small screens use card/list view

  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);

  const openEditModal = (s) => {
    setEditingSchedule(s);
    setEditForm({
      schedule_id: s.schedule_id,
      effective_date: s.effective_date || "",
      end_date: s.end_date || "",
      recurrence_type: s.recurrence_type || "none",
      recurrence_interval: s.recurrence_interval ?? 1,
      days_of_week: s.days_of_week ? s.days_of_week.split(",").map(d => d.trim()) : [],
      occurrence_limit: s.occurrence_limit ?? "",
      priority: s.priority ?? 1,
      is_active: s.is_active === 1 || s.is_active === true,
    });
    setShowEditModal(true);
  };

  const handleEditField = (key, value) => setEditForm(p => ({ ...p, [key]: value }));

  const toggleWeekday = (day) => {
    setEditForm((prev) => {
      const current = Array.isArray(prev.days_of_week) ? [...prev.days_of_week] : [];
      const included = current.includes(day);
      const next = included ? current.filter(d => d !== day) : [...current, day];
      return { ...prev, days_of_week: next };
    });
  };

  const saveEdit = async () => {
    if (!editForm || !editForm.schedule_id) return;
    const payload = { schedule_id: editForm.schedule_id };

    payload.effective_date = editForm.effective_date || null;
    payload.end_date = editForm.end_date ? editForm.end_date : null;
    payload.recurrence_type = editForm.recurrence_type;
    payload.recurrence_interval = Number(editForm.recurrence_interval) || 1;
    payload.occurrence_limit = editForm.occurrence_limit !== "" ? Number(editForm.occurrence_limit) : null;
    payload.priority = Number(editForm.priority) || 1;
    payload.is_active = editForm.is_active ? 1 : 0;

    if (editForm.recurrence_type === "weekly") {
      payload.days_of_week = Array.isArray(editForm.days_of_week) && editForm.days_of_week.length ? editForm.days_of_week.join(",") : null;
    } else {
      payload.days_of_week = null;
    }

    try {
      const res = await updateSchedule(payload);
      if (res && res.success) {
        await sw({ title: "Saved", text: "Schedule updated", icon: "success" });
        setShowEditModal(false);
        fetchSchedules();
      } else {
        await sw({ title: "Error", text: res?.message || "Update failed", icon: "error" });
      }
    } catch (err) {
      console.error(err);
      await sw({ title: "Error", text: "Network or server error", icon: "error" });
    }
  };

  const handleDelete = async (schedule_id) => {
    const confirmed = await sw({
      title: "Delete schedule?",
      text: "This will permanently delete the schedule record.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    });
    if (!confirmed.isConfirmed) return;
    try {
      const res = await deleteSchedule(schedule_id);
      if (res && res.success) {
        await sw({ title: "Deleted", text: "Schedule removed.", icon: "success" });
        fetchSchedules();
      } else {
        await sw({ title: "Error", text: res?.message || "Delete failed", icon: "error" });
      }
    } catch (err) {
      console.error(err);
      await sw({ title: "Error", text: "Network or server error", icon: "error" });
    }
  };

  // helper to render employee name
  const employeeName = (employee_id) => {
    const emp = employees.find(e => e.employee_id === employee_id);
    return emp ? `${emp.first_name} ${emp.last_name}` : String(employee_id || "-");
  };

  return (
    <Box mt={3}>
      <Typography variant="h6" mb={2}>Existing Schedules</Typography>

      {/* Desktop / md+ -> Table with horizontal scroll container */}
      {!isSmall ? (
        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Shift</TableCell>
                <TableCell>Effective</TableCell>
                <TableCell>End</TableCell>
                <TableCell>Recurrence</TableCell>
                <TableCell>Interval</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Limit</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(schedules) && schedules.map(s => (
                <TableRow key={s.schedule_id}>
                  <TableCell>{employeeName(s.employee_id)}</TableCell>
                  <TableCell>{s.shift_name}</TableCell>
                  <TableCell>{s.effective_date || '-'}</TableCell>
                  <TableCell>{s.end_date || '-'}</TableCell>
                  <TableCell>{s.recurrence_type}</TableCell>
                  <TableCell>{s.recurrence_interval}</TableCell>
                  <TableCell>{s.days_of_week || (s.recurrence_type === 'weekly' ? 'All' : '-')}</TableCell>
                  <TableCell>{s.occurrence_limit ?? '-'}</TableCell>
                  <TableCell>{s.is_active ? 'Yes' : 'No'}</TableCell>
                  <TableCell>{s.priority}</TableCell>
                  <TableCell>{s.created_at || '-'}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <IconButton size="small" onClick={() => openEditModal(s)} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(s.schedule_id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        /* Mobile / small -> Card/List view */
        <Stack spacing={2}>
          {Array.isArray(schedules) && schedules.map(s => (
            <Card key={s.schedule_id} variant="outlined" sx={{ overflow: "visible" }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {employeeName(s.employee_id)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.shift_name || "-"}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                      <Chip size="small" label={`Effective: ${s.effective_date || "-"}`} />
                      <Chip size="small" label={`End: ${s.end_date || "-"}`} />
                      <Chip size="small" label={`Recurrence: ${s.recurrence_type || "-"}`} />
                      <Chip size="small" label={`Interval: ${s.recurrence_interval ?? "-"}`} />
                    </Stack>

                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">Days:</Typography>
                      <Box sx={{ mt: 0.5, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {s.days_of_week ? s.days_of_week.split(",").map(d => <Chip key={d} size="small" label={d} />) : (s.recurrence_type === 'weekly' ? <Chip size="small" label="All" /> : <Typography variant="caption" color="text.secondary">-</Typography>)}
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                      <Typography variant="caption">Active:</Typography>
                      <Typography variant="body2">{s.is_active ? "Yes" : "No"}</Typography>
                      <Typography variant="caption" sx={{ ml: 2 }}>Priority:</Typography>
                      <Typography variant="body2">{s.priority}</Typography>
                    </Stack>
                  </Box>

                  <Box sx={{ ml: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                    <IconButton size="small" onClick={() => openEditModal(s)} title="Edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(s.schedule_id)} title="Delete">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 2, pt: 0 }}>
                <Typography variant="caption" color="text.secondary">Created: {s.created_at || "-"}</Typography>
              </CardActions>
            </Card>
          ))}
        </Stack>
      )}

      {/* Edit Modal (responsive sizing) */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 3,
            borderRadius: 1,
            width: { xs: '95%', sm: '85%', md: '60%' },
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          <Typography variant="h6" mb={2}>Edit Schedule</Typography>

          {editForm && (
            <Box component="form" noValidate autoComplete="off" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              <TextField
                type="date"
                label="Effective Date"
                value={editForm.effective_date || ""}
                onChange={(e) => handleEditField('effective_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="date"
                label="End Date (Optional)"
                value={editForm.end_date || ""}
                onChange={(e) => handleEditField('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />

              <Box>
                <Typography variant="caption" display="block" gutterBottom>Recurrence</Typography>
                <Select
                  fullWidth
                  value={editForm.recurrence_type || "none"}
                  onChange={(e) => handleEditField('recurrence_type', e.target.value)}
                >
                  <MenuItem value="none">None</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </Box>

              <TextField
                type="number"
                label="Recurrence Interval"
                value={editForm.recurrence_interval ?? 1}
                onChange={(e) => handleEditField('recurrence_interval', Number(e.target.value || 1))}
                inputProps={{ min: 1 }}
                fullWidth
              />

              {editForm.recurrence_type === 'weekly' ? (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" display="block" gutterBottom>Weekdays</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {ALL_WEEKDAYS.map(d => {
                      const checked = Array.isArray(editForm.days_of_week) && editForm.days_of_week.includes(d);
                      return (
                        <FormControlLabel
                          key={d}
                          control={<Checkbox checked={checked} onChange={() => toggleWeekday(d)} />}
                          label={d}
                          sx={{ mr: 1 }}
                        />
                      );
                    })}
                  </Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    If you leave all weekdays unchecked, the schedule will apply to <strong>all weekdays</strong>.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="body2" color="text.secondary">
                    {editForm.recurrence_type === 'daily'
                      ? 'Daily recurrence ignores weekdays. Use the interval to repeat every X days.'
                      : editForm.recurrence_type === 'monthly'
                        ? 'Monthly recurrence repeats on the same day-of-month as Effective Date (e.g. 15th every X months).'
                        : 'One-time schedule applies only on Effective Date.'}
                  </Typography>
                </Box>
              )}

              <TextField
                type="number"
                label="Occurrence Limit"
                value={editForm.occurrence_limit ?? ""}
                onChange={(e) => handleEditField('occurrence_limit', e.target.value)}
                fullWidth
              />
              <TextField
                type="number"
                label="Priority"
                value={editForm.priority ?? 1}
                onChange={(e) => handleEditField('priority', e.target.value)}
                fullWidth
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch checked={!!editForm.is_active} onChange={() => handleEditField('is_active', !editForm.is_active)} />
                <Typography>Active</Typography>
              </Box>

              <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="contained" onClick={saveEdit}>Save changes</Button>
                <Button variant="outlined" onClick={() => setShowEditModal(false)}>Cancel</Button>
              </Box>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
