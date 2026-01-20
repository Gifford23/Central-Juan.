// WorkTimeFormModal.jsx
import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useCreateWorkTime, useUpdateWorkTime, useFetchWorkTimes } from "../work-timeHooks/useWorkTimeAPI";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Checkbox,
  FormControlLabel,
  Tooltip,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  Stack
} from "@mui/material";

const WorkTimeFormModal = ({ isOpen, onClose, initialData, onSaved }) => {
  const [form, setForm] = useState({
    shift_name: "",
    start_time: "",
    end_time: "",
    valid_in_start: "",
    valid_in_end: "",
    valid_out_start: "",
    valid_out_end: "",
    is_default: 0,
  });

  // track validation errors for specific fields
  const [errors, setErrors] = useState({});

  const { create } = useCreateWorkTime();
  const { update } = useUpdateWorkTime();
  const { workTimes } = useFetchWorkTimes();

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm({
        shift_name: "",
        start_time: "",
        end_time: "",
        valid_in_start: "",
        valid_in_end: "",
        valid_out_start: "",
        valid_out_end: "",
        is_default: 0,
      });
    }

    // reset errors whenever modal opens/closes or initialData changes
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    // clear error for this field as user types/selects
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  // separate checkbox handler to maintain numeric 1/0
  const handleCheckbox = (e) => {
    const { name, checked } = e.target;
    setForm((s) => ({ ...s, [name]: checked ? 1 : 0 }));
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  // helper to ensure SweetAlert sits above MUI Dialog (fix overlap)
  const showSwal = (opts = {}) => {
    return Swal.fire({
      ...opts,
      didOpen: () => {
        // ensure Swal container and popup z-index are higher than MUI Dialog
        try {
          const container = document.querySelector(".swal2-container");
          const popup = document.querySelector(".swal2-popup");
          if (container) container.style.zIndex = "2000";
          if (popup) popup.style.zIndex = "2001";
        } catch (err) {
          // ignore if DOM access fails for any reason
        }
        // if user passed their own didOpen, still call it
        if (typeof opts.didOpen === "function") {
          try {
            opts.didOpen();
          } catch (e) {
            // swallow errors from user didOpen to avoid breaking alerts
          }
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Validate only the Valid In/Out fields here — if any are empty, mark them red and stop.
    const requiredFields = ["valid_in_start", "valid_in_end", "valid_out_start", "valid_out_end"];
    const newErrors = {};
    requiredFields.forEach((f) => {
      if (!form[f]) newErrors[f] = "Required";
    });

    if (Object.keys(newErrors).length > 0) {
      // set errors to show red fields and helper text; do NOT show SweetAlert for this validation failure
      setErrors(newErrors);
      // optionally focus first invalid field (nice UX)
      const firstInvalid = requiredFields.find((f) => newErrors[f]);
      if (firstInvalid) {
        const el = document.querySelector(`[name="${firstInvalid}"]`);
        if (el && typeof el.focus === "function") {
          el.focus();
        }
      }
      return; // abort submission
    }

    let result;
    if (form.id) {
      result = await update(form.id, form);
    } else {
      result = await create(form);
    }

    if (result?.success) {
      // use SweetAlert2 for nicer alerts and make sure it appears above the dialog
      await showSwal({
        icon: "success",
        title: "Shift saved successfully",
        showConfirmButton: false,
        timer: 1400,
      });
      if (typeof onSaved === "function") await onSaved();
      onClose();
    } else {
      await showSwal({
        icon: "error",
        title: "Failed to save shift",
        text: result?.message || "Failed to save shift",
      });
    }
  };

  // determine if another default exists (exclude current editing id)
  const existingDefault = (workTimes || []).find(
    (w) => Number(w.is_default) === 1 && Number(w.id) !== Number(form.id)
  );
  const defaultDisabled = !!existingDefault && form.is_default !== 1;

  // Responsive dialog: fullScreen on small viewports
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm")); // sm ≈ 600px

  return (
    <Dialog
      open={!!isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      fullScreen={fullScreen}
      aria-labelledby="worktime-dialog-title"
    >
      <DialogTitle id="worktime-dialog-title" sx={{ pt: 2, pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography variant="h6" component="div">
            {form.id ? "Edit Shift" : "Add Shift"}
          </Typography>
        </Box>
      </DialogTitle>

      {/* Make content scrollable with a max height so dialog doesn't overflow the viewport */}
      <DialogContent
        dividers
        sx={{
          px: { xs: 2, md: 3 },
          py: 1.5,
          // if fullscreen use most of the viewport, otherwise allow a comfortable height
          maxHeight: fullScreen ? "calc(100vh - 140px)" : "60vh",
          overflowY: "auto",
        }}
      >
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <Stack spacing={1.5}>
            {/* Shift name */}
            <TextField
              label="Shift Name"
              name="shift_name"
              value={form.shift_name}
              onChange={handleChange}
              fullWidth
              size="small"
              required
            />

            {/* Checkbox under the name */}
            <Box>
              <Tooltip title="Mark this shift as the default. Only one shift can be default at a time." placement="top">
                <FormControlLabel
                  control={
                    <Checkbox
                      name="is_default"
                      checked={form.is_default === 1}
                      onChange={handleCheckbox}
                      size="small"
                      disabled={defaultDisabled}
                    />
                  }
                  label={<Typography sx={{ fontSize: 13, lineHeight: 1.1 }}>Set as Default</Typography>}
                  sx={{ m: 0 }}
                />
              </Tooltip>
              {defaultDisabled && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                  A default shift already exists. You can edit the current default, or unset it elsewhere first.
                </Typography>
              )}
            </Box>

            {/* Set shift start and end */}
            <Typography variant="subtitle2" sx={{ mt: 0.5, mb: 0 }}>
              Set shift start and end
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="Start Time"
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                required
              />

              <TextField
                label="End Time"
                name="end_time"
                type="time"
                value={form.end_time}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                required
              />
            </Stack>

            {/* Valid In / Out */}
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 0 }}>
              Valid In and Out
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 1 }}>
              <TextField
                label="Valid In Start"
                name="valid_in_start"
                type="time"
                value={form.valid_in_start}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                required
                error={Boolean(errors.valid_in_start)}
                helperText={errors.valid_in_start ? "Required" : ""}
              />

              <TextField
                label="Valid In End"
                name="valid_in_end"
                type="time"
                value={form.valid_in_end}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                required
                error={Boolean(errors.valid_in_end)}
                helperText={errors.valid_in_end ? "Required" : ""}
              />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 1 }}>
              <TextField
                label="Valid Out Start"
                name="valid_out_start"
                type="time"
                value={form.valid_out_start}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                required
                error={Boolean(errors.valid_out_start)}
                helperText={errors.valid_out_start ? "Required" : ""}
              />

              <TextField
                label="Valid Out End"
                name="valid_out_end"
                type="time"
                value={form.valid_out_end}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
                required
                error={Boolean(errors.valid_out_end)}
                helperText={errors.valid_out_end ? "Required" : ""}
              />
            </Stack>
          </Stack>
        </Box>
      </DialogContent>

      {/* Sticky actions so Save/Cancel remain visible on mobile */}
      <DialogActions
        sx={{
          px: { xs: 2, md: 3 },
          py: 1,
          // sticky bottom inside the dialog; uses dialog's background for smoothness
          position: "sticky",
          bottom: 0,
          background: (theme) => theme.palette.background.paper,
          zIndex: 40,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkTimeFormModal;




// // WorkTimeFormModal.jsx
// import React, { useState, useEffect } from "react";
// import { useCreateWorkTime, useUpdateWorkTime, useFetchWorkTimes } from "../work-timeHooks/useWorkTimeAPI";
// import {
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Button,
//   TextField,
//   Box,
//   Checkbox,
//   FormControlLabel,
//   Tooltip,
//   Typography,
//   Divider,
//   useMediaQuery,
//   useTheme,
//   Stack
// } from "@mui/material";

// const WorkTimeFormModal = ({ isOpen, onClose, initialData, onSaved }) => {
//   const [form, setForm] = useState({
//     shift_name: "",
//     start_time: "",
//     end_time: "",
//     valid_in_start: "",
//     valid_in_end: "",
//     valid_out_start: "",
//     valid_out_end: "",
//     is_default: 0,
//   });

//   const { create } = useCreateWorkTime();
//   const { update } = useUpdateWorkTime();
//   const { workTimes } = useFetchWorkTimes();

//   useEffect(() => {
//     if (initialData) {
//       setForm(initialData);
//     } else {
//       setForm({
//         shift_name: "",
//         start_time: "",
//         end_time: "",
//         valid_in_start: "",
//         valid_in_end: "",
//         valid_out_start: "",
//         valid_out_end: "",
//         is_default: 0,
//       });
//     }
//   }, [initialData, isOpen]);

//   const handleChange = (e) => {
//     setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
//   };

//   // separate checkbox handler to maintain numeric 1/0
//   const handleCheckbox = (e) => {
//     const { name, checked } = e.target;
//     setForm((s) => ({ ...s, [name]: checked ? 1 : 0 }));
//   };

//   const handleSubmit = async (e) => {
//     if (e && e.preventDefault) e.preventDefault();

//     let result;
//     if (form.id) {
//       result = await update(form.id, form);
//     } else {
//       result = await create(form);
//     }

//     if (result?.success) {
//       // small UX improvement: use window.alert for now to remain consistent with your code
//       alert("✅ Shift saved successfully");
//       if (typeof onSaved === "function") await onSaved();
//       onClose();
//     } else {
//       alert(`❌ ${result?.message || "Failed to save shift"}`);
//     }
//   };

//   // determine if another default exists (exclude current editing id)
//   const existingDefault = (workTimes || []).find(
//     (w) => Number(w.is_default) === 1 && Number(w.id) !== Number(form.id)
//   );
//   const defaultDisabled = !!existingDefault && form.is_default !== 1;

//   // Responsive dialog: fullScreen on small viewports
//   const theme = useTheme();
//   const fullScreen = useMediaQuery(theme.breakpoints.down("sm")); // sm ≈ 600px

//   return (
//     <Dialog
//       open={!!isOpen}
//       onClose={onClose}
//       fullWidth
//       maxWidth="xs"
//       fullScreen={fullScreen}
//       aria-labelledby="worktime-dialog-title"
//     >
//       <DialogTitle id="worktime-dialog-title" sx={{ pt: 2, pb: 1 }}>
//         <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
//           <Typography variant="h6" component="div">
//             {form.id ? "Edit Shift" : "Add Shift"}
//           </Typography>
//         </Box>
//       </DialogTitle>

//       {/* Make content scrollable with a max height so dialog doesn't overflow the viewport */}
//       <DialogContent
//         dividers
//         sx={{
//           px: { xs: 2, md: 3 },
//           py: 1.5,
//           // if fullscreen use most of the viewport, otherwise allow a comfortable height
//           maxHeight: fullScreen ? "calc(100vh - 140px)" : "60vh",
//           overflowY: "auto",
//         }}
//       >
//         <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
//           <Stack spacing={1.5}>
//             {/* Shift name */}
//             <TextField
//               label="Shift Name"
//               name="shift_name"
//               value={form.shift_name}
//               onChange={handleChange}
//               fullWidth
//               size="small"
//               required
//             />

//             {/* Checkbox under the name */}
//             <Box>
//               <Tooltip title="Mark this shift as the default. Only one shift can be default at a time." placement="top">
//                 <FormControlLabel
//                   control={
//                     <Checkbox
//                       name="is_default"
//                       checked={form.is_default === 1}
//                       onChange={handleCheckbox}
//                       size="small"
//                       disabled={defaultDisabled}
//                     />
//                   }
//                   label={<Typography sx={{ fontSize: 13, lineHeight: 1.1 }}>Set as Default</Typography>}
//                   sx={{ m: 0 }}
//                 />
//               </Tooltip>
//               {defaultDisabled && (
//                 <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
//                   A default shift already exists. You can edit the current default, or unset it elsewhere first.
//                 </Typography>
//               )}
//             </Box>

//             {/* Set shift start and end */}
//             <Typography variant="subtitle2" sx={{ mt: 0.5, mb: 0 }}>
//               Set shift start and end
//             </Typography>

//             <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
//               <TextField
//                 label="Start Time"
//                 name="start_time"
//                 type="time"
//                 value={form.start_time}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//                 size="small"
//                 required
//               />

//               <TextField
//                 label="End Time"
//                 name="end_time"
//                 type="time"
//                 value={form.end_time}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//                 size="small"
//                 required
//               />
//             </Stack>

//             {/* Valid In / Out */}
//             <Divider sx={{ my: 1 }} />
//             <Typography variant="subtitle2" sx={{ mb: 0 }}>
//               Valid In and Out
//             </Typography>

//             <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 1 }}>
//               <TextField
//                 label="Valid In Start"
//                 name="valid_in_start"
//                 type="time"
//                 value={form.valid_in_start}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//                 size="small"
//                 required
//               />

//               <TextField
//                 label="Valid In End"
//                 name="valid_in_end"
//                 type="time"
//                 value={form.valid_in_end}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//                 size="small"
//                 required
//               />
//             </Stack>

//             <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ pt: 1 }}>
//               <TextField
//                 label="Valid Out Start"
//                 name="valid_out_start"
//                 type="time"
//                 value={form.valid_out_start}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//                 size="small"
//                 required
//               />

//               <TextField
//                 label="Valid Out End"
//                 name="valid_out_end"
//                 type="time"
//                 value={form.valid_out_end}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//                 size="small"
//                 required
//               />
//             </Stack>
//           </Stack>
//         </Box>
//       </DialogContent>

//       {/* Sticky actions so Save/Cancel remain visible on mobile */}
//       <DialogActions
//         sx={{
//           px: { xs: 2, md: 3 },
//           py: 1,
//           // sticky bottom inside the dialog; uses dialog's background for smoothness
//           position: "sticky",
//           bottom: 0,
//           background: (theme) => theme.palette.background.paper,
//           zIndex: 40,
//           borderTop: (theme) => `1px solid ${theme.palette.divider}`,
//         }}
//       >
//         <Button onClick={onClose}>Cancel</Button>
//         <Button variant="contained" onClick={handleSubmit}>
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default WorkTimeFormModal;


