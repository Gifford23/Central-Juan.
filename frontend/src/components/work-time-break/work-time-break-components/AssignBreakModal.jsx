// src/components/WorkTimeBreakUI/AssignBreakModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  FormHelperText,
} from "@mui/material";
import Swal from "sweetalert2";
import { useCreateWorkTimeBreak } from "../work-time-breakhooks/useWorkTimeBreak";
import { fetchBreaks } from "../work-time-breakAPI/WorkTimeBreakAPI";
import axios from "axios";
import BASE_URL from "../../../../backend/server/config";

const AssignBreakModal = ({ workTimeId = null, onClose, onSuccess, open = true }) => {
  const { create } = useCreateWorkTimeBreak();
  const [shifts, setShifts] = useState([]);
  const [breaks, setBreaks] = useState([]);
  const [selectedShift, setSelectedShift] = useState(workTimeId || "");
  const [selectedBreak, setSelectedBreak] = useState("");

  // field-level errors: { shift: "Required", break: "Required" }
  const [errors, setErrors] = useState({});

  // sync prop -> state if workTimeId changes
  useEffect(() => {
    setSelectedShift(workTimeId || "");
    // clear errors when the modal is opened/prop changes
    setErrors({});
  }, [workTimeId, open]);

  // ✅ Load all shifts
  useEffect(() => {
    let mounted = true;
    const loadShifts = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/work_time/read_work_time.php`);
        if (mounted && res.data?.success) setShifts(res.data.data || []);
      } catch (err) {
        console.error("Failed to load shifts", err);
      }
    };
    loadShifts();
    return () => { mounted = false; };
  }, []);

  // ✅ Load available breaks
  useEffect(() => {
    let mounted = true;
    const loadBreaks = async () => {
      try {
        const data = await fetchBreaks();
        if (mounted) setBreaks(data || []);
      } catch (err) {
        console.error("Failed to load breaks", err);
      }
    };
    loadBreaks();
    return () => { mounted = false; };
  }, []);

  // helper to ensure SweetAlert sits above MUI Dialogs
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
            // swallow
          }
        }
      },
    });
  };

  const handleSubmit = async () => {
    // validate required selects: mark red and show helper text, do NOT show SweetAlert for this validation
    const newErrors = {};
    if (!selectedShift) newErrors.shift = "Required";
    if (!selectedBreak) newErrors.break = "Required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // focus first invalid field
      if (newErrors.shift) {
        const el = document.getElementById("select-shift");
        if (el && typeof el.focus === "function") el.focus();
      } else if (newErrors.break) {
        const el = document.getElementById("select-break");
        if (el && typeof el.focus === "function") el.focus();
      }
      return;
    }

    // proceed with create
    const result = await create(selectedShift, selectedBreak);
    if (result?.success) {
      // success toast and call onSuccess/onClose
      await showSwal({
        icon: "success",
        title: "Break assigned successfully!",
        showConfirmButton: false,
        timer: 1200,
      });

      if (typeof onSuccess === "function") {
        onSuccess({
          mapping_id: result.id,
          work_time_id: selectedShift,
          break_id: selectedBreak,
          shift_name: shifts.find((s) => s.id === Number(selectedShift))?.shift_name,
          break_name: breaks.find((b) => b.id === Number(selectedBreak))?.break_name,
          break_start: breaks.find((b) => b.id === Number(selectedBreak))?.break_start,
          break_end: breaks.find((b) => b.id === Number(selectedBreak))?.break_end,
        });
      }
      onClose();
    } else {
      await showSwal({
        icon: "error",
        title: "Failed to assign break",
        text: result?.message || "Failed to assign break",
      });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Assign Break</DialogTitle>

      <DialogContent>
        <Box className="flex flex-col gap-4 mt-1">
          <FormControl fullWidth error={Boolean(errors.shift)}>
            <InputLabel id="assign-shift-label">Select Shift</InputLabel>
            <Select
              id="select-shift"
              labelId="assign-shift-label"
              value={selectedShift}
              label="Select Shift"
              onChange={(e) => {
                setSelectedShift(e.target.value);
                setErrors((prev) => ({ ...prev, shift: false }));
              }}
            >
              <MenuItem value="">
                <em>-- Select Shift --</em>
              </MenuItem>
              {shifts.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.shift_name} ({s.start_time} - {s.end_time})
                </MenuItem>
              ))}
            </Select>
            {errors.shift && <FormHelperText>{errors.shift}</FormHelperText>}
          </FormControl>

          <FormControl fullWidth error={Boolean(errors.break)}>
            <InputLabel id="assign-break-label">Select Break</InputLabel>
            <Select
              id="select-break"
              labelId="assign-break-label"
              value={selectedBreak}
              label="Select Break"
              onChange={(e) => {
                setSelectedBreak(e.target.value);
                setErrors((prev) => ({ ...prev, break: false }));
              }}
            >
              <MenuItem value="">
                <em>-- Select Break --</em>
              </MenuItem>
              {breaks.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.break_name} ({b.break_start} - {b.break_end})
                </MenuItem>
              ))}
            </Select>
            {errors.break && <FormHelperText>{errors.break}</FormHelperText>}
          </FormControl>
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

export default AssignBreakModal;






// import React, { useEffect, useState } from "react";
// import { useCreateWorkTimeBreak } from "../work-time-breakhooks/useWorkTimeBreak";
// import { fetchBreaks } from "../work-time-breakAPI/WorkTimeBreakAPI";
// import axios from "axios";
// import BASE_URL from "../../../../backend/server/config";

// const AssignBreakModal = ({ workTimeId = null, onClose, onSuccess }) => {
//   const { create } = useCreateWorkTimeBreak();
//   const [shifts, setShifts] = useState([]);
//   const [breaks, setBreaks] = useState([]);
//   const [selectedShift, setSelectedShift] = useState(workTimeId || "");
//   const [selectedBreak, setSelectedBreak] = useState("");

//   // ✅ Load all shifts
//   useEffect(() => {
//     const loadShifts = async () => {
//       const res = await axios.get(`${BASE_URL}/work_time/read_work_time.php`);
//       if (res.data.success) setShifts(res.data.data);
//     };
//     loadShifts();
//   }, []);

//   // ✅ Load available breaks
//   useEffect(() => {
//     const loadBreaks = async () => {
//       const data = await fetchBreaks();
//       setBreaks(data);
//     };
//     loadBreaks();
//   }, []);

//   const handleSubmit = async () => {
//     if (!selectedShift || !selectedBreak) {
//       alert("Please select both shift and break");
//       return;
//     }

//     const result = await create(selectedShift, selectedBreak);
//     if (result.success) {
//       alert("Break assigned successfully!");
//       onSuccess({
//         mapping_id: result.id,
//         work_time_id: selectedShift,
//         break_id: selectedBreak,
//         shift_name: shifts.find((s) => s.id === Number(selectedShift))?.shift_name,
//         break_name: breaks.find((b) => b.id === Number(selectedBreak))?.break_name,
//         break_start: breaks.find((b) => b.id === Number(selectedBreak))?.break_start,
//         break_end: breaks.find((b) => b.id === Number(selectedBreak))?.break_end,
//       });
//       onClose();
//     } else {
//       alert(result.message || "Failed to assign break");
//     }
//   };

//   return (
//     <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
//       <div className="p-5 bg-white rounded-lg shadow-lg w-96">
//         <h3 className="mb-4 text-lg font-semibold">Assign Break</h3>

//         {/* ✅ Shift dropdown */}
//         <label className="block mb-2">Select Shift</label>
//         <select
//           value={selectedShift}
//           onChange={(e) => setSelectedShift(e.target.value)}
//           className="w-full p-2 mb-4 border rounded"
//         >
//           <option value="">-- Select Shift --</option>
//           {shifts.map((s) => (
//             <option key={s.id} value={s.id}>
//               {s.shift_name} ({s.start_time} - {s.end_time})
//             </option>
//           ))}
//         </select>

//         {/* ✅ Break dropdown */}
//         <label className="block mb-2">Select Break</label>
//         <select
//           value={selectedBreak}
//           onChange={(e) => setSelectedBreak(e.target.value)}
//           className="w-full p-2 mb-4 border rounded"
//         >
//           <option value="">-- Select Break --</option>
//           {breaks.map((b) => (
//             <option key={b.id} value={b.id}>
//               {b.break_name} ({b.break_start} - {b.break_end})
//             </option>
//           ))}
//         </select>

//         <div className="flex justify-end gap-2">
//           <button
//             onClick={onClose}
//             className="px-3 py-1 border border-gray-400 rounded"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             className="px-3 py-1 text-white bg-blue-600 rounded hover:bg-blue-700"
//           >
//             Save
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AssignBreakModal;
