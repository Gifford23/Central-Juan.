import { useState, useRef } from "react";
import {
  Button,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  FormHelperText,
} from "@mui/material";

export default function ShiftMappingForm({ shift, tiers = [], onSave, onCancel }) {
  const [selectedTier, setSelectedTier] = useState(shift?.tier_id || "");
  const [error, setError] = useState(false);
  const selectRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedTier || String(selectedTier).trim() === "") {
      setError(true);
      try {
        selectRef.current?.focus();
      } catch (err) {
        // ignore
      }
      return;
    }

    onSave({
      work_time_id: shift.work_time_id, // ✅ correct field
      tier_id: selectedTier,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent dividers>
        <Typography variant="subtitle1" gutterBottom>
          Shift: <strong>{shift.shift_name}</strong>
        </Typography>

        <FormControl fullWidth margin="normal" error={error}>
          <InputLabel id="tier-label" required>
            Late Deduction Tier
          </InputLabel>
          <Select
            labelId="tier-label"
            value={selectedTier}
            onChange={(e) => {
              setSelectedTier(e.target.value);
              if (error) setError(false);
            }}
            inputRef={selectRef}
          >
            {tiers.length > 0 ? (
              tiers.map((tier) => (
                <MenuItem key={tier.id} value={tier.id}>
                  {tier.tier_name}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>No tiers available</MenuItem>
            )}
          </Select>
          {error && <FormHelperText>Required</FormHelperText>}
        </FormControl>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">
          Save
        </Button>
      </DialogActions>
    </form>
  );
}
