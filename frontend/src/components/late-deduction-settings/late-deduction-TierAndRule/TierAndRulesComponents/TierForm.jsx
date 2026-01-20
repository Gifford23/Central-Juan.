// src/components/lateDeduction/TierForm.jsx
import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from "@mui/material";

const TierForm = ({ open, onClose, onSave, initialData }) => {
  const [tierName, setTierName] = useState("");
  const [description, setDescription] = useState("");

  // track simple field validation (only required fields)
  const [fieldErrors, setFieldErrors] = useState({
    tierName: false,
  });

  // ref to focus the Tier Name input when invalid
  const tierNameRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setTierName(initialData.tier_name);
      setDescription(initialData.description || "");
    } else {
      setTierName("");
      setDescription("");
    }
    // reset errors whenever initialData or open changes
    setFieldErrors({ tierName: false });
  }, [initialData, open]);

  const handleSubmit = () => {
    // validate required fields: Tier Name
    if (!tierName || String(tierName).trim() === "") {
      setFieldErrors({ tierName: true });
      // focus tier name input for quick re-entry
      try {
        tierNameRef.current?.focus();
      } catch (e) {
        // ignore focus errors
      }
      return;
    }

    const payload = {
      id: initialData?.id,
      tier_name: tierName,
      description,
    };
    onSave(payload);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{initialData ? "Edit Tier" : "Add Tier"}</DialogTitle>
      <DialogContent className="flex flex-col gap-4 mt-2">
        <TextField
          label="Tier Name"
          value={tierName}
          onChange={(e) => {
            setTierName(e.target.value);
            if (fieldErrors.tierName) setFieldErrors((p) => ({ ...p, tierName: false }));
          }}
          fullWidth
          required
          error={fieldErrors.tierName}
          helperText={fieldErrors.tierName ? "Required" : ""}
          inputProps={{ "aria-label": "Tier Name", name: "tierName" }}
          inputRef={tierNameRef}
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
        />
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

export default TierForm;

