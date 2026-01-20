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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const OT_Multiplier_Modal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [label, setLabel] = useState("");
  const [multiplier, setMultiplier] = useState(""); // keep as string for typing
  const [errors, setErrors] = useState({});

  // Populate fields when initialData changes or when opened
  useEffect(() => {
    if (initialData) {
      setLabel(initialData.label ?? "");
      setMultiplier(
        initialData.multiplier !== undefined && initialData.multiplier !== null
          ? String(initialData.multiplier)
          : ""
      );
    } else {
      setLabel("");
      setMultiplier("");
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const e = {};
    if (!label.trim()) e.label = "Label is required";
    const num = parseFloat(multiplier);
    if (multiplier === "") {
      e.multiplier = "Multiplier is required";
    } else if (Number.isNaN(num)) {
      e.multiplier = "Enter a valid number";
    } else if (num <= 0) {
      e.multiplier = "Multiplier must be greater than 0";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    if (ev) ev.preventDefault();
    if (!validate()) return;
    onSubmit({
      id: initialData?.id,
      label: label.trim(),
      multiplier: parseFloat(multiplier),
    });
    // don't automatically call onClose — let the parent decide when to close after success.
  };

  return (
    <Dialog
      open={!!isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="ot-multiplier-dialog-title"
    >
      <DialogTitle id="ot-multiplier-dialog-title" sx={{ pr: 6 }}>
        {initialData ? "Edit Overtime multiplier" : "Add Overtime multiplier"}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label="Label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
              fullWidth
              variant="outlined"
              size="small"
              error={!!errors.label}
              helperText={errors.label}
              inputProps={{ "aria-label": "Overtime type label" }}
            />

            <TextField
              label="Multiplier"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              fullWidth
              variant="outlined"
              size="small"
              error={!!errors.multiplier}
              helperText={errors.multiplier || "e.g. 1.25"}
              type="number"
              inputProps={{
                step: "0.01",
                min: "0",
                "aria-label": "Overtime multiplier",
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button type="submit" variant="contained" size="small">
            {initialData ? "Update" : "Add"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

OT_Multiplier_Modal.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    label: PropTypes.string,
    multiplier: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
};

OT_Multiplier_Modal.defaultProps = {
  isOpen: false,
  initialData: null,
};

export default OT_Multiplier_Modal;



// import { useState, useEffect } from 'react';

// const OT_Multiplier_Modal = ({ isOpen, onClose, onSubmit, initialData }) => {
//   const [label, setLabel] = useState('');
//   const [multiplier, setMultiplier] = useState('');

//   useEffect(() => {
//     if (initialData) {
//       setLabel(initialData.label);
//       setMultiplier(initialData.multiplier);
//     } else {
//       setLabel('');
//       setMultiplier('');
//     }
//   }, [initialData]);

//   const handleSubmit = () => {
//     onSubmit({
//       id: initialData?.id,
//       label,
//       multiplier: parseFloat(multiplier),
//     });
//   };

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="bg-white p-4 rounded w-[350px]">
//         <h2 className="mb-4 text-lg font-bold">{initialData ? 'Edit' : 'Add'} Overtime Type</h2>

//         <label className="block mb-2">
//           Label:
//           <input
//             className="w-full p-2 border rounded"
//             value={label}
//             onChange={(e) => setLabel(e.target.value)}
//           />
//         </label>

//         <label className="block mb-4">
//           Multiplier:
//           <input
//             className="w-full p-2 border rounded"
//             type="number"
//             step="0.01"
//             value={multiplier}
//             onChange={(e) => setMultiplier(e.target.value)}
//           />
//         </label>

//         <div className="flex justify-end gap-2">
//           <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
//           <button onClick={handleSubmit} className="px-4 py-2 text-white bg-blue-600 rounded">
//             {initialData ? 'Update' : 'Add'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OT_Multiplier_Modal;
