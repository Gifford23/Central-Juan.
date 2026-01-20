import React, { useEffect, useState } from "react";
import BASE_URL from "../../../backend/server/config";

import {
  Avatar,
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Select,
  MenuItem,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Stack,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function CommissionManager() {
  const [payrolls, setPayrolls] = useState([]);
  const [commissions, setCommissions] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingCommission, setEditingCommission] = useState(null);

  const [dailyRows, setDailyRows] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // per-row editing state
  const [rowEditingId, setRowEditingId] = useState(null);
  const [editingAmounts, setEditingAmounts] = useState({});
  const [editingDates, setEditingDates] = useState({});

  // add-day inputs
  const [newDayDate, setNewDayDate] = useState("");
  const [newDayAmount, setNewDayAmount] = useState("");

  // date range filters for the selected commission (placed below Commission Info card)
  const [filterFrom, setFilterFrom] = useState("");
  const [filterUntil, setFilterUntil] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line
  }, []);

  // ---------------- helpers ----------------
  async function safeJson(res) {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error("Invalid JSON from server:\n" + text.slice(0, 800));
    }
  }

  const formatDateLong = (date) =>
    new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const computeTotal = (rows) =>
    rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const formatCurrency = (n) =>
    `₱ ${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  function initialsFromName(name = "") {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map(p => p.charAt(0).toUpperCase()).join("");
  }

  function showSnack(message, severity = "success") {
    setSnack({ open: true, message, severity });
  }
  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  // safe getter for basic salary on editingCommission
  function getBasicSalaryFromRow(row) {
    if (!row) return null;
    if (row.basic_salary !== undefined && row.basic_salary !== null && row.basic_salary !== "") return Number(row.basic_salary);
    if (row.base_salary !== undefined && row.base_salary !== null && row.base_salary !== "") return Number(row.base_salary);
    if (row.basicSalary !== undefined && row.basicSalary !== null && row.basicSalary !== "") return Number(row.basicSalary);
    return null;
  }

  // Compare helper -> returns 'above'|'below'|'none'
  function compareAmountToBasic(amount, basic) {
    if (basic === null || basic === undefined || Number.isNaN(Number(basic))) return "none";
    if (!amount && amount !== 0) return "none";
    const a = Number(amount);
    if (Number.isNaN(a)) return "none";
    return a > Number(basic) ? "above" : "below";
  }

  // Chip render for comparison (faded)
  function ComparisonChip({ amount, basic }) {
    const comp = compareAmountToBasic(amount, basic);
    if (comp === "none") {
      return <Chip label="—" size="small" />;
    }
    const success = comp === "above";
    return (
      <Chip
        label={success ? "Above basic" : "Below basic"}
        size="small"
        sx={{
          bgcolor: success ? "success.light" : "error.light",
          color: success ? "success.dark" : "error.dark",
          fontWeight: 700,
        }}
      />
    );
  }

  // filter helper: returns rows between from/until (inclusive)
  function filterDailyByDate(rows, from, until) {
    if (!from && !until) return rows;

    const fromDate = from ? new Date(from) : null;
    const untilDate = until ? new Date(until) : null;

    return rows.filter(r => {
      const d = new Date(r.date);
      if (fromDate && d < fromDate) return false;
      if (untilDate && d > untilDate) return false;
      return true;
    }).sort((a,b) => new Date(a.date) - new Date(b.date));
  }

  // ---------------- data ----------------
  async function fetchAll() {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`${BASE_URL}/commission/get_payrolls.php`),
        fetch(`${BASE_URL}/commission/get_commissions.php`),
      ]);
      const pJson = await safeJson(pRes);
      const cJson = await safeJson(cRes);
      if (!pJson.success) throw new Error(pJson.message || "Failed to load payrolls");
      if (!cJson.success) throw new Error(cJson.message || "Failed to load commissions");
      setPayrolls(pJson.data || []);
      setCommissions(cJson.data || []);
    } catch (err) {
      showSnack(err.message || "Load failed", "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleCommission(payroll_id, value) {
    try {
      const form = new FormData();
      form.append("payroll_id", payroll_id);
      form.append("commission_based", value);
      const res = await fetch(`${BASE_URL}/commission/update_payroll.php`, { method: "POST", body: form });
      const json = await safeJson(res);
      if (!json.success) throw new Error(json.message || "Update failed");
      showSnack("Updated payroll");
      await fetchAll();
    } catch (err) {
      showSnack(err.message || "Update failed", "error");
    }
  }

  // ---------------- modal & daily ----------------
  function openEditDialog(row) {
    setEditingCommission(row);
    setNewDayDate("");
    setNewDayAmount("");
    // reset date filters when opening a different commission
    setFilterFrom("");
    setFilterUntil("");
    setRowEditingId(null);
    setEditingAmounts({});
    setEditingDates({});
    fetchDailyRows(row.commission_id);
    setEditOpen(true);
  }

  function closeEditDialog() {
    setEditOpen(false);
    setEditingCommission(null);
    setDailyRows([]);
    setRowEditingId(null);
    setEditingAmounts({});
    setEditingDates({});
  }

  async function fetchDailyRows(commission_id) {
    setDailyLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/commission/get_commission_daily.php?commission_id=${commission_id}`);
      const json = await safeJson(res);
      if (!json.success) throw new Error(json.message || "Failed to load daily");

      const normalized = (json.data || []).map(r => {
        if (!r.date && r.work_date) {
          r.date = r.work_date;
          delete r.work_date;
        }
        return r;
      });

      setDailyRows(normalized);

      const amountInit = {};
      const dateInit = {};
      normalized.forEach(r => {
        amountInit[r.id] = Number(r.amount).toFixed(2);
        dateInit[r.id] = r.date;
      });
      setEditingAmounts(amountInit);
      setEditingDates(dateInit);
    } catch (err) {
      showSnack(err.message || "Failed to load daily", "error");
      setDailyRows([]);
      setEditingAmounts({});
      setEditingDates({});
    } finally {
      setDailyLoading(false);
    }
  }

  async function addDailyRow() {
    if (!editingCommission) return;
    if (!newDayDate) return showSnack("Choose date", "error");
    if (newDayAmount === "" || isNaN(newDayAmount) || Number(newDayAmount) < 0) return showSnack("Invalid amount", "error");

    try {
      const form = new FormData();
      form.append("commission_id", editingCommission.commission_id);
      form.append("date", newDayDate);
      form.append("amount", Number(newDayAmount).toFixed(2));
      const res = await fetch(`${BASE_URL}/commission/add_commission_day.php`, { method: "POST", body: form });
      const json = await safeJson(res);
      if (!json.success) throw new Error(json.message || "Add failed");
      showSnack("Day added");
      setNewDayDate("");
      setNewDayAmount("");
      await fetchDailyRows(editingCommission.commission_id);
      await fetchAll();
    } catch (err) {
      showSnack(err.message || "Add failed", "error");
    }
  }

  function startRowEdit(id) {
    setRowEditingId(id);
  }
  function cancelRowEdit() {
    setRowEditingId(null);
  }

  async function saveRowEdit(id) {
    const amount = editingAmounts[id];
    const date = editingDates[id];
    if (amount === "" || isNaN(amount) || Number(amount) < 0) return showSnack("Invalid amount", "error");
    if (!date || isNaN(Date.parse(date))) return showSnack("Invalid date", "error");

    try {
      const form = new FormData();
      form.append("day_id", id);
      form.append("amount", Number(amount).toFixed(2));
      form.append("date", date);
      const res = await fetch(`${BASE_URL}/commission/update_commission_day.php`, { method: "POST", body: form });
      const json = await safeJson(res);
      if (!json.success) throw new Error(json.message || "Update failed");
      showSnack("Saved");
      setRowEditingId(null);
      await fetchDailyRows(editingCommission.commission_id);
      await fetchAll();
    } catch (err) {
      showSnack(err.message || "Save failed", "error");
    }
  }

  async function deleteRow(id) {
    if (!confirm("Delete this daily commission?")) return;
    try {
      const form = new FormData();
      form.append("day_id", id);
      const res = await fetch(`${BASE_URL}/commission/delete_commission_day.php`, { method: "POST", body: form });
      const json = await safeJson(res);
      if (!json.success) throw new Error(json.message || "Delete failed");
      showSnack("Deleted");
      await fetchDailyRows(editingCommission.commission_id);
      await fetchAll();
    } catch (err) {
      showSnack(err.message || "Delete failed", "error");
    }
  }

  // filtered rows according to date range
  const filteredDailyRows = filterDailyByDate(dailyRows, filterFrom, filterUntil);

  // ---------------- render ----------------
  return (
    <Box sx={{ p: 2, minHeight: "calc(100vh - 48px)", bgcolor: "#f7fafc" }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 2 }}>
        Commission Manager
      </Typography>

      <Grid container spacing={2} alignItems="stretch">
        {/* LEFT: Payrolls */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: "calc(100vh - 150px)", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Payrolls</Typography>
              <Tooltip title="Refresh">
                <IconButton onClick={fetchAll} size="small"><RefreshIcon /></IconButton>
              </Tooltip>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}><CircularProgress/></Box>
            ) : (
              <TableContainer sx={{ overflow: "auto", flex: 1 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 500 }}>Employee</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 110 }}>Commission Based?</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payrolls.map(p => (
                      <TableRow key={p.payroll_id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{p.position_name ?? ""}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>

                        <TableCell>
                          <Select
                            size="small"
                            value={p.commission_based ?? "no"}
                            onChange={e => toggleCommission(p.payroll_id, e.target.value)}
                            sx={{ minWidth: 96 }}
                          >
                            <MenuItem value="no">No</MenuItem>
                            <MenuItem value="yes">Yes</MenuItem>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* RIGHT: Commissions table (no date from/until columns) */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2, borderRadius: 2, height: "calc(100vh - 150px)", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Commissions</Typography>
              <Button variant="contained" onClick={fetchAll} startIcon={<RefreshIcon />}>Refresh</Button>
            </Stack>

            <Divider sx={{ mb: 1 }} />

            <TableContainer sx={{ overflow: "auto", flex: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 80 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Commission</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Salary</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography variant="h6" color="text.secondary">No commission records</Typography>
                        <Typography variant="body2" color="text.secondary">Enable commission for employees on the left to create commission records.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : commissions.map(c => (
                    <TableRow key={c.commission_id} hover>
                      <TableCell sx={{ minWidth: 80, fontWeight: 600 }}>{c.commission_id}</TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{c.name}</Typography>
                            <Typography variant="caption" color="text.secondary">ID: {c.employee_id}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell align="right">{formatCurrency(c.commission ?? c.total ?? 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(c.total ?? 0)}</TableCell>
                      <TableCell align="right">{formatCurrency(c.salary ?? 0)}</TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Edit commission and daily breakdown">
                            <IconButton onClick={() => openEditDialog(c)} color="primary">
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onClose={closeEditDialog} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit Commission
          <IconButton onClick={closeEditDialog} sx={{ position: "absolute", right: 12, top: 12 }} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Left: read-only info */}
            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1, color: "text.secondary" }}>Commission Info</Typography>

                <Stack spacing={1}>
                  <Typography variant="h6" sx={{ fontWeight: 800 }}>{editingCommission?.name ?? "—"}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}> Basic Salary: {editingCommission?.basic_salary ?? "—"}</Typography>

                  <Typography variant="body2" color="text.secondary">Employee ID: {editingCommission?.employee_id ?? "—"}</Typography>
                  {editingCommission?.position_name && <Typography variant="body2" color="text.secondary">Position: {editingCommission.position_name}</Typography>}
                  {editingCommission?.department_name && <Typography variant="body2" color="text.secondary">Department: {editingCommission.department_name}</Typography>}
                  {typeof editingCommission?.base_salary !== "undefined" && (
                    <Typography variant="body2" sx={{ mt: 1 }}>Basic Salary: <strong>{formatCurrency(editingCommission.base_salary)}</strong></Typography>
                  )}
                </Stack>
              </Paper>

              {/* DATE RANGE FILTER - placed BELOW Commission Info card */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Filter Commission Dates</Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                  <TextField
                    label="Date From"
                    type="date"
                    size="small"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 0, flex: 1 }}
                  />

                  <TextField
                    label="Date Until"
                    type="date"
                    size="small"
                    value={filterUntil}
                    onChange={(e) => setFilterUntil(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: 0, flex: 1 }}
                  />

                  <Button variant="outlined" onClick={() => { setFilterFrom(""); setFilterUntil(""); }}>
                    Clear
                  </Button>
                </Stack>
              </Paper>
            </Grid>

            {/* Right: daily breakdown */}
            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth:600 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Daily Commission Breakdown</Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">Total</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>{formatCurrency(computeTotal(filteredDailyRows))}</Typography>
                  </Stack>
                </Stack>

                <Box sx={{ mb: 2 }}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                    <TextField
                      type="date"
                      size="small"
                      value={newDayDate}
                      onChange={(e) => setNewDayDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 160 }}
                      aria-label="New day date"
                    />
                    <TextField
                      type="number"
                      size="small"
                      inputProps={{ step: "0.01" }}
                      placeholder="Amount"
                      value={newDayAmount}
                      onChange={(e) => setNewDayAmount(e.target.value)}
                      sx={{ minWidth: 140 }}
                      aria-label="New day amount"
                    />

                    {/* Add-day preview comparison chip */}
                    <Box>
                      <ComparisonChip
                        amount={newDayAmount === "" ? null : Number(newDayAmount)}
                        basic={getBasicSalaryFromRow(editingCommission)}
                      />
                    </Box>

                    <Button startIcon={<AddIcon />} variant="contained" onClick={addDailyRow}>Add Commission</Button>
                    <Box sx={{ flex: 1 }} />
                  </Stack>
                </Box>

                {dailyLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                  </Box>
                ) : (filteredDailyRows.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                    {dailyRows.length === 0 ? (
                      <>
                        <Typography variant="h6" gutterBottom>No daily commission yet</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Add daily commission above.</Typography>
                        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { /* focus */ }}>Add first day</Button>
                      </>
                    ) : (
                      <>
                        <Typography variant="h6" gutterBottom>No daily commission for selected range</Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>Try clearing the date filter or selecting a different range.</Typography>
                        <Button variant="outlined" onClick={() => { setFilterFrom(""); setFilterUntil(""); }}>Clear Filter</Button>
                      </>
                    )}
                  </Box>
                ) : (
                  <TableContainer sx={{ maxHeight: 340 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Vs Basic</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Amount</TableCell>
                          <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredDailyRows.map(d => {
                          // choose displayed amount for comparison depending on edit mode
                          const displayAmount = rowEditingId === d.id ? (editingAmounts[d.id] ?? d.amount) : d.amount;
                          const basic = getBasicSalaryFromRow(editingCommission);
                          return (
                            <TableRow key={d.id} hover>
                              <TableCell sx={{ minWidth: 150 }}>
                                {rowEditingId === d.id ? (
                                  <TextField
                                    type="date"
                                    size="small"
                                    value={editingDates[d.id]}
                                    onChange={(e) => setEditingDates(prev => ({ ...prev, [d.id]: e.target.value }))}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                  />
                                ) : (
                                  formatDateLong(d.date)
                                )}
                              </TableCell>

                              {/* Comparison column */}
                              <TableCell>
                                <ComparisonChip amount={displayAmount} basic={basic} />
                              </TableCell>

                              <TableCell align="right" sx={{ minWidth: 220 }}>
                                {rowEditingId === d.id ? (
                                  <TextField
                                    size="small"
                                    type="number"
                                    inputProps={{ step: "0.01" }}
                                    value={editingAmounts[d.id]}
                                    onChange={(e) => setEditingAmounts(prev => ({ ...prev, [d.id]: e.target.value }))}
                                    fullWidth
                                  />
                                ) : (
                                  formatCurrency(d.amount)
                                )}
                              </TableCell>

                              <TableCell align="right" sx={{ minWidth: 250 }}>
                                <Stack direction="row" spacing={1} justifyContent="flex-end">
                                  {rowEditingId === d.id ? (
                                    <>
                                      <Button size="small" variant="contained" onClick={() => saveRowEdit(d.id)}>Save</Button>
                                      <Button size="small" variant="outlined" onClick={cancelRowEdit}>Cancel</Button>
                                      <IconButton size="small" color="error" onClick={() => deleteRow(d.id)}><DeleteIcon /></IconButton>
                                    </>
                                  ) : (
                                    <>
                                      <IconButton size="small" color="primary" onClick={() => startRowEdit(d.id)}><EditIcon /></IconButton>
                                      <IconButton size="small" color="error" onClick={() => deleteRow(d.id)}><DeleteIcon /></IconButton>
                                    </>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ))}

                {/* footer total */}
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="subtitle2">Total Daily Commission</Typography>
                  <Typography variant="h6">{formatCurrency(computeTotal(filteredDailyRows))}</Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeEditDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={closeSnack}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ width: "100%" }}>{snack.message}</Alert>
      </Snackbar>
    </Box>
  );
}
