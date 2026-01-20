import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/**
 * OvertimeModalDialog (MUI Dialog)
 *
 * Props:
 *  - isOpen (bool)
 *  - onClose (fn)
 *  - onSubmit (fn) => receives { overtime_start, overtime_id }
 *  - overtimeData (object | null) => when present, modal is in edit mode
 *  - submitting (bool) optional -> show spinner/disabled submit when saving
 */
const OvertimeModal = ({ isOpen, onClose, onSubmit, overtimeData, submitting = false }) => {
  const [overtimeStart, setOvertimeStart] = useState("");
  const [errors, setErrors] = useState("");

  // Populate the form when editing
  useEffect(() => {
    if (overtimeData && overtimeData.overtime_start) {
      // Ensure value is "HH:mm" for input[type="time"]
      setOvertimeStart(overtimeData.overtime_start);
    } else {
      setOvertimeStart("");
    }
    setErrors("");
  }, [overtimeData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors("");

    // Basic validation: required and valid HH:mm format
    if (!overtimeStart) {
      setErrors("Please choose an overtime start time.");
      return;
    }
    const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!hhmmRegex.test(overtimeStart)) {
      setErrors("Time must be in HH:mm format.");
      return;
    }

    const payload = {
      overtime_start: overtimeStart,
      overtime_id: overtimeData ? overtimeData.overtime_id : null,
    };

    onSubmit(payload);
  };

  return (
    <Dialog
      open={Boolean(isOpen)}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="overtime-dialog-title"
    >
      <DialogTitle id="overtime-dialog-title" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="div">
            {overtimeData ? "Edit Overtime" : "Add Overtime"}
          </Typography>
        </Box>

        <IconButton
          aria-label="close"
          onClick={onClose}
          size="small"
          sx={{
            color: (theme) => theme.palette.text.secondary,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          {/* <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Enter the overtime start time. This value is saved as <code>HH:mm</code> and will be shown in the UI as a 12-hour time.
          </Typography> */}

          <TextField
            label="Overtime Start"
            type="time"
            value={overtimeStart}
            onChange={(e) => setOvertimeStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ step: 60 }} // allow minute increments of 1 minute (use 60 for minute steps of 1)
            fullWidth
            required
            autoFocus
          />

          {errors && (
            <Typography variant="caption" color="error" sx={{ display: "block", mt: 1 }}>
              {errors}
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" disabled={submitting}>
            Cancel
          </Button>

          <Button type="submit" variant="contained" color="primary" disabled={submitting}>
            {submitting ? (overtimeData ? "Updating..." : "Adding...") : overtimeData ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

OvertimeModal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  overtimeData: PropTypes.object,
  submitting: PropTypes.bool,
};

OvertimeModal.defaultProps = {
  isOpen: false,
  overtimeData: null,
  submitting: false,
};

export default OvertimeModal;
