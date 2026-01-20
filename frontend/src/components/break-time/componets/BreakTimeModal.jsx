import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
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
} from "@mui/material";
import { useCreateBreakTime, useUpdateBreakTime } from "../break-timeHooks/useBreakTimeAPI";

const BreakTimeFormModal = ({ breakData, onClose, onSaved, open = true }) => {
  const { create } = useCreateBreakTime();
  const { update } = useUpdateBreakTime();

  const [form, setForm] = useState({
    break_name: breakData?.break_name || "",
    break_start: breakData?.break_start || "",
    break_end: breakData?.break_end || "",
    valid_break_in_start: breakData?.valid_break_in_start || "",
    valid_break_in_end: breakData?.valid_break_in_end || "",
    valid_break_out_start: breakData?.valid_break_out_start || "",
    valid_break_out_end: breakData?.valid_break_out_end || "",
    work_time_id: breakData?.work_time_id || null,
    is_shift_split: breakData?.is_shift_split ? 1 : 0,
  });

  // track validation errors for fields we want to mark red
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm({
      break_name: breakData?.break_name || "",
      break_start: breakData?.break_start || "",
      break_end: breakData?.break_end || "",
      valid_break_in_start: breakData?.valid_break_in_start || "",
      valid_break_in_end: breakData?.valid_break_in_end || "",
      valid_break_out_start: breakData?.valid_break_out_start || "",
      valid_break_out_end: breakData?.valid_break_out_end || "",
      work_time_id: breakData?.work_time_id || null,
      is_shift_split: breakData?.is_shift_split ? 1 : 0,
    });

    // reset validation errors whenever modal opens or breakData changes
    setErrors({});
  }, [breakData, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
    // clear field-specific error on change
    setErrors((prev) => ({ ...prev, [name]: false }));
  };

  // checkbox handler (keeps numeric 1/0 to match DB tinyint)
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
        try {
          const container = document.querySelector(".swal2-container");
          const popup = document.querySelector(".swal2-popup");
          if (container) container.style.zIndex = "2000";
          if (popup) popup.style.zIndex = "2001";
        } catch (err) {
          // ignore
        }
        if (typeof opts.didOpen === "function") {
          try {
            opts.didOpen();
          } catch (e) {
            // swallow user didOpen errors
          }
        }
      },
    });
  };

  const handleSubmit = async () => {
    // validate required Valid Break In/Out fields (same behaviour as work-time modal)
    const requiredFields = [
      "valid_break_in_start",
      "valid_break_in_end",
      "valid_break_out_start",
      "valid_break_out_end",
    ];
    const newErrors = {};
    requiredFields.forEach((f) => {
      if (!form[f]) newErrors[f] = "Required";
    });

    if (Object.keys(newErrors).length > 0) {
      // set errors and focus first invalid field; do NOT show SweetAlert for validation failures
      setErrors(newErrors);
      const firstInvalid = requiredFields.find((f) => newErrors[f]);
      if (firstInvalid) {
        const el = document.querySelector(`[name="${firstInvalid}"]`);
        if (el && typeof el.focus === "function") el.focus();
      }
      return;
    }

    let res;
    if (breakData && breakData.id) {
      res = await update(breakData.id, form);
    } else {
      res = await create(form);
    }

    if (res?.success) {
      if (typeof onSaved === "function") {
        await onSaved();
      } else {
        onClose();
      }
      // success SweetAlert (same pattern as work-time modal)
      await showSwal({
        icon: "success",
        title: "Break saved!",
        showConfirmButton: false,
        timer: 1400,
      });
    } else {
      await showSwal({
        icon: "error",
        title: "Error saving break",
        text: res?.message || res?.error || "Unknown",
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      {/* Title row */}
      <DialogTitle sx={{ pt: 2, pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography variant="h6" component="div">
            {breakData ? "Edit Break" : "Add Break"}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box component="form" className="flex flex-col gap-3 mt-1">
          {/* Break name + checkbox row */}
          <div className="flex w-full col">
            <div className="flex-1">
              <TextField
                label="Break Name"
                name="break_name"
                value={form.break_name}
                onChange={handleChange}
                fullWidth
                size="small"
              />
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            <Tooltip title="Major split separating shift blocks" placement="top">
              <FormControlLabel
                control={
                  <Checkbox
                    name="is_shift_split"
                    checked={!!form.is_shift_split}
                    onChange={handleCheckbox}
                    size="small"
                  />
                }
                label={<Typography sx={{ fontSize: 13, lineHeight: 1.1 }}>Shift split </Typography>}
                sx={{ m: 0 }}
              />
            </Tooltip>
          </div>

          {/* Set break start and end */}
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.5 }}>
            Set break start and end
          </Typography>
          <div className="flex w-full gap-2">
            <div className="flex-1">
              <TextField
                label="Break Start"
                name="break_start"
                type="time"
                value={form.break_start}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </div>

            <div className="flex-1">
              <TextField
                label="Break End"
                name="break_end"
                type="time"
                value={form.break_end}
                onChange={handleChange}
                fullWidth
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </div>
          </div>

          {/* Valid Break Out and In */}
          <div>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Valid Break Out and In
            </Typography>

            <div className="flex w-full gap-2 pt-3">
              <div className="flex-1">
                <TextField
                  label="Valid Break Out Start"
                  name="valid_break_out_start"
                  type="time"
                  value={form.valid_break_out_start}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  error={Boolean(errors.valid_break_out_start)}
                  helperText={errors.valid_break_out_start ? "Required" : ""}
                />
              </div>

              <div className="flex-1">
                <TextField
                  label="Valid Break Out End"
                  name="valid_break_out_end"
                  type="time"
                  value={form.valid_break_out_end}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  error={Boolean(errors.valid_break_out_end)}
                  helperText={errors.valid_break_out_end ? "Required" : ""}
                />
              </div>
            </div>

            <div className="flex w-full gap-2 pt-3">
              <div className="flex-1">
                <TextField
                  label="Valid Break In Start"
                  name="valid_break_in_start"
                  type="time"
                  value={form.valid_break_in_start}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  error={Boolean(errors.valid_break_in_start)}
                  helperText={errors.valid_break_in_start ? "Required" : ""}
                />
              </div>

              <div className="flex-1">
                <TextField
                  label="Valid Break In End"
                  name="valid_break_in_end"
                  type="time"
                  value={form.valid_break_in_end}
                  onChange={handleChange}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  size="small"
                  error={Boolean(errors.valid_break_in_end)}
                  helperText={errors.valid_break_in_end ? "Required" : ""}
                />
              </div>
            </div>
          </div>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BreakTimeFormModal;


// // BreakTimeFormModal.jsx
// import React, { useState, useEffect } from "react";
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
// } from "@mui/material";
// import { useCreateBreakTime, useUpdateBreakTime } from "../break-timeHooks/useBreakTimeAPI";

// const BreakTimeFormModal = ({ breakData, onClose, onSaved, open = true }) => {
//   const { create } = useCreateBreakTime();
//   const { update } = useUpdateBreakTime();

//   const [form, setForm] = useState({
//     break_name: breakData?.break_name || "",
//     break_start: breakData?.break_start || "",
//     break_end: breakData?.break_end || "",
//     valid_break_in_start: breakData?.valid_break_in_start || "",
//     valid_break_in_end: breakData?.valid_break_in_end || "",
//     valid_break_out_start: breakData?.valid_break_out_start || "",
//     valid_break_out_end: breakData?.valid_break_out_end || "",
//     work_time_id: breakData?.work_time_id || null,
//     is_shift_split: breakData?.is_shift_split ? 1 : 0, // <-- new
//   });

//   useEffect(() => {
//     setForm({
//       break_name: breakData?.break_name || "",
//       break_start: breakData?.break_start || "",
//       break_end: breakData?.break_end || "",
//       valid_break_in_start: breakData?.valid_break_in_start || "",
//       valid_break_in_end: breakData?.valid_break_in_end || "",
//       valid_break_out_start: breakData?.valid_break_out_start || "",
//       valid_break_out_end: breakData?.valid_break_out_end || "",
//       work_time_id: breakData?.work_time_id || null,
//       is_shift_split: breakData?.is_shift_split ? 1 : 0, // <-- new
//     });
//   }, [breakData, open]);

//   const handleChange = (e) => {
//     setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
//   };

//   // checkbox handler (keeps numeric 1/0 to match DB tinyint)
//   const handleCheckbox = (e) => {
//     const { name, checked } = e.target;
//     setForm((s) => ({ ...s, [name]: checked ? 1 : 0 }));
//   };

//   const handleSubmit = async () => {
//     let res;
//     if (breakData && breakData.id) {
//       res = await update(breakData.id, form);
//     } else {
//       res = await create(form);
//     }

//     if (res?.success) {
//       if (typeof onSaved === "function") {
//         await onSaved();
//       } else {
//         onClose();
//       }
//       alert("✅ Break saved!");
//     } else {
//       alert("❌ Error: " + (res?.message || res?.error || "Unknown"));
//     }
//   };

//   return (
//     <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
//       <DialogTitle>{breakData ? "Edit Break" : "Add Break"}</DialogTitle>
//       <DialogContent>
//         <Box component="form" className="flex flex-col gap-3 mt-1">


//           <div className="flex w-full gap-2">
//             <div className="flex-1">
//               <TextField
//                 label="Break Name"
//                 name="break_name"
//                 value={form.break_name}
//                 onChange={handleChange}
//                 fullWidth
//               />
//             </div>

//             <div className="flex-1">
//               <FormControlLabel
//                 control={
//                   <Checkbox
//                     name="is_shift_split"
//                     checked={!!form.is_shift_split}
//                     onChange={handleCheckbox}
//                     size="small"
//                   />
//                 }
//                 label="Is shift split (major split separating shift blocks)"
//               />
//             </div>
//           </div>

//           {/* Set break start and end - kept exactly as originally but organized */}
//           <p>Set break start and end</p>
//           <div className="flex w-full gap-2">
//             <div className="flex-1">
//               <TextField
//                 label="Break Start"
//                 name="break_start"
//                 type="time"
//                 value={form.break_start}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//               />
//             </div>

//             <div className="flex-1">
//               <TextField
//                 label="Break End"
//                 name="break_end"
//                 type="time"
//                 value={form.break_end}
//                 onChange={handleChange}
//                 fullWidth
//                 InputLabelProps={{ shrink: true }}
//               />
//             </div>
//           </div>

//           {/* The original duplicate Break Start / Break End fields are preserved (no removals)
//           <TextField
//             label="Break Start"
//             name="break_start"
//             type="time"
//             value={form.break_start}
//             onChange={handleChange}
//             fullWidth
//             InputLabelProps={{ shrink: true }}
//           />
//           <TextField
//             label="Break End"
//             name="break_end"
//             type="time"
//             value={form.break_end}
//             onChange={handleChange}
//             fullWidth
//             InputLabelProps={{ shrink: true }}
//           /> */}

//           {/* Valid Break Out - organized into two-column layout (same structure as above) */}
//           <div >
//             <p className="pb-3 mb-3 border-b-1">Valid Break Out and In</p>
//             <div className="flex w-full gap-2 pt-3">
//               <div className="flex-1">
//                 <TextField
//                   label="Valid Break Out Start"
//                   name="valid_break_out_start"
//                   type="time"
//                   value={form.valid_break_out_start}
//                   onChange={handleChange}
//                   fullWidth
//                   InputLabelProps={{ shrink: true }}
//                 />
//               </div>

//               <div className="flex-1">
//                 <TextField
//                   label="Valid Break Out End"
//                   name="valid_break_out_end"
//                   type="time"
//                   value={form.valid_break_out_end}
//                   onChange={handleChange}
//                   fullWidth
//                   InputLabelProps={{ shrink: true }}
//                 />
//               </div>
//             </div>
//           </div>

//           {/* Valid Break In - organized into two-column layout (same structure as above) */}
//           <div>
//             {/* <p className="mb-1">Valid Break In</p> */}
//             <div className="flex w-full gap-2">
//               <div className="flex-1">
//                 <TextField
//                   label="Valid Break In Start"
//                   name="valid_break_in_start"
//                   type="time"
//                   value={form.valid_break_in_start}
//                   onChange={handleChange}
//                   fullWidth
//                   InputLabelProps={{ shrink: true }}
//                 />
//               </div>

//               <div className="flex-1">
//                 <TextField
//                   label="Valid Break In End"
//                   name="valid_break_in_end"
//                   type="time"
//                   value={form.valid_break_in_end}
//                   onChange={handleChange}
//                   fullWidth
//                   InputLabelProps={{ shrink: true }}
//                 />
//               </div>
//             </div>
//           </div>


//         </Box>
//       </DialogContent>

//       <DialogActions>
//         <Button onClick={onClose}>Cancel</Button>
//         <Button variant="contained" onClick={handleSubmit}>
//           Save
//         </Button>
//       </DialogActions>
//     </Dialog>
//   );
// };

// export default BreakTimeFormModal;



